import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/manager/dashboard' },
  { label: 'Products', icon: 'inventory_2', path: '/manager/products' },
  { label: 'Team', icon: 'group', path: '/manager/team' },
  { label: 'Reports', icon: 'assessment', path: '/manager/reports' },
];

const ManagerSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 overflow-hidden border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800/20">
      <div className="flex h-full min-h-[700px] flex-col justify-between p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-2">
            <div
              className="size-10 rounded-full bg-cover bg-center"
              data-alt="Manager's profile picture"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0NyPTg6QnGCd6bzahKXvW46dMD1lNfA6X1S32qTZUncNY2RHoZso_crxkUid-qUOnXTPDD6Ccnu_OxR-mOryUr8iUkAXX8sDkFZVq-13kCqal55UCl9oxbkSdJDZuvPTU58zA51yJ-SdljQlsmDOKpf6BC0x_ziY7ylYopUR2N9AJfoMojwIWulwTme9skA2VGi9mrQzahcmnEMRx1mMW69GK9i92zZHgfwRD8ULc-bRTn9wl5NsG0O9hNTa3RLtdtWWMu_N0G4Gj")',
              }}
            ></div>
            <div className="flex flex-col">
              <h1 className="text-base font-medium text-gray-800 dark:text-white">Sangeet Chowdhury</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Project Manager</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50'
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
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <button className="flex h-10 min-w-[84px] max-w-[480px] items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-primary/90">
            <span className="truncate">New Project</span>
          </button>
          <div className="flex flex-col gap-1 border-t border-gray-200 pt-4 dark:border-gray-800">
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50">
              <span className="material-symbols-outlined">settings</span>
              Settings
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-800/50">
              <span className="material-symbols-outlined">logout</span>
              Log Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ManagerSidebar;
