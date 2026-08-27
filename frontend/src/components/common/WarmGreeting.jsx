import React from 'react';

const displayNameOf = (user) => {
  if (!user) return '';
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.name || (user.email ? user.email.split('@')[0] : '');
};

/**
 * Time-of-day greeting computed from the viewer's local clock — never
 * hardcoded to one greeting. 22:00-04:59 has no natural "morning/afternoon/
 * evening" label, so it falls back to a neutral "Welcome back".
 */
const getTimeGreeting = (hour) => {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Welcome back';
};

/**
 * Compact personalized greeting shown just below the portal header and
 * above the KPI row — one shared component reused by every portal, with
 * only the supporting `message` copy varying per portal. Deliberately not
 * styled as a hero banner: title is a single semibold line, message is
 * short and muted, no gradients/illustrations/emoji.
 */
const WarmGreeting = ({ user, message, showDate = false, className = '' }) => {
  const name = displayNameOf(user);
  const greeting = getTimeGreeting(new Date().getHours());
  const dateLabel = showDate
    ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
        {greeting}
        {name ? `, ${name}` : ''}
      </h2>
      {message && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{message}</p>}
      {dateLabel && <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{dateLabel}</p>}
    </div>
  );
};

export default WarmGreeting;
