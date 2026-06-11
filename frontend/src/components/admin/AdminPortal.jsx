import React from 'react';
import AdminSidebar from './AdminSidebar';
import { useSidebar } from '../../context/SidebarContext';

const AdminPortal = ({ children }) => {
  const { collapsed } = useSidebar();
  return (
    <div
      className="portal-shell relative flex min-h-screen w-full font-display bg-background-light text-neutral-800 dark:bg-background-dark dark:text-neutral-100"
      data-role="admin"
    >
      <AdminSidebar />
      <div
        className={`portal-content flex-1 overflow-x-hidden pt-16 transition-[margin] duration-300 ease-out-expo md:pt-0 ${
          collapsed ? 'md:ml-16' : 'md:ml-[250px]'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default AdminPortal;
