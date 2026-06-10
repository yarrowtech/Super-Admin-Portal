import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SectionSidebar = ({
  title = 'Portal',
  subtitle = 'Department',
  icon = 'dashboard',
  items = [],
  activeId = '',
  onSelect,
}) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-10 hidden h-screen w-[250px] shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900 md:flex">
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{subtitle}</p>
          </div>
        </div>
      </div>

      {user && (
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex min-h-11 items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
            </div>
            {user.role && (
              <span className="rounded-full bg-[color:var(--portal-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--portal-accent)]">
                {user.role}
              </span>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-2">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={`group relative flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left text-sm transition-all ${
                  isActive
                    ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white font-semibold shadow-md'
                    : 'border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}>
                  {item.icon}
                </span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  {item.description && !isActive ? (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{item.description}</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <button
          onClick={handleLogout}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="flex-1 text-left font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default SectionSidebar;
