export const PORTALS = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
  CEO: 'ceo',
  HR: 'hr',
  IT: 'it',
  LAW: 'law',
  MEDIA: 'media',
  FINANCE: 'finance',
  SALES: 'sales',
  RESEARCH: 'research',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  OUTSOURCING: 'outsourcing',
};

const baseRoleAccess = {
  admin: [PORTALS.ADMIN, PORTALS.SUPER_ADMIN, PORTALS.CEO, PORTALS.HR, PORTALS.IT, PORTALS.LAW, PORTALS.MEDIA, PORTALS.FINANCE, PORTALS.MANAGER, PORTALS.EMPLOYEE, PORTALS.OUTSOURCING],
  ceo: [PORTALS.CEO],
  hr: [PORTALS.HR],
  it: [PORTALS.IT],
  law: [PORTALS.LAW],
  media: [PORTALS.MEDIA],
  finance: [PORTALS.FINANCE],
  sales: [PORTALS.SALES],
  research_operator: [PORTALS.RESEARCH],
  manager: [PORTALS.MANAGER],
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
