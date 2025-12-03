import React from 'react';
import HRSidebar from './HRSidebar';

const HRPortal = ({ children }) => {
  return (
    <div className="relative flex min-h-screen w-full font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-100">
      <HRSidebar />
      <div className="ml-64 flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
};

export default HRPortal;
