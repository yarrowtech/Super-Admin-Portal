import React from 'react';
import { useLocation } from 'react-router-dom';
import EmployeeSidebar from './EmployeeSidebar';

const EmployeePortal = ({ children }) => {
  const location = useLocation();
  const isChatPage = location.pathname === '/employee/chat';

  if (isChatPage) {
    return (
      <div className="relative flex h-screen w-full bg-background-light font-display text-neutral-900 dark:bg-background-dark dark:text-white">
        <div className="hidden md:block">
          <EmployeeSidebar />
        </div>
        <div className="flex-1 overflow-hidden md:ml-64">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background-light font-display text-neutral-900 dark:bg-background-dark dark:text-white">
      <EmployeeSidebar />
      <div className="flex-1 overflow-x-hidden md:ml-64">
        <div className="min-h-screen bg-gradient-to-b from-white/80 via-white/60 to-transparent px-4 py-6 dark:from-slate-900/50 dark:via-slate-900/30 md:px-10 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default EmployeePortal;
