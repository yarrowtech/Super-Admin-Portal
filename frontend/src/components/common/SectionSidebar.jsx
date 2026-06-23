import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

const MiniTooltip = memo(({ label }) => (
  <span
    className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-white dark:text-neutral-900"
    aria-hidden="true"
  >
    {label}
    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-white" />
  </span>
));

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
  const { collapsed, toggle } = useSidebar();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebarW = collapsed ? 'w-16' : 'w-[250px]';

  return (
    <aside
      className={`fixed left-0 top-0 z-[1000] hidden h-screen shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white shadow-sidebar transition-[width] duration-300 ease-out-expo dark:border-neutral-800 dark:bg-neutral-950 md:flex ${sidebarW}`}
    >
      {/* Branding + collapse toggle */}
      <div className={`flex shrink-0 items-center border-b border-neutral-100 dark:border-neutral-800 ${collapsed ? 'justify-center py-3.5' : 'gap-3 px-4 py-3.5'}`}>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--portal-accent)] to-[var(--portal-accent)]/70 text-white shadow-md">
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
              <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{subtitle}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 ${collapsed ? '' : 'ml-auto'}`}
        >
          <span className="material-symbols-outlined text-[18px]">{collapsed ? 'menu_open' : 'menu'}</span>
        </button>
      </div>

      {/* User Info */}
      {user && !collapsed && (
        <div className="shrink-0 px-3 py-2.5">
          <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-xs font-bold text-[var(--portal-accent)]">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{user.firstName} {user.lastName}</p>
              <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{user.email}</p>
            </div>
            {user.role && (
              <span className="shrink-0 rounded-full bg-[var(--portal-accent-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--portal-accent)]">
                {user.role}
              </span>
            )}
          </div>
        </div>
      )}

      {user && collapsed && (
        <div className="group relative flex shrink-0 justify-center py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-xs font-bold text-[var(--portal-accent)]">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <MiniTooltip label={`${user.firstName} ${user.lastName} · ${user.role || ''}`} />
        </div>
      )}

      {!collapsed && <div className="mx-3 mb-1 mt-0.5 h-px bg-neutral-100 dark:bg-neutral-800" />}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
        <div className="space-y-0.5">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/70'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                aria-label={collapsed ? item.label : undefined}
              >
                <span
                  className={`material-symbols-outlined shrink-0 text-[20px] ${collapsed ? 'mx-auto' : ''}`}
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate font-medium leading-none">{item.label}</div>
                      {item.description && !isActive && (
                        <div className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-500">{item.description}</div>
                      )}
                    </div>
                    {item.badge > 0 && !isActive && (
                      <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                    {isActive && <span className="material-symbols-outlined shrink-0 text-[14px] text-white/70">chevron_right</span>}
                  </>
                )}
                {collapsed && item.badge > 0 && !isActive && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white dark:ring-neutral-950">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {collapsed && <MiniTooltip label={item.badge > 0 ? `${item.label} (${item.badge})` : item.label} />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-neutral-100 px-2 pb-3 pt-2 dark:border-neutral-800">
        <button
          type="button"
          onClick={handleLogout}
          className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-all duration-150 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 ${collapsed ? 'justify-center px-0' : ''}`}
          aria-label={collapsed ? 'Logout' : undefined}
        >
          <span className={`material-symbols-outlined shrink-0 text-[20px] ${collapsed ? 'mx-auto' : ''}`}>logout</span>
          {!collapsed && <span className="flex-1 text-left">Logout</span>}
          {collapsed && <MiniTooltip label="Logout" />}
        </button>
      </div>
    </aside>
  );
};

export default SectionSidebar;
