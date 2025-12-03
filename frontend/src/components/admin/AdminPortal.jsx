import React from 'react';
import AdminSidebar from './AdminSidebar';

const AdminPortal = ({ children }) => {
  return (
    <div className="relative flex min-h-screen w-full font-display bg-background-light text-neutral-800 dark:bg-background-dark dark:text-neutral-100">
      <AdminSidebar />
      <div className="ml-64 flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
};

export default AdminPortal;
