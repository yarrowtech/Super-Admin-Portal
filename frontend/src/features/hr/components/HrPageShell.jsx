import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../../components/common/PortalHeader';

const HrPageShell = ({
  title,
  subtitle,
  icon = 'badge',
  showSearch = false,
  showNotifications = true,
  showThemeToggle = true,
  headerChildren,
  children,
}) => {
  const { user } = useAuth();

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PortalHeader
          title={title}
          subtitle={subtitle}
          user={user}
          icon={icon}
          showSearch={showSearch}
          showNotifications={showNotifications}
          showThemeToggle={showThemeToggle}
        >
          {headerChildren}
        </PortalHeader>
        {children}
      </div>
    </main>
  );
};

export default HrPageShell;
