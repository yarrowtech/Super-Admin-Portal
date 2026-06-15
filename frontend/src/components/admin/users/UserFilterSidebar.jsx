import React from 'react';

const roleOptions = [
  { value: 'admin', label: 'Admin', icon: 'shield_person' },
  { value: 'ceo', label: 'CEO', icon: 'business_center' },
  { value: 'it', label: 'IT', icon: 'computer' },
  { value: 'law', label: 'Law', icon: 'gavel' },
  { value: 'hr', label: 'HR', icon: 'badge' },
  { value: 'media', label: 'Media', icon: 'photo_camera' },
  { value: 'finance', label: 'Finance', icon: 'payments' },
  { value: 'manager', label: 'Manager', icon: 'supervisor_account' },
  { value: 'freelancer', label: 'Freelancer', icon: 'person' },
  { value: 'sales', label: 'Sales', icon: 'trending_up' },
  { value: 'research_operator', label: 'Research', icon: 'science' },
  { value: 'employee', label: 'Employee', icon: 'person' },
];

const filterButtonClass = (active, activeClass = 'bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-md') =>
  `flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
    active
      ? activeClass
      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
  }`;

const UserFilterSidebar = ({ filters, setFilters, stats, roleCounts }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-4 shadow-sm dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-800">
        <label className="block">
          <div className="mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">search</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Search Users</span>
          </div>
          <div className="group relative flex min-h-11 items-stretch overflow-hidden rounded-xl border-2 border-neutral-200 bg-white transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800">
            <span className="flex items-center justify-center pl-3 text-neutral-400 group-focus-within:text-primary">
              <span className="material-symbols-outlined text-xl">search</span>
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm font-medium text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-0 dark:text-neutral-100"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, search: '' })}
                className="flex min-h-11 min-w-11 items-center justify-center pr-3 text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">badge</span>
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Filter by Role</h3>
        </div>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setFilters({ ...filters, role: '' })}
            className={filterButtonClass(filters.role === '')}
          >
            <span className="font-medium">All Roles</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${filters.role === '' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'}`}>
              {stats.totalUsers}
            </span>
          </button>
          {roleOptions.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setFilters({ ...filters, role: role.value })}
              className={filterButtonClass(filters.role === role.value)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className={`material-symbols-outlined text-lg ${filters.role === role.value ? 'text-white' : ''}`}>{role.icon}</span>
                <span className="truncate font-medium capitalize">{role.label}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${filters.role === role.value ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'}`}>
                {roleCounts[role.value] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">toggle_on</span>
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Filter by Status</h3>
        </div>
        <div className="space-y-1.5">
          <button type="button" onClick={() => setFilters({ ...filters, isActive: '' })} className={filterButtonClass(filters.isActive === '')}>
            <span className="font-medium">All Status</span>
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, isActive: 'true', accountStatus: '' })}
            className={filterButtonClass(filters.isActive === 'true', 'bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold shadow-md')}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span className="font-medium">Active Only</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, isActive: 'false', accountStatus: '' })}
            className={filterButtonClass(filters.isActive === 'false', 'bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold shadow-md')}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">cancel</span>
              <span className="font-medium">Inactive Only</span>
            </div>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Account Control</h3>
        </div>
        <select
          value={filters.accountStatus || ''}
          onChange={(e) => setFilters({ ...filters, accountStatus: e.target.value, isActive: '' })}
          className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="">All account states</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
          <option value="pending_verification">Pending verification</option>
        </select>
      </div>
    </div>
  );
};

export default UserFilterSidebar;
