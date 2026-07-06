import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const PERIODS = ['weekly', 'monthly', 'quarterly', 'annual'];

const MarketingReportPanel = ({ projectId }) => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [periodType, setPeriodType] = useState('weekly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token || !projectId) return;
    try {
      const res = await departmentApi.getMediaReports(token, { projectId });
      setReports(res?.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId]);

  const generate = async () => {
    setBusy(true);
    try {
      await departmentApi.generateMediaReport(token, periodType, { projectId });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) {
    return <div className={card}><p className="text-sm text-neutral-500 dark:text-neutral-400">Select a project to generate reports.</p></div>;
  }

  return (
    <div className={card}>
      {error ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Generated reports (Tasks + Campaign + Budget + KPI + Content)</p>
        <div className="flex gap-2">
          <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
            {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button type="button" disabled={busy} onClick={generate} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            Generate report
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {reports.length ? reports.map((report) => (
          <div key={report._id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-800/60">
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize text-neutral-900 dark:text-neutral-100">{report.periodType} report</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(report.generatedAt).toLocaleString()}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-600 dark:text-neutral-400">
              <span>Campaigns: {report.snapshot?.kpis?.totalCampaigns ?? 0}</span>
              <span>Tasks done: {report.snapshot?.kpis?.completedTasks ?? 0}</span>
              <span>Budget used: ${report.snapshot?.kpis?.budgetUsed ?? 0}</span>
              <span>ROAS: {(report.snapshot?.kpis?.roas ?? 0).toFixed?.(2) ?? report.snapshot?.kpis?.roas}x</span>
            </div>
          </div>
        )) : <p className="text-sm text-neutral-500 dark:text-neutral-400">No reports generated yet.</p>}
      </div>
    </div>
  );
};

export default MarketingReportPanel;
