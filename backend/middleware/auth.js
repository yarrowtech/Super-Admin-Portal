// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
      decoded = jwt.verify(token, process.env.JWT_SECRET);
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

    // 5. Attach user to request
    req.user = {
      id: user._id,
      _id: user._id, // keep _id for handlers that expect it
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department,
      isActive: user.isActive
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token expires in less than 24 hours
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn < 86400) { // Less than 24 hours
      // Generate new token
      const newToken = jwt.sign(
        {
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
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
  optionalAuth,
  authorizeOwnership,
  refreshToken
};
