import baseRoleAccess from '../../../backend/config/portalAccessPolicy.json';

export const PORTALS = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
  CEO: 'ceo',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  IT: 'it',
  LAW: 'law',
  MEDIA: 'media',
  FINANCE: 'finance',
  OUTSOURCING: 'outsourcing',
};

export const IT_PORTAL_ROLES = ['it_admin', 'it_employee'];
export const HR_PORTAL_ROLES = ['hr', 'it_hr'];
export const FINANCE_PORTAL_ROLES = ['finance_manager', 'finance_employee'];
export const MEDIA_PORTAL_ROLES = ['media_head', 'media_sales', 'media_marketing'];
export const LAW_PORTAL_ROLES = ['law_head', 'law_employee'];
export const EMPLOYEE_PORTAL_ROLES = [
  'employee',
  'it_employee',
  'finance_employee',
];

const normalizeOutsourcingType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const normalizeDepartment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s&-]+/g, '_');

const isOutsourcingUser = (user) => {
    const type = normalizeOutsourcingType(user?.metadata?.outsourcingType);
    const role = String(user?.role || '').trim().toLowerCase();
    const department = normalizeDepartment(user?.department);
    return (
      role === 'freelancer' ||
      department === 'outsourcing' ||
      department === 'outsource' ||
      department === 'external_workforce' ||
      type === 'third_party_worker' ||
      type === '3rd_party_worker' ||
      type === 'thirdpartyworker' ||
      type === 'freelancer' ||
      type === 'freelaner'
    );
};

export const canAccessPortal = (user, portal) => {
  if (!user || !portal) return false;
  const role = String(user.role || '').toLowerCase();
  // Server-resolved rules include explicit denials. A portal grant never replaces
  // the action/record authorization performed by routes and owning services.
  if (Object.prototype.hasOwnProperty.call(user.portalAccess || {}, portal)) {
    return user.portalAccess[portal] === true;
  }
  const allowed = baseRoleAccess[role] || [];
  if (allowed.includes(portal)) return true;

  if (portal === PORTALS.OUTSOURCING) return isOutsourcingUser(user);
  return false;
};

// Portal settings cannot grant a different job role. Match the role gates on
// the actual portal entry routes before choosing a navigation destination.
export const canEnterPortal = (user, portal) => {
  if (!canAccessPortal(user, portal)) return false;
  if (['super_admin', 'superadmin'].includes(user?.role)) return true;
  if (user?.role === 'admin') return portal !== PORTALS.SUPER_ADMIN;
  const entryRoles = {
    [PORTALS.CEO]: ['ceo'],
    [PORTALS.HR]: HR_PORTAL_ROLES,
    [PORTALS.MANAGER]: ['it_manager'],
    [PORTALS.EMPLOYEE]: EMPLOYEE_PORTAL_ROLES,
    [PORTALS.IT]: IT_PORTAL_ROLES,
    [PORTALS.FINANCE]: FINANCE_PORTAL_ROLES,
    [PORTALS.LAW]: LAW_PORTAL_ROLES,
    [PORTALS.MEDIA]: MEDIA_PORTAL_ROLES,
  };
  if (portal === PORTALS.OUTSOURCING) return isOutsourcingUser(user);
  return (entryRoles[portal] || []).includes(user?.role);
};
