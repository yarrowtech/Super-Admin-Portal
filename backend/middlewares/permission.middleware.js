const { hasPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    logger.warn({
      requestId: req.id || req.headers['x-request-id'] || null,
      module: 'authorization',
      action: 'permission_check',
      status: 'failed',
      permission,
      path: req.originalUrl,
      method: req.method,
    }, 'Permission check rejected: unauthenticated request');
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (!hasPermission(req.user.role, permission) && !userPermissions.includes(permission)) {
    logger.warn({
      requestId: req.id || req.headers['x-request-id'] || null,
      module: 'authorization',
      action: 'permission_check',
      status: 'failed',
      userId: req.user.id,
      role: req.user.role,
      permission,
      path: req.originalUrl,
      method: req.method,
    }, 'Permission check rejected');
    return res.status(403).json({ success: false, error: 'Permission denied', permission });
  }
  logger.debug({
    requestId: req.id || req.headers['x-request-id'] || null,
    module: 'authorization',
    action: 'permission_check',
    status: 'success',
    userId: req.user.id,
    role: req.user.role,
    permission,
  }, 'Permission check passed');
  return next();
};

module.exports = {
  requirePermission,
};
