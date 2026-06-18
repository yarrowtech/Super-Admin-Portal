const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/auth/User');
const Token = require('../models/auth/Token');
const ActivityLog = require('../models/auth/ActivityLog');
const env = require('../config/env');
const jwtConfig = require('../config/jwt');
const { ROLES, getRolePermissions } = require('../config/roles');
const {
  findProjectByCode,
  getAccessibleProjects,
  getProjectRoleBinding,
  isPrivilegedProjectLauncher,
  normalizeProjectKey,
} = require('../utils/projectAccess');

const EFNBMMS_PROJECT_CODE = 'EFNBMMS';
const EFNBMMS_PORTAL = 'efnbmms';
const DEFAULT_LAUNCH_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SSO_TTL_SECONDS = 15 * 60;

const normalizeStr = (value) => String(value || '').trim();
const normalizeLower = (value) => normalizeStr(value).toLowerCase();
const parseIntSafe = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const parseDurationToMilliseconds = (value, fallbackMs) => {
  const raw = normalizeStr(value);
  if (!raw) return fallbackMs;
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = raw.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const scale = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit];
  return Number.isFinite(amount) && scale ? amount * scale : fallbackMs;
};

const parseDurationToSeconds = (value, fallbackSeconds) => {
  const ms = parseDurationToMilliseconds(value, fallbackSeconds * 1000);
  return Math.max(1, Math.round(ms / 1000));
};

const getPortalBaseUrl = () => {
  const raw = env.EFNBMMS_PORTAL_URL || env.EFMBMMS_PORTAL_URL || '';
  return String(raw || '').replace(/\/$/, '');
};

const requirePortalBaseUrl = () => {
  const base = getPortalBaseUrl();
  if (!base) {
    const error = new Error('EFNBMMS_PORTAL_URL is not configured');
    error.status = 500;
    error.code = 'EFNBMMS_PORTAL_URL_MISSING';
    throw error;
  }
  return base;
};

const getSsoSecret = () =>
  String(
    env.EFNBMMS_SSO_SECRET ||
      env.EFMBMMS_SHARED_SECRET ||
      jwtConfig.accessSecret ||
      env.JWT_SECRET ||
      ''
  ).trim();

const getSsoIssuer = () => normalizeStr(env.EFNBMMS_SSO_ISSUER || 'super-admin-portal');
const getSsoAudience = () => normalizeStr(env.EFNBMMS_SSO_AUDIENCE || 'efnbmms');
const getSsoExpiresIn = () => normalizeStr(env.EFNBMMS_SSO_TTL || '15m');
const getSsoExpiresInSeconds = () => parseDurationToSeconds(getSsoExpiresIn(), DEFAULT_SSO_TTL_SECONDS);
const getLaunchTtlMs = () => {
  const fallback = DEFAULT_LAUNCH_TTL_MS;
  const raw = env.EFNBMMS_LAUNCH_TTL || env.EFNBMMS_SSO_TTL_MS || env.EFNBMMS_SSO_TTL;
  return parseDurationToMilliseconds(raw, fallback);
};

