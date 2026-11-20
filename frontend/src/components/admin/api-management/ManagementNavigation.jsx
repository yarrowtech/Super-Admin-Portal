import React, { useState } from 'react';
import { NAV_GROUPS, INPUT } from './config';
import { Icon } from './ManagementUI';

export default function ManagementNavigation({ section, onNavigate, disabled }) {
  const [collapsed, setCollapsed] = useState(false);
  return <>
    <div className="mb-4 lg:hidden"><label htmlFor="api-section-navigation" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-neutral-500">API Management section</label><select id="api-section-navigation" value={section} disabled={disabled} onChange={event => onNavigate(event.target.value)} className={INPUT}>{NAV_GROUPS.map(([group, items]) => <optgroup key={group} label={group}>{items.map(([name]) => <option key={name}>{name}</option>)}</optgroup>)}</select></div>
    <aside className={`sticky top-4 hidden max-h-[calc(100vh-2rem)] shrink-0 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900 lg:block ${collapsed ? 'w-[60px]' : 'w-56'}`}>
      <button type="button" aria-label={collapsed ? 'Expand API navigation' : 'Collapse API navigation'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)} className="mb-2 flex min-h-10 w-full items-center gap-2 rounded-xl px-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-neutral-800"><Icon name={collapsed ? 'right_panel_open' : 'left_panel_close'} />{!collapsed && <span className="text-xs font-semibold">Workspace navigation</span>}</button>
      <nav aria-label="API Management">{NAV_GROUPS.map(([group, items]) => <div key={group} className="mb-3">{!collapsed && <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{group}</p>}{items.map(([name, icon]) => <button key={name} type="button" disabled={disabled} aria-current={section === name ? 'page' : undefined} title={collapsed ? name : undefined} onClick={() => onNavigate(name)} className={`mb-0.5 flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${section === name ? 'bg-[var(--portal-accent-soft)] font-bold text-[var(--portal-accent)]' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'}`}><Icon name={icon} className="shrink-0" />{!collapsed && <span>{name}</span>}</button>)}</div>)}</nav>
    </aside>
  </>;
}
