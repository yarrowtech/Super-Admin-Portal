import React from 'react';
import { Outlet } from 'react-router-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OutsourcingSidebar from './OutsourcingSidebar';

const mobileLinks = [
  { to: '/outsourcing/dashboard', label: 'Dashboard' },
  { to: '/outsourcing/jobs', label: 'Jobs' },
  { to: '/outsourcing/contracts', label: 'Contracts' },
  { to: '/outsourcing/time-logs', label: 'Logs' },
  { to: '/outsourcing/activity', label: 'Activity' },
  { to: '/outsourcing/invoices', label: 'Invoices' },
  { to: '/outsourcing/payments', label: 'Payments' },
  { to: '/outsourcing/notifications', label: 'Alerts' },
  { to: '/outsourcing/profile', label: 'Profile' }
];

const OutsourcingPortal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/outsourcing/login', { replace: true });
  };
  const onProfilePage = location.pathname === '/outsourcing/profile';

  return (
    <div className="flex min-h-screen overflow-x-clip bg-gradient-to-br from-neutral-100 via-neutral-50 to-white dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <OutsourcingSidebar />
      <div className="flex-1 p-3 tb:p-4 lap:ml-64 lap:p-6">
        <div className="sticky-topbar mb-3 rounded-2xl border border-neutral-200/80 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 md:mb-4 md:p-4">
          <div className="flex items-center justify-end gap-2">
            <div className="mr-2 hidden text-right md:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">Signed In</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{user?.firstName || 'User'}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.role || 'freelancer'}</p>
            </div>
            <button
              onClick={() => navigate('/outsourcing/profile')}
              disabled={onProfilePage}
              className="touch-btn rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
            >
              My Profile
            </button>
            <button
              onClick={handleLogout}
              className="touch-btn rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-black"
            >
              Logout
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {mobileLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    isActive
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-neutral-300 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default OutsourcingPortal;
