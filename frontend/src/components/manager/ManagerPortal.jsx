import React from 'react';
import ManagerSidebar from './ManagerSidebar';

const ManagerPortal = ({ children }) => {
  return (
    <div className="relative flex min-h-screen w-full bg-background-light font-display text-neutral-800 dark:bg-background-dark dark:text-neutral-100">
      <ManagerSidebar />
      <div className="ml-64 flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
};

export default ManagerPortal;
