import React, { useState } from 'react';
import { getInitials } from '../../utils/sidebarInitials';

const MiniTooltip = ({ label }) => (
  <span
    className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-white dark:text-neutral-900"
    aria-hidden="true"
  >
    {label}
    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-white" />
  </span>
);

// One shared signed-in-user row for every sidebar — avatar + name only. No email, role, or
// status: the portal header above it already carries the primary identity, this row is
// intentionally the secondary, quieter one. Static (not a button) since no portal currently
// wires a profile action to this row — a hover state here would imply an interaction that
// doesn't exist.
const SidebarUserCard = ({ user, collapsed = false }) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  if (!user) return null;

  const initials = getInitials(user);
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const photoUrl = !photoFailed && (user.profileImage || user.avatarUrl || user.photo);

  const avatar = (sizeClass) =>
    photoUrl ? (
      <img
        src={photoUrl}
        alt=""
        onError={() => setPhotoFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    ) : (
      <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-xs font-bold text-[var(--portal-accent)]`}>
        {initials}
      </div>
    );

  if (collapsed) {
    return (
      <div className="group relative flex shrink-0 justify-center py-2.5">
        {avatar('h-9 w-9')}
        <MiniTooltip label={fullName} />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5 px-3 pb-3 pt-2">
      {avatar('h-9 w-9')}
      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-none text-neutral-700 dark:text-neutral-300">{fullName}</p>
    </div>
  );
};

export default SidebarUserCard;
