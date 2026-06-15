export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CEO: 'ceo',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  FINANCE: 'finance',
  IT: 'it',
  LAW: 'law',
});

export const PERMISSIONS = Object.freeze({
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  ROLES_ASSIGN: 'roles:assign',
  AUDIT_LOGS_READ: 'auditLogs:read',
  SETTINGS_UPDATE: 'settings:update',
});

export const hasRole = (user, allowedRoles = []) => allowedRoles.includes(user?.role);

export const hasPermission = (user, permission) => {
  if (!permission) return true;
  if (user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN) return true;
  return Array.isArray(user?.permissions) && user.permissions.includes(permission);
};
