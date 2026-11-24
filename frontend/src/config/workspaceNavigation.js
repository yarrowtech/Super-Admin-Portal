import { canEnterPortal } from '../utils/rbac';
import { resolvePortalMenu } from './portalMenus';

const workspaces = [
  { portal: 'super-admin', label: 'Super Admin', icon: 'admin_panel_settings', path: '/admin/super-admin' },
  { portal: 'admin', label: 'Administration', icon: 'domain', path: '/admin/dashboard' },
  { portal: 'ceo', label: 'Executive', icon: 'business_center', path: '/ceo/dashboard' },
  { portal: 'hr', label: 'Human Resources', icon: 'badge', path: '/hr/dashboard' },
  { portal: 'manager', label: 'Project Management', icon: 'assignment', path: '/manager/dashboard' },
  { portal: 'employee', label: 'My Workspace', icon: 'person', path: '/employee/dashboard' },
  { portal: 'finance', label: 'Finance', icon: 'account_balance', path: '/finance/dashboard' },
  { portal: 'it', label: 'IT Operations', icon: 'devices', path: '/it/dashboard' },
  { portal: 'law', label: 'Legal', icon: 'gavel', path: '/law/dashboard' },
  { portal: 'media', label: 'Media', icon: 'campaign', path: '/media/dashboard' },
  { portal: 'outsourcing', label: 'Outsourcing', icon: 'handshake', path: '/outsourcing/dashboard' },
];

export const getWorkspaceNavigation = (user) => {
  const destinations = [];
  const seen = new Set();
  const add = item => {
    if (seen.has(item.path)) return;
    seen.add(item.path);
    destinations.push(item);
  };
  for (const workspace of workspaces.filter(item => canEnterPortal(user, item.portal))) {
    const path = workspace.portal === 'media' && user.role === 'media_head' ? '/media/head/dashboard'
      : workspace.portal === 'media' && user.role === 'media_sales' ? '/media/sales/dashboard' : workspace.path;
    add({ ...workspace, path, section: workspace.label, description: 'Open workspace' });
    if (['super-admin', 'ceo', 'media'].includes(workspace.portal)) continue;
    const flatten = items => items.flatMap(item => item.children?.length ? flatten(item.children) : [item]);
    for (const item of flatten(resolvePortalMenu(workspace.portal, user))) {
      if (canEnterPortal(user, item.path.split('/')[1])) add({ ...item, section: workspace.label });
    }
    if (workspace.portal === 'admin') {
      for (const item of [
        { label: 'CRM', path: '/admin/crm', icon: 'contacts' },
        { label: 'Projects & Products', path: '/admin/projects', icon: 'folder_open' },
        { label: 'API Management', path: '/admin/api-management', icon: 'hub' },
        { label: 'Digital Portfolio', path: '/admin/digital-portfolio', icon: 'workspaces' },
      ]) add({ ...item, section: workspace.label });
    }
  }
  return destinations;
};
