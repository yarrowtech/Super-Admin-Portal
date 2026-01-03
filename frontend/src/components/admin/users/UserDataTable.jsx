import React, { useState } from 'react';
import Button from '../../common/Button';

const UserDataTable = ({
  users,
  loading,
  selectedUser,
  onSelectUser,
  onEditUser,
  onToggleStatus,
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
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    const modifier = sortOrder === 'asc' ? 1 : -1;
    return aVal.toString().localeCompare(bVal.toString()) * modifier;
  });

  const getRoleIcon = (role) => {
    const iconMap = {
      admin: 'shield_person',
      ceo: 'business_center',
      it: 'computer',
      law: 'gavel',
      hr: 'badge',
      media: 'photo_camera',
      finance: 'payments',
      manager: 'supervisor_account',
      sales: 'trending_up',
      research_operator: 'science',
      employee: 'person',
    };
    return iconMap[role] || 'person';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              User Directory
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {users.length} {users.length === 1 ? 'user' : 'users'} found
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-64 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute left-3 top-2.5 material-symbols-outlined text-neutral-400">search</span>
            </div>
            
            {/* View Toggle */}
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-primary text-white' 
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
              >
                <span className="material-symbols-outlined text-lg">table_rows</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-primary text-white' 
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
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
        <div className="py-16 text-center">
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
            onClick={() => setFilters({ search: '', role: '', isActive: '' })}
            icon={<span className="material-symbols-outlined">refresh</span>}
          >
            Clear all filters
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  <button
                    onClick={() => handleSort('firstName')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    User
                    <span className="material-symbols-outlined text-lg">
                      {sortBy === 'firstName' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </button>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
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
                <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Department</th>
                <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
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
                <th className="text-center p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {sortedUsers.map((user) => {
                const userId = user._id || user.id;
                const isSelected = (selectedUser?._id || selectedUser?.id) === userId;
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
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                          isSelected 
                            ? 'bg-primary text-white' 
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{fullName}</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-neutral-500">
                          {getRoleIcon(user.role)}
                        </span>
                        <span className="capitalize font-medium text-neutral-700 dark:text-neutral-300">
                          {user.role?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-green-600' : 'bg-orange-600'}`}></span>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {user.department || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditUser();
                          }}
                          className="rounded-lg p-2 text-neutral-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                          title="Edit user"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectUser(user);
                            onToggleStatus();
                          }}
                          disabled={actionState.togglingId === userId}
                          className={`rounded-lg p-2 transition-colors ${
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectUser(user);
                            onDeleteUser();
                          }}
                          disabled={actionState.deletingId === userId}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
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
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
            {sortedUsers.map((user) => {
              const userId = user._id || user.id;
              const isSelected = (selectedUser?._id || selectedUser?.id) === userId;
              const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';
              const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';

              return (
                <div
                  key={userId}
                  onClick={() => onSelectUser(user)}
                  className={`group relative rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
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
                        <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-xs font-semibold capitalize">
                          <span className="material-symbols-outlined text-sm">{getRoleIcon(user.role)}</span>
                          {user.role?.replace('_', ' ') || 'N/A'}
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
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditUser();
                      }}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
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
        <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span>Showing page {page} of {totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-1 mx-2">
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