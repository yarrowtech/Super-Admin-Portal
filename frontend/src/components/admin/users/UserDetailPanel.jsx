import React from 'react';
import Button from '../../common/Button';

const UserDetailPanel = ({
  user,
  onEdit,
  onToggleStatus,
  onDelete,
  actionState,
}) => {
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8">
        <div className="text-center">
          <span className="material-symbols-outlined mb-3 text-5xl text-neutral-300 dark:text-neutral-600">
            person_off
          </span>
          <p className="text-neutral-600 dark:text-neutral-400">No user selected</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            Select a user from the list to view details
          </p>
        </div>
      </div>
    );
  }

  const userId = user._id || user.id;
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';
  const isToggling = actionState.togglingId === userId;
  const isDeleting = actionState.deletingId === userId;

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-800 p-6 shadow-lg">
      {/* Header with Avatar */}
      <div className="flex items-start gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 text-2xl font-bold text-white shadow-lg ring-4 ring-primary/20">
          {initials}
          {user.isActive && (
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 ring-4 ring-white dark:ring-neutral-900">
              <span className="material-symbols-outlined text-sm text-white">check</span>
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{fullName}</h2>
            {user.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-600"></span>
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary dark:bg-primary/20">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {getRoleIcon(user.role)}
              </span>
              {user.role || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* User Details */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Contact Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
              <span className="material-symbols-outlined text-neutral-600 dark:text-neutral-400">email</span>
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Email Address</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{user.email}</p>
              </div>
            </div>
            {user.phone && (
              <div className="flex items-start gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
                <span className="material-symbols-outlined text-neutral-600 dark:text-neutral-400">phone</span>
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Phone Number</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{user.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Work Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
              <span className="material-symbols-outlined text-neutral-600 dark:text-neutral-400">badge</span>
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Role</p>
                <p className="text-sm font-semibold capitalize text-neutral-800 dark:text-neutral-200">
                  {user.role || 'Not specified'}
                </p>
              </div>
            </div>
            {user.department && (
              <div className="flex items-start gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
                <span className="material-symbols-outlined text-neutral-600 dark:text-neutral-400">
                  corporate_fare
                </span>
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Department</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{user.department}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Account Details
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
              <span className="material-symbols-outlined text-neutral-600 dark:text-neutral-400">calendar_today</span>
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Created At</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
              <span className="material-symbols-outlined text-neutral-600 dark:text-neutral-400">update</span>
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Last Updated</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <div className="space-y-2">
          <Button
            variant="primary"
            fullWidth
            onClick={onEdit}
            icon={<span className="material-symbols-outlined text-lg">edit</span>}
          >
            Edit User
          </Button>
          <Button
            variant={user.isActive ? 'warning' : 'success'}
            fullWidth
            onClick={onToggleStatus}
            loading={isToggling}
            disabled={isToggling || isDeleting}
            icon={
              !isToggling && (
                <span className="material-symbols-outlined text-lg">
                  {user.isActive ? 'pause_circle' : 'play_circle'}
                </span>
              )
            }
          >
            {user.isActive ? 'Deactivate User' : 'Activate User'}
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={onDelete}
            loading={isDeleting}
            disabled={isToggling || isDeleting}
            icon={!isDeleting && <span className="material-symbols-outlined text-lg">delete</span>}
          >
            Delete User
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper function to get icon based on role
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

export default UserDetailPanel;
