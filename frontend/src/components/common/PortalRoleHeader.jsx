import React from 'react';

const roleBadgeTone = {
  admin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  hr: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
  employee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  manager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
  ceo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  law: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  outsourcing: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200',
};

const roleQuickMeta = {
  ceo: 'Executive analytics online',
  admin: 'System control actions ready',
  hr: 'Workforce status synchronized',
  employee: 'Check-in and task focus',
  manager: 'Team delivery monitor active',
  law: 'Compliance checkpoints enabled',
  outsourcing: 'External operations connected',
};

const PortalRoleHeader = ({ role = 'employee', title = 'Workspace', subtitle = '', user }) => {
  const normalizedRole = String(role || user?.role || 'employee').toLowerCase();
  const badgeClass = roleBadgeTone[normalizedRole] || roleBadgeTone.employee;

  return (
    <header className="fixed left-[250px] right-0 top-0 z-30 hidden h-16 items-center border-b border-neutral-200 bg-white/95 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 md:flex">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle || roleQuickMeta[normalizedRole] || 'Unified dashboard shell'}</p>
      </div>
      <div className="mx-4 hidden max-w-[360px] flex-1 lg:block">
        <input
          readOnly
          value=""
          placeholder="Global search"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass}`}>{normalizedRole}</span>
        <div className="text-right">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{user?.firstName || 'User'}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{roleQuickMeta[normalizedRole] || 'Workspace ready'}</p>
        </div>
      </div>
    </header>
  );
};

export default PortalRoleHeader;
