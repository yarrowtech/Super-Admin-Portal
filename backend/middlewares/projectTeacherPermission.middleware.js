const { ROLES } = require('../config/roles');

const PRIVILEGED_ROLES = new Set([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FREELANCER]);

const getProjectPermissions = (user = {}, projectCode = '') => {
  const assignments = Array.isArray(user.assignedProjects)
    ? user.assignedProjects
    : Array.isArray(user.metadata?.projectAssignments)
      ? user.metadata.projectAssignments
      : [];

  return assignments
    .filter((assignment) => String(assignment?.projectCode || '').toUpperCase() === String(projectCode || '').toUpperCase())
    .flatMap((assignment) => (Array.isArray(assignment.permissions) ? assignment.permissions : []));
};

const requireProjectTeacherPermission = (projectCode, permission) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (PRIVILEGED_ROLES.has(req.user.role)) return next();

  const directPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  const projectPermissions = getProjectPermissions(req.user, projectCode);
  const permissions = new Set([...directPermissions, ...projectPermissions]);

  if (!permissions.has(permission) && !permissions.has('edifyeight:*') && !permissions.has('*')) {
    return res.status(403).json({
      success: false,
      error: 'Permission denied',
      permission,
      code: 'PROJECT_TEACHER_PERMISSION_DENIED',
    });
  }

  return next();
};

module.exports = {
  requireProjectTeacherPermission,
};
