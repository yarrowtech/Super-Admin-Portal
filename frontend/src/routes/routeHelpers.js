import { MEDIA_PORTAL_ROLES } from '../utils/rbac';

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
    it_manager: '/manager/dashboard',
    it_admin: '/it/dashboard',
    it_employee: '/employee/dashboard',
    it_hr: '/hr/dashboard',
    law: '/law/dashboard',
    finance: '/finance/dashboard',
    media: '/media/dashboard',
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
    research_operator: '/research/dashboard',
  };

  if (MEDIA_PORTAL_ROLES.includes(role)) {
    return '/media/dashboard';
  }

  return roleRoutes[role] || '/hr/dashboard';
};

export const allowWithAdmin = (role) => [role, 'admin', 'super_admin', 'superadmin'];
