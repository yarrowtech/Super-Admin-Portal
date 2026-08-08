const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/auth/User');
const ActivityLog = require('../models/auth/ActivityLog');
const jwtConfig = require('../config/jwt');
const {
  PROJECT_REGISTRY,
  findProjectByCode,
  getAccessibleProjects,
  buildProjectAccessSummary,
  buildAccessTokenPayload,
  buildProjectLaunchUrl,
  isPrivilegedProjectLauncher,
  normalizeProjectKey,
} = require('../utils/projectAccess');

const writeProjectAccessActivity = async (req, action, targetId, metadata = {}) => {
  try {
    await ActivityLog.create({
      actor: req.user?._id || req.user?.id || targetId || null,
      user: req.user?._id || req.user?.id || targetId || null,
      action,
      module: 'project_access',
      targetType: 'ProjectAccess',
      targetId: String(targetId || ''),
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    logger.warn({ err: error, action }, 'Failed to write project access activity');
  }
};

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

const canAccessProjectHub = (user = {}) => {
  if (isPrivilegedProjectLauncher(user)) return true;

  const assignedProjects = getAccessibleProjects(user);
  return assignedProjects.some((project) => project.assigned || project.accessGranted);
};

const buildProjectEnvelope = (project, user) => {
  if (!project) return null;
  const isEfnbmms = normalizeProjectKey(project.code) === 'EFNBMMS';
  const isEdifyEight = normalizeProjectKey(project.code) === 'EEC';
  return {
    code: project.code,
    name: project.name,
    description: project.description,
    launchUrl: project.launchUrl,
    ssoPath: project.ssoPath,
    apiOnly: Boolean(project.apiOnly),
    assigned: project.assigned,
    accessGranted: project.accessGranted,
    role: project.role,
    integrationRole: project.integrationRole || null,
    apiRole: isEdifyEight ? 'teacher_management' : isEfnbmms ? 'admin' : project.integrationRole || project.role || null,
    status: project.status,
    permissions: project.permissions || [],
    startDate: project.startDate || null,
    endDate: project.endDate || null,
    projectAssignment: project.projectAssignment || null,
    access: {
      canLaunch: !isEfnbmms && !isEdifyEight && Boolean(project.accessGranted || isPrivilegedProjectLauncher(user)),
      canUseApi: (isEfnbmms || isEdifyEight) && Boolean(project.accessGranted || isPrivilegedProjectLauncher(user)),
      mode: isEdifyEight ? 'teacher_management_api' : isEfnbmms ? 'admin_management_api' : 'launch',
      blockedReason: isEfnbmms
        ? 'EFNBMMS is connected by admin-management API only'
        : isEdifyEight
          ? 'EdifyEight teacher management is connected by API only'
        : project.accessGranted ? null : 'Project not assigned or access has expired',
    },
  };
};

const getMyProjects = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const { projects, summary } = buildProjectAccessSummary(user);
    const payload = {
      projects: projects.map((project) => buildProjectEnvelope(project, user)),
      summary,
      assignedProjects: projects.filter((project) => project.assigned).map((project) => buildProjectEnvelope(project, user)),
      accessibleProjects: projects.filter((project) => project.accessGranted).map((project) => buildProjectEnvelope(project, user)),
    };

    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'Get project hub projects error');
    return res.status(500).json({ success: false, error: 'Failed to load projects', details: error.message });
  }
};

