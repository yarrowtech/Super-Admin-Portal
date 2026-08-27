import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../common/Button';
import IconButton from '../../common/IconButton';
import StatusBadge from '../../common/StatusBadge';
import { getRoleIcon, getRoleLabel } from './userDirectoryMeta';

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
  const sortBy = filters?.sortBy || 'createdAt';
  const sortOrder = filters?.sortOrder || 'desc';
  // Below 768px the directory always renders as cards — a table can't fit that
  // narrow without truncating every column, so there's no toggle back to it there.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [viewMode, setViewMode] = useState(() => (isMobile ? 'grid' : 'table')); // 'table' | 'grid'

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const effectiveViewMode = isMobile ? 'grid' : viewMode;

  const handleSort = (field) => {
    if (sortBy === field) {
      setFilters((current) => ({ ...current, sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' }));
    } else {
      setFilters((current) => ({ ...current, sortBy: field, sortOrder: 'asc' }));
    }
  };

  const sortedUsers = useMemo(() => {
    return users;
  }, [users]);

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
              {sortedUsers.length} {sortedUsers.length === 1 ? 'user' : 'users'} found
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
                className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-9 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 lg:w-72"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-neutral-400">search</span>
              {filters.search && (
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, search: '' })}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:hover:bg-neutral-700 dark:hover:text-red-400"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* View Toggle (desktop/tablet only — mobile always shows cards) */}
            <div className="hidden overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 md:flex">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex min-h-11 flex-1 items-center justify-center px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-none ${
                  viewMode === 'table'
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
                aria-label="Table view"
                aria-pressed={viewMode === 'table'}
              >
                <span className="material-symbols-outlined text-lg">table_rows</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex min-h-11 flex-1 items-center justify-center px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-none ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
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

      {sortedUsers.length === 0 ? (
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
            onClick={() => setFilters({ search: '', department: '', role: '', isActive: '', accountStatus: '', joinedWithin: '', sortBy: 'createdAt', sortOrder: 'desc' })}
            icon={<span className="material-symbols-outlined">refresh</span>}
          >
            Clear all filters
          </Button>
        </div>
      ) : effectiveViewMode === 'table' ? (
        /* Table View */
        <div className="max-h-[70vh] overflow-auto lg:max-h-none">
          <table className="w-full min-w-[860px]">
            <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-800/95">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300" aria-sort={sortBy === 'firstName' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button
                    onClick={() => handleSort('firstName')}
                    className="flex min-h-10 items-center gap-1 rounded-md px-1 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    User
                    <span className={`material-symbols-outlined text-lg ${sortBy === 'firstName' ? 'text-primary' : 'text-neutral-400'}`}>
                      {sortBy === 'firstName' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300" aria-sort={sortBy === 'role' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button
                    onClick={() => handleSort('role')}
                    className="flex min-h-10 items-center gap-1 rounded-md px-1 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Role
                    <span className={`material-symbols-outlined text-lg ${sortBy === 'role' ? 'text-primary' : 'text-neutral-400'}`}>
                      {sortBy === 'role' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">Department</th>
                <th className="p-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300" aria-sort={sortBy === 'createdAt' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex min-h-10 items-center gap-1 rounded-md px-1 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Joined
                    <span className={`material-symbols-outlined text-lg ${sortBy === 'createdAt' ? 'text-primary' : 'text-neutral-400'}`}>
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
                      <StatusBadge
                        tone={
                          user.accountStatus === 'active'
                            ? 'success'
                            : user.accountStatus === 'blocked' || user.accountStatus === 'suspended'
                              ? 'danger'
                              : 'warning'
                        }
                        label={(user.accountStatus || (user.isActive ? 'active' : 'inactive')).replace(/_/g, ' ')}
                      />
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
                        <IconButton
                          icon="edit"
                          tone="primary"
                          tooltip="Edit user"
                          disabled={legacyEmployee}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditUser(user);
                          }}
                        />
                        <IconButton
                          icon={user.accountStatus === 'blocked' ? 'lock_open' : 'block'}
                          tone="danger"
                          tooltip={user.accountStatus === 'blocked' ? 'Unblock user' : 'Block user'}
                          disabled={legacyEmployee || actionState.togglingId === userId}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetStatus?.(user, user.accountStatus === 'blocked' ? 'active' : 'blocked');
                          }}
                        />
                        <IconButton
                          icon={user.isActive ? 'pause_circle' : 'play_circle'}
                          tone={user.isActive ? 'warning' : 'success'}
                          tooltip={user.isActive ? 'Deactivate user' : 'Activate user'}
                          disabled={legacyEmployee || actionState.togglingId === userId}
                          loading={actionState.togglingId === userId}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(user);
                          }}
                        />
                        <IconButton
                          icon="delete"
                          tone="danger"
                          tooltip="Delete user"
                          disabled={legacyEmployee || actionState.deletingId === userId}
                          loading={actionState.deletingId === userId}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUser(user);
                          }}
                        />
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
                  <div className="flex items-start gap-3 md:pr-24">
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
                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-neutral-100 pt-3 dark:border-neutral-800 md:absolute md:right-3 md:top-3 md:mt-0 md:border-0 md:pt-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                    <IconButton
                      icon="edit"
                      tone="primary"
                      tooltip={`Edit ${fullName}`}
                      disabled={legacyEmployee}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditUser(user);
                      }}
                    />
                    <IconButton
                      icon={user.accountStatus === 'blocked' ? 'lock_open' : 'block'}
                      tone="danger"
                      tooltip={user.accountStatus === 'blocked' ? `Unblock ${fullName}` : `Block ${fullName}`}
                      disabled={legacyEmployee || actionState.togglingId === userId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetStatus?.(user, user.accountStatus === 'blocked' ? 'active' : 'blocked');
                      }}
                    />
                    <IconButton
                      icon={user.isActive ? 'pause_circle' : 'play_circle'}
                      tone={user.isActive ? 'warning' : 'success'}
                      tooltip={user.isActive ? `Deactivate ${fullName}` : `Activate ${fullName}`}
                      disabled={legacyEmployee || actionState.togglingId === userId}
                      loading={actionState.togglingId === userId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(user);
                      }}
                    />
                    <IconButton
                      icon="delete"
                      tone="danger"
                      tooltip={`Delete ${fullName}`}
                      disabled={legacyEmployee || actionState.deletingId === userId}
                      loading={actionState.deletingId === userId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteUser(user);
                      }}
                    />
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
