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

  if (!projectId) {
    return <div className={card}><p className="text-sm text-neutral-500 dark:text-neutral-400">Select a project to view its weekly plans.</p></div>;
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}

      <form onSubmit={createPlan} className={card}>
        <p className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Plan this week</p>
        <textarea
          value={objectivesText}
          onChange={(e) => setObjectivesText(e.target.value)}
          placeholder={'One objective per line, e.g.\nDesign 3 Instagram banners\nSchedule email blast'}
          rows={3}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
        <button type="submit" disabled={busy} className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
          Create weekly plan
        </button>
      </form>

      {plans.length ? plans.map((plan) => (
        <div key={plan._id} className={card}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {new Date(plan.weekStart).toLocaleDateString()} - {new Date(plan.weekEnd).toLocaleDateString()}
            </p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{plan.progress}% complete</span>
          </div>
          <div className="space-y-1.5">
            {plan.objectives.map((objective) => (
              <button
                key={objective._id}
                type="button"
                disabled={busy}
                onClick={() => cycleStatus(plan, objective)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                  objective.status === 'done'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 line-through dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : objective.status === 'in-progress'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                <span>{objective.text}</span>
                <span className="text-[10px] font-bold uppercase">{objective.status}</span>
              </button>
            ))}
          </div>
        </div>
      )) : <div className={card}><p className="text-sm text-neutral-500 dark:text-neutral-400">No weekly plans yet.</p></div>}
    </div>
  );
};

export default WeeklyPlanner;
