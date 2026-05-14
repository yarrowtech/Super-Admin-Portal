import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MobilePortalNav = ({ title = 'Portal', subtitle = '', icon = 'dashboard', items = [] }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderItem = (item) => {
    const active = item.active ?? (item.path ? location.pathname === item.path || location.pathname.startsWith(`${item.path}/`) : false);
    const content = (
      <>
        <span className="material-symbols-outlined text-lg">{item.icon || 'chevron_right'}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </>
    );

    const className = `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'bg-primary text-white shadow-sm'
        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
    }`;

    if (item.path) {
      return (
        <NavLink key={item.key || item.path} to={item.path} className={className}>
          {content}
        </NavLink>
      );
    }

    return (
      <button
        key={item.key || item.label}
        type="button"
        onClick={() => {
          item.onClick?.();
          setOpen(false);
        }}
        className={`${className} w-full text-left`}
      >
        {content}
      </button>
    );
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-700 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-200 dark:hover:bg-neutral-800"
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {subtitle || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Workspace'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 dark:text-red-400 dark:hover:bg-red-900/20"
          aria-label="Logout"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/50 transition-opacity duration-300" onClick={() => setOpen(false)} aria-label="Close navigation overlay" />
          <aside className="relative flex h-full w-[min(22rem,88vw)] flex-col border-r border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle || user?.email || 'Navigation'}</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">{items.map(renderItem)}</div>
            </nav>
            <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default MobilePortalNav;
