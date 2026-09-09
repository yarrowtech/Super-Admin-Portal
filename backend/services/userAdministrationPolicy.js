const { PLATFORM_ROLES } = require('./employeeScope.service');
const isPlatformAdmin = (actor) => ['admin', 'super_admin'].includes(actor?.role);
const assertUserAdministration = (actor, target, payload = {}) => {
  const denied = (message) => { const error = new Error(message); error.statusCode = 403; throw error; };
  if (!isPlatformAdmin(actor)) {
    if (!['hr', 'it_hr'].includes(actor?.role)) denied('User administration is not permitted');
    if (PLATFORM_ROLES.includes(target?.role) || PLATFORM_ROLES.includes(payload.role)) {
      denied('Only platform administrators can manage platform accounts');
    }
    if (payload.permissions !== undefined && JSON.stringify(payload.permissions) !== JSON.stringify(target?.permissions || [])) {
      denied('Only platform administrators can assign custom permissions');
    }
    for (const field of ['accessLevel', 'projectAssignments', 'projectAccess', 'projectRoles']) {
      if (payload.metadata?.[field] !== undefined &&
          JSON.stringify(payload.metadata[field]) !== JSON.stringify(target?.metadata?.[field] ?? [])) {
        denied('Only platform administrators can change project access grants');
      }
    }
  } else if (actor.role !== 'super_admin' && (target?.role === 'super_admin' || payload.role === 'super_admin')) {
    denied('Only super administrators can manage super administrator accounts');
  }
};
module.exports = { assertUserAdministration, isPlatformAdmin };
