const { hasPermission } = require('../utils/permissions');

const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (!hasPermission(req.user.role, permission) && !userPermissions.includes(permission)) {
    return res.status(403).json({ success: false, error: 'Permission denied', permission });
  }
  return next();
};

module.exports = {
  requirePermission,
};
