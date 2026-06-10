const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const User = require('../../models/auth/User');
const Session = require('../../models/auth/Session');
const Token = require('../../models/auth/Token');
const ActivityLog = require('../../models/auth/ActivityLog');
const SystemHealth = require('../../models/superAdmin/SystemHealth');
const PortalAccess = require('../../models/superAdmin/PortalAccess');
const OutsourcingFreelancer = require('../../models/outsourcing/OutsourcingFreelancer');

const SUPER_ADMIN_PORTAL = 'super-admin';
const PACKAGE_VERSION = (() => {
  try {
    return require('../../../package.json').version || '0.0.0';
  } catch (error) {
    return '0.0.0';
  }
})();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const REPLAY_EVENT_TYPES = ['TOKEN_REPLAY_ATTEMPT', 'TOKEN_VERIFY_FAILED'];
const LOGIN_FAILURE_EVENT_TYPES = ['AUTH_LOGIN_FAILED', 'LOGIN_FAILED', 'INVALID_CREDENTIALS', 'TOKEN_INVALID', 'TOKEN_EXPIRED'];
const SECURITY_EVENT_TYPES = [
  'ADMIN_USER_UPDATED',
  'ADMIN_ROLE_CHANGED',
  'ADMIN_ACCESS_STATUS_CHANGED',
  'SESSION_REVOKED',
  'TOKEN_VERIFY_FAILED',
  'TOKEN_REPLAY_ATTEMPT',
  'USER_SYNCED',
  'ROLE_SYNC',
  'PERMISSION_SYNC',
  'ACCESS_DENIED',
];

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parseIntSafe = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeStr = (value) => String(value || '').trim();
const normalizeLower = (value) => normalizeStr(value).toLowerCase();
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || '').trim());

const buildMeta = () => ({
  environment: process.env.NODE_ENV || 'development',
  version: PACKAGE_VERSION,
  nodeVersion: process.version,
});

const sendSuccess = (res, data, status = 200, message = 'OK') =>
  res.status(status).json({ success: true, message, data });
const sendError = (res, status, error, details = undefined, extra = {}) =>
  res.status(status).json({ success: false, message: error, error, ...(details ? { details } : {}), ...extra });

const paginate = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

const pickMetadata = (metadata = {}) => {
  const src = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    designation: normalizeStr(src.designation),
    employeeCode: normalizeStr(src.employeeCode),
    vendorCode: normalizeStr(src.vendorCode),
    projectCode: normalizeStr(src.projectCode),
    syncSource: normalizeStr(src.syncSource),
    outsourcing: src.outsourcing && typeof src.outsourcing === 'object' ? src.outsourcing : {},
    superAdmin: src.superAdmin && typeof src.superAdmin === 'object' ? src.superAdmin : {},
  };
};

const getContext = (req) => ({
  ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
  userAgent: req.get('user-agent') || '',
});

const buildUserView = (user = {}, extras = {}) => {
  const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  const cleanedMetadata = pickMetadata(metadata);
  const accountStatus = user.accountStatus || (user.isActive ? 'active' : 'inactive');
  return {
    _id: user._id,
    id: user._id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone || '',
    department: user.department || '',
    designation: extras.designation || cleanedMetadata.designation || '',
    employeeCode: extras.employeeCode || cleanedMetadata.employeeCode || '',
    vendorCode: extras.vendorCode || cleanedMetadata.vendorCode || '',
    externalStatus: extras.externalStatus || cleanedMetadata.externalStatus || '',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    isActive: Boolean(user.isActive),
    accountStatus,
    emailVerified: Boolean(user.emailVerified),
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    metadata: {
      ...metadata,
      ...cleanedMetadata,
      superAdmin: {
        ...cleanedMetadata.superAdmin,
        accessStatus: accountStatus,
      },
    },
    flags: {
      active: Boolean(user.isActive),
      suspended: ['suspended', 'blocked'].includes(accountStatus),
      verified: Boolean(user.emailVerified),
    },
    ...extras,
  };
};

