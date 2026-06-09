const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/auth/User');
const jwtConfig = require('../config/jwt');
const { findProjectByCode, getAccessibleProjects, buildProjectAccessSummary, buildAccessTokenPayload, buildProjectLaunchUrl, normalizeProjectKey } = require('../utils/projectAccess');

const resolveUser = async (userId) => {
  if (!userId) return null;
  return User.findById(userId).select('firstName lastName email role department metadata permissions isActive accountStatus');
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
    const userId = req.body?.userId || req.query?.userId;

    let user = null;
    if (token) {
      const decoded = jwt.verify(token, jwtConfig.accessSecret);
      user = await resolveUser(decoded.userId || decoded.sub);
    } else if (userId) {
      user = await resolveUser(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
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
};
