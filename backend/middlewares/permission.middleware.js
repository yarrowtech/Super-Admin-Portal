const { hasPermission } = require('../utils/permissions');
const logger = require('../utils/logger');
const logService = require('../services/log.service');
const env = require('../config/env');

const toLogId = (value) => {
  if (!value) return null;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
};

const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    logger.warn({
      event: 'rbac.access.denied',
      category: 'RBAC',
      requestId: req.id || req.headers['x-request-id'] || null,
      sessionId: req.authSessionId ? toLogId(req.authSessionId) : null,
      module: 'authorization',
      action: 'permission_check',
      status: 'failed',
      permission,
      path: req.originalUrl,
      method: req.method,
    }, 'Permission check rejected: unauthenticated request');
    req.systemErrorLogged = true;
    logService.fireAndForgetFromRequest(req, {
      level: 'warn',
      event: 'ACCESS_DENIED',
      message: 'Permission check rejected: unauthenticated request',
      emit: false,
      module: 'authorization',
      action: 'PERMISSION_CHECK',
      statusCode: 401,
      metadata: { permission },
    });
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (!hasPermission(req.user.role, permission) && !userPermissions.includes(permission)) {
    logger.warn({
      event: 'rbac.access.denied',
      category: 'RBAC',
      requestId: req.id || req.headers['x-request-id'] || null,
      sessionId: req.authSessionId ? toLogId(req.authSessionId) : null,
      module: 'authorization',
      action: 'permission_check',
      status: 'failed',
      userId: toLogId(req.user.id),
      role: req.user.role,
      permission,
      path: req.originalUrl,
      method: req.method,
    }, 'Permission check rejected');
    req.systemErrorLogged = true;
    logService.fireAndForgetFromRequest(req, {
      level: 'warn',
      event: 'ACCESS_DENIED',
      message: 'Permission check rejected',
      emit: false,
      module: 'authorization',
      action: 'PERMISSION_CHECK',
      statusCode: 403,
      metadata: { permission },
    });
    return res.status(403).json({ success: false, error: 'Permission denied', permission });
  }
  if (env.LOG_RBAC_SUCCESS) logger.debug({
    event: 'rbac.access.granted',
    category: 'RBAC',
    requestId: req.id || req.headers['x-request-id'] || null,
    sessionId: req.authSessionId ? toLogId(req.authSessionId) : null,
    module: 'authorization',
    action: 'permission_check',
    status: 'success',
    userId: toLogId(req.user.id),
    role: req.user.role,
    permission,
  }, 'Permission check passed');
  return next();
};

module.exports = {
  requirePermission,
};
