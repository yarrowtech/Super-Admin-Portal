import React from 'react';
import ITSidebar from './ITSidebar';
import ITDashboard from './ITDashboard';

const ITPortal = () => {
  return (
    <div className="min-h-screen w-full font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-100">
      <ITSidebar />
      <div className="ml-64">
        <ITDashboard />
      </div>
    </div>
  );
};

export default ITPortal;