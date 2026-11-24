import { MEDIA_PORTAL_ROLES, canEnterPortal, PORTALS } from '../utils/rbac';

const preferredRoleRoute = (user) => {
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
    it_manager: '/manager/dashboard',
    it_admin: '/it/dashboard',
    it_employee: '/employee/dashboard',
    it_hr: '/hr/dashboard',
    law: '/law/dashboard',
    law_head: '/law/dashboard',
    law_employee: '/law/dashboard',
    finance: '/finance/dashboard',
    finance_manager: '/finance/dashboard',
    finance_employee: '/finance/dashboard',
    media: '/media/dashboard',
    media_marketing: '/media/dashboard',
    marketing_head: '/media/dashboard',
    media_manager: '/media/dashboard',
    content_writer: '/media/dashboard',
    graphic_designer: '/media/dashboard',
    video_editor: '/media/dashboard',
    seo_specialist: '/media/dashboard',
    social_media_manager: '/media/dashboard',
    ads_manager: '/media/dashboard',
    project_manager: '/media/dashboard',
    department_head: '/media/dashboard',
    client_viewer: '/media/dashboard',
    sales: '/sales/dashboard',
  };

  if (role === 'media_head') {
    return '/media/head/dashboard';
  }
  if (role === 'media_sales') {
    return '/media/sales/dashboard';
  }
  if (MEDIA_PORTAL_ROLES.includes(role)) {
    return '/media/dashboard';
  }

  return roleRoutes[role] || '/hr/dashboard';
};

// A revoked default portal must not redirect back to itself indefinitely.
const portalPaths = {
  [PORTALS.SUPER_ADMIN]: '/admin/super-admin',
  [PORTALS.ADMIN]: '/admin/dashboard',
  [PORTALS.CEO]: '/ceo/dashboard',
  [PORTALS.HR]: '/hr/dashboard',
  [PORTALS.MANAGER]: '/manager/dashboard',
  [PORTALS.EMPLOYEE]: '/employee/dashboard',
  [PORTALS.IT]: '/it/dashboard',
  [PORTALS.LAW]: '/law/dashboard',
  [PORTALS.MEDIA]: '/media/dashboard',
  [PORTALS.FINANCE]: '/finance/dashboard',
  [PORTALS.OUTSOURCING]: '/outsourcing/dashboard',
};

export const getDefaultRoute = (user) => {
  const preferred = preferredRoleRoute(user);
  const portal = preferred === '/admin/super-admin' ? PORTALS.SUPER_ADMIN : preferred.split('/')[1];
  if (canEnterPortal(user, portal)) return preferred;
  const fallback = Object.entries(portalPaths).find(([key]) => canEnterPortal(user, key));
  return fallback?.[1] || '/access-denied';
};

export const allowWithAdmin = (role) => [role, 'admin', 'super_admin', 'superadmin'];
