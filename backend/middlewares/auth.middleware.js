const logger = require('../utils/logger');
const { setRequestContext } = require('../logger/context');
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/auth/User');
const Session = require('../models/auth/Session');
const PortalAccess = require('../models/superAdmin/PortalAccess');
const logService = require('../services/log.service');
const jwtConfig = require('../config/jwt');
const constants = require('../config/constants');
const { getRolePermissions } = require('../config/roles');

const DEFAULT_IT_MANAGER_PORTALS = new Set(['manager']);
const DEFAULT_IT_EMPLOYEE_PORTALS = new Set(['it']);
const DEFAULT_IT_HR_PORTALS = new Set(['hr']);
const DEFAULT_CEO_PORTALS = new Set(['ceo', 'media']);
const DEFAULT_EMPLOYEE_PORTAL_ROLES = new Set([
  'employee',
  'it_employee',
  'finance_employee',
  'law_employee',
]);

// Department-scoped roles no longer share a literal string with their portal
// (e.g. role 'it_manager' vs portal 'it'), unlike the old flat roles. This maps
// each new role to the portal it belongs to, for the same-role/portal fallback below.
const DEPARTMENT_ROLE_PORTAL = {
  it_manager: 'manager',
  it_admin: 'it',
  it_employee: 'it',
  it_hr: 'hr',
  finance_manager: 'finance',
  finance_employee: 'finance',
  media_head: 'media',
  media_sales: 'media',
  media_marketing: 'media',
  law_head: 'law',
  law_employee: 'law',
};

const normalizeProjectAssignments = (metadata = {}) => {
  const raw = metadata?.projectAssignments ?? metadata?.assignedProjects ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        const value = entry.trim();
        return value ? value : null;
      }
      if (!entry || typeof entry !== 'object') return null;

      const normalized = {
        projectId: typeof entry.projectId === 'string' ? entry.projectId.trim() : String(entry.projectId || '').trim(),
        projectCode: typeof entry.projectCode === 'string' ? entry.projectCode.trim() : '',
        projectName: typeof entry.projectName === 'string' ? entry.projectName.trim() : '',
      };

      const permissions = Array.isArray(entry.permissions)
        ? entry.permissions
            .map((permission) => (typeof permission === 'string' ? permission.trim() : ''))
            .filter(Boolean)
        : [];
      if (permissions.length > 0) normalized.permissions = permissions;

      const cleaned = Object.fromEntries(
        Object.entries(normalized).filter(([, value]) => Boolean(value))
      );
      return Object.keys(cleaned).length > 0 ? cleaned : null;
    })
    .filter(Boolean)
    .slice(0, 100);
};

