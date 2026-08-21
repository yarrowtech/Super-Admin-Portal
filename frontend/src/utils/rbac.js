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
  'law_employee',
  'media_marketing',
];

const baseRoleAccess = {
  admin: [PORTALS.ADMIN, PORTALS.CEO, PORTALS.HR, PORTALS.MANAGER, PORTALS.EMPLOYEE, PORTALS.IT, PORTALS.LAW, PORTALS.MEDIA, PORTALS.FINANCE, PORTALS.OUTSOURCING],
  super_admin: [PORTALS.ADMIN, PORTALS.SUPER_ADMIN],
  superadmin: [PORTALS.ADMIN, PORTALS.SUPER_ADMIN],
  ceo: [PORTALS.CEO],
  hr: [PORTALS.HR],
  it_manager: [PORTALS.MANAGER],
  it_admin: [PORTALS.IT],
  it_employee: [PORTALS.IT, PORTALS.EMPLOYEE],
  it_hr: [PORTALS.HR],
  finance_manager: [PORTALS.FINANCE],
  finance_employee: [PORTALS.FINANCE, PORTALS.EMPLOYEE],
  law_head: [PORTALS.LAW],
  law_employee: [PORTALS.LAW, PORTALS.EMPLOYEE],
  media_head: [PORTALS.MEDIA],
  media_sales: [PORTALS.MEDIA],
  media_marketing: [PORTALS.MEDIA, PORTALS.EMPLOYEE],
  employee: [PORTALS.EMPLOYEE],
};

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

export const canAccessPortal = (user, portal) => {
  if (!user || !portal) return false;
  const role = String(user.role || '').toLowerCase();
  const allowed = baseRoleAccess[role] || [];
  if (allowed.includes(portal)) return true;

  if (portal === PORTALS.OUTSOURCING) {
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
  }
  return false;
};
