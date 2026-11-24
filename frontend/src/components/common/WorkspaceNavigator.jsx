import { useId, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getWorkspaceNavigation } from '../../config/workspaceNavigation';
import Modal from '../ui/Modal';

export default function WorkspaceNavigator() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchId = useId();
  const items = useMemo(() => getWorkspaceNavigation(user), [user]);
  if (!user || !items.length) return null;
  const visible = items.filter(item => `${item.label} ${item.section} ${item.description || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const sections = [...new Set(visible.map(item => item.section))];
  return <>
    <button type="button" onClick={() => { setSearch(''); setOpen(true); }} className="workspace-navigator-trigger inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:bg-white dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300" aria-haspopup="dialog">
      <span className="material-symbols-outlined text-lg" aria-hidden="true">search</span>
      Find a page
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="Your workspaces" description="Search the pages available to your role. Switch workspaces without signing out." className="sm:max-w-xl">
      <label className="block text-sm font-medium" htmlFor={searchId}>Search pages and workspaces</label>
      <input id={searchId} data-workspace-search type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try invoices, attendance or projects" className="app-input mt-2" />
      <p className="mt-3 text-xs text-neutral-500" role="status">{visible.length} {visible.length === 1 ? 'page' : 'pages'} available</p>
      <nav aria-label="Workspace pages" className="mt-3 max-h-[48dvh] space-y-4 overflow-y-auto overscroll-contain pr-1">
        {sections.map(section => <div key={section}>
          <h3 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{section}</h3>
          {visible.filter(item => item.section === section).map(item => {
            const current = `${location.pathname}${location.search}` === item.path;
            return <button type="button" key={item.path} onClick={() => { setOpen(false); navigate(item.path); }} aria-current={current ? 'page' : undefined} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-neutral-100 focus-visible:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800">
              <span className="material-symbols-outlined rounded-lg bg-neutral-100 p-2 text-lg text-neutral-500 dark:bg-neutral-800" aria-hidden="true">{item.icon || 'chevron_right'}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span>{item.description && <span className="block text-xs text-neutral-500">{item.description}</span>}</span>
              {current && <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">Current</span>}
            </button>;
          })}
        </div>)}
        {!visible.length && <div className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-800">No matching pages. Try a different name or clear your search.</div>}
      </nav>
    </Modal>
  </>;
}
