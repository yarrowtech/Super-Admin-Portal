import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ThemeToggleButton from './ThemeToggleButton';

const PortalSidebar = ({
  brandingTitle = 'Portal',
  brandingSubtitle = 'Management System',
  brandingIcon = 'dashboard',
  user,
  navItems = [],
  currentPath = '',
  onLogout,
}) => {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const footerItems = [
    { path: '/settings', label: 'Settings', icon: 'settings', description: 'Manage preferences' },
    { path: '/support', label: 'Support', icon: 'help', description: 'Get help' },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* Branding */}
      <div className="border-b border-neutral-200 p-6 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
            <span className="material-symbols-outlined text-xl">{brandingIcon}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{brandingTitle}</h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{brandingSubtitle}</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-primary text-white font-semibold shadow-md'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >
                  {item.icon}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  {hoveredItem === item.path && !isActive && item.description && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{item.description}</div>
                  )}
                </div>
                {isActive && <span className="material-symbols-outlined text-lg">chevron_right</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer - Settings, Theme Toggle, Support, Logout */}
      <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <div className="space-y-1 mb-3">
          {footerItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                  isActive
                    ? 'bg-primary text-white font-semibold shadow-md'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >
                  {item.icon}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  {hoveredItem === item.path && !isActive && item.description && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{item.description}</div>
                  )}
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="flex-1 text-left font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default PortalSidebar;
