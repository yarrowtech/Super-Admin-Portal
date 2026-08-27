import React, { useState } from 'react';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from './Button';
import FilterDrawer from './FilterDrawer';

/**
 * Shared context/filter bar for dashboards with a changing dataset (by
 * department, team, project, status, assignee, search...). Keep this short —
 * only expose the 2-4 filters that actually matter for the portal.
 *
 * filters: [{ key, type: 'select'|'search', label, value, onChange, options, placeholder }]
 * Desktop renders filters inline; mobile collapses them into a drawer behind
 * a "Filters" button so the dashboard doesn't lose vertical space.
 */
const DashboardFilterBar = ({ filters = [], className = '' }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  if (!filters.length) return null;

  const activeCount = filters.filter((f) => f.value && f.value !== 'all' && f.value !== '').length;

  const renderControl = (filter) =>
    filter.type === 'search' ? (
      <Input
        key={filter.key}
        aria-label={filter.label}
        placeholder={filter.placeholder || `Search ${filter.label?.toLowerCase() || ''}`}
        value={filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        className="min-h-10"
      />
    ) : (
      <Select
        key={filter.key}
        aria-label={filter.label}
        value={filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        options={filter.options || []}
        className="min-h-10"
      />
    );

  return (
    <div className={`mb-5 flex items-center gap-2 ${className}`}>
      {/* Desktop — inline controls */}
      <div className="hidden flex-1 flex-wrap items-center gap-2 md:flex">
        {filters.map((filter) => (
          <div key={filter.key} className={filter.type === 'search' ? 'w-56' : 'w-40'}>
            {renderControl(filter)}
          </div>
        ))}
      </div>

      {/* Mobile — collapsible drawer trigger */}
      <Button
        variant="secondary"
        size="sm"
        className="md:hidden"
        icon={<span className="material-symbols-outlined text-base">tune</span>}
        onClick={() => setDrawerOpen(true)}
      >
        Filters{activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" subtitle="Refine this dashboard">
        <div className="space-y-4">
          {filters.map((filter) => (
            <div key={filter.key}>
              {filter.label && <p className="mb-1.5 text-sm font-bold text-neutral-700 dark:text-neutral-200">{filter.label}</p>}
              {renderControl(filter)}
            </div>
          ))}
          <Button className="w-full" onClick={() => setDrawerOpen(false)}>
            Apply
          </Button>
        </div>
      </FilterDrawer>
    </div>
  );
};

export default DashboardFilterBar;
