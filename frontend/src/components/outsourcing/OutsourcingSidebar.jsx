import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const links = [
  { to: '/outsourcing/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/outsourcing/projects', label: 'Projects', icon: 'apps' },
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
  const location = useLocation();
  if (!canAccessPortal(user, PORTALS.OUTSOURCING)) return null;

  const onLogout = async () => {
    await logout();
    onClose();
    navigate('/outsourcing/login', { replace: true });
  };

  const SidebarBody = ({ mobile = false }) => (
    <div className="flex h-full flex-col overflow-hidden border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
            <span className="material-symbols-outlined text-xl">work</span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-neutral-900 dark:text-neutral-100">Outsourcing Portal</h2>
          </div>
          {mobile ? (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex size-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 md:hidden"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex min-h-11 items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
          </div>
          <span className="rounded-full bg-[color:var(--portal-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--portal-accent)]">
            {user?.role || 'freelancer'}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-2">
          {links.map((link) => {
            const isActive = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={`group relative flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white font-semibold shadow-md'
                    : 'border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >
                  {link.icon}
                </span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{link.label}</div>
                </div>
                {isActive ? <span className="material-symbols-outlined text-lg">chevron_right</span> : null}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="flex-1 text-left font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-[1000] hidden h-screen w-[250px] shadow-lg md:block">
        <SidebarBody />
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
        <SidebarBody mobile />
      </aside>
    </>
  );
};

export default OutsourcingSidebar;
