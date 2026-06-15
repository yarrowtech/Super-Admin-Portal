import React from 'react';
import { useNavigate } from 'react-router-dom';
import EmployeeDirectory from '../EmployeeDirectory';
import HrPageShell from '../../../features/hr/components/HrPageShell';

const EmployeesPage = () => {
  const navigate = useNavigate();

  return (
    <HrPageShell
      title="Employee Management"
      subtitle="Manage employee records, departments, and designations"
      icon="manage_accounts"
    >
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          onClick={() => navigate('/hr/employees?new=1')}
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sky-800 transition hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-200"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.1em]">Quick Action</p>
          <p className="mt-1 text-sm font-bold">Create Employee Record</p>
        </button>
        <button
          onClick={() => navigate('/hr/profiles')}
          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-200"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.1em]">Profile Ops</p>
          <p className="mt-1 text-sm font-bold">Review Employee Profiles</p>
        </button>
        <button
          onClick={() => navigate('/hr/performance')}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.1em]">Performance</p>
          <p className="mt-1 text-sm font-bold">Open Appraisal Workspace</p>
        </button>
      </div>
      <EmployeeDirectory />
    </HrPageShell>
  );
};

export default EmployeesPage;