const getProjectPermissions = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const { projects, summary } = buildProjectAccessSummary(user);
    return res.status(200).json({
      success: true,
      data: {
        summary,
        permissions: projects.map((project) => ({
          projectCode: project.code,
          projectName: project.name,
          role: project.role,
          accessGranted: project.accessGranted,
          permissions: project.permissions || [],
          moduleScopes: project.projectAssignment?.moduleScopes || [],
          pages: project.projectAssignment?.pages || [],
          actions: project.projectAssignment?.actions || [],
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get project permissions error');
    return res.status(500).json({ success: false, error: 'Failed to fetch project permissions', details: error.message });
  }
};

const getProjectRoles = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const { projects, summary } = buildProjectAccessSummary(user);
    const roles = Array.from(
      projects.reduce((map, project) => {
        const key = normalizeProjectKey(project.role || 'member');
        if (!map.has(key)) {
          map.set(key, {
            role: project.role || 'member',
            projectCodes: [],
            projectNames: [],
            accessGranted: 0,
            accessBlocked: 0,
          });
        }
        const entry = map.get(key);
        entry.projectCodes.push(project.code);
        entry.projectNames.push(project.name);
        if (project.accessGranted) entry.accessGranted += 1;
        else entry.accessBlocked += 1;
        return map;
      }, new Map()).values()
    );

    return res.status(200).json({
      success: true,
      data: {
        summary,
        roles,
        projects: projects.map((project) => ({
          projectCode: project.code,
          projectName: project.name,
          role: project.role,
          accessGranted: project.accessGranted,
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get project roles error');
    return res.status(500).json({ success: false, error: 'Failed to fetch project roles', details: error.message });
  }
};

const generateProjectAccessToken = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const projectCode = normalizeProjectKey(req.params.projectCode || req.body?.projectCode || req.query?.projectCode);
    if (!projectCode) {
      return res.status(400).json({ success: false, error: 'projectCode is required' });
    }
    if (projectCode === 'EFNBMMS') {
      return res.status(400).json({
        success: false,
        error: 'EFNBMMS website launch is disabled. Use the admin-management API inside this portal.',
        code: 'EFNBMMS_API_ONLY',
      });
    }

    const projectFromRegistry = findProjectByCode(projectCode);
    if (!projectFromRegistry) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const accessibleProject = getAccessibleProjects(user).find((project) => normalizeProjectKey(project.code) === projectCode) || null;
    const isAdmin = isPrivilegedProjectLauncher(user);
    const resolvedProject = accessibleProject || {
      ...projectFromRegistry,
      role: user.role || 'member',
      assigned: false,
      accessGranted: Boolean(isAdmin),
      status: isAdmin ? 'active' : 'blocked',
      permissions: [],
      projectAssignment: null,
    };

    if (!isAdmin && !resolvedProject.accessGranted) {
      return res.status(403).json({
        success: false,
        error: 'Project is not assigned to this user',
        code: 'PROJECT_ACCESS_DENIED',
      });
    }

    const accessToken = jwt.sign(
      buildAccessTokenPayload(user, resolvedProject, { projectCode: resolvedProject.code }),
      jwtConfig.accessSecret,
      { expiresIn: jwtConfig.accessExpiresIn }
    );
    const redirectUrl = buildProjectLaunchUrl(resolvedProject, accessToken);

    await writeProjectAccessActivity(req, 'project_access.token_generated', user._id || user.id, {
      projectCode: resolvedProject.code,
      projectName: resolvedProject.name,
    });

    return res.status(200).json({
      success: true,
      data: {
        project: buildProjectEnvelope(resolvedProject, user),
        accessToken,
        token: accessToken,
        redirectUrl,
        user: {
          id: String(user._id || user.id || ''),
          email: user.email || '',
          role: user.role || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          department: user.department || '',
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Generate project access token error');
    return res.status(500).json({ success: false, error: 'Failed to generate project access token', details: error.message });
  }
};

const verifyProjectAccessToken = async (req, res) => {
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

    const projectCode = normalizeProjectKey(decoded.projectCode || req.body?.projectCode || req.query?.projectCode);
    const projectFromRegistry = findProjectByCode(projectCode);
    if (!projectFromRegistry) {
      return res.status(404).json({ success: false, valid: false, error: 'Project not found' });
    }

    const project = getAccessibleProjects(user).find((item) => normalizeProjectKey(item.code) === projectCode) || {
      ...projectFromRegistry,
      role: user.role || 'member',
      assigned: false,
      accessGranted: false,
      status: 'blocked',
      permissions: [],
    };
    const isAdmin = isPrivilegedProjectLauncher(user);

    if (!isAdmin && !project.accessGranted) {
      return res.status(403).json({
        success: false,
        valid: false,
        error: 'Project access denied',
        code: 'PROJECT_ACCESS_DENIED',
      });
    }

    await writeProjectAccessActivity(req, 'project_access.token_verified', user._id || user.id, {
      projectCode: project.code,
      projectName: project.name,
    });

    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        user: {
          id: String(user._id || user.id || ''),
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department,
        },
        project: buildProjectEnvelope(project, user),
        permissions: project.permissions || [],
        redirectUrl: buildProjectLaunchUrl(project, token),
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, valid: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, valid: false, error: 'Invalid token', code: 'TOKEN_INVALID' });
  }
};

module.exports = {
  getMyProjects,
  getProjectPermissions,
  getProjectRoles,
  generateProjectAccessToken,
  verifyProjectAccessToken,
  canAccessProjectHub,
  buildProjectEnvelope,
  PROJECT_REGISTRY,
};