const buildSessionView = (session = {}, user = null) => {
  const ua = normalizeStr(session.userAgent);
  const browser = ua.includes('Chrome')
    ? 'Chrome'
    : ua.includes('Firefox')
      ? 'Firefox'
      : ua.includes('Safari')
        ? 'Safari'
        : ua.includes('Edge')
          ? 'Edge'
          : 'Unknown';
  const device = /mobile|android|iphone|ipad|tablet/i.test(ua) ? 'Mobile' : 'Desktop';
  const isRevoked = Boolean(session.revokedAt);
  const isExpired = session.expiresAt ? new Date(session.expiresAt).getTime() <= Date.now() : false;
  const status = isRevoked ? 'revoked' : isExpired ? 'expired' : 'active';
  return {
    _id: session._id,
    sessionId: session._id,
    userId: user?._id || session.user?._id || session.user || null,
    user: user ? buildUserView(user) : null,
    loginSource: normalizeStr(session.loginSource || user?.metadata?.loginSource || user?.metadata?.source || 'password'),
    portal: normalizeStr(session.portal || user?.metadata?.portal || SUPER_ADMIN_PORTAL),
    ipAddress: session.ipAddress || '',
    device,
    browser,
    userAgent: session.userAgent || '',
    loginTime: session.createdAt || null,
    lastActivityAt: session.lastUsedAt || session.updatedAt || session.createdAt || null,
    expiresAt: session.expiresAt || null,
    revokedAt: session.revokedAt || null,
    status,
    jti: session.jti || '',
  };
};

const buildAuditView = (entry = {}) => {
  const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
  return {
    _id: entry._id,
    eventType: normalizeStr(metadata.eventType || entry.action),
    portal: normalizeStr(metadata.portal || SUPER_ADMIN_PORTAL),
    projectCode: normalizeStr(metadata.projectCode || ''),
    userId: normalizeStr(metadata.userId || entry.user || ''),
    employeeCode: normalizeStr(metadata.employeeCode || ''),
    role: normalizeStr(metadata.role || ''),
    sessionId: normalizeStr(metadata.sessionId || ''),
    jti: normalizeStr(metadata.jti || ''),
    ipAddress: normalizeStr(metadata.ipAddress || entry.ipAddress || ''),
    userAgent: normalizeStr(metadata.userAgent || entry.userAgent || ''),
    status: normalizeStr(metadata.status || 'success'),
    message: normalizeStr(metadata.message || ''),
    timestamp: entry.createdAt || metadata.timestamp || null,
    actor: entry.actor || null,
    user: entry.user || null,
    action: entry.action,
    module: entry.module,
    metadata,
  };
};

const audit = async (req, { eventType, user = null, status = 'success', message = '', sessionId = '', jti = '', metadata = {} }) => {
  const ctx = getContext(req);
  const targetUserId = user?._id?.toString?.() || metadata.userId || '';
  const role = user?.role || metadata.role || '';
  const employeeCode = user?.metadata?.employeeCode || metadata.employeeCode || '';
  const projectCode = user?.metadata?.projectCode || metadata.projectCode || '';
  const resolvedJti = jti || req.authTokenJti || metadata.jti || '';

  await ActivityLog.create({
    actor: req.user?._id || req.user?.id || null,
    user: user?._id || null,
    action: eventType,
    module: SUPER_ADMIN_PORTAL,
    targetType: 'User',
    targetId: targetUserId,
    metadata: {
      eventType,
      portal: SUPER_ADMIN_PORTAL,
      projectCode,
      userId: targetUserId,
      employeeCode,
      role,
      sessionId,
      jti: resolvedJti,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      status,
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
};

const buildUserQuery = (req) => {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search,
    role,
    department,
    designation,
    employeeCode,
    vendorCode,
    accountStatus,
    isActive,
    status,
    externalAccount,
  } = req.query || {};

  const safePage = Math.max(parseIntSafe(page, DEFAULT_PAGE), 1);
  const safeLimit = Math.min(Math.max(parseIntSafe(limit, DEFAULT_LIMIT), 1), MAX_LIMIT);
  const query = {};

  if (role) query.role = normalizeLower(role);
  if (department) query.department = { $regex: escapeRegex(department), $options: 'i' };
  if (designation) query['metadata.designation'] = { $regex: escapeRegex(designation), $options: 'i' };
  if (employeeCode) query['metadata.employeeCode'] = { $regex: escapeRegex(employeeCode), $options: 'i' };
  if (vendorCode) query['metadata.vendorCode'] = { $regex: escapeRegex(vendorCode), $options: 'i' };
  if (accountStatus) query.accountStatus = normalizeLower(accountStatus);
  if (isActive !== undefined && isActive !== '') query.isActive = String(isActive).toLowerCase() === 'true';
  if (status) {
    const normalized = normalizeLower(status);
    if (normalized === 'active') query.isActive = true;
    if (normalized === 'inactive') query.isActive = false;
    if (normalized === 'suspended' || normalized === 'blocked') query.accountStatus = normalized;
  }
  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
      { department: { $regex: escaped, $options: 'i' } },
      { 'metadata.designation': { $regex: escaped, $options: 'i' } },
      { 'metadata.employeeCode': { $regex: escaped, $options: 'i' } },
      { 'metadata.vendorCode': { $regex: escaped, $options: 'i' } },
    ];
  }

  return { query, safePage, safeLimit, externalAccount };
};

