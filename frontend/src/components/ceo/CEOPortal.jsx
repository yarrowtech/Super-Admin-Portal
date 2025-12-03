import React from 'react';
import CEOSidebar from './CEOSidebar';
import CEODashboard from './CEODashboard';

const CEOPortal = () => {
  return (
    <div className="flex h-screen w-full flex-col font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-200">
      <div className="flex h-full w-full">
        <CEOSidebar />
        <div className="ml-64 flex-1">
          <CEODashboard />
        </div>
      </div>
    </div>
  );
};

export default CEOPortal;