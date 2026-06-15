const logger = require('../utils/logger');

const auditMiddleware = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        userId: req.user?.id || null,
        durationMs: Date.now() - startedAt,
      },
      'Audit trail'
    );
  });
  next();
};

module.exports = auditMiddleware;
