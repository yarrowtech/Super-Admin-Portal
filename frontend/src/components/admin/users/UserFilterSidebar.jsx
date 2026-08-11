import React, { useState } from 'react';
import { departmentGroups, JOINED_WITHIN_OPTIONS } from './userDirectoryMeta';

const SectionCard = ({ icon, title, children }) => (
  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{title}</h3>
    </div>
    {children}
  </div>
);

const filterButtonClass = (active, activeClass = 'bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-md') =>
  `flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
    active
      ? activeClass
      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
  }`;

const CountBadge = ({ active, children }) => (
  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'}`}>
    {children}
  </span>
);

const UserFilterSidebar = ({ filters, setFilters, stats, roleCounts }) => {
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (key) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  const groupCount = (roles) => roles.reduce((sum, role) => sum + (roleCounts[role] || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-4 shadow-sm dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-800">
        <label className="block">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </div>
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

      <SectionCard icon="apartment" title="Filter by Department">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setFilters({ ...filters, role: '' })}
            className={filterButtonClass(filters.role === '')}
          >
            <span className="font-medium">All Departments</span>
            <CountBadge active={filters.role === ''}>{stats.totalUsers}</CountBadge>
          </button>

          {departmentGroups.map((group) => {
            if (!group.subRoles) {
              const value = group.roles[0];
              const active = filters.role === value;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setFilters({ ...filters, role: value })}
                  className={filterButtonClass(active)}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/20 text-white' : group.badge}`}>
                      <span className="material-symbols-outlined text-[16px]">{group.icon}</span>
                    </div>
                    <span className="truncate font-medium">{group.label}</span>
                  </div>
                  <CountBadge active={active}>{roleCounts[value] || 0}</CountBadge>
                </button>
              );
            }

            const groupRoleValue = group.subRoles.map((r) => r.value).join(',');
            const groupActive = filters.role === groupRoleValue;
            const isOpen = openGroups[group.key] ?? false;

            return (
              <div key={group.key}>
                <div className={`flex min-h-11 w-full items-stretch rounded-lg overflow-hidden transition-shadow ${
                  groupActive ? 'shadow-md' : isOpen ? 'bg-neutral-50 dark:bg-neutral-800/50' : ''
                }`}>
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, role: groupRoleValue })}
                    className={`flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-sm transition-all ${
                      groupActive
                        ? 'bg-gradient-to-r from-primary to-primary/80 text-white font-semibold'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${groupActive ? 'bg-white/20 text-white' : group.badge}`}>
                      <span className="material-symbols-outlined text-[16px]">{group.icon}</span>
                    </div>
                    <span className="truncate font-medium">{group.label}</span>
                    <span className="ml-auto">
                      <CountBadge active={groupActive}>{groupCount(group.subRoles.map((r) => r.value))}</CountBadge>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    aria-label={isOpen ? `Collapse ${group.label}` : `Expand ${group.label}`}
                    className={`flex w-9 shrink-0 items-center justify-center transition-colors ${
                      groupActive
                        ? 'bg-primary/80 text-white hover:bg-primary'
                        : 'text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-lg transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                </div>

                {isOpen && (
                  <div className="ml-3 mt-1 space-y-1 border-l-2 border-neutral-100 pl-3 dark:border-neutral-800">
                    {group.subRoles.map((sub) => {
                      const active = filters.role === sub.value;
                      return (
                        <button
                          key={sub.value}
                          type="button"
                          onClick={() => setFilters({ ...filters, role: sub.value })}
                          className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-all ${
                            active
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-primary/20 text-primary' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'}`}>
                            {roleCounts[sub.value] || 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard icon="toggle_on" title="Account Status">
        <div className="space-y-1.5">
          <button type="button" onClick={() => setFilters({ ...filters, isActive: '', accountStatus: '' })} className={filterButtonClass(filters.isActive === '' && !filters.accountStatus)}>
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

          <div className="pt-2">
            <label className="mb-1.5 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Or pick an exact account state</label>
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
      </SectionCard>

      <SectionCard icon="event" title="Joined Date">
        <div className="grid grid-cols-2 gap-1.5">
          {JOINED_WITHIN_OPTIONS.map((option) => {
            const active = (filters.joinedWithin || '') === option.value;
            return (
              <button
                key={option.value || 'any'}
                type="button"
                onClick={() => setFilters({ ...filters, joinedWithin: option.value })}
                className={`min-h-11 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-neutral-400 dark:text-neutral-500">
          Applies to the users currently loaded on this page.
        </p>
      </SectionCard>
    </div>
  );
};

export default UserFilterSidebar;
