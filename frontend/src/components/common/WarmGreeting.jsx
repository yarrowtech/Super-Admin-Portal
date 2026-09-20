import React from 'react';
import { getFirstName, getGreetingParts, useGreetingClock } from '../../utils/greeting';

/**
 * Compact personalized greeting shown just below the portal header and
 * above the KPI row — one shared component reused by every portal dashboard.
 * Time bands and messages come from utils/greeting.js (shared with the
 * Project Overview header). `roleHint` (e.g. 'legal operations') flavours the
 * message; `message` overrides it entirely (kept for backward compatibility).
 */
const WarmGreeting = ({ user, message, roleHint = '', showDate = false, className = '' }) => {
  const now = useGreetingClock();
  const parts = getGreetingParts(now, roleHint);
  const name = getFirstName(user);
  const dateLabel = showDate
    ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;
  const line = message || parts.message;

  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
        {parts.greeting}
        {name ? `, ${name}` : ''}
      </h2>
      {line && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{line}</p>}
      {dateLabel && <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{dateLabel}</p>}
    </div>
  );
};

export default WarmGreeting;
