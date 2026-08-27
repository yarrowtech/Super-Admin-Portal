import React from 'react';

/**
 * Row of 1-3 contextual quick actions, each wired to a real existing
 * route/handler — never decorative. actions: [{ label, icon, onClick }]
 */
const QuickActions = ({ actions = [], className = '' }) => {
  if (!actions.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 sm:flex-none"
        >
          {action.icon && (
            <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--portal-accent)' }}>
              {action.icon}
            </span>
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
