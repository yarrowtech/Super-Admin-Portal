import React from 'react';
import MobilePortalNav from '../components/common/MobilePortalNav';
import PortalRoleHeader from '../components/common/PortalRoleHeader';
import { useSidebar } from '../context/SidebarContext';

// Maps every real role code (backend/config/roles.js) to the portal-accent
// theme bucket it should render as (index.css .portal-shell[data-role=...]).
// Previously this only matched a handful of coarse literals ('hr','manager',
// 'it'...), so granular roles like it_manager/it_admin/it_hr/finance_manager/
// law_head all silently fell through to the 'employee' fallback color —
// every "head/manager/admin"-level role in Manager/IT/Finance/HR/Law
// rendered as the wrong (employee-green) accent instead of its real portal
// color, which is what showed up as "wrong sidebar/accent" for real users.
const ROLE_THEME = {
  admin: 'admin',
  super_admin: 'admin',
  superadmin: 'admin',
  ceo: 'ceo',
  hr: 'hr',
  it_hr: 'hr',
  it_manager: 'manager',
  manager: 'manager',
  it_admin: 'it',
  it: 'it',
  it_employee: 'employee',
  employee: 'employee',
  finance_manager: 'finance',
  finance_employee: 'employee',
  finance: 'finance',
  law_head: 'law',
  law_employee: 'employee',
  law: 'law',
  media_head: 'media',
  media_sales: 'media',
  media_marketing: 'media',
  media: 'media',
  freelancer: 'outsourcing',
  outsourcing: 'outsourcing',
};

const AppLayout = ({
  sidebar,
  title = 'Workspace',
  subtitle = '',
  mobileIcon = 'dashboard',
  mobileItems = [],
  user,
  children,
  contentClassName = '',
  showHeader = true,
  showMobileNav = true,
}) => {
  const { collapsed } = useSidebar();
  const resolvedRole = String(user?.role || '').toLowerCase();
  const roleForTheme = ROLE_THEME[resolvedRole] || 'employee';

  return (
    <div
      className="portal-shell relative flex min-h-screen w-full bg-background-light font-display text-neutral-900 dark:bg-background-dark dark:text-neutral-100"
      data-role={roleForTheme}
    >
      {showMobileNav ? <MobilePortalNav title={title} subtitle={subtitle} icon={mobileIcon} items={mobileItems} /> : null}
      {sidebar}
      {showHeader ? <PortalRoleHeader role={roleForTheme} title={title} subtitle={subtitle} user={user} /> : null}
      <div
        className={`flex-1 overflow-x-hidden transition-[margin] duration-300 ease-out-expo ${
          collapsed ? 'md:ml-16' : 'md:ml-[250px]'
        } ${showMobileNav || showHeader ? 'pt-16 md:pt-16' : 'pt-0 md:pt-0'}`}
      >
        <main className={`portal-content min-h-screen ${contentClassName}`.trim()}>{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
