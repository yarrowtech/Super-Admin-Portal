import React from 'react';

const ExperienceTimeline = ({ items = [] }) => {
  return (
    <div className="space-y-3">
      {items.length === 0 ? <p className="text-sm text-neutral-500">No experience added.</p> : null}
      {items.map((item, idx) => (
        <div key={`${item.company || 'exp'}-${idx}`} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.company || 'Company'}</p>
          <p className="text-xs text-neutral-500">{item.role || 'Role'} • {item.startDate || '-'} - {item.endDate || 'Present'}</p>
          {item.description ? <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
};

export default React.memo(ExperienceTimeline);
