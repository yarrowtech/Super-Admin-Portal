import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import Attendance from '../Attendance';

const AttendancePage = () => {
  const { user } = useAuth();

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-green-50/30 via-white to-emerald-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PortalHeader
          title="Attendance Management"
          subtitle="Track and manage employee attendance records"
          user={user}
          icon="calendar_month"
          showSearch={true}
          showNotifications={true}
          showThemeToggle={true}
          searchPlaceholder="Search attendance records..."
        />

        <Attendance />
      </div>
    </main>
  );
};

export default AttendancePage;
