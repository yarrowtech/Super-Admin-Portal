import React from 'react';

const UserListItem = ({ user, isSelected, onClick }) => {
  const userId = user._id || user.id;
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <button
      onClick={() => onClick(user)}
      className={`group w-full rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-sm dark:bg-primary/20'
          : 'border-neutral-200 bg-white hover:border-primary/50 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isSelected
              ? 'bg-primary text-white'
              : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
          }`}
        >
          {initials}
        </div>

        {/* User Info */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <p
              className={`truncate font-semibold ${
                isSelected
                  ? 'text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-800 dark:text-neutral-200'
              }`}
            >
              {fullName}
            </p>
            {user.isActive ? (
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-green-500"></span>
            ) : (
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-orange-500"></span>
            )}
          </div>

          <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{user.email}</p>

          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                isSelected
                  ? 'bg-primary/20 text-primary dark:bg-primary/30'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {getRoleIcon(user.role)}
              </span>
              {user.role || 'N/A'}
            </span>
            {user.department && (
              <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {user.department}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        {isSelected && (
          <span className="material-symbols-outlined text-primary">chevron_right</span>
        )}
      </div>
    </button>
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

export default UserListItem;
