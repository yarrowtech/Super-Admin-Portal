import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const card = 'rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const input = 'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
const labelFor = (value = '') => String(value).replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num(value));

const FunnelBars = ({ stages = [] }) => {
  const max = Math.max(1, ...stages.map((stage) => num(stage.count)));

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const width = Math.max(5, (num(stage.count) / max) * 100);
        return (
          <div key={stage.stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-950 dark:text-neutral-100">{labelFor(stage.stage)}</p>
              <div className="text-right">
                <p className="text-sm font-black text-slate-950 dark:text-neutral-100">{num(stage.count).toLocaleString()}</p>
                {stage.conversionFromPrevious !== null && stage.conversionFromPrevious !== undefined ? (
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">{num(stage.conversionFromPrevious).toFixed(1)}% conversion</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-neutral-800">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
      {!stages.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400">
          No KPI data yet
        </div>
      ) : null}
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
      setError('');
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

  const stats = useMemo(() => {
    const revenue = num(kpiTrend.stages?.find((stage) => stage.stage === 'revenue')?.count);
    const leads = num(kpiTrend.stages?.find((stage) => stage.stage === 'leads')?.count);
    const bookings = num(kpiTrend.stages?.find((stage) => stage.stage === 'bookings')?.count);
    const traffic = num(kpiTrend.stages?.find((stage) => stage.stage === 'websiteTraffic')?.count);
    return { revenue, leads, bookings, traffic };
  }, [kpiTrend.stages]);

  if (!projectId) {
    return (
      <section className={card}>
        <h2 className="text-xl font-black text-slate-950 dark:text-neutral-100">KPI & Funnel</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Select a project to manage KPI snapshots.</p>
      </section>
    );
  }

  const funnelFields = ['awareness', 'interest', 'websiteVisit', 'registration', 'lead', 'customer', 'retention', 'referral'];
  const kpiFields = ['websiteTraffic', 'registrations', 'leads', 'bookings', 'revenue', 'retention'];

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}

      <section className={card}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[22px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">insights</span>
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-neutral-100">KPI & Funnel Control</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Track traffic, leads, bookings, revenue, and funnel movement.</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {funnel.period || kpiTrend.period || 'Current period'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Traffic', stats.traffic.toLocaleString(), 'travel_explore'],
            ['Leads', stats.leads.toLocaleString(), 'person_add'],
            ['Bookings', stats.bookings.toLocaleString(), 'event_available'],
            ['Revenue', money(stats.revenue), 'payments'],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{icon}</span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={card}>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Marketing Funnel</h3>
          <FunnelBars stages={funnel.stages} />
        </section>
        <section className={card}>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">KPI Trend</h3>
          <FunnelBars stages={kpiTrend.stages} />
        </section>
      </div>

      <form onSubmit={saveSnapshot} className={card}>
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Update Snapshot</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...kpiFields, ...funnelFields.filter((field) => !kpiFields.includes(field))].map((field) => (
            <label key={field} className="space-y-1.5 text-xs">
              <span className="block font-semibold text-neutral-500 dark:text-neutral-400">{labelFor(field)}</span>
              <input type="number" min="0" value={form[field] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} className={input} />
            </label>
          ))}
        </div>
        <button type="submit" disabled={busy} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">
          <span className="material-symbols-outlined text-[18px]">save</span>
          Save Snapshot
        </button>
      </form>
    </div>
  );
};

export default KpiFunnelChart;
