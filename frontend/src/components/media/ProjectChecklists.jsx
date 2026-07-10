import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

const ProjectChecklists = ({ projectId }) => {
  const { token } = useAuth();
  const [checklists, setChecklists] = useState([]);
  const [newItem, setNewItem] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token || !projectId) return;
    try {
      const res = await departmentApi.getMediaChecklists(token, { projectId });
      setChecklists(res?.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load checklists.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId]);

  const addItem = async (checklistType) => {
    const label = (newItem[checklistType] || '').trim();
    if (!label) return;
    setBusy(true);
    try {
      await departmentApi.addMediaChecklistItem(token, checklistType, label, { projectId });
      setNewItem((prev) => ({ ...prev, [checklistType]: '' }));
      await load();
    } catch (err) {
      setError(err.message || 'Failed to add item.');
    } finally {
      setBusy(false);
    }
  };

  const toggleItem = async (checklistType, itemId) => {
    setBusy(true);
    try {
      await departmentApi.toggleMediaChecklistItem(token, checklistType, itemId, { projectId });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update item.');
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) {
    return (
      <section className={card}>
        <h2 className="text-xl font-black text-slate-950 dark:text-neutral-100">Project Checklists</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Select a project to manage launch readiness checklists.</p>
      </section>
    );
  }

  const totalItems = checklists.reduce((sum, checklist) => sum + (checklist.items?.length || 0), 0);
  const completedItems = checklists.reduce((sum, checklist) => sum + (checklist.items || []).filter((item) => item.done).length, 0);
  const completion = totalItems ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[22px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">checklist_rtl</span>
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-neutral-100">Project Checklists</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Readiness tracking for website, SEO, CRM, ads, email, WhatsApp, and reporting.</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {completion}% complete
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {checklists.map((checklist) => (
          <div key={checklist._id || checklist.checklistType} className={card}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{checklist.checklistType}</p>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">{checklist.completionPercent || 0}%</span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${checklist.completionPercent || 0}%` }} />
            </div>
            <div className="space-y-1">
              {(checklist.items || []).map((item) => (
                <label key={item._id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={item.done} disabled={busy} onChange={() => toggleItem(checklist.checklistType, item._id)} />
                  <span className={item.done ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-neutral-700 dark:text-neutral-300'}>{item.label}</span>
                </label>
              ))}
              {!checklist.items?.length ? <p className="text-xs text-neutral-400 dark:text-neutral-500">No items yet.</p> : null}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input
                value={newItem[checklist.checklistType] || ''}
                onChange={(e) => setNewItem((prev) => ({ ...prev, [checklist.checklistType]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addItem(checklist.checklistType)}
                placeholder="Add item"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
              <button type="button" disabled={busy} onClick={() => addItem(checklist.checklistType)} className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">
                Add
              </button>
            </div>
          </div>
        ))}
        {!checklists.length ? (
          <div className={`${card} md:col-span-2 xl:col-span-3`}>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400">
              No checklists available
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ProjectChecklists;
