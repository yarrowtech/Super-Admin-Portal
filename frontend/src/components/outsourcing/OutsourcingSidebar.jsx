import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const links = [
  { to: '/outsourcing/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/outsourcing/jobs', label: 'Jobs', icon: 'work' },
  { to: '/outsourcing/contracts', label: 'Contracts', icon: 'contract' },
  { to: '/outsourcing/time-logs', label: 'Time Logs', icon: 'schedule' },
  { to: '/outsourcing/activity', label: 'Activity', icon: 'timeline' },
  { to: '/outsourcing/invoices', label: 'Invoices', icon: 'receipt_long' },
  { to: '/outsourcing/payments', label: 'Payments', icon: 'payments' },
  { to: '/outsourcing/notifications', label: 'Notifications', icon: 'notifications' },
  { to: '/outsourcing/profile', label: 'Profile', icon: 'person' }
];

const OutsourcingSidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!canAccessPortal(user, PORTALS.OUTSOURCING)) return null;

  const onLogout = async () => {
    await logout();
    onClose();
    navigate('/outsourcing/login', { replace: true });
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="rounded-xl bg-neutral-900 p-4 text-white dark:bg-white dark:text-black">
          <p className="text-xs uppercase tracking-[0.14em] opacity-80">Workspace</p>
          <h2 className="text-lg font-bold">Freelancer Portal</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 md:hidden"
          aria-label="Close menu"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition ${
                isActive
                  ? 'border-primary bg-neutral-900 text-white shadow dark:bg-white dark:text-black'
                  : 'border-transparent text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <div className="mb-2 rounded-lg bg-neutral-100 p-2.5 dark:bg-neutral-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400">Signed In</p>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{user?.firstName || 'User'}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.role || 'freelancer'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NavLink
            to="/outsourcing/profile"
            onClick={onClose}
            className="touch-btn inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-900"
          >
            Profile
          </NavLink>
          <button
            type="button"
            onClick={onLogout}
            className="touch-btn rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 hidden h-screen w-[250px] flex-col overflow-hidden border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        {sidebarContent}
      </aside>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[84%] max-w-[300px] flex-col overflow-hidden border-r border-neutral-200 bg-white shadow-2xl transition-transform dark:border-neutral-800 dark:bg-neutral-900 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Outsourcing menu"
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default OutsourcingSidebar;
