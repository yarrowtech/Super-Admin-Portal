const logger = require('../utils/logger');
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/auth/User');
const PortalAccess = require('../models/superAdmin/PortalAccess');
const jwtConfig = require('../config/jwt');
const constants = require('../config/constants');

const DEFAULT_MANAGER_PORTALS = new Set(['manager', 'admin', 'hr', 'it', 'law', 'employee']);
const DEFAULT_IT_PORTALS = new Set(['it', 'admin', 'hr', 'law', 'employee', 'manager']);

/**
 * Universal JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 * Works for all roles
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Extract token from header
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided. Please login.'
      });
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.accessSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please login again.',
          code: 'INVALID_TOKEN'
        });
      }
      throw err;
    }

    // 3. Find user from token
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Token invalid.',
        code: 'USER_NOT_FOUND'
      });
    }

    // 4. Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (['suspended', 'blocked'].includes(user.accountStatus)) {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.accountStatus}. Contact administrator.`,
        code: 'ACCOUNT_RESTRICTED'
      });
    }

    // 5. Attach user to request
    req.user = {
      id: user._id,
      _id: user._id, // keep _id for handlers that expect it
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department,
      isActive: user.isActive,
      accountStatus: user.accountStatus,
      permissions: user.permissions || []
    };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Authentication error');
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based Authorization Middleware Factory
 * Usage: authorize('admin', 'ceo')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`,
        userRole: req.user.role,
        requiredRoles: roles,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Portal access authorization based on Super Admin portal-access rules.
 * Usage: router.use(authorizePortalAccess('admin'))
 */
const authorizePortalAccess = (portal) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const rule = await PortalAccess.findOne({
        role: req.user.role,
        portal
      }).select('canAccess');

      if (!rule && req.user.role === 'admin') return next();
      if (!rule && req.user.role === 'manager' && DEFAULT_MANAGER_PORTALS.has(portal)) {
        return next();
      }
      if (!rule && req.user.role === 'it' && DEFAULT_IT_PORTALS.has(portal)) {
        return next();
      }
      // Fail-open for first-party same-role portal access when rule seeding is missing.
      // Explicit stored deny rules still take precedence.
      if (!rule && req.user.role === portal) return next();
      if (!rule) {
        return res.status(403).json({
          success: false,
          error: `No portal access rule found for role '${req.user.role}' and portal '${portal}'`,
          code: 'PORTAL_RULE_MISSING'
        });
      }

      if (!rule.canAccess) {
        return res.status(403).json({
          success: false,
          error: `Access denied for portal '${portal}'`,
          code: 'PORTAL_ACCESS_DENIED'
        });
      }

      return next();
    } catch (error) {
      logger.error({ err: error, portal }, 'Portal access authorization error');
      return res.status(500).json({
        success: false,
        error: 'Portal access verification failed',
        code: 'PORTAL_ACCESS_ERROR'
      });
    }
  };
};

/**
 * Optional Authentication
 * Attaches user if token exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(); // Continue without authentication
    }

    try {
      const decoded = jwt.verify(token, jwtConfig.accessSecret);
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive) {
        req.user = {
          id: user._id,
          _id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department
        };
      }
    } catch (err) {
      // Silently fail for optional auth
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Check if user owns the resource
 * Usage: authorizeOwnership('userId')
 */
const authorizeOwnership = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const resourceId = req.params[paramName];
    const userId = req.user.id.toString();

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership
    if (resourceId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.',
        code: 'NOT_OWNER'
      });
    }

    next();
  };
};

/**
 * Refresh token if it's about to expire
 * Usage: refreshToken (as middleware)
 */
const refreshToken = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.accessSecret);

    // Check if token expires in less than 24 hours
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn < constants.TOKEN_RENEWAL_THRESHOLD_SECONDS) {
      // Generate new token
      const newToken = jwt.sign(
        {
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role
        },
        jwtConfig.accessSecret,
        { expiresIn: jwtConfig.accessExpiresIn }
      );

      // Send new token in response header
      res.setHeader('X-New-Token', newToken);
    }

    next();
  } catch (error) {
    next(); // Continue even if refresh fails
  }
};

module.exports = {
  authenticate,
  authorize,
  authorizePortalAccess,
  optionalAuth,
  authorizeOwnership,
  refreshToken
};
