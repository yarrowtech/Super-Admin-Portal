const { getAccessibleProjects, normalizeProjectKey } = require('../utils/projectAccess');

const requireWorkspaceAccess = (projectCode, permission = '') => (req, res, next) => {
  const project = getAccessibleProjects(req.user || {})
    .find((entry) => normalizeProjectKey(entry.code) === normalizeProjectKey(projectCode));
  const permissions = new Set(project?.permissions || []);
  if (!project?.accessGranted) {
    return res.status(403).json({ success: false, error: 'Project is not assigned to this user', code: 'PROJECT_ACCESS_DENIED' });
  }
  if (permission && !permissions.has(permission) && !permissions.has(`${normalizeProjectKey(projectCode).toLowerCase()}:*`) && !permissions.has('*')) {
    return res.status(403).json({ success: false, error: 'Project permission denied', code: 'PROJECT_PERMISSION_DENIED', permission });
  }
  req.workspaceProject = project;
  return next();
};

module.exports = { requireWorkspaceAccess };