const buildAudit = async (req, action, user, metadata = {}) => {
  try {
    await ActivityLog.create({
      actor: req.user?._id || req.user?.id || user?._id || user?.id || null,
      user: user?._id || user?.id || null,
      action,
      module: EFNBMMS_PORTAL,
      targetType: 'User',
      targetId: String(user?._id || user?.id || metadata.userId || ''),
      metadata: {
        ...metadata,
        portal: EFNBMMS_PORTAL,
        userId: String(user?._id || user?.id || metadata.userId || ''),
        role: user?.role || metadata.role || '',
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || '',
        timestamp: new Date().toISOString(),
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    logger.warn({ err: error, action }, 'Failed to audit EFNBMMS integration event');
  }
};

const getEffectivePermissions = (user = {}) => {
  const rolePermissions = getRolePermissions(user.role || ROLES.EMPLOYEE);
  const directPermissions = Array.isArray(user.permissions) ? user.permissions : [];
  return Array.from(new Set([...rolePermissions, ...directPermissions].map((item) => normalizeStr(item)).filter(Boolean)));
};

const buildSnapshotVersion = (user = {}) => {
  const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  const basis = JSON.stringify({
    id: String(user._id || user.id || ''),
    updatedAt: user.updatedAt || '',
    role: user.role || '',
    status: user.accountStatus || '',
    permissions: getEffectivePermissions(user),
    metadata: {
      syncSource: metadata.syncSource || '',
      syncStatus: metadata.syncStatus || '',
      superAdmin: metadata.superAdmin || {},
    },
  });
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 16);
};

const buildProjectContext = (user = {}) => {
  const projectFromRegistry = findProjectByCode(EFNBMMS_PROJECT_CODE);
  const accessibleProjects = getAccessibleProjects(user);
  const accessible = accessibleProjects.find((project) => normalizeProjectKey(project.code) === EFNBMMS_PROJECT_CODE) || null;
  const privileged = isPrivilegedProjectLauncher(user);
  const roleBinding = getProjectRoleBinding(EFNBMMS_PROJECT_CODE, user);

  return accessible || (projectFromRegistry ? {
    ...projectFromRegistry,
    role: roleBinding.appRole,
    assigned: false,
    accessGranted: privileged,
    status: privileged ? 'active' : 'blocked',
    permissions: roleBinding.appPermissions,
    projectAssignment: {
      appRole: roleBinding.appRole,
      appPermissions: roleBinding.appPermissions,
    },
  } : null);
};

const buildUserSnapshot = (user = {}, extras = {}) => {
  const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  const projectAssignments = Array.isArray(metadata.projectAssignments)
    ? metadata.projectAssignments
    : Array.isArray(metadata.assignedProjects)
      ? metadata.assignedProjects
      : [];

  return {
    id: String(user._id || user.id || ''),
    _id: String(user._id || user.id || ''),
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    name: `${normalizeStr(user.firstName)} ${normalizeStr(user.lastName)}`.trim() || user.email || '',
    role: user.role || '',
    department: user.department || '',
    isActive: Boolean(user.isActive),
    accountStatus: user.accountStatus || (user.isActive ? 'active' : 'inactive'),
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    effectivePermissions: getEffectivePermissions(user),
    snapshotVersion: buildSnapshotVersion(user),
    projectAssignments,
    metadata,
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    ...extras,
  };
};

const buildLaunchRedirectUrl = (project = {}, launchCode = '', redirectTo = '') => {
  const base = requirePortalBaseUrl();
  const path = project.ssoPath || env.EFNBMMS_SSO_PATH || env.EFMBMMS_SSO_PATH || '/superadmin-login';
  if (!base || !launchCode) return `${base}${path}`;
  const params = new URLSearchParams();
  params.set('code', launchCode);
  const resolvedRedirectTo = normalizeRedirectTo(redirectTo);
  if (resolvedRedirectTo) {
    params.set('redirectTo', resolvedRedirectTo);
  }
  return `${base}${path}?${params.toString()}`;
};

const buildAuthToken = (user, project, launchCode) =>
  jwt.sign(
    {
      iss: getSsoIssuer(),
      aud: getSsoAudience(),
      sub: String(user._id || user.id || ''),
      userId: String(user._id || user.id || ''),
      email: user.email || '',
      name: `${normalizeStr(user.firstName)} ${normalizeStr(user.lastName)}`.trim() || user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || '',
      department: user.department || '',
      permissions: getEffectivePermissions(user),
      projectCode: project.code || EFNBMMS_PROJECT_CODE,
      projectName: project.name || EFNBMMS_PROJECT_CODE,
      accessScope: project.accessGranted ? 'project_only' : 'blocked',
      source: 'super-admin-portal',
      ssoProvider: 'super-admin',
    },
    getSsoSecret(),
    {
      expiresIn: getSsoExpiresIn(),
      jwtid: launchCode,
    }
  );

const resolveLaunchTarget = (req) => {
  const project = buildProjectContext(req.user || {});
  if (!project) {
    const error = new Error('EFNBMMS project is not configured');
    error.status = 404;
    throw error;
  }
  if (!isPrivilegedProjectLauncher(req.user || {}) && !project.accessGranted) {
    const error = new Error('Project access denied');
    error.status = 403;
    error.code = 'PROJECT_ACCESS_DENIED';
    throw error;
  }
  return project;
};

const normalizeRedirectTo = (value) => {
  const candidate = normalizeStr(value);
  return candidate.startsWith('/') ? candidate : '/dashboard';
};

const getClientCredentials = (req) => ({
  clientId: normalizeStr(req.body?.clientId || req.headers['x-client-id']),
  clientSecret: normalizeStr(req.body?.clientSecret || req.headers['x-client-secret']),
});

const validateClientCredentials = (req) => {
  const expectedClientId = normalizeStr(env.EFNBMMS_CLIENT_ID);
  const expectedClientSecret = normalizeStr(env.EFNBMMS_CLIENT_SECRET);
  const provided = getClientCredentials(req);

  if (!provided.clientId || !provided.clientSecret) {
    const error = new Error('invalid_client');
    error.status = 401;
    error.code = 'invalid_client';
    throw error;
  }

  if (!expectedClientId || !expectedClientSecret) {
    const error = new Error('identity_source_unavailable');
    error.status = 502;
    error.code = 'identity_source_unavailable';
    throw error;
  }

  if (provided.clientId !== expectedClientId || provided.clientSecret !== expectedClientSecret) {
    const error = new Error('invalid_client');
    error.status = 401;
    error.code = 'invalid_client';
    throw error;
  }

  return provided;
};

const launch = async (req, res) => {
  try {
    const project = resolveLaunchTarget(req);
    const roleBinding = getProjectRoleBinding(project.code, req.user || {});
    const redirectTo = normalizeRedirectTo(req.body?.redirectTo || req.query?.redirectTo);
    const launchCode = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + getLaunchTtlMs());

    await Token.create({
      user: req.user._id || req.user.id,
      token: launchCode,
      jti: launchCode,
      type: 'sso',
      portal: EFNBMMS_PORTAL,
      projectCode: EFNBMMS_PROJECT_CODE,
      expiresAt,
    });

    const redirectUrl = buildLaunchRedirectUrl(project, launchCode, redirectTo);
    await buildAudit(req, 'EFNBMMS_SSO_LAUNCH_ISSUED', req.user, {
      projectCode: project.code,
      redirectTo,
      redirectUrl,
      launchCode,
    });

    return res.status(200).json({
      success: true,
      code: launchCode,
      launchCode,
      expiresAt: expiresAt.toISOString(),
      expiresIn: Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 1000)),
      issuer: getSsoIssuer(),
      audience: getSsoAudience(),
      redirectUrl,
      project: {
        code: project.code,
        name: project.name,
        launchUrl: project.launchUrl,
        ssoPath: project.ssoPath,
        role: roleBinding.appRole,
        permissions: roleBinding.appPermissions,
      },
      user: buildUserSnapshot(req.user, {
        role: roleBinding.appRole,
        sourceRole: req.user?.role || '',
        appRole: roleBinding.appRole,
        appPermissions: roleBinding.appPermissions,
        permissions: roleBinding.appPermissions,
        effectivePermissions: roleBinding.appPermissions,
      }),
      data: {
        launchCode,
        code: launchCode,
        expiresAt: expiresAt.toISOString(),
        expiresIn: Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 1000)),
        issuer: getSsoIssuer(),
        audience: getSsoAudience(),
        redirectUrl,
        project: {
          code: project.code,
          name: project.name,
          launchUrl: project.launchUrl,
          ssoPath: project.ssoPath,
          role: roleBinding.appRole,
          permissions: roleBinding.appPermissions,
        },
        user: buildUserSnapshot(req.user, {
          role: roleBinding.appRole,
          sourceRole: req.user?.role || '',
          appRole: roleBinding.appRole,
          appPermissions: roleBinding.appPermissions,
          permissions: roleBinding.appPermissions,
          effectivePermissions: roleBinding.appPermissions,
        }),
      },
    });
  } catch (error) {
    const status = Number(error.status) || 500;
    logger.error({ err: error }, 'EFNBMMS launch token generation failed');
    return res.status(status).json({
      success: false,
      error: error.message || 'Failed to create EFNBMMS launch token',
      code: error.code || 'EFNBMMS_LAUNCH_FAILED',
    });
  }
};

