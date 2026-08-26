import React from 'react';

/**
 * Compact horizontal project switcher — replaces a full project-card grid with a
 * single scrollable tab row ("All Projects | EdifyEight | Better Pass ...").
 * Selecting a project drives the same `onChange(projectId)` the old card grid did.
 */
const ProjectSwitcher = ({ projects = [], value = '', onChange }) => {
  if (!projects.length) return null;

  const items = [{ key: '', label: 'All Projects' }, ...projects.map((p) => ({ key: p.value, label: p.name || p.code || 'Untitled' }))];

  return (
    <div role="tablist" aria-label="Project scope" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {items.map((item) => {
        const active = (value || '') === item.key;
        return (
          <button
            key={item.key || 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.key)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]/40 ${
              active
                ? 'bg-[var(--portal-accent)] text-white'
                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default ProjectSwitcher;
