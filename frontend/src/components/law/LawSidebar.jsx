import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const LawSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!canAccessPortal(user, PORTALS.LAW)) return null;

  const menus = [
    { key: 'dashboard', label: 'Workflow', icon: 'gavel', path: '/law/dashboard' },
    { key: 'legal-docs', label: 'Legal Documents', icon: 'description', path: '/law/legal-docs' },
    { key: 'legal-library', label: 'Approved Library', icon: 'library_books', path: '/law/legal-library' },
    { key: 'agreements', label: 'Agreements', icon: 'contract', path: '/law/agreements' },
    { key: 'policy', label: 'Privacy & Policy', icon: 'policy', path: '/law/policy' },
    { key: 'disputes', label: 'Disputes & Fraud', icon: 'balance', path: '/law/disputes' },
    { key: 'ip', label: 'IP & Copyright', icon: 'copyright', path: '/law/ip' },
    { key: 'work-hire', label: 'Work on Hire', icon: 'assignment_ind', path: '/law/work-hire' },
    { key: 'third-party', label: 'Third Party', icon: 'handshake', path: '/law/third-party' },
  ];

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-10 hidden h-screen w-[250px] shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:flex">
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-600 to-rose-500 text-white shadow-lg">
            <span className="material-symbols-outlined text-xl">gavel</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">LAW Dashboard</h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Legal Department</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {menus.map((menu) => {
          const active = location.pathname.startsWith(menu.path);
          return (
            <button
              key={menu.key}
              type="button"
              onClick={() => navigate(menu.path)}
              className={`mb-2 flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left text-sm transition-all ${
                active
                  ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white font-semibold shadow-md'
                  : 'border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{menu.icon}</span>
              <span className="flex-1 font-medium">{menu.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <button
          onClick={onLogout}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="flex-1 text-left font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default LawSidebar;