exports.getOverview = async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalSessions, activeSessions, totalAudits, totalPortalRules, totalHealth, outsourcingLinks] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Session.countDocuments(),
      Session.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }),
      ActivityLog.countDocuments({ module: SUPER_ADMIN_PORTAL }),
      PortalAccess.countDocuments(),
      SystemHealth.countDocuments(),
      OutsourcingFreelancer.countDocuments(),
    ]);

    const recentAudit = await ActivityLog.find({ module: SUPER_ADMIN_PORTAL }).sort({ createdAt: -1 }).limit(5).lean();

    return sendSuccess(res, {
      summary: {
        totalUsers,
        activeUsers,
        totalSessions,
        activeSessions,
        totalAudits,
        portalRules: totalPortalRules,
        healthSnapshots: totalHealth,
        outsourcingLinks,
      },
      recentAudit: recentAudit.map(buildAuditView),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Super-admin overview error');
    return sendError(res, 500, 'Failed to fetch overview', error.message);
  }
};

exports.getMetrics = async (req, res) => {
  try {
    const [usersByRole, usersByStatus, sessionsByStatus, auditsByEvent] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      User.aggregate([{ $group: { _id: '$accountStatus', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Session.aggregate([
        {
          $project: {
            status: {
              $switch: {
                branches: [
                  { case: { $ne: ['$revokedAt', null] }, then: 'revoked' },
                  { case: { $lte: ['$expiresAt', new Date()] }, then: 'expired' },
                ],
                default: 'active',
              },
            },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ActivityLog.aggregate([{ $match: { module: SUPER_ADMIN_PORTAL } }, { $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);

    return sendSuccess(res, {
      usersByRole,
      usersByStatus,
      sessionsByStatus,
      auditsByEvent,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Super-admin metrics error');
    return sendError(res, 500, 'Failed to fetch metrics', error.message);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { query, safePage, safeLimit, externalAccount } = buildUserQuery(req);
    if (externalAccount !== undefined && externalAccount !== '') {
      const linkedUserIds = await OutsourcingFreelancer.distinct('user');
      const isExternal = String(externalAccount).toLowerCase() === 'true';
      query._id = isExternal ? { $in: linkedUserIds } : { $nin: linkedUserIds };
    }

    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      User.countDocuments(query),
    ]);

    const userIds = users.map((item) => item._id);
    const [sessionCounts, lastSessions, outsourcingLinks] = await Promise.all([
      Session.aggregate([
        { $match: { user: { $in: userIds } } },
        {
          $group: {
            _id: '$user',
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$revokedAt', null] }, { $gt: ['$expiresAt', new Date()] }] },
                  1,
                  0,
                ],
              },
            },
            lastUsedAt: { $max: '$lastUsedAt' },
          },
        },
      ]),
      Session.aggregate([
        { $match: { user: { $in: userIds } } },
        { $sort: { lastUsedAt: -1 } },
        { $group: { _id: '$user', lastUsedAt: { $first: '$lastUsedAt' }, loginAt: { $first: '$createdAt' } } },
      ]),
      OutsourcingFreelancer.find({ user: { $in: userIds } }).select('user freelancerId contactEmail contactPhone status accessLevel lawValidated domain skills').lean(),
    ]);

    const sessionCountMap = new Map(sessionCounts.map((item) => [String(item._id), item]));
    const lastSessionMap = new Map(lastSessions.map((item) => [String(item._id), item]));
    const linkMap = new Map(outsourcingLinks.map((item) => [String(item.user), item]));

    const items = users.map((user) => {
      const link = linkMap.get(String(user._id));
      const userSessions = sessionCountMap.get(String(user._id)) || {};
      const lastSession = lastSessionMap.get(String(user._id)) || {};
      const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
      const linkedStatus = link ? link.status : metadata.externalStatus || '';
      return buildUserView(user, {
        outsourcing: link || null,
        sessionCount: userSessions.total || 0,
        activeSessionCount: userSessions.active || 0,
        lastSessionAt: lastSession.lastUsedAt || null,
        designation: metadata.designation || '',
        employeeCode: metadata.employeeCode || '',
        vendorCode: metadata.vendorCode || '',
        externalStatus: linkedStatus,
      });
    });

    return sendSuccess(res, {
      items,
      pagination: paginate(safePage, safeLimit, total),
      filters: req.query || {},
    }, 200, 'Users fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin list users error');
    return sendError(res, 500, 'Failed to fetch users', error.message);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isObjectId(userId)) {
      return sendError(res, 400, 'Invalid userId');
    }

    const [user, sessions, audits, outsourcingLink] = await Promise.all([
      User.findById(userId).select('-password').lean(),
      Session.find({ user: userId }).sort({ lastUsedAt: -1 }).lean(),
      ActivityLog.find({ $or: [{ user: userId }, { actor: userId }] }).sort({ createdAt: -1 }).limit(50).lean(),
      OutsourcingFreelancer.findOne({ user: userId }).lean(),
    ]);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, {
      user: buildUserView(user, { outsourcing: outsourcingLink || null }),
      sessions: sessions.map((session) => buildSessionView(session, user)),
      auditHistory: audits.map(buildAuditView),
      outsourcingLink: outsourcingLink || null,
    }, 200, 'User details fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin user detail error');
    return sendError(res, 500, 'Failed to fetch user detail', error.message);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isObjectId(userId)) {
      return sendError(res, 400, 'Invalid userId');
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const before = user.toObject();
    const body = req.body || {};
    const metadata = user.metadata && typeof user.metadata === 'object' ? { ...user.metadata } : {};
    const nextMetadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (body.name !== undefined) {
      const name = normalizeStr(body.name);
      if (name) {
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
          user.firstName = parts[0];
        } else {
          user.firstName = parts.shift();
          user.lastName = parts.join(' ');
        }
      }
    }
    if (body.firstName !== undefined) user.firstName = normalizeStr(body.firstName) || user.firstName;
    if (body.lastName !== undefined) user.lastName = normalizeStr(body.lastName) || user.lastName;
    if (body.email !== undefined) {
      const nextEmail = normalizeLower(body.email);
      if (nextEmail) {
        const emailExists = await User.findOne({ email: nextEmail, _id: { $ne: userId } }).lean();
        if (emailExists) {
          return sendError(res, 409, 'Email already exists');
        }
        user.email = nextEmail;
      }
    }
    if (body.phone !== undefined) user.phone = normalizeStr(body.phone);
    if (body.department !== undefined) user.department = normalizeStr(body.department);
    if (body.role !== undefined) user.role = normalizeLower(body.role);
    if (body.permissions !== undefined) {
      if (!Array.isArray(body.permissions)) {
        return sendError(res, 400, 'permissions must be an array');
      }
      user.permissions = Array.from(new Set(body.permissions.map((item) => normalizeStr(item)).filter(Boolean)));
    }
    if (body.designation !== undefined) metadata.designation = normalizeStr(body.designation);
    if (body.employeeCode !== undefined) metadata.employeeCode = normalizeStr(body.employeeCode);
    if (body.vendorCode !== undefined) metadata.vendorCode = normalizeStr(body.vendorCode);
    if (body.externalStatus !== undefined) metadata.externalStatus = normalizeStr(body.externalStatus);
    if (body.accountStatus !== undefined) {
      const allowed = ['active', 'inactive', 'suspended', 'blocked', 'pending_verification'];
      const selected = normalizeLower(body.accountStatus);
      if (!allowed.includes(selected)) {
        return sendError(res, 400, `Invalid accountStatus. Valid statuses are: ${allowed.join(', ')}`);
      }
      user.accountStatus = selected;
      user.isActive = selected === 'active';
    } else if (body.isActive !== undefined) {
      user.isActive = Boolean(body.isActive);
      user.accountStatus = user.isActive ? 'active' : 'inactive';
    }

    const mergeMeta = (key, value) => {
      if (value === undefined) return;
      if (value === null || (typeof value === 'string' && value.trim() === '')) {
        delete metadata[key];
        return;
      }
      metadata[key] = value;
    };

    mergeMeta('designation', nextMetadata.designation !== undefined ? normalizeStr(nextMetadata.designation) : body.designation);
    mergeMeta('employeeCode', nextMetadata.employeeCode !== undefined ? normalizeStr(nextMetadata.employeeCode) : body.employeeCode);
    mergeMeta('vendorCode', nextMetadata.vendorCode !== undefined ? normalizeStr(nextMetadata.vendorCode) : body.vendorCode);
    mergeMeta('externalStatus', nextMetadata.externalStatus !== undefined ? normalizeStr(nextMetadata.externalStatus) : body.externalStatus);
    mergeMeta('projectCode', nextMetadata.projectCode !== undefined ? normalizeStr(nextMetadata.projectCode) : body.projectCode);
    metadata.superAdmin = {
      ...(metadata.superAdmin && typeof metadata.superAdmin === 'object' ? metadata.superAdmin : {}),
      accessStatus: user.accountStatus,
      lastUpdatedBy: req.user?.id || null,
      lastUpdatedAt: new Date().toISOString(),
    };
    if (body.metadata && typeof body.metadata === 'object') {
      Object.entries(body.metadata).forEach(([key, value]) => {
        if (['designation', 'employeeCode', 'vendorCode', 'projectCode', 'superAdmin'].includes(key)) return;
        if (value === undefined) return;
        metadata[key] = value;
      });
    }

    user.metadata = metadata;
    user.markModified('metadata');
    await user.save();

    const sessionsShouldBeRevoked = before.role !== user.role || before.accountStatus !== user.accountStatus || before.isActive !== user.isActive;
    if (sessionsShouldBeRevoked) {
      const now = new Date();
      await Session.updateMany(
        { user: user._id, revokedAt: null },
        { $set: { revokedAt: now, lastUsedAt: now } }
      );
    }

    const changedRole = before.role !== user.role;
    const changedStatus = before.accountStatus !== user.accountStatus || before.isActive !== user.isActive;
    const eventType = changedRole ? 'ADMIN_ROLE_CHANGED' : changedStatus ? 'ADMIN_ACCESS_STATUS_CHANGED' : 'ADMIN_USER_UPDATED';

    await audit(req, {
      eventType,
      user,
      status: 'success',
      message: changedRole
        ? `Role updated from ${before.role} to ${user.role}`
        : changedStatus
          ? `Access status updated to ${user.accountStatus}`
          : 'User profile updated',
      metadata: {
        previousRole: before.role,
        nextRole: user.role,
        previousAccountStatus: before.accountStatus,
        nextAccountStatus: user.accountStatus,
      },
    });

    return sendSuccess(res, {
      user: buildUserView(user),
      revokedSessionsImmediately: sessionsShouldBeRevoked,
    }, 200, 'User updated successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin update user error');
    return sendError(res, 500, 'Failed to update user', error.message);
  }
};

exports.syncUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isObjectId(userId)) {
      return sendError(res, 400, 'Invalid userId');
    }

    const [user, outsourcingLink] = await Promise.all([
      User.findById(userId),
      OutsourcingFreelancer.findOne({ user: userId }).lean(),
    ]);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (!outsourcingLink) {
      return sendError(res, 404, 'No linked outsourcing profile found for this user');
    }

    const metadata = user.metadata && typeof user.metadata === 'object' ? { ...user.metadata } : {};
    metadata.outsourcing = {
      freelancerId: outsourcingLink.freelancerId,
      contactEmail: outsourcingLink.contactEmail,
      contactPhone: outsourcingLink.contactPhone || '',
      skills: outsourcingLink.skills || [],
      domain: outsourcingLink.domain || '',
      accessLevel: outsourcingLink.accessLevel || '',
      status: outsourcingLink.status || '',
      lawValidated: Boolean(outsourcingLink.lawValidated),
      syncedAt: new Date().toISOString(),
      source: 'outsourcing',
    };
    metadata.syncSource = 'outsourcing';
    metadata.syncStatus = 'synced';
    metadata.superAdmin = {
      ...(metadata.superAdmin && typeof metadata.superAdmin === 'object' ? metadata.superAdmin : {}),
      lastSyncedAt: new Date().toISOString(),
      lastSyncedBy: req.user?.id || null,
    };

    user.metadata = metadata;
    user.markModified('metadata');
    await user.save();

    await audit(req, {
      eventType: 'USER_SYNCED',
      user,
      status: 'success',
      message: 'Outsourcing profile synced into super-admin portal',
      metadata: {
        outsourcingFreelancerId: outsourcingLink.freelancerId,
      },
    });

    return sendSuccess(res, {
      user: buildUserView(user, { outsourcing: outsourcingLink }),
      outsourcingLink,
    }, 200, 'User synced successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin sync user error');
    return sendError(res, 500, 'Failed to sync user', error.message);
  }
};

exports.getSessions = async (req, res) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, userId, status, portal, search } = req.query || {};
    const safePage = Math.max(parseIntSafe(page, DEFAULT_PAGE), 1);
    const safeLimit = Math.min(Math.max(parseIntSafe(limit, DEFAULT_LIMIT), 1), MAX_LIMIT);
    const query = {};
    if (userId && isObjectId(userId)) query.user = userId;
    if (status) {
      const normalized = normalizeLower(status);
      if (normalized === 'active') query.revokedAt = null;
      if (normalized === 'revoked') query.revokedAt = { $ne: null };
      if (normalized === 'expired') query.expiresAt = { $lte: new Date() };
    }
    if (portal) query.portal = normalizeLower(portal);
    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { ipAddress: { $regex: escaped, $options: 'i' } },
        { userAgent: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .sort({ lastUsedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('user', 'firstName lastName email role department accountStatus isActive metadata lastLogin')
        .lean(),
      Session.countDocuments(query),
    ]);

    const items = sessions
      .map((session) => buildSessionView(session, session.user))
      .filter((item) => {
        if (!portal) return true;
        return normalizeLower(item.portal) === normalizeLower(portal);
      });

    return sendSuccess(res, {
      items,
      pagination: paginate(safePage, safeLimit, total),
      filters: req.query || {},
    }, 200, 'Sessions fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin list sessions error');
    return sendError(res, 500, 'Failed to fetch sessions', error.message);
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isObjectId(userId)) {
      return sendError(res, 400, 'Invalid userId');
    }

    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const sessions = await Session.find({ user: userId }).sort({ lastUsedAt: -1 }).lean();
    return sendSuccess(res, {
      user: buildUserView(user),
      items: sessions.map((session) => buildSessionView(session, user)),
      total: sessions.length,
    }, 200, 'User sessions fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin user sessions error');
    return sendError(res, 500, 'Failed to fetch user sessions', error.message);
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const { sessionId, userId } = req.body || {};
    if (!sessionId || !isObjectId(sessionId)) {
      return sendError(res, 400, 'sessionId is required');
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return sendError(res, 404, 'Session not found');
    }

    if (userId && isObjectId(userId) && String(session.user) !== String(userId)) {
      return sendError(res, 400, 'sessionId does not belong to the provided userId');
    }

    session.revokedAt = new Date();
    session.lastUsedAt = new Date();
    await session.save();

    const user = await User.findById(session.user).select('-password').lean();
    await audit(req, {
      eventType: 'SESSION_REVOKED',
      user,
      status: 'success',
      message: 'Single session revoked',
      sessionId: session._id.toString(),
    });

    return sendSuccess(res, {
      session: buildSessionView(session, user),
    }, 200, 'Session revoked successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin revoke session error');
    return sendError(res, 500, 'Failed to revoke session', error.message);
  }
};

