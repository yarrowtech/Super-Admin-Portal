import React from 'react';
import KPICard from '../common/KPICard';

/**
 * Compact 5-up KPI row shared by every Creative section (Total/In Review/Approved/
 * Files/Types). `items`: [{label, value, icon}]. Uses KPICard's `compact` mode so
 * five cards fit without the huge empty space the old hand-rolled metric cards had.
 */
const CreativeStatsGrid = ({ items = [] }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
    {items.map(([label, value, icon]) => (
      <KPICard key={label} title={label} value={value} icon={icon} compact />
    ))}
  </div>
);

export default CreativeStatsGrid;
