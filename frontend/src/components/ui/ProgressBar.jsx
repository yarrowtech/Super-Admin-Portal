import React from 'react';

// One shared linear progress bar, used for portfolio/pillar completion and the
// Information Completeness / Execution Progress metrics — previously copy-pasted
// byte-for-byte in AdminPortfolioPage.jsx and PortfolioOverviewPanel.jsx.
const ProgressBar = ({ value = 0, colorClass = 'bg-primary' }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
    <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

export default ProgressBar;
