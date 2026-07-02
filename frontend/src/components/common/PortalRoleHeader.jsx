import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const roleBadgeTone = {
  admin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  hr: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
  employee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  manager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
  ceo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  law: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  outsourcing: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200',
  media: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200',
};

const roleQuickMeta = {
  ceo: 'Executive analytics online',
  admin: 'System control actions ready',
  hr: 'Workforce status synchronized',
  employee: 'Check-in and task focus',
  manager: 'Operations dashboard active',
  law: 'Compliance checkpoints enabled',
  outsourcing: 'External operations connected',
  media: 'Campaign analytics online',
};

const PortalRoleHeader = ({ role = 'employee', title = 'Workspace', subtitle = '', user }) => {
  const { logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const normalizedRole = String(role || user?.role || 'employee').toLowerCase();
  const badgeClass = roleBadgeTone[normalizedRole] || roleBadgeTone.employee;

  return (
    <header className="fixed left-[250px] right-0 top-0 z-30 hidden h-16 items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 md:flex">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle || roleQuickMeta[normalizedRole] || 'Unified dashboard shell'}</p>
      </div>
      <div className="mx-2 hidden max-w-[420px] flex-1 lg:block">
        <input
          placeholder="Global search..."
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <button type="button" className="relative rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">
        <span className="material-symbols-outlined">notifications</span>
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-orange-500" />
      </button>
      <button type="button" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover">
        <span className="mr-1 material-symbols-outlined align-middle text-sm">add</span>
        Quick Action
      </button>
      <div className="relative flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass}`}>{normalizedRole}</span>
        <button type="button" onClick={() => setProfileOpen((prev) => !prev)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            {(user?.firstName || 'U').slice(0, 1)}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{user?.firstName || 'User'}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{roleQuickMeta[normalizedRole] || 'Workspace ready'}</p>
          </div>
        </button>
        {profileOpen ? (
          <div className="absolute right-0 top-12 w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <button type="button" className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">Profile</button>
            <button type="button" onClick={logout} className="w-full rounded-md px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Logout</button>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default PortalRoleHeader;
