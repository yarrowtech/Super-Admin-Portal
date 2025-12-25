import React from 'react';
import { Outlet } from 'react-router-dom';
import HRSidebar from './HRSidebar';

const HRPortal = () => {
  return (
    <div className="relative flex min-h-screen w-full font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-100">
      <HRSidebar />
      <div className="ml-64 flex-1 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default HRPortal;
