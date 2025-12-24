import React, { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navLinks = [
  { label: 'Dashboard', icon: 'dashboard', path: '/hr/dashboard' },
  { label: 'Applicants', icon: 'group', path: '/hr/applicants' },
  { label: 'Attendance', icon: 'calendar_month', path: '/hr/attendance' },
  { label: 'Employees', icon: 'badge', path: '/hr/employees' },
  { label: 'Leave', icon: 'hourglass_empty', path: '/hr/leave' },
  { label: 'Notices', icon: 'campaign', path: '/hr/notices' },
  { label: 'Performance', icon: 'trending_up', path: '/hr/performance' },
  { label: 'Staff Work Report', icon: 'assessment', path: '/hr/staff-report' },
  { label: 'Complaint & Solutions', icon: 'report', path: '/hr/complaints' },
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
      <div className="flex flex-col gap-4">
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
        <div className="flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm leading-normal transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'font-medium text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-white/10'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-4">
        <button className="flex h-10 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white">
          <span className="truncate">Post Announcement</span>
        </button>
        <div className="flex flex-col gap-1">
          <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-normal text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-white/10">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-normal text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default HRSidebar;
