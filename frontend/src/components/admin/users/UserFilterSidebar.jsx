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
  { value: 'sales', label: 'Sales', icon: 'trending_up' },
  { value: 'research_operator', label: 'Research', icon: 'science' },
  { value: 'employee', label: 'Employee', icon: 'person' },
];

const UserFilterSidebar = ({ filters, setFilters, stats, roleCounts }) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Search Box */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-800 p-5 shadow-lg">
        <label className="block">
          <div className="mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">search</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              Search Users
            </span>
          </div>
          <div className="group relative flex items-stretch rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="flex items-center justify-center pl-3 text-neutral-400 group-focus-within:text-primary">
              <span className="material-symbols-outlined text-xl">search</span>
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 border-0 bg-transparent px-3 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: '' })}
                className="flex items-center justify-center pr-3 text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </label>
      </div>

      {/* Role Filter */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">badge</span>
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Filter by Role</h3>
        </div>
        <div className="space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
          <button
            onClick={() => setFilters({ ...filters, role: '' })}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
              filters.role === ''
                ? 'bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-md'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="font-medium">All Roles</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              filters.role === ''
                ? 'bg-white/20 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>{stats.totalUsers}</span>
          </button>
          {roleOptions.map((role) => (
            <button
              key={role.value}
              onClick={() => setFilters({ ...filters, role: role.value })}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                filters.role === role.value
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-md'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-lg ${
                  filters.role === role.value ? 'text-white' : ''
                }`}>{role.icon}</span>
                <span className="font-medium capitalize">{role.label}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                filters.role === role.value
                  ? 'bg-white/20 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}>{roleCounts[role.value] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">toggle_on</span>
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Filter by Status</h3>
        </div>
        <div className="space-y-1.5">
          <button
            onClick={() => setFilters({ ...filters, isActive: '' })}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
              filters.isActive === ''
                ? 'bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-md'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="font-medium">All Status</span>
          </button>
          <button
            onClick={() => setFilters({ ...filters, isActive: 'true' })}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
              filters.isActive === 'true'
                ? 'bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold shadow-md'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span className="font-medium">Active Only</span>
            </div>
          </button>
          <button
            onClick={() => setFilters({ ...filters, isActive: 'false' })}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
              filters.isActive === 'false'
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold shadow-md'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">cancel</span>
              <span className="font-medium">Inactive Only</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserFilterSidebar;
