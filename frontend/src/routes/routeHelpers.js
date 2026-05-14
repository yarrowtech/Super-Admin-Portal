export const getDefaultRoute = (user) => {
  const role = user?.role;
  const outsourcingType = user?.metadata?.outsourcingType;

  if (outsourcingType === 'third_party_worker' || outsourcingType === 'freelancer') {
    return '/outsourcing/dashboard';
  }

  const roleRoutes = {
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

export const allowWithAdmin = (role) => [role, 'admin'];
