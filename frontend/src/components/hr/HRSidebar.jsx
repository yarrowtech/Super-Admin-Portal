import React, { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navSections = [
  { id: 'employee-management', label: 'Employee Management', icon: 'manage_accounts', path: '/hr/system#employee-management' },
  { id: 'attendance-management', label: 'Attendance Management', icon: 'calendar_month', path: '/hr/system#attendance-management' },
  { id: 'leave-management', label: 'Leave Management', icon: 'hourglass_empty', path: '/hr/system#leave-management' },
  { id: 'recruitment-hiring', label: 'Recruitment and Hiring', icon: 'work', path: '/hr/system#recruitment-hiring' },
  { id: 'performance-appraisal', label: 'Performance & Appraisal', icon: 'trending_up', path: '/hr/system#performance-appraisal' },
  { id: 'policy-compliance', label: 'Policy, Compliance and Documentation', icon: 'gavel', path: '/hr/system#policy-compliance' },
  { id: 'employee-communication', label: 'Employee Communication and Report', icon: 'campaign', path: '/hr/system#employee-communication' },
];

const HRSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = useMemo(() => {
    if (!user) return 'HR';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.name || user.email || 'HR';
  }, [user]);

  const subtitle = user?.department || (user?.role ? `${user.role.toUpperCase()} Department` : 'HR Department');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-10 flex h-screen w-64 flex-col border-r border-neutral-200 bg-white p-4 text-neutral-800 dark:border-neutral-800 dark:bg-background-dark dark:text-neutral-100">
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-full bg-cover bg-center bg-no-repeat"
            data-alt="User avatar image"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_HFSbNHCmNgTeKZAiFk2MqdSEqd36bsfGVXM1jMm4u-rmgBnoBDcVJpkRH2VlN__XL8gTeUCSNaWwJKRI1aQWTzEJFlZwOsBOty_vqThHZd_iMdGC6uv-at2zgu8HswCT2SKDxAFdEANBncCJPPnVF1JdJE9LC2WD9x9fHsLvY8x4J6_F_lwFafZnDp-dxW2kdcZUMybmvUNwjVpPxdbp4V3asAgzpdG_97qVGZe72iXV5Qth5NM66WFVrkCjZS88_sYOYcCBphv1")',
            }}
          ></div>
          <div className="flex flex-col">
            <h1 className="text-base font-medium leading-normal">{displayName}</h1>
            <p className="text-sm font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
          <NavLink
            to="/hr/dashboard"
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-400 to-purple-600 text-white shadow-inner'
                  : 'text-neutral-700 hover:bg-purple-100 hover:shadow-inner dark:text-neutral-100 dark:hover:bg-white/10'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="whitespace-nowrap">Dashboard</span>
          </NavLink>
          {navSections.map((link) => {
            const targetHash = link.path.split('#')[1] || '';
            const currentHash = location.hash.replace('#', '');
            const isActive = location.pathname === '/hr/system' && currentHash === targetHash;
            return (
              <NavLink
                key={link.id}
                to={link.path}
                className={`group flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-400 to-purple-600 text-white shadow-inner'
                    : 'text-neutral-700 hover:bg-purple-100 hover:shadow-inner dark:text-neutral-100 dark:hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                <span className="whitespace-nowrap">{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold text-neutral-700 transition-all hover:bg-purple-100 hover:shadow-inner dark:text-neutral-100 dark:hover:bg-white/10"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default HRSidebar;
