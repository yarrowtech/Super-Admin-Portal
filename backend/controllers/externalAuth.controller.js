const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const User = require('../models/auth/User');
const Token = require('../models/auth/Token');
const ActivityLog = require('../models/auth/ActivityLog');
const jwtConfig = require('../config/jwt');
const { findProjectByCode, getAccessibleProjects, buildProjectAccessSummary, buildAccessTokenPayload, buildProjectLaunchUrl, normalizeProjectKey } = require('../utils/projectAccess');

const resolveUser = async (userId) => {
  if (!userId) return null;
  return User.findById(userId).select('firstName lastName email role department metadata permissions isActive accountStatus');
};

const getRequestUser = async (req) => {
  if (req.user?._id || req.user?.id) {
    return resolveUser(req.user._id || req.user.id);
  }
  if (req.body?.userId || req.query?.userId) {
    return resolveUser(req.body.userId || req.query.userId);
  }
  return null;
};

const getDisplayName = (user = {}) =>
  `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim() || user?.email || '';

const getSsoContext = (user = {}) => {
  const metadata = user?.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  return {
    designation: String(metadata.designation || '').trim(),
    employeeCode: String(metadata.employeeCode || '').trim(),
    vendorCode: String(metadata.vendorCode || '').trim(),
  };
};

const writeSsoActivity = async (req, eventType, user, metadata = {}) => {
  try {
    const ctx = getSsoContext(user);
    await ActivityLog.create({
      actor: user?._id || user?.id || null,
      user: user?._id || user?.id || null,
      action: eventType,
      module: 'sso',
      targetType: 'SSO',
      targetId: String(metadata.projectCode || 'EEC'),
      metadata: {
        eventType,
        portal: 'outsourcing',
        projectCode: String(metadata.projectCode || 'EEC'),
        userId: String(user?._id || user?.id || ''),
        employeeCode: metadata.employeeCode || ctx.employeeCode || '',
        role: user?.role || '',
        sessionId: metadata.sessionId || '',
        jti: metadata.jti || '',
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || '',
        status: metadata.status || 'success',
        message: metadata.message || '',
        timestamp: new Date().toISOString(),
        redirectTo: metadata.redirectTo || '',
        redirectUrl: metadata.redirectUrl || '',
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    logger.warn({ err: error, eventType }, 'Failed to write SSO activity');
  }
};

const buildProjectResponse = (user, project) => ({
  project: {
    code: project.code,
    name: project.name,
    description: project.description,
    launchUrl: project.launchUrl,
    ssoPath: project.ssoPath,
    role: project.role,
    status: project.status,
    assigned: project.assigned,
    accessGranted: project.accessGranted,
    permissions: project.permissions || [],
  },
  user: {
    id: String(user._id || user.id || ''),
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    department: user.department,
  },
});

const buildProjectForUser = (user, projectCode) => {
  const projectFromRegistry = findProjectByCode(projectCode);
  if (!projectFromRegistry) return null;
  const accessibleProject = getAccessibleProjects(user).find((project) => normalizeProjectKey(project.code) === normalizeProjectKey(projectCode)) || null;
  const isAdmin = String(user.role || '').toLowerCase() === 'admin';
  return accessibleProject || {
    ...projectFromRegistry,
    role: user.role || 'member',
    assigned: false,
    accessGranted: Boolean(isAdmin),
    status: isAdmin ? 'active' : 'blocked',
    permissions: [],
    projectAssignment: null,
  };
};

const issueExternalToken = (user, project) =>
  jwt.sign(
    buildAccessTokenPayload(user, project, { projectCode: project.code }),
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );

const issueEecSsoToken = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found', error: 'User not found' });
    }

    const projectCode = normalizeProjectKey(req.body?.projectCode);
    const redirectCandidate = typeof req.body?.redirectTo === 'string' ? req.body.redirectTo.trim() : '';
    const redirectTo = redirectCandidate.startsWith('/')
      ? redirectCandidate
      : '/dashboard';

    if (projectCode !== 'EEC') {
      return res.status(400).json({
        success: false,
        message: 'projectCode must be EEC',
        error: 'Invalid projectCode',
      });
    }

    const project = buildProjectForUser(user, projectCode);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found', error: 'Project not found' });
    }

    if (String(user.role || '').toLowerCase() !== 'admin' && !project.accessGranted) {
      return res.status(403).json({
        success: false,
        message: 'Project access denied',
        error: 'Project access denied',
        code: 'PROJECT_ACCESS_DENIED',
      });
    }

    const jti = crypto.randomUUID();
    const payload = buildAccessTokenPayload(user, project, {
      projectCode: 'EEC',
      projectName: project.name,
      jti,
      designation: user?.metadata?.designation || '',
      employeeCode: user?.metadata?.employeeCode || '',
      vendorCode: user?.metadata?.vendorCode || '',
    });
    const token = jwt.sign(payload, jwtConfig.accessSecret, {
      expiresIn: '5m',
      jwtid: jti,
    });
    const redirectUrl = buildProjectLaunchUrl(project, token, { redirectTo });
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Promise.all([
      Token.create({
        user: user._id || user.id,
        token,
        jti,
        type: 'sso',
        portal: 'outsourcing',
        projectCode: 'EEC',
        expiresAt,
      }),
      writeSsoActivity(req, 'SSO_TOKEN_CREATED', user, {
        projectCode: 'EEC',
        jti,
        redirectTo,
        redirectUrl,
        message: 'EEC SSO token created',
      }),
      writeSsoActivity(req, 'SSO_REDIRECT_ISSUED', user, {
        projectCode: 'EEC',
        jti,
        redirectTo,
        redirectUrl,
        message: 'EEC redirect issued',
      }),
    ]);

    return res.status(200).json({
      success: true,
      token,
      redirectUrl,
      message: 'EEC SSO token created',
    });
  } catch (error) {
    logger.error({ err: error }, 'Issue EEC SSO token error');
    return res.status(500).json({ success: false, message: 'Failed to create SSO token', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;
    const projectCode = normalizeProjectKey(req.body?.projectCode);

    if (!email || !password || !projectCode) {
      return res.status(400).json({ success: false, error: 'email, password and projectCode are required' });
    }

    const user = await User.findByCredentials(email, password);
    const project = buildProjectForUser(user, projectCode);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (String(user.role || '').toLowerCase() !== 'admin' && !project.accessGranted) {
      return res.status(403).json({ success: false, error: 'Project access denied', code: 'PROJECT_ACCESS_DENIED' });
    }

    const accessToken = issueExternalToken(user, project);
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        token: accessToken,
        redirectUrl: buildProjectLaunchUrl(project, accessToken),
        ...buildProjectResponse(user, project),
        summary: buildProjectAccessSummary(user).summary,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'External auth login error');
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    return res.status(500).json({ success: false, error: 'External login failed', details: error.message });
  }
};

const verify = async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ success: false, error: 'token is required' });
    }

    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    const user = await resolveUser(decoded.userId || decoded.sub);
    if (!user || !user.isActive || ['suspended', 'blocked'].includes(user.accountStatus)) {
      return res.status(401).json({ success: false, valid: false, error: 'Invalid token or user inactive' });
    }

    const project = buildProjectForUser(user, decoded.projectCode || req.body?.projectCode || req.query?.projectCode);
    if (!project) {
      return res.status(404).json({ success: false, valid: false, error: 'Project not found' });
    }

    if (String(user.role || '').toLowerCase() !== 'admin' && !project.accessGranted) {
      return res.status(403).json({ success: false, valid: false, error: 'Project access denied', code: 'PROJECT_ACCESS_DENIED' });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        ...buildProjectResponse(user, project),
        redirectUrl: buildProjectLaunchUrl(project, token),
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, valid: false, error: 'Token expired' });
    }
    return res.status(401).json({ success: false, valid: false, error: 'Invalid token' });
  }
};

const ssoLogin = async (req, res) => {
  try {
    const token = req.body?.token || req.body?.accessToken || req.query?.token;
    const projectCode = normalizeProjectKey(req.body?.projectCode || req.query?.projectCode);
    if (!token) {
      return res.status(400).json({ success: false, error: 'token is required' });
    }

    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    const user = await resolveUser(decoded.userId || decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid token or user inactive' });
    }

    const project = buildProjectForUser(user, projectCode || decoded.projectCode);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (String(user.role || '').toLowerCase() !== 'admin' && !project.accessGranted) {
      return res.status(403).json({ success: false, error: 'Project access denied', code: 'PROJECT_ACCESS_DENIED' });
    }

    return res.status(200).json({
      success: true,
      message: 'SSO login successful',
      data: {
        session: {
          token,
          projectCode: project.code,
          projectName: project.name,
          issuedAt: new Date().toISOString(),
        },
        redirectUrl: buildProjectLaunchUrl(project, token),
        ...buildProjectResponse(user, project),
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

const userAccess = async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token || req.headers.authorization?.split(' ')[1];

    let user = null;
    if (token) {
      const decoded = jwt.verify(token, jwtConfig.accessSecret);
      user = await resolveUser(decoded.userId || decoded.sub);
    }

    if (!user) {
      return res.status(400).json({ success: false, error: 'token is required' });
    }

    const { projects, summary } = buildProjectAccessSummary(user);
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: String(user._id || user.id || ''),
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department,
        },
        projects,
        summary,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

module.exports = {
  login,
  verify,
  ssoLogin,
  userAccess,
  issueEecSsoToken,
};
