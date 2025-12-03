import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
  { label: 'User Management', icon: 'group', path: '/admin/users' },
  { label: 'Departments', icon: 'corporate_fare', path: '/admin/departments' },
  { label: 'Security', icon: 'security', path: '/admin/security' },
  { label: 'Reports', icon: 'bar_chart', path: '/admin/reports' },
  { label: 'Workflows', icon: 'account_tree', path: '/admin/workflows' },
];

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col border-r border-neutral-200 bg-white p-4 text-neutral-800 dark:border-neutral-800 dark:bg-background-dark dark:text-neutral-100">
      <div className="mb-8 flex items-center gap-3 px-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
          <span className="material-symbols-outlined text-2xl">shield_person</span>
        </div>
        <div>
          <p className="text-lg font-bold leading-tight">Admin Portal</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Control Center</p>
        </div>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
              >
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800">
          <span className="material-symbols-outlined">settings</span>
          Settings
        </button>
        <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800">
          <span className="material-symbols-outlined">help</span>
          Support
        </button>
        <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800">
          <span className="material-symbols-outlined">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
