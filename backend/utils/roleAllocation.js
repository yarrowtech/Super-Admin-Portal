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

module.exports = { ROLE_DEPARTMENT, getDepartmentForRole };
