import React, { useMemo, useState } from 'react';
import Button from '../../common/Button';

const UserDataTable = ({
  users,
  loading,
  selectedUser,
  onSelectUser,
  onEditUser,
  onToggleStatus,
  onSetStatus,
  onDeleteUser,
  actionState,
  filters,
  setFilters,
  page,
  setPage,
  totalPages,
}) => {
  const [sortBy, setSortBy] = useState('firstName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      return 'grid';
    }
    return 'table';
  }); // 'table' | 'grid'

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedUsers = useMemo(() => [...users].sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    const modifier = sortOrder === 'asc' ? 1 : -1;
    return aVal.toString().localeCompare(bVal.toString()) * modifier;
  }), [sortBy, sortOrder, users]);

  const ROLE_ICONS = {
    admin: 'shield_person',
    ceo: 'business_center',
    hr: 'badge',
    it_manager: 'computer',
    it_admin: 'admin_panel_settings',
    it_employee: 'computer',
    it_hr: 'badge',
    finance_manager: 'payments',
    finance_employee: 'payments',
    media_head: 'photo_camera',
    media_sales: 'trending_up',
    media_marketing: 'campaign',
    law_head: 'gavel',
    law_employee: 'gavel',
    freelancer: 'person',
    employee: 'person',
  };
  const getRoleIcon = (role) => ROLE_ICONS[role] || 'person';

  const ROLE_LABELS = {
    admin: 'Super Admin',
    ceo: 'CEO',
    hr: 'HR',
    it_manager: 'IT Manager',
    it_admin: 'IT Admin',
    it_employee: 'IT Employee',
    it_hr: 'IT HR',
    finance_manager: 'Finance Manager',
    finance_employee: 'Finance Employee',
    media_head: 'Media Head',
    media_sales: 'Media Sales',
    media_marketing: 'Media Marketing',
    law_head: 'Law Head',
    law_employee: 'Law Employee',
    freelancer: 'Freelancer',
  };
  const getRoleLabel = (role) => ROLE_LABELS[role] || role?.replace(/_/g, ' ') || 'N/A';

  const isLegacyEmployee = (role) => String(role || '').trim().toLowerCase() === 'employee';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Table Header */}
      <div className="border-b border-neutral-200 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 p-3 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 lg:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 lg:text-xl">
              User Directory
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {users.length} {users.length === 1 ? 'user' : 'users'} found
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto lg:flex lg:flex-wrap lg:items-center">
            {/* Search Bar */}
            <div className="relative min-w-0">
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 lg:w-72"
              />
              <span className="absolute left-3 top-2.5 material-symbols-outlined text-neutral-400">search</span>
            </div>
            
            {/* View Toggle */}
            <div className="flex overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex min-h-11 flex-1 items-center justify-center px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                  viewMode === 'table' 
                    ? 'bg-primary text-white' 
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
                aria-label="Table view"
              >
                <span className="material-symbols-outlined text-lg">table_rows</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex min-h-11 flex-1 items-center justify-center px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                  viewMode === 'grid' 
                    ? 'bg-primary text-white' 
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
                aria-label="Grid view"
              >
                <span className="material-symbols-outlined text-lg">grid_view</span>
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Loading...
              </div>
            )}
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700">
            <span className="material-symbols-outlined text-4xl text-neutral-400">group_off</span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-200">No users found</h3>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Try adjusting your search criteria or filters
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFilters({ search: '', role: '', isActive: '', accountStatus: '' })}
            icon={<span className="material-symbols-outlined">refresh</span>}
          >
            Clear all filters
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="max-h-[70vh] overflow-auto lg:max-h-none">
          <table className="w-full min-w-[860px]">
            <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-800/95">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  <button
                    onClick={() => handleSort('firstName')}
                    className="flex min-h-10 items-center gap-1 transition-colors hover:text-primary"
                  >
                    User
                    <span className="material-symbols-outlined text-lg">
                      {sortBy === 'firstName' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  <button
                    onClick={() => handleSort('role')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Role
                    <span className="material-symbols-outlined text-lg">
                      {sortBy === 'role' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">Department</th>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Joined
                    <span className="material-symbols-outlined text-lg">
                      {sortBy === 'createdAt' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="p-3 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {sortedUsers.map((user) => {
                const userId = user._id || user.id;
                const isSelected = (selectedUser?._id || selectedUser?.id) === userId;
                const legacyEmployee = isLegacyEmployee(user.role);
                const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';

                return (
                  <tr
                    key={userId}
                    onClick={() => onSelectUser(user)}
                    className={`cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
                      isSelected ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                          isSelected 
                            ? 'bg-primary text-white' 
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-56 truncate font-semibold text-neutral-900 dark:text-neutral-100">{fullName}</p>
                          <p className="max-w-64 truncate text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-neutral-500">
                          {getRoleIcon(user.role)}
                        </span>
                        <span className={`font-medium ${legacyEmployee ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                          {legacyEmployee ? 'Legacy Employee' : getRoleLabel(user.role)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.accountStatus === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : user.accountStatus === 'blocked' || user.accountStatus === 'suspended'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.accountStatus === 'active' ? 'bg-green-600' : 'bg-orange-600'}`}></span>
                        {(user.accountStatus || (user.isActive ? 'active' : 'inactive')).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {user.department || '-'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditUser(user);
                          }}
                          disabled={legacyEmployee}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                          title="Edit user"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetStatus?.(user, user.accountStatus === 'blocked' ? 'active' : 'blocked');
                          }}
                          disabled={legacyEmployee || actionState.togglingId === userId}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 dark:hover:bg-red-900/30"
                          title={user.accountStatus === 'blocked' ? 'Unblock user' : 'Block user'}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {user.accountStatus === 'blocked' ? 'lock_open' : 'block'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(user);
                          }}
                          disabled={legacyEmployee || actionState.togglingId === userId}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                            user.isActive
                              ? 'text-orange-500 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30'
                              : 'text-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30'
                          } disabled:opacity-50`}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {actionState.togglingId === userId ? (
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="currentColor">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                          ) : (
                            <span className="material-symbols-outlined text-lg">
                              {user.isActive ? 'pause_circle' : 'play_circle'}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUser(user);
                          }}
                          disabled={legacyEmployee || actionState.deletingId === userId}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 dark:hover:bg-red-900/30"
                          title="Delete user"
                        >
                          {actionState.deletingId === userId ? (
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="currentColor">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                          ) : (
                            <span className="material-symbols-outlined text-lg">delete</span>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {sortedUsers.map((user) => {
              const userId = user._id || user.id;
              const isSelected = (selectedUser?._id || selectedUser?.id) === userId;
              const legacyEmployee = isLegacyEmployee(user.role);
              const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';
              const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';

              return (
                <div
                  key={userId}
                  onClick={() => onSelectUser(user)}
                  className={`group relative cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary/30 ${
                    isSelected
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3 pr-16 sm:pr-10">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${
                      isSelected 
                        ? 'bg-primary text-white' 
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {fullName}
                        </p>
                        <span className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mb-2">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-xs font-semibold">
                          <span className="material-symbols-outlined text-sm">{getRoleIcon(user.role)}</span>
                          {legacyEmployee ? 'Legacy Employee' : getRoleLabel(user.role)}
                        </span>
                        {user.department && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {user.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="absolute right-3 top-3 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditUser(user);
                      }}
                      disabled={legacyEmployee}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:hover:bg-blue-900/30"
                      aria-label={`Edit ${fullName}`}
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span>Showing page {page} of {totalPages}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
                icon={<span className="material-symbols-outlined text-lg">first_page</span>}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                icon={<span className="material-symbols-outlined text-lg">chevron_left</span>}
              />
              <div className="mx-0 flex max-w-full items-center gap-1 overflow-x-auto sm:mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + Math.max(1, page - 2);
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary text-white'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                icon={<span className="material-symbols-outlined text-lg">chevron_right</span>}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                icon={<span className="material-symbols-outlined text-lg">last_page</span>}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDataTable;
