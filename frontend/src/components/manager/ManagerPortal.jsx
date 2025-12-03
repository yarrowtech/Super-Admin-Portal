import React from 'react';
import ManagerSidebar from './ManagerSidebar';
import ManagerDashboard from './ManagerDashboard';

const ManagerPortal = () => {
  return (
    <div className="relative flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display">
      <ManagerSidebar />
      <div className="ml-64 flex-1">
        <ManagerDashboard />
      </div>
    </div>
  );
};

export default ManagerPortal;