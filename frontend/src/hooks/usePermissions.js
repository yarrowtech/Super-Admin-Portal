import { useMemo } from 'react';

const getProjectPermissions = (user = {}) => {
  const assignments = Array.isArray(user.assignedProjects)
    ? user.assignedProjects
    : Array.isArray(user.metadata?.projectAssignments)
      ? user.metadata.projectAssignments
      : [];

  return assignments
    .filter((assignment) => String(assignment?.projectCode || '').toUpperCase() === 'EEC')
    .flatMap((assignment) => (Array.isArray(assignment.permissions) ? assignment.permissions : []));
};

export const hasUserPermission = (user, permission) => {
  if (!user || !permission) return false;
  if (['admin', 'super_admin', 'superadmin', 'freelancer'].includes(user.role)) return true;

  const permissions = new Set([
    ...(Array.isArray(user.permissions) ? user.permissions : []),
    ...getProjectPermissions(user),
  ]);

  return permissions.has(permission);
};

export const useEdifyEightTeacherPermissions = (user) =>
  useMemo(
    () => ({
      canRead: hasUserPermission(user, 'edifyeight:teachers:read'),
      canCreate: hasUserPermission(user, 'edifyeight:teachers:create'),
      canUpdate: hasUserPermission(user, 'edifyeight:teachers:update'),
      canDelete: hasUserPermission(user, 'edifyeight:teachers:delete'),
    }),
    [user]
  );

export const useEdifyEightStudyMaterialPermissions = (user) =>
  useMemo(
    () => ({
      canRead: hasUserPermission(user, 'edifyeight:study-materials:read'),
      canCreate: hasUserPermission(user, 'edifyeight:study-materials:create'),
      canUpdate: hasUserPermission(user, 'edifyeight:study-materials:update'),
      canDelete: hasUserPermission(user, 'edifyeight:study-materials:delete'),
    }),
    [user]
  );