exports.revokeAllSessions = async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId || !isObjectId(userId)) {
      return sendError(res, 400, 'userId is required');
    }

    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const now = new Date();
    const [sessionsUpdate, tokensUpdate] = await Promise.all([
      Session.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: now, lastUsedAt: now } }),
      Token.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: now } }),
    ]);

    await audit(req, {
      eventType: 'SESSION_REVOKED',
      user,
      status: 'success',
      message: 'All sessions revoked for user',
      metadata: {
        scope: 'all',
        revokedSessions: sessionsUpdate.modifiedCount || 0,
        revokedTokens: tokensUpdate.modifiedCount || 0,
      },
    });

    return sendSuccess(res, {
      user: buildUserView(user),
      revokedSessions: sessionsUpdate.modifiedCount || 0,
      revokedTokens: tokensUpdate.modifiedCount || 0,
    }, 200, 'All sessions revoked successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin revoke all sessions error');
    return sendError(res, 500, 'Failed to revoke sessions', error.message);
  }
};

exports.getActiveSessionCount = async (req, res) => {
  try {
    const count = await Session.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } });
    return sendSuccess(res, { count, activeCount: count }, 200, 'Active session count fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin active session count error');
    return sendError(res, 500, 'Failed to fetch active session count', error.message);
  }
};

