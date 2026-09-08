import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import Attendance from '../Attendance';

const AttendancePage = () => {
  const { user } = useAuth();

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Attendance Management"
          subtitle="Track and manage employee attendance records"
          user={user}
          icon="calendar_month"
        />

        <div className="mb-5 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-sky-600 dark:text-sky-400">info</span>
          <p className="text-neutral-600 dark:text-neutral-400">
            Attendance is tracked manually by HR for this portal &mdash; GPS smart tracking is intentionally disabled.
          </p>
        </div>

        <Attendance />
      </div>
    </main>
  );
};

export default AttendancePage;