const logAuthEvent = (req, level, status, message, extra = {}) => {
  const payload = {
    requestId: req.id || req.headers['x-request-id'] || null,
    module: 'authentication',
    action: 'authenticate',
    status,
    userId: req.user?.id || extra.userId || null,
    role: req.user?.role || extra.role || null,
    path: req.originalUrl,
    method: req.method,
    ...extra,
  };
  const targetLogger = req.log || logger;
  targetLogger[level]?.(payload, message);
  if (status !== 'success') {
    const isForbidden = Boolean(extra.accountStatus) || /inactive|restricted|deactivated|blocked|suspended/i.test(message);
    req.systemErrorLogged = true;
    logService.fireAndForgetFromRequest(req, {
      level: level === 'error' ? 'error' : 'warn',
      event: isForbidden ? 'ACCESS_DENIED' : 'AUTHENTICATE',
      message,
      emit: false,
      module: 'authentication',
      action: 'AUTHENTICATE',
      userId: payload.userId,
      role: payload.role,
      statusCode: isForbidden ? 403 : 401,
      metadata: {
        reason: extra.reason || status,
        path: req.originalUrl,
        method: req.method,
      },
    });
  } else {
    logService.fireAndForgetFromRequest(req, {
      level: 'info',
      event: 'AUTHENTICATE',
      message,
      emit: false,
      module: 'authentication',
      action: 'AUTHENTICATE',
      userId: payload.userId,
      role: payload.role,
      statusCode: 200,
      metadata: {
        status,
        path: req.originalUrl,
        method: req.method,
      },
    });
  }
};

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
      logAuthEvent(req, 'warn', 'failed', 'Authentication rejected: missing token');
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
        logAuthEvent(req, 'warn', 'failed', 'Authentication rejected: token expired');
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (err.name === 'JsonWebTokenError') {
        logAuthEvent(req, 'warn', 'failed', 'Authentication rejected: invalid token');
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
      logAuthEvent(req, 'warn', 'failed', 'Authentication rejected: user not found', { userId: decoded.userId || null });
      return res.status(401).json({
        success: false,
        error: 'User not found. Token invalid.',
        code: 'USER_NOT_FOUND'
      });
    }

    // 4. Check if user is active
    if (!user.isActive) {
      logAuthEvent(req, 'warn', 'failed', 'Authentication rejected: inactive account', { userId: user._id, role: user.role });
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (['suspended', 'blocked'].includes(user.accountStatus)) {
      logAuthEvent(req, 'warn', 'failed', 'Authentication rejected: restricted account', {
        userId: user._id,
        role: user.role,
        accountStatus: user.accountStatus,
      });
      return res.status(403).json({
        success: false,
        error: `Account is ${user.accountStatus}. Contact administrator.`,
        code: 'ACCOUNT_RESTRICTED'
      });
    }

    if (!decoded.jti) {
      logAuthEvent(req, 'warn', 'failed', 'Authentication rejected: missing session id', { userId: user._id, role: user.role });
      return res.status(401).json({
        success: false,
        error: 'Invalid session. Please login again.',
        code: 'SESSION_INVALID'
      });
    }

    const session = await Session.findOne({
      user: user._id,
      jti: decoded.jti,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).select('_id jti');

    if (!session) {
      logAuthEvent(req, 'warn', 'failed', 'Authentication rejected: invalid session', { userId: user._id, role: user.role });
      return res.status(401).json({
        success: false,
        error: 'Session expired or logged out. Please login again.',
        code: 'SESSION_INVALID'
      });
    }

    // 5. Attach user to request
    req.authTokenJti = decoded.jti || null;
    req.authSessionId = session._id;
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
      permissions: Array.from(new Set([
        ...(Array.isArray(user.permissions) ? user.permissions : []),
        ...getRolePermissions(user.role),
      ])),
      metadata: user.metadata || {},
      assignedProjects: normalizeProjectAssignments(user.metadata || {})
    };

    setRequestContext({
      userId: req.user.id,
      role: req.user.role,
      module: req.logContext?.module || 'authentication',
      status: 'authenticated',
    });
    if (req.log?.child) {
      req.log = req.log.child({ userId: req.user.id, role: req.user.role });
    }
    logAuthEvent(req, 'info', 'success', 'Authentication succeeded');

    next();
  } catch (error) {
    logger.error({
      err: error,
      requestId: req.id || req.headers['x-request-id'] || null,
      module: 'authentication',
      action: 'authenticate',
      status: 'error',
      path: req.originalUrl,
      method: req.method,
    }, 'Authentication error');
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
      logger.warn({
        requestId: req.id || req.headers['x-request-id'] || null,
        module: 'authorization',
        action: 'role_check',
        status: 'failed',
        path: req.originalUrl,
        method: req.method,
        requiredRoles: roles,
      }, 'Authorization rejected: unauthenticated request');
      req.systemErrorLogged = true;
      logService.fireAndForgetFromRequest(req, {
        level: 'warn',
        event: 'ACCESS_DENIED',
        message: 'Authorization rejected: unauthenticated request',
        emit: false,
        module: 'authorization',
        action: 'ROLE_CHECK',
        statusCode: 401,
        metadata: { requiredRoles: roles },
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn({
        requestId: req.id || req.headers['x-request-id'] || null,
        module: 'authorization',
        action: 'role_check',
        status: 'failed',
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: roles,
        path: req.originalUrl,
        method: req.method,
      }, 'Authorization rejected: role mismatch');
      req.systemErrorLogged = true;
      logService.fireAndForgetFromRequest(req, {
        level: 'warn',
        event: 'ACCESS_DENIED',
        message: 'Authorization rejected: role mismatch',
        emit: false,
        module: 'authorization',
        action: 'ROLE_CHECK',
        statusCode: 403,
        metadata: { requiredRoles: roles },
      });
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`,
        userRole: req.user.role,
        requiredRoles: roles,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    logger.debug({
      requestId: req.id || req.headers['x-request-id'] || null,
      module: 'authorization',
      action: 'role_check',
      status: 'success',
      userId: req.user.id,
      role: req.user.role,
      requiredRoles: roles,
    }, 'Authorization role check passed');
    logService.fireAndForgetFromRequest(req, {
      level: 'info',
      event: 'ACCESS_GRANTED',
      message: 'Authorization role check passed',
      emit: false,
      module: 'authorization',
      action: 'ROLE_CHECK',
      statusCode: 200,
      metadata: { requiredRoles: roles },
    });
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
        logger.warn({
          requestId: req.id || req.headers['x-request-id'] || null,
          module: 'authorization',
          action: 'portal_access',
          status: 'failed',
          portal,
          path: req.originalUrl,
          method: req.method,
        }, 'Portal access rejected: unauthenticated request');
        req.systemErrorLogged = true;
        logService.fireAndForgetFromRequest(req, {
          level: 'warn',
          event: 'ACCESS_DENIED',
          message: 'Portal access rejected: unauthenticated request',
          emit: false,
          module: 'authorization',
          action: 'PORTAL_ACCESS',
          statusCode: 401,
          metadata: { portal },
        });
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
      if (!rule && req.user.role === 'it_manager' && DEFAULT_IT_MANAGER_PORTALS.has(portal)) {
        return next();
      }
      if (!rule && req.user.role === 'it_employee' && DEFAULT_IT_EMPLOYEE_PORTALS.has(portal)) {
        return next();
      }
      if (!rule && portal === 'employee' && DEFAULT_EMPLOYEE_PORTAL_ROLES.has(req.user.role)) {
        return next();
      }
      if (!rule && req.user.role === 'it_hr' && DEFAULT_IT_HR_PORTALS.has(portal)) {
        return next();
      }
      if (!rule && req.user.role === 'ceo' && DEFAULT_CEO_PORTALS.has(portal)) {
        return next();
      }
      if (!rule && req.user.role === 'hr' && portal === 'admin') {
        return next();
      }
      // Fail-open for first-party same-role portal access when rule seeding is missing.
      // Explicit stored deny rules still take precedence.
      if (!rule && req.user.role === portal) return next();
      if (!rule && DEPARTMENT_ROLE_PORTAL[req.user.role] === portal) return next();
      if (!rule) {
        logger.warn({
          requestId: req.id || req.headers['x-request-id'] || null,
          module: 'authorization',
          action: 'portal_access',
          status: 'failed',
          userId: req.user.id,
          role: req.user.role,
          portal,
        }, 'Portal access rejected: rule missing');
        req.systemErrorLogged = true;
        logService.fireAndForgetFromRequest(req, {
          level: 'warn',
          event: 'ACCESS_DENIED',
          message: 'Portal access rejected: rule missing',
          emit: false,
          module: 'authorization',
          action: 'PORTAL_ACCESS',
          statusCode: 403,
          metadata: { portal },
        });
        return res.status(403).json({
          success: false,
          error: `No portal access rule found for role '${req.user.role}' and portal '${portal}'`,
          code: 'PORTAL_RULE_MISSING'
        });
      }

      if (!rule.canAccess) {
        logger.warn({
          requestId: req.id || req.headers['x-request-id'] || null,
          module: 'authorization',
          action: 'portal_access',
          status: 'failed',
          userId: req.user.id,
          role: req.user.role,
          portal,
        }, 'Portal access rejected: denied by rule');
        req.systemErrorLogged = true;
        logService.fireAndForgetFromRequest(req, {
          level: 'warn',
          event: 'ACCESS_DENIED',
          message: 'Portal access rejected: denied by rule',
          emit: false,
          module: 'authorization',
          action: 'PORTAL_ACCESS',
          statusCode: 403,
          metadata: { portal },
        });
        return res.status(403).json({
          success: false,
          error: `Access denied for portal '${portal}'`,
          code: 'PORTAL_ACCESS_DENIED'
        });
      }

      return next();
    } catch (error) {
      logger.error({
        err: error,
        requestId: req.id || req.headers['x-request-id'] || null,
        module: 'authorization',
        action: 'portal_access',
        status: 'error',
        userId: req.user?.id || null,
        role: req.user?.role || null,
        portal,
      }, 'Portal access authorization error');
      req.systemErrorLogged = true;
      logService.fireAndForgetFromRequest(req, {
        level: 'error',
        event: 'API_ERROR',
        message: 'Portal access verification failed',
        emit: false,
        module: 'authorization',
        action: 'PORTAL_ACCESS',
        statusCode: 500,
        metadata: { portal },
        error,
      });
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
          department: user.department,
          permissions: Array.from(new Set([
            ...(Array.isArray(user.permissions) ? user.permissions : []),
            ...getRolePermissions(user.role),
          ])),
          metadata: user.metadata || {},
          assignedProjects: normalizeProjectAssignments(user.metadata || {})
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
        { expiresIn: jwtConfig.accessExpiresIn, jwtid: decoded.jti || crypto.randomUUID() }
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