const buildAuditQuery = (req) => {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    from,
    to,
    eventType,
    portal,
    role,
    status,
    userId,
    search,
  } = req.query || {};

  const safePage = Math.max(parseIntSafe(page, DEFAULT_PAGE), 1);
  const safeLimit = Math.min(Math.max(parseIntSafe(limit, DEFAULT_LIMIT), 1), MAX_LIMIT);
  const query = {};
  const filters = [];

  if (eventType) filters.push({ action: normalizeStr(eventType) });
  if (portal) filters.push({ 'metadata.portal': normalizeLower(portal) });
  if (role) filters.push({ 'metadata.role': normalizeLower(role) });
  if (status) filters.push({ 'metadata.status': normalizeLower(status) });
  if (userId && isObjectId(userId)) filters.push({ user: userId });
  if (search) {
    const escaped = escapeRegex(search);
    filters.push({
      $or: [
        { action: { $regex: escaped, $options: 'i' } },
        { 'metadata.message': { $regex: escaped, $options: 'i' } },
        { 'metadata.employeeCode': { $regex: escaped, $options: 'i' } },
        { 'metadata.projectCode': { $regex: escaped, $options: 'i' } },
      ],
    });
  }
  if (filters.length > 0) query.$and = filters;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  return { query, safePage, safeLimit };
};

