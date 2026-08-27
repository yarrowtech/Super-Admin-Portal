const ROLE_DEPARTMENT = Object.freeze({
  admin: 'Administration',
  super_admin: 'Administration',
  ceo: 'Executive',
  hr: 'Human Resources',
  it_manager: 'IT',
  it_admin: 'IT',
  it_employee: 'IT',
  it_hr: 'IT',
  finance_manager: 'Finance',
  finance_employee: 'Finance',
  law_head: 'Law',
  law_employee: 'Law',
  media_head: 'Media',
  media_sales: 'Media',
  media_marketing: 'Media',
  freelancer: 'Outsourcing',
});

const getDepartmentForRole = (role, fallback = '') =>
  ROLE_DEPARTMENT[String(role || '').trim().toLowerCase()] || String(fallback || '').trim();

const normalizeDepartment = (value) => String(value || '').trim().toLowerCase();

const getRoleDisplayName = (role) => {
  const code = String(role || '').trim().toLowerCase();
  const department = ROLE_DEPARTMENT[code];
  if (!department) return code.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const departmentPrefix = department.toLowerCase().replace(/\s+/g, '_');
  const withoutDepartment = code.startsWith(`${departmentPrefix}_`)
    ? code.slice(departmentPrefix.length + 1)
    : code;
  if (code === 'freelancer') return 'Freelancer';
  if (code === 'admin' || code === 'super_admin') return code === 'super_admin' ? 'Super Admin' : 'Admin';
  if (code === 'ceo') return 'CEO';
  if (code === 'hr') return 'HR';
  if (withoutDepartment === 'hr') return 'HR';
  return withoutDepartment.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const isRoleValidForDepartment = (role, department) => {
  const expected = ROLE_DEPARTMENT[String(role || '').trim().toLowerCase()];
  return Boolean(expected && normalizeDepartment(expected) === normalizeDepartment(department));
};

const buildAccessCatalog = (roleCodes) => {
  const byDepartment = new Map();
  for (const role of roleCodes) {
    const department = ROLE_DEPARTMENT[role];
    if (!department) continue;
    if (!byDepartment.has(department)) {
      byDepartment.set(department, {
        id: department.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: department,
        roles: [],
      });
    }
    byDepartment.get(department).roles.push({
      id: role,
      code: role,
      displayName: getRoleDisplayName(role),
    });
  }
  return Array.from(byDepartment.values()).sort((a, b) => a.name.localeCompare(b.name));
};

module.exports = {
  ROLE_DEPARTMENT,
  getDepartmentForRole,
  getRoleDisplayName,
  isRoleValidForDepartment,
  buildAccessCatalog,
};
