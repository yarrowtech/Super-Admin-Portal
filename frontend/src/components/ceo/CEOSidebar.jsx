import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const CEOSidebar = ({ onViewChange }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  if (!canAccessPortal(user, PORTALS.CEO)) return null;

  const menuItems = [
    { key: 'dashboard', label: 'Overview Dashboard', icon: 'dashboard' },
    { key: 'revenueAnalytics', label: 'Revenue Analytics', icon: 'payments' },
    { key: 'productInsights', label: 'Product Insights', icon: 'insights' },
    { key: 'employees', label: 'Employee Analytics', icon: 'groups' },
    { key: 'departmentStats', label: 'Department Insights', icon: 'bar_chart' },
    { key: 'reports', label: 'Reports', icon: 'summarize' },
    { key: 'projectUpdates', label: 'Project Updates', icon: 'update' },
    { key: 'legalApproval', label: 'Legal Approval', icon: 'gavel', badge: true },
    { key: 'chat', label: 'Chat', icon: 'chat' },
    { key: 'notifications', label: 'Notifications', icon: 'notifications' },
  ];

  const handleViewChange = (view) => {
    setActiveView(view);
    if (onViewChange) onViewChange(view);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-10 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-background-dark md:flex">
      <div className="mb-4 flex items-center gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-700">
        <div
          className="size-10 rounded-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80")',
          }}
        />
        <div>
          <h1 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">CEO Console</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Executive Access</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {menuItems.map((item) => {
          const active = activeView === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                active
                  ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/20'
                  : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/10'
              }`}
              onClick={() => handleViewChange(item.key)}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        <span className="material-symbols-outlined text-base">add</span>
        <span>New Report</span>
      </button>

      <button
        type="button"
        className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
        onClick={handleLogout}
      >
        <span className="material-symbols-outlined text-base">logout</span>
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default CEOSidebar;