exports.getAudit = async (req, res) => {
  try {
    const { query, safePage, safeLimit } = buildAuditQuery(req);
    const [items, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      ActivityLog.countDocuments(query),
    ]);

    return sendSuccess(res, {
      items: items.map(buildAuditView),
      pagination: paginate(safePage, safeLimit, total),
      filters: req.query || {},
    }, 200, 'Audit logs fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin audit error');
    return sendError(res, 500, 'Failed to fetch audit logs', error.message);
  }
};

exports.getSecurityEvents = async (req, res) => {
  try {
    const { query, safePage, safeLimit } = buildAuditQuery(req);
    query.$and = query.$and ? [...query.$and, { action: { $in: SECURITY_EVENT_TYPES } }] : [{ action: { $in: SECURITY_EVENT_TYPES } }];
    const [items, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      ActivityLog.countDocuments(query),
    ]);

    return sendSuccess(res, {
      items: items.map(buildAuditView),
      pagination: paginate(safePage, safeLimit, total),
      filters: req.query || {},
    }, 200, 'Security events fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin security events error');
    return sendError(res, 500, 'Failed to fetch security events', error.message);
  }
};

exports.getReplayAttempts = async (req, res) => {
  try {
    const { query, safePage, safeLimit } = buildAuditQuery(req);
    query.$and = query.$and ? [...query.$and, { action: { $in: REPLAY_EVENT_TYPES } }] : [{ action: { $in: REPLAY_EVENT_TYPES } }];
    const [items, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      ActivityLog.countDocuments(query),
    ]);

    return sendSuccess(res, {
      items: items.map(buildAuditView),
      pagination: paginate(safePage, safeLimit, total),
      filters: req.query || {},
    }, 200, 'Replay attempts fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin replay attempts error');
    return sendError(res, 500, 'Failed to fetch replay attempts', error.message);
  }
};

