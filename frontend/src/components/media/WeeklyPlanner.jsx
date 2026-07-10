import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

const WeeklyPlanner = ({ projectId }) => {
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [objectivesText, setObjectivesText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newObjectiveText, setNewObjectiveText] = useState({});
  const [editingObjectiveId, setEditingObjectiveId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const load = async () => {
    if (!token || !projectId) return;
    try {
      const res = await departmentApi.getMediaWeeklyPlans(token, { projectId });
      setPlans(res?.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load weekly plans.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId]);

  const createPlan = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const objectives = objectivesText.split('\n').map((line) => line.trim()).filter(Boolean).map((text) => ({ text }));
      const weekStart = new Date();
      const weekEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
      await departmentApi.createMediaWeeklyPlan(token, { weekStart, weekEnd, objectives }, { projectId });
      setObjectivesText('');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to create weekly plan.');
    } finally {
      setBusy(false);
    }
  };

  const cycleStatus = async (plan, objective) => {
    const order = ['pending', 'in-progress', 'done'];
    const next = order[(order.indexOf(objective.status) + 1) % order.length];
    setBusy(true);
    try {
      await departmentApi.updateMediaWeeklyPlanObjective(token, plan._id, objective._id, next, { projectId });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update objective.');
    } finally {
      setBusy(false);
    }
  };

  const deletePlan = async (plan) => {
    if (!window.confirm('Delete this weekly plan? This cannot be undone.')) return;
    setBusy(true);
    try {
      await departmentApi.deleteMediaWeeklyPlan(token, plan._id, { projectId });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete weekly plan.');
    } finally {
      setBusy(false);
    }
  };

  const addObjective = async (plan) => {
    const text = (newObjectiveText[plan._id] || '').trim();
    if (!text) return;
    setBusy(true);
    try {
      await departmentApi.addMediaWeeklyPlanObjective(token, plan._id, text, { projectId });
      setNewObjectiveText((prev) => ({ ...prev, [plan._id]: '' }));
      await load();
    } catch (err) {
      setError(err.message || 'Failed to add objective.');
    } finally {
      setBusy(false);
    }
  };

  const startEditObjective = (objective) => {
    setEditingObjectiveId(objective._id);
    setEditingText(objective.text);
  };

  const cancelEditObjective = () => {
    setEditingObjectiveId(null);
    setEditingText('');
  };

  const saveObjectiveText = async (plan) => {
    const text = editingText.trim();
    if (!text) return;
    setBusy(true);
    try {
      await departmentApi.updateMediaWeeklyPlanObjectiveText(token, plan._id, editingObjectiveId, text, { projectId });
      cancelEditObjective();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update objective.');
    } finally {
      setBusy(false);
    }
  };

  const deleteObjective = async (plan, objective) => {
    setBusy(true);
    try {
      await departmentApi.deleteMediaWeeklyPlanObjective(token, plan._id, objective._id, { projectId });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete objective.');
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) {
    return (
      <section className={card}>
        <h2 className="text-xl font-black text-slate-950 dark:text-neutral-100">Weekly Planning</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Select a project to manage weekly campaign objectives.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[22px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">event_note</span>
          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-neutral-100">Weekly Planning</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Plan weekly objectives and move work from pending to done.</p>
          </div>
        </div>
      </section>

      <form onSubmit={createPlan} className={card}>
        <p className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Plan this week</p>
        <textarea
          value={objectivesText}
          onChange={(e) => setObjectivesText(e.target.value)}
          placeholder={'One objective per line, e.g.\nDesign 3 Instagram banners\nSchedule email blast'}
          rows={3}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
        <button type="submit" disabled={busy} className="mt-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">
          Create weekly plan
        </button>
      </form>

      {plans.length ? plans.map((plan) => (
        <div key={plan._id} className={card}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {new Date(plan.weekStart).toLocaleDateString()} - {new Date(plan.weekEnd).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{plan.progress}% complete</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => deletePlan(plan)}
                title="Delete plan"
                className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {plan.objectives.map((objective) => (
              editingObjectiveId === objective._id ? (
                <div key={objective._id} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
                  <input
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveObjectiveText(plan);
                      if (e.key === 'Escape') cancelEditObjective();
                    }}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-neutral-900 outline-none focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <button type="button" disabled={busy} onClick={() => saveObjectiveText(plan)} className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">Save</button>
                  <button type="button" disabled={busy} onClick={cancelEditObjective} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">Cancel</button>
                </div>
              ) : (
                <div
                  key={objective._id}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    objective.status === 'done'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : objective.status === 'in-progress'
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => cycleStatus(plan, objective)}
                    className={`flex-1 truncate text-left ${objective.status === 'done' ? 'line-through' : ''}`}
                    title="Click to change status"
                  >
                    {objective.text}
                  </button>
                  <span className="shrink-0 text-[10px] font-bold uppercase">{objective.status}</span>
                  <button type="button" disabled={busy} onClick={() => startEditObjective(objective)} title="Edit" className="shrink-0 rounded-full p-1 text-current opacity-70 hover:opacity-100 disabled:opacity-30">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button type="button" disabled={busy} onClick={() => deleteObjective(plan, objective)} title="Delete" className="shrink-0 rounded-full p-1 text-current opacity-70 hover:opacity-100 disabled:opacity-30">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )
            ))}
            {!plan.objectives.length ? <p className="text-xs text-neutral-400 dark:text-neutral-500">No objectives yet.</p> : null}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input
              value={newObjectiveText[plan._id] || ''}
              onChange={(e) => setNewObjectiveText((prev) => ({ ...prev, [plan._id]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addObjective(plan)}
              placeholder="Add objective"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            <button type="button" disabled={busy} onClick={() => addObjective(plan)} className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">
              Add
            </button>
          </div>
        </div>
      )) : (
        <div className={card}>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400">
            No weekly plans
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanner;
