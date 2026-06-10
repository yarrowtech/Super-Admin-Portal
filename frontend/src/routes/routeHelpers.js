export const getDefaultRoute = (user) => {
  const role = user?.role;
  const outsourcingType = String(user?.metadata?.outsourcingType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const department = String(user?.department || '')
    .trim()
    .toLowerCase()
    .replace(/[\s&-]+/g, '_');

  if (
    role === 'freelancer' ||
    department === 'outsourcing' ||
    department === 'outsource' ||
    department === 'external_workforce' ||
    outsourcingType === 'third_party_worker' ||
    outsourcingType === '3rd_party_worker' ||
    outsourcingType === 'thirdpartyworker' ||
    outsourcingType === 'freelancer' ||
    outsourcingType === 'freelaner'
  ) {
    return '/outsourcing/dashboard';
  }

  const roleRoutes = {
    super_admin: '/admin/super-admin',
    superadmin: '/admin/super-admin',
    admin: '/admin/dashboard',
    ceo: '/ceo/dashboard',
    manager: '/manager/dashboard',
    hr: '/hr/dashboard',
    employee: '/employee/dashboard',
    it: '/it/dashboard',
    law: '/law/dashboard',
    finance: '/finance/dashboard',
    media: '/media/dashboard',
    sales: '/sales/dashboard',
    research_operator: '/research/dashboard',
  };

  return roleRoutes[role] || '/hr/dashboard';
};

export const allowWithAdmin = (role) => [role, 'admin', 'super_admin', 'superadmin'];
