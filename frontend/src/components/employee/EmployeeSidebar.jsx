import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Overview', icon: 'dashboard', path: '/employee/dashboard' },
  { label: 'Projects', icon: 'folder', path: '/employee/projects' },
  { label: 'Tasks', icon: 'check_circle', path: '/employee/tasks' },
  { label: 'Documents', icon: 'description', path: '/employee/documents' },
  { label: 'Directory', icon: 'group', path: '/employee/team' },
  { label: 'Chat', icon: 'forum', path: '/employee/chat' },
];

const quickLinks = [
  { label: 'Standup Notes', icon: 'pending_actions' },
  { label: 'Timesheet', icon: 'schedule' },
  { label: 'Support', icon: 'support_agent' },
];

const EmployeeSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = useMemo(() => {
    if (!user) return 'Employee';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.name || 'Employee';
  }, [user]);

  const initials = displayName?.[0]?.toUpperCase() || 'E';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 md:flex">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-400 text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-2xl">blur_on</span>
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Employee</p>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Workplace</h1>
            </div>
          </div>
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="material-symbols-outlined text-lg"
                      style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-white font-semibold">
              {initials}
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role ? user.role.toUpperCase() : 'TEAM MEMBER'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500 hover:text-red-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-400 dark:hover:text-red-400"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default EmployeeSidebar;