const exchange = async (req, res) => {
  try {
    const launchCode = normalizeStr(req.body?.code || req.body?.launchCode || req.query?.code);

    if (!launchCode) {
      return res.status(400).json({ success: false, error: 'invalid_code', code: 'invalid_code' });
    }

    validateClientCredentials(req);

    const tokenRecord = await Token.findOne({
      token: launchCode,
      type: 'sso',
      portal: EFNBMMS_PORTAL,
      projectCode: EFNBMMS_PROJECT_CODE,
    });

    if (!tokenRecord) {
      return res.status(400).json({ success: false, error: 'invalid_code', code: 'invalid_code' });
    }
    if (tokenRecord.revokedAt) {
      return res.status(409).json({ success: false, error: 'code_already_used', code: 'code_already_used' });
    }
    if (tokenRecord.expiresAt && tokenRecord.expiresAt.getTime() <= Date.now()) {
      return res.status(410).json({ success: false, error: 'expired_code', code: 'expired_code' });
    }

    const user = await User.findById(tokenRecord.user).select('firstName lastName email role department metadata permissions isActive accountStatus lastLogin createdAt updatedAt');
    if (!user || !user.isActive || ['suspended', 'blocked'].includes(user.accountStatus)) {
      return res.status(502).json({ success: false, error: 'identity_source_unavailable', code: 'identity_source_unavailable' });
    }

    const project = buildProjectContext(user);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not configured', code: 'PROJECT_NOT_CONFIGURED' });
    }
    const roleBinding = getProjectRoleBinding(project.code, user);
    if (!isPrivilegedProjectLauncher(user) && !project.accessGranted) {
      return res.status(403).json({ success: false, error: 'Project access denied', code: 'PROJECT_ACCESS_DENIED' });
    }

    tokenRecord.revokedAt = new Date();
    await tokenRecord.save();

    const accessToken = buildAuthToken(user, project, launchCode);
    const expiresIn = getSsoExpiresInSeconds();
    const snapshotVersion = buildSnapshotVersion(user);
    const payload = {
      accessToken,
      token: accessToken,
      expiresIn,
      issuer: getSsoIssuer(),
      audience: getSsoAudience(),
      snapshotVersion,
      authType: 'jwt',
      project: {
        code: project.code,
        name: project.name,
        launchUrl: project.launchUrl,
        ssoPath: project.ssoPath,
        permissions: project.permissions || [],
        role: roleBinding.appRole,
      },
      user: {
        id: String(user._id || user.id || ''),
        name: `${normalizeStr(user.firstName)} ${normalizeStr(user.lastName)}`.trim() || user.email || '',
        email: user.email || '',
        role: roleBinding.appRole,
        sourceRole: user.role || '',
        permissions: roleBinding.appPermissions,
        sourcePermissions: getEffectivePermissions(user),
        snapshotVersion,
      },
      profile: buildUserSnapshot(user, {
        portal: EFNBMMS_PORTAL,
        projectCode: project.code,
        accessGranted: Boolean(project.accessGranted || isPrivilegedProjectLauncher(user)),
        role: roleBinding.appRole,
        sourceRole: user.role || '',
        appRole: roleBinding.appRole,
        appPermissions: roleBinding.appPermissions,
        permissions: roleBinding.appPermissions,
        effectivePermissions: roleBinding.appPermissions,
      }),
      permissions: roleBinding.appPermissions,
    };

    await buildAudit(req, 'EFNBMMS_SSO_CODE_EXCHANGED', user, {
      projectCode: project.code,
      launchCode,
    });

    return res.status(200).json({
      success: true,
      ...payload,
      data: payload,
    });
  } catch (error) {
    if (error.code === 'invalid_client') {
      return res.status(401).json({ success: false, error: 'invalid_client', code: 'invalid_client' });
    }
    if (error.code === 'identity_source_unavailable') {
      return res.status(502).json({ success: false, error: 'identity_source_unavailable', code: 'identity_source_unavailable' });
    }
    logger.error({ err: error }, 'EFNBMMS launch exchange failed');
    return res.status(500).json({
      success: false,
      error: 'identity_source_unavailable',
      code: 'identity_source_unavailable',
    });
  }
};

