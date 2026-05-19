import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const roleCanDelete = (role = '') => ['admin', 'super_admin'].includes(String(role).toLowerCase());

const LawSidebar = ({ projects = [], counts = {} }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState('agreements');
  if (!canAccessPortal(user, PORTALS.LAW)) return null;

  const role = String(user?.role || '').toLowerCase();
  const canSeeDeleteActions = roleCanDelete(role);

  const projectChildren = (moduleKey) =>
    projects.map((p) => ({
      key: `${moduleKey}-project-${p._id}`,
      label: p.name || 'Project',
      path: `/law/${moduleKey}/project/${p._id}`,
    }));

  const menus = useMemo(
    () => [
      {
        key: 'agreements',
        label: 'Agreements',
        icon: 'contract',
        children: [
          { key: 'all', label: 'All Agreements', path: '/law/agreements' },
          { key: 'create', label: 'Create Agreement', path: '/law/agreements/create' },
          ...projectChildren('agreements'),
          { key: 'archived', label: 'Archived', path: '/law/agreements?status=Archived' },
        ],
      },
      {
        key: 'policy',
        label: 'Privacy & Policy',
        icon: 'policy',
        children: [
          { key: 'all', label: 'All Policies', path: '/law/policy' },
          { key: 'create', label: 'Create Policy', path: '/law/policy/create' },
          ...projectChildren('policy'),
          { key: 'compliance', label: 'Compliance Reports', path: '/law/policy?tab=compliance' },
        ],
      },
      {
        key: 'disputes',
        label: 'Disputes & Fraud',
        icon: 'balance',
        children: [
          { key: 'active', label: 'Active Cases', path: '/law/disputes?status=Pending' },
          { key: 'raise', label: 'Raise Case', path: '/law/disputes/create' },
          ...projectChildren('disputes'),
        ],
      },
      {
        key: 'ip',
        label: 'IP & Copyright',
        icon: 'copyright',
        children: [
          { key: 'reg', label: 'Registered IP', path: '/law/ip' },
          { key: 'file', label: 'File IP', path: '/law/ip/create' },
          ...projectChildren('ip'),
        ],
      },
      {
        key: 'work-hire',
        label: 'Work on Hire',
        icon: 'assignment_ind',
        children: [
          { key: 'free', label: 'Freelancer Contracts', path: '/law/work-hire?type=freelancer' },
          { key: 'emp', label: 'Employee Contracts', path: '/law/work-hire?type=employee' },
        ],
      },
      {
        key: 'third-party',
        label: 'Third Party',
        icon: 'handshake',
        children: [
          { key: 'vendor', label: 'Vendor Agreements', path: '/law/third-party?vendor=true' },
          { key: 'external', label: 'External Contracts', path: '/law/third-party' },
        ],
      },
    ],
    [projects]
  );

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
        <button
          type="button"
          onClick={() => navigate('/law/dashboard')}
          className={`mb-2 flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left text-sm transition-all ${
            location.pathname === '/law/dashboard'
              ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white font-semibold shadow-md'
              : 'border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
          }`}
        >
          <span className="material-symbols-outlined text-xl">dashboard</span>
          <span className="flex-1 font-medium">Dashboard</span>
        </button>

        {menus.map((menu) => {
          const isOpen = openMenu === menu.key;
          return (
            <div key={menu.key} className="mb-2">
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => (prev === menu.key ? '' : menu.key))}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <span className="material-symbols-outlined text-lg">{menu.icon}</span>
                <span className="flex-1 font-medium">{menu.label}</span>
                <span className={`material-symbols-outlined text-base transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 pl-8 pr-1 pb-1 pt-1">
                    {menu.children.map((child) => {
                      const active = location.pathname + location.search === child.path || location.pathname === child.path;
                      return (
                        <button
                          key={child.key}
                          type="button"
                          onClick={() => navigate(child.path)}
                          className={`w-full rounded-md px-3 py-2 text-left text-xs transition ${
                            active
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <p className="px-3 pb-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          Active Cases: {counts.activeCases || 0} • Expiring: {counts.expiring || 0}
        </p>
        {!canSeeDeleteActions ? (
          <p className="px-3 pb-2 text-[11px] text-amber-600 dark:text-amber-400">Limited access role</p>
        ) : null}
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