exports.getFailedLogins = async (req, res) => {
  try {
    const { query, safePage, safeLimit } = buildAuditQuery(req);
    query.$and = query.$and ? [...query.$and, { action: { $in: LOGIN_FAILURE_EVENT_TYPES } }] : [{ action: { $in: LOGIN_FAILURE_EVENT_TYPES } }];
    const [items, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      ActivityLog.countDocuments(query),
    ]);

    return sendSuccess(res, {
      items: items.map(buildAuditView),
      pagination: paginate(safePage, safeLimit, total),
      filters: req.query || {},
    }, 200, 'Failed logins fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin failed logins error');
    return sendError(res, 500, 'Failed to fetch failed login attempts', error.message);
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query || {};
    const safePage = Math.max(parseIntSafe(page, DEFAULT_PAGE), 1);
    const safeLimit = Math.min(Math.max(parseIntSafe(limit, DEFAULT_LIMIT), 1), MAX_LIMIT);
    const query = { revokedAt: null, expiresAt: { $gt: new Date() } };
    const [sessions, total] = await Promise.all([
      Session.find(query)
        .sort({ lastUsedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('user', 'firstName lastName email role department accountStatus isActive metadata lastLogin')
        .lean(),
      Session.countDocuments(query),
    ]);

    return sendSuccess(res, {
      items: sessions.map((session) => buildSessionView(session, session.user)),
      pagination: paginate(safePage, safeLimit, total),
    }, 200, 'Active sessions fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin active sessions security error');
    return sendError(res, 500, 'Failed to fetch active sessions', error.message);
  }
};

exports.getDatabaseHealthSnapshot = async () => {
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const code = mongoose.connection.readyState;
  const state = stateMap[code] || 'unknown';
  return {
    status: state === 'connected' ? 'healthy' : 'down',
    state,
    code,
    message: state === 'connected' ? 'Database connected' : 'Database not connected',
    meta: buildMeta(),
    details: {
      collections: Object.keys(mongoose.connection.collections || {}).length,
    },
  };
};

exports.getSsoHealthSnapshot = async () => {
  const [linkedUsers, activeTokens] = await Promise.all([
    OutsourcingFreelancer.countDocuments(),
    Token.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }),
  ]);
  return {
    status: linkedUsers > 0 ? 'healthy' : 'degraded',
    state: linkedUsers > 0 ? 'operational' : 'needs_attention',
    message: linkedUsers > 0 ? 'SSO-linked profiles available' : 'No linked outsourcing profiles found',
    meta: buildMeta(),
    details: { linkedUsers, activeTokens },
  };
};

