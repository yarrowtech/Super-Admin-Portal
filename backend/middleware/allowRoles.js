// backend/middleware/allowRoles.js
const { ROLES, hasHigherOrEqualHierarchy, hasPermission } = require('../config/roles');

/**
 * Middleware factory to restrict access to specific roles
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 *
 * Usage: router.get('/admin-only', requireAuth, allowRoles(ROLES.ADMIN), controller)
 */
const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated (should be called after requireAuth)
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }

    const userRole = req.user.role;

    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden - ${userRole.toUpperCase()} role does not have access to this resource`,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

/**
 * Middleware to allow access based on minimum hierarchy level
 * @param {string} minimumRole - The minimum role required
 * @returns {Function} Express middleware function
 *
 * Usage: router.get('/ceo-and-above', requireAuth, allowMinimumRole(ROLES.CEO), controller)
 */
const allowMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!hasHigherOrEqualHierarchy(userRole, minimumRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden - Insufficient role hierarchy. Minimum required: ${minimumRole.toUpperCase()}`,
        userRole: userRole,
        minimumRole: minimumRole
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - The permission to check
 * @returns {Function} Express middleware function
 *
 * Usage: router.post('/budget', requireAuth, requirePermission('budget_management'), controller)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden - You do not have the required permission: ${permission}`,
        userRole: userRole,
        requiredPermission: permission
      });
    }

    next();
  };
};

/**
 * Middleware to allow ADMIN to bypass restrictions or specific roles
 * @param {...string} allowedRoles - Roles that are allowed (ADMIN is always allowed)
 * @returns {Function} Express middleware function
 */
const allowRolesOrAdmin = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }

    const userRole = req.user.role;

    // Allow if user is ADMIN or in allowed roles
    if (userRole === ROLES.ADMIN || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden - ${userRole.toUpperCase()} role does not have access to this resource`,
      requiredRoles: [...allowedRoles, ROLES.ADMIN]
    });
  };
};

module.exports = {
  allowRoles,
  allowMinimumRole,
  requirePermission,
  allowRolesOrAdmin
};
