import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NAV_GROUPS, GLOBAL_SECTIONS, INPUT } from './config';
import { Icon } from './ManagementUI';

const STORAGE_KEY = 'api-management:nav-collapsed';
const readCollapsed = () => {
  try { return window.localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
};

export default function ManagementNavigation({ section, onNavigate, disabled, hasProject = true }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [filter, setFilter] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch { /* storage unavailable */ }
  }, [collapsed]);

  const term = filter.trim().toLowerCase();
  const groups = useMemo(() => NAV_GROUPS
    .map(([group, items]) => [group, items.filter(([name]) => !term || name.toLowerCase().includes(term) || group.toLowerCase().includes(term))])
    .filter(([, items]) => items.length), [term]);
  const matches = groups.reduce((total, [, items]) => total + items.length, 0);
  const activeGroup = NAV_GROUPS.find(([, items]) => items.some(([name]) => name === section))?.[0];

  const jumpToFirst = event => {
    if (event.key !== 'Enter') return;
    const first = groups[0]?.[1]?.[0]?.[0];
    if (first) { setFilter(''); onNavigate(first); }
  };

  return <>
    <div className="mb-4 lg:hidden">
      <label htmlFor="api-section-navigation" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-neutral-500">API Management section</label>
      <select id="api-section-navigation" value={section} disabled={disabled} onChange={event => onNavigate(event.target.value)} className={INPUT}>
        {NAV_GROUPS.map(([group, items]) => <optgroup key={group} label={group}>{items.map(([name]) => <option key={name}>{name}</option>)}</optgroup>)}
      </select>
    </div>
    <aside className={`sticky top-4 hidden max-h-[calc(100vh-2rem)] shrink-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:flex ${collapsed ? 'w-[60px]' : 'w-64'}`}>
      <div className="shrink-0 p-2 pb-0">
        <button type="button" aria-label={collapsed ? 'Expand API navigation' : 'Collapse API navigation'} aria-expanded={!collapsed}
          onClick={() => { setCollapsed(value => !value); setFilter(''); }}
          className="flex min-h-10 w-full items-center gap-2 rounded-xl px-2 text-neutral-500 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-neutral-800">
          <Icon name={collapsed ? 'right_panel_open' : 'left_panel_close'} />
          {!collapsed && <span className="text-xs font-semibold">Workspace navigation</span>}
        </button>
        {!collapsed && <div className="relative mt-2">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"><Icon name="search" className="text-[17px]" /></span>
          <input ref={searchRef} type="search" aria-label="Filter API Management sections" placeholder="Filter sections…" value={filter} disabled={disabled}
            onChange={event => setFilter(event.target.value)} onKeyDown={jumpToFirst}
            className="min-h-9 w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 pl-8 pr-2 text-xs text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[var(--portal-accent)] focus:bg-white focus:ring-2 focus:ring-[var(--portal-accent)]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:bg-neutral-900" />
        </div>}
      </div>
      <nav aria-label="API Management" className="min-h-0 flex-1 overflow-y-auto p-2 pt-3">
        {!groups.length
          ? <p className="px-3 py-6 text-center text-xs text-neutral-500">No section matches “{filter.trim()}”.</p>
          : groups.map(([group, items]) => <div key={group} className="mb-3">
            {!collapsed && <p className={`mb-1 px-3 text-[10px] font-bold uppercase tracking-wider ${group === activeGroup ? 'text-[var(--portal-accent)]' : 'text-neutral-400'}`}>{group}</p>}
            {items.map(([name, icon]) => {
              const current = section === name;
              const needsProject = !hasProject && !GLOBAL_SECTIONS.has(name);
              return <button key={name} type="button" disabled={disabled} aria-current={current ? 'page' : undefined}
                title={collapsed ? (needsProject ? `${name} · requires a project` : name) : undefined}
                onClick={() => { setFilter(''); onNavigate(name); }}
                className={`mb-0.5 flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${current ? 'bg-[var(--portal-accent-soft)] font-bold text-[var(--portal-accent)]' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'}`}>
                <Icon name={icon} className="shrink-0" />
                {!collapsed && <>
                  {needsProject && !current && <Icon name="folder_off" className="order-last shrink-0 text-[15px] text-neutral-300 dark:text-neutral-600" />}
                  <span className="min-w-0 flex-1 leading-snug">{name}</span>
                </>}
              </button>;
            })}
          </div>)}
      </nav>
      {!collapsed && (term
        ? <p aria-live="polite" className="shrink-0 border-t border-neutral-100 px-3 py-2 text-[10px] text-neutral-400 dark:border-neutral-800">{matches} section{matches === 1 ? '' : 's'} · press Enter to open the first</p>
        : !hasProject && <p className="flex shrink-0 items-center gap-1.5 border-t border-neutral-100 px-3 py-2 text-[10px] text-neutral-400 dark:border-neutral-800"><Icon name="folder_off" className="shrink-0 text-[14px]" />Needs a selected project</p>)}
    </aside>
  </>;
}