exports.getPermissionsHealthSnapshot = async () => {
  const [rules, superAdminRules] = await Promise.all([
    PortalAccess.countDocuments(),
    PortalAccess.countDocuments({ role: 'super_admin', portal: SUPER_ADMIN_PORTAL }),
  ]);
  const missing = superAdminRules === 0;
  return {
    status: missing ? 'degraded' : 'healthy',
    state: missing ? 'needs_attention' : 'operational',
    message: missing ? 'Super-admin portal access rule missing' : 'Portal access rules are configured',
    meta: buildMeta(),
    details: { rules, superAdminRules },
  };
};

exports.getSessionsHealthSnapshot = async () => {
  const [total, active, revoked] = await Promise.all([
    Session.countDocuments(),
    Session.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }),
    Session.countDocuments({ revokedAt: { $ne: null } }),
  ]);
  return {
    status: active > 0 || total === 0 ? 'healthy' : 'degraded',
    state: active > 0 ? 'operational' : 'limited',
    message: active > 0 ? 'Active session governance is healthy' : 'No active sessions found',
    meta: buildMeta(),
    details: { total, active, revoked },
  };
};

exports.getHealth = async (req, res) => {
  try {
    const [database, sso, permissions, sessions] = await Promise.all([
      exports.getDatabaseHealthSnapshot(),
      exports.getSsoHealthSnapshot(),
      exports.getPermissionsHealthSnapshot(),
      exports.getSessionsHealthSnapshot(),
    ]);
    const status = [database, sso, permissions, sessions].some((item) => item.status === 'down')
      ? 'down'
      : [database, sso, permissions, sessions].some((item) => item.status === 'degraded')
        ? 'degraded'
        : 'healthy';

    return sendSuccess(res, {
      status,
      components: { database, sso, permissions, sessions },
      generatedAt: new Date().toISOString(),
      meta: buildMeta(),
    }, 200, 'Portal health fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin health error');
    return sendError(res, 500, 'Failed to fetch health', error.message);
  }
};

exports.getDatabaseHealth = async (req, res) => {
  try {
    return sendSuccess(res, await exports.getDatabaseHealthSnapshot(), 200, 'Database health fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin database health error');
    return sendError(res, 500, 'Failed to fetch database health', error.message);
  }
};

exports.getSsoHealth = async (req, res) => {
  try {
    return sendSuccess(res, await exports.getSsoHealthSnapshot(), 200, 'SSO health fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin sso health error');
    return sendError(res, 500, 'Failed to fetch SSO health', error.message);
  }
};

exports.getPermissionsHealth = async (req, res) => {
  try {
    return sendSuccess(res, await exports.getPermissionsHealthSnapshot(), 200, 'Permissions health fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin permissions health error');
    return sendError(res, 500, 'Failed to fetch permissions health', error.message);
  }
};

exports.getSessionsHealth = async (req, res) => {
  try {
    return sendSuccess(res, await exports.getSessionsHealthSnapshot(), 200, 'Sessions health fetched successfully');
  } catch (error) {
    logger.error({ err: error }, 'Super-admin sessions health error');
    return sendError(res, 500, 'Failed to fetch sessions health', error.message);
  }
};
