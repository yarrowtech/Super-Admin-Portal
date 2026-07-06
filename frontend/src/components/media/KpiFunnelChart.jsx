import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const input = 'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
const stageLabel = (stage) => stage.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

// Single-hue sequential ramp (blue, light -> dark) for the ordered funnel/KPI stages —
// one hue for magnitude, never a rainbow. Dark-mode steps stay lighter so they clear
// contrast against the dark surface instead of just re-using the light steps.
const RAMP_LIGHT = ['#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95'];
const RAMP_DARK = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6'];

const FunnelBars = ({ stages = [] }) => {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="space-y-2">
      {stages.map((stage, index) => {
        const light = RAMP_LIGHT[index % RAMP_LIGHT.length];
        const dark = RAMP_DARK[index % RAMP_DARK.length];
        return (
          <div key={stage.stage}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{stageLabel(stage.stage)}</span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {stage.count.toLocaleString()}
                {stage.conversionFromPrevious !== null ? ` · ${stage.conversionFromPrevious.toFixed(1)}% conv.` : ''}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-(--bar-light) transition-[width] dark:bg-(--bar-dark)"
                style={{ width: `${Math.max(4, (stage.count / max) * 100)}%`, '--bar-light': light, '--bar-dark': dark }}
                title={`${stageLabel(stage.stage)}: ${stage.count.toLocaleString()}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const KpiFunnelChart = ({ projectId }) => {
  const { token } = useAuth();
  const [funnel, setFunnel] = useState({ stages: [] });
  const [kpiTrend, setKpiTrend] = useState({ stages: [] });
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token || !projectId) return;
    try {
      const [funnelRes, trendRes] = await Promise.all([
        departmentApi.getMediaMarketingFunnel(token, { projectId }),
        departmentApi.getMediaKpiTrend(token, { projectId }),
      ]);
      setFunnel(funnelRes?.data || { stages: [] });
      setKpiTrend(trendRes?.data || { stages: [] });
    } catch (err) {
      setError(err.message || 'Failed to load KPI/funnel data.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId]);

  const saveSnapshot = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await departmentApi.updateMediaKpiSnapshot(token, form, { projectId });
      setForm({});
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update KPI snapshot.');
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) {
    return <div className={card}><p className="text-sm text-neutral-500 dark:text-neutral-400">Select a project to view its KPI funnel.</p></div>;
  }

  const funnelFields = ['awareness', 'interest', 'websiteVisit', 'registration', 'lead', 'customer', 'retention', 'referral'];
  const kpiFields = ['websiteTraffic', 'registrations', 'leads', 'bookings', 'revenue', 'retention'];

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={card}>
          <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Marketing funnel ({funnel.period})</p>
          <FunnelBars stages={funnel.stages} />
        </div>
        <div className={card}>
          <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">KPI trend ({kpiTrend.period})</p>
          <FunnelBars stages={kpiTrend.stages} />
        </div>
      </div>

      <form onSubmit={saveSnapshot} className={card}>
        <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Update this month's numbers</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[...kpiFields, ...funnelFields.filter((f) => !kpiFields.includes(f))].map((field) => (
            <label key={field} className="text-xs">
              <span className="mb-1 block text-neutral-500 dark:text-neutral-400">{stageLabel(field)}</span>
              <input
                type="number"
                min="0"
                value={form[field] ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                className={input}
              />
            </label>
          ))}
        </div>
        <button type="submit" disabled={busy} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
          Save snapshot
        </button>
      </form>
    </div>
  );
};

export default KpiFunnelChart;
