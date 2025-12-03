import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';

const AdminPortal = () => {
  return (
    <div className="relative flex min-h-screen w-full flex-col font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-100">
      <div className="flex h-full w-full flex-row">
        <AdminSidebar />
        <div className="ml-64 flex-1">
          <AdminDashboard />
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;