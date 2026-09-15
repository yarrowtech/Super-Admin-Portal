const { hasPermission } = require('../config/roles');

// Permission checks for the centralized policy domain. Super Admin remains the
// break-glass owner; all other access is granted by an explicit role/user permission.
const requirePolicyPermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' });
  const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (req.user.role === 'super_admin' || permissions.includes(permission) || hasPermission(req.user.role, permission)) return next();
  return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Policy permission denied' });
};
module.exports = { requirePolicyPermission };
