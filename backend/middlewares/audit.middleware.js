const logger = require('../utils/logger');
const { writeAuditTrail } = require('../services/auditTrail.service');
const { sanitizeForLog } = require('../logger/sanitize');

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const toAuditAction = (req) => {
  const action = req.logContext?.action || 'request';
  return `${req.logContext?.module || 'api'}_${action}`;
};

const auditMiddleware = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    if (!AUDITED_METHODS.has(req.method) || res.statusCode >= 400 || !req.user?.id) return;

    writeAuditTrail({
      userId: req.user.id,
      role: req.user.role || '',
      module: req.logContext?.module || 'api',
      action: toAuditAction(req),
      targetType: req.logContext?.module || 'api',
      targetId: req.params?.id || req.params?.userId || req.params?.workflowId || '',
      metadata: sanitizeForLog({
        requestId: req.id || req.headers['x-request-id'] || null,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        params: req.params || {},
      }),
      ipAddress: req.ip || req.socket?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
    }).catch((err) => {
      logger.warn(
        {
          err,
          requestId: req.id || req.headers['x-request-id'] || null,
          module: req.logContext?.module || 'api',
          action: toAuditAction(req),
        },
        'Failed to write request audit event'
      );
    });
  });
  next();
};

module.exports = auditMiddleware;
