import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import EmployeeDirectory from '../EmployeeDirectory';

const EmployeesPage = () => {
  const { user } = useAuth();

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PortalHeader
          title="Employee Management"
          subtitle="Manage employee records, departments, and designations"
          user={user}
          icon="manage_accounts"
          showSearch={false}
          showNotifications={true}
          showThemeToggle={true}
        />

        <EmployeeDirectory />
      </div>
    </main>
  );
};

export default EmployeesPage;
