import React from 'react';

/**
 * Consistent tab/section header: title + description on the left, action
 * buttons (Refresh/Export/etc.) aligned to the title row on the right.
 * Use this instead of hand-rolling a `<h2>+<p>+<Button>` block per tab so
 * every section in a module lines up on the same baseline and spacing.
 */
const SectionHeader = ({ title, description, actions, className = '' }) => (
  <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h2 className="text-[20px] font-semibold leading-tight text-neutral-900 dark:text-neutral-100">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export default SectionHeader;
