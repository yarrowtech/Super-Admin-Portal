import React from 'react';
import KPICard from '../common/KPICard';

/**
 * Compact 5-up KPI row shared by every Creative section (Total/In Review/Approved/
 * Files/Types). `items`: [label, value, icon, extra?] where extra is an optional
 * {onClick, active, tone} to turn a stat into a filter toggle. Uses KPICard's
 * `compact` mode so five cards fit without the huge empty space the old
 * hand-rolled metric cards had.
 */
const COLUMN_CLASSES = {
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'lg:grid-cols-5',
};

const CreativeStatsGrid = ({ items = [], columns = 5 }) => (
  <div className={`grid grid-cols-2 gap-2.5 ${COLUMN_CLASSES[columns] || COLUMN_CLASSES[5]}`}>
    {items.map(([label, value, icon, extra]) => (
      <KPICard
        key={label}
        title={label}
        value={value}
        icon={icon}
        variant="minimal"
        onClick={extra?.onClick}
        active={extra?.active}
        tone={extra?.tone}
      />
    ))}
  </div>
);

export default CreativeStatsGrid;