const buildDirectoryQuery = (req) => {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    department,
    status,
    includeInactive,
  } = req.query || {};

  const safePage = Math.max(parseIntSafe(page, 1), 1);
  const safeLimit = Math.min(Math.max(parseIntSafe(limit, 20), 1), 100);
  const query = {};
  const normalizedStatus = normalizeLower(status);

  if (search) {
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { department: { $regex: escaped, $options: 'i' } },
      { role: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (role) query.role = normalizeLower(role);
  if (department) query.department = { $regex: String(department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (normalizedStatus === 'active') query.isActive = true;
  if (['inactive', 'suspended', 'blocked'].includes(normalizedStatus)) {
    query.accountStatus = normalizedStatus;
    query.isActive = false;
  }
  if (!normalizedStatus && String(includeInactive).toLowerCase() !== 'true') query.isActive = { $ne: false };

  return { query, safePage, safeLimit };
};

const listUsers = async (req, res) => {
  try {
    const { query, safePage, safeLimit } = buildDirectoryQuery(req);
    const [users, total] = await Promise.all([
      User.find(query).select('firstName lastName email role department permissions isActive accountStatus metadata createdAt updatedAt lastLogin').sort({ updatedAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      User.countDocuments(query),
    ]);

    const items = users.map((user) => buildUserSnapshot(user, {
      effectivePermissions: getEffectivePermissions(user),
      projectContext: buildProjectContext(user),
    }));

    return res.status(200).json({
      success: true,
      data: {
        items,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'EFNBMMS user directory fetch failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user directory',
      code: 'EFNBMMS_DIRECTORY_FAILED',
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('firstName lastName email role department permissions isActive accountStatus metadata createdAt updatedAt lastLogin').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: buildUserSnapshot(user, {
          effectivePermissions: getEffectivePermissions(user),
          projectContext: buildProjectContext(user),
        }),
        project: buildProjectContext(user),
        permissions: getEffectivePermissions(user),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'EFNBMMS user detail fetch failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      code: 'EFNBMMS_USER_FETCH_FAILED',
    });
  }
};

const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('firstName lastName email role department permissions isActive accountStatus metadata').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const project = buildProjectContext(user);
    return res.status(200).json({
      success: true,
      data: {
        user: buildUserSnapshot(user),
        project,
        permissions: getEffectivePermissions(user),
        rolePermissions: getRolePermissions(user.role || ROLES.EMPLOYEE),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'EFNBMMS user permissions fetch failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions',
      code: 'EFNBMMS_PERMISSIONS_FETCH_FAILED',
    });
  }
};

const syncUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('firstName lastName email role department permissions isActive accountStatus metadata createdAt updatedAt lastLogin').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    await buildAudit(req, 'EFNBMMS_USER_SYNC_REQUESTED', user, {
      projectCode: EFNBMMS_PROJECT_CODE,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: buildUserSnapshot(user, {
          effectivePermissions: getEffectivePermissions(user),
          projectContext: buildProjectContext(user),
        }),
        project: buildProjectContext(user),
        permissions: getEffectivePermissions(user),
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'EFNBMMS user sync failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to sync user snapshot',
      code: 'EFNBMMS_USER_SYNC_FAILED',
    });
  }
};

const health = async (req, res) => {
  try {
    const [userCount, activeUsers, tokenCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Token.countDocuments({ type: 'sso', portal: EFNBMMS_PORTAL, projectCode: EFNBMMS_PROJECT_CODE, revokedAt: null, expiresAt: { $gt: new Date() } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        issuer: getSsoIssuer(),
        audience: getSsoAudience(),
        portal: EFNBMMS_PORTAL,
        projectCode: EFNBMMS_PROJECT_CODE,
        userCount,
        activeUsers,
        activeLaunchCodes: tokenCount,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'EFNBMMS health check failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch EFNBMMS health',
      code: 'EFNBMMS_HEALTH_FAILED',
    });
  }
};

module.exports = {
  launch,
  exchange,
  listUsers,
  getUserById,
  getUserPermissions,
  syncUser,
  health,
  buildUserSnapshot,
  getEffectivePermissions,
};
