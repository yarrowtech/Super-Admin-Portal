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
    return <div className={card}><p className="text-sm text-neutral-500 dark:text-neutral-400">Select a project to view its checklists.</p></div>;
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {checklists.map((checklist) => (
          <div key={checklist._id || checklist.checklistType} className={card}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{checklist.checklistType}</p>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{checklist.completionPercent || 0}%</span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${checklist.completionPercent || 0}%` }} />
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
              <button type="button" disabled={busy} onClick={() => addItem(checklist.checklistType)} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectChecklists;
