import React from 'react';
import { NavLink } from 'react-router-dom';
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

const OutsourcingSidebar = () => {
  const { user } = useAuth();
  if (!canAccessPortal(user, PORTALS.OUTSOURCING)) return null;

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[250px] flex-col overflow-hidden border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:flex">
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="rounded-xl bg-neutral-900 p-4 text-white dark:bg-white dark:text-black">
        <p className="text-xs uppercase tracking-[0.14em] opacity-80">Workspace</p>
        <h2 className="text-lg font-bold">Freelancer Portal</h2>
        </div>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
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
    </aside>
  );
};

export default OutsourcingSidebar;
