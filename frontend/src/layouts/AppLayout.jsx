import React from 'react';
import MobilePortalNav from '../components/common/MobilePortalNav';
import PortalRoleHeader from '../components/common/PortalRoleHeader';

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
  const resolvedRole = String(user?.role || '').toLowerCase();
  const roleForTheme = ['admin', 'hr', 'employee', 'manager', 'ceo', 'law', 'outsourcing', 'finance', 'it'].includes(resolvedRole)
    ? resolvedRole
    : 'employee';

  return (
    <div
      className="portal-shell relative flex min-h-screen w-full bg-background-light font-display text-neutral-900 dark:bg-background-dark dark:text-neutral-100"
      data-role={roleForTheme}
    >
      {showMobileNav ? <MobilePortalNav title={title} subtitle={subtitle} icon={mobileIcon} items={mobileItems} /> : null}
      {sidebar}
      {showHeader ? <PortalRoleHeader role={roleForTheme} title={title} subtitle={subtitle} user={user} /> : null}
      <div className={`flex-1 overflow-x-hidden md:ml-[250px] ${showMobileNav || showHeader ? 'pt-16 md:pt-16' : 'pt-0 md:pt-0'}`}>
        <main className={`portal-content min-h-screen ${contentClassName}`.trim()}>{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
