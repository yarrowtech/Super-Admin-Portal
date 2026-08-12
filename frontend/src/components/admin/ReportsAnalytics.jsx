import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

const STATUS_TONE = { Completed: 'success', Processing: 'warning', Failed: 'danger' };

const formatDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const csvEscape = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const buildReportsCsv = (rows) => {
  const headers = ['Name', 'Report Type', 'Department', 'Status', 'Generated On', 'Created At'];
  const lines = rows.map((r) =>
    [r.name, r.reportType, r.department, r.status, r.generatedOn, formatDate(r.createdAt)].map(csvEscape).join(',')
  );
  return [headers.map(csvEscape).join(','), ...lines].join('\r\n');
};

const downloadCsv = (csv, filename) => {
  const BOM = '﻿';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const DEFAULT_FILTERS = {
  reportType: 'All',
  department: 'All Departments',
  dateFrom: '',
  dateTo: '',
  status: 'All',
};

const DEFAULT_GENERATE_FORM = { name: '', reportType: '', department: 'All Departments', status: 'Processing' };

// Buckets report activity into a simple, real trend derived from actual generated-report dates.
const buildTrend = (reports, period) => {
  const parsed = reports
    .map((r) => new Date(r.generatedOn || r.createdAt))
    .filter((d) => !Number.isNaN(d.getTime()));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'Week') {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return {
      labels: days.map((d) => d.toLocaleDateString('en-IN', { weekday: 'short' })),
      counts: days.map((d) => parsed.filter((p) => p.toDateString() === d.toDateString()).length),
    };
  }

  if (period === 'Year') {
    const months = Array.from({ length: 12 }, (_, i) => new Date(today.getFullYear(), today.getMonth() - (11 - i), 1));
    return {
      labels: months.map((d) => d.toLocaleDateString('en-IN', { month: 'short' })),
      counts: months.map((d) => parsed.filter((p) => p.getFullYear() === d.getFullYear() && p.getMonth() === d.getMonth()).length),
    };
  }

  // Month: last 4 weekly buckets
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const end = new Date(today);
    end.setDate(end.getDate() - (3 - i) * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { start, end };
  });
  return {
    labels: weeks.map(({ start, end }) => `${start.getDate()}-${end.getDate()}`),
    counts: weeks.map(({ start, end }) => parsed.filter((p) => p >= start && p <= end).length),
  };
};

const GenerateReportModal = ({ form, setForm, departmentOptions, reportTypeOptions, saving, error, onClose, onSave }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Generate Report</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Close">
          <span className="material-symbols-outlined text-neutral-400">close</span>
        </button>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Report Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Q2 Financial Summary"
            className="app-input"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Report Type</label>
          <select
            value={form.reportType}
            onChange={(e) => setForm((prev) => ({ ...prev, reportType: e.target.value }))}
            className="app-input"
          >
            {reportTypeOptions.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Department</label>
          <select
            value={form.department}
            onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
            className="app-input"
          >
            {departmentOptions.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Initial Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            className="app-input"
          >
            {['Processing', 'Completed', 'Failed'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/10 dark:text-rose-300">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <Button variant="secondary" size="md" fullWidth onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="md" fullWidth loading={saving} onClick={onSave}>
          Generate
        </Button>
      </div>
    </div>
  </div>
);

const ReportsAnalytics = () => {
  const { token } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

  const [predefinedReports, setPredefinedReports] = useState([]);
  const [customReports, setCustomReports] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, completedCount: 0, processingCount: 0, generatedToday: 0 });
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('Month');

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState(DEFAULT_GENERATE_FORM);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const fetchReports = useCallback(async (nextFilters) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getReportsOverview(token, {
        status: nextFilters.status,
        reportType: nextFilters.reportType,
        department: nextFilters.department,
        from: nextFilters.dateFrom,
        to: nextFilters.dateTo,
      });
      const payload = response?.data?.data || response?.data || {};
      setPredefinedReports(Array.isArray(payload.predefinedReports) ? payload.predefinedReports : []);
      setCustomReports(Array.isArray(payload.customReports) ? payload.customReports : []);
      setStats(payload.stats || { totalCount: 0, completedCount: 0, processingCount: 0, generatedToday: 0 });
    } catch (err) {
      setError(err?.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    adminApi.getDepartmentsOverview(token)
      .then((response) => {
        const payload = response?.data?.data || response?.data || [];
        setDepartments(Array.isArray(payload) ? payload.map((d) => d.name).filter(Boolean) : []);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchReports(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const departmentOptions = useMemo(() => ['All Departments', ...departments], [departments]);
  const reportTypeOptions = useMemo(
    () => ['All', ...predefinedReports.map((r) => r.title)],
    [predefinedReports]
  );

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    fetchReports(filters);
  };

  const handleStatusChange = (status) => {
    const next = { ...filters, status };
    setFilters(next);
    setAppliedFilters(next);
    fetchReports(next);
  };

  const handleExportAll = () => {
    if (customReports.length === 0) return;
    downloadCsv(buildReportsCsv(customReports), `reports-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Reports exported.');
  };

  const handleDownloadOne = (r) => {
    const safeName = (r.name || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    downloadCsv(buildReportsCsv([r]), `${safeName}.csv`);
    toast.success(`"${r.name}" downloaded.`);
  };

  const openGenerateModal = (prefillType) => {
    setGenerateForm({ ...DEFAULT_GENERATE_FORM, reportType: prefillType || predefinedReports[0]?.title || 'User Activity' });
    setGenerateError('');
    setGenerateOpen(true);
  };

  const handleGenerate = async () => {
    if (!generateForm.name.trim()) {
      setGenerateError('Report name is required');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    try {
      await adminApi.createCustomReport(token, generateForm);
      setGenerateOpen(false);
      fetchReports(appliedFilters);
      toast.success(`"${generateForm.name}" report generated.`);
    } catch (err) {
      setGenerateError(err?.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const trend = useMemo(() => buildTrend(customReports, period), [customReports, period]);
  const maxCount = Math.max(1, ...trend.counts);
  const completionRate = stats.totalCount > 0 ? Math.round((stats.completedCount / stats.totalCount) * 100) : 0;

  return (
    <main className="portal-page">
      <div className="portal-page-inner">

        <PortalHeader
          title="Reports & Analytics"
          subtitle="Generate, schedule, and download reports across all departments"
          icon="bar_chart_4_bars"
          showSearch={false}
          showNotifications={false}
          showThemeToggle
        >
          <Button variant="secondary" size="md" className="min-h-11" onClick={handleExportAll} disabled={customReports.length === 0} icon={<span className="material-symbols-outlined text-lg">download</span>}>
            Export
          </Button>
          <Button variant="primary" size="md" className="min-h-11" onClick={() => openGenerateModal()} icon={<span className="material-symbols-outlined text-lg">add</span>}>
            Generate Report
          </Button>
        </PortalHeader>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Total Reports" value={stats.totalCount} subtitle="Matching current filters" icon="description" compact />
          <KPICard title="Generated Today" value={stats.generatedToday} subtitle="Since midnight" icon="schedule_send" compact />
          <KPICard title="Completed" value={stats.completedCount} subtitle={`${completionRate}% completion rate`} icon="check_circle" compact />
          <KPICard title="Processing" value={stats.processingCount} subtitle="Currently generating" icon="hourglass_top" compact />
        </div>

        {/* Filter Bar */}
        <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Filters</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Report Type</label>
                <select
                  value={filters.reportType}
                  onChange={(e) => setFilters((prev) => ({ ...prev, reportType: e.target.value }))}
                  className="app-input"
                >
                  {reportTypeOptions.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="app-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="app-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
                  className="app-input"
                >
                  {departmentOptions.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div className="flex items-end">
                <Button variant="primary" size="md" fullWidth onClick={handleApplyFilters} icon={<span className="material-symbols-outlined text-lg">filter_alt</span>}>
                  Apply Filters
                </Button>
              </div>
            </div>
        </div>

        {/* Predefined Reports */}
        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Predefined Reports</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {predefinedReports.map((r) => (
              <button
                key={r.title}
                type="button"
                onClick={() => openGenerateModal(r.title)}
                className="group flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:border-indigo-200 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                  <span className="material-symbols-outlined text-[22px]">{r.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-bold text-neutral-900 dark:text-neutral-100">{r.title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{r.description}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100 dark:text-indigo-400">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Generate this report
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Chart */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-3 lg:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Reports Generated</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{stats.totalCount}</p>
                    <span className="text-sm font-semibold text-neutral-400">in current filter range</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
                  {['Week', 'Month', 'Year'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        period === p
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inline metric row */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Completed',  value: stats.completedCount },
                  { label: 'Processing', value: stats.processingCount },
                  { label: 'Completion Rate', value: `${completionRate}%` },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="text-xs text-neutral-500">{m.label}</p>
                    <p className="mt-0.5 font-bold text-neutral-900 dark:text-white">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart driven by real report-generation dates */}
              <div className="flex h-45 w-full items-end gap-2 overflow-hidden rounded-xl bg-neutral-50 px-3 pb-3 pt-4 dark:bg-neutral-900">
                {trend.counts.map((count, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-[10px] font-semibold text-neutral-400">{count > 0 ? count : ''}</span>
                    <div
                      className="w-full rounded-t-md bg-indigo-500/80 transition-all dark:bg-indigo-500"
                      style={{ height: `${Math.max(4, (count / maxCount) * 100)}%` }}
                    />
                    <span className="text-[10px] text-neutral-400">{trend.labels[i]}</span>
                  </div>
                ))}
              </div>
          </div>

          {/* Recent Custom Reports */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2 lg:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Recent Reports</p>
                <select
                  value={filters.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                >
                  {['All', 'Completed', 'Processing', 'Failed'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
                  ))}
                </div>
              ) : customReports.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-700">description</span>
                  <p className="text-sm text-neutral-400">No reports match this filter.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customReports.map((r) => (
                    <div key={r._id} className="group flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 transition hover:border-neutral-200 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
                        <span className="material-symbols-outlined text-[17px] text-indigo-600 dark:text-indigo-400">description</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[11px] text-neutral-400">{r.generatedOn || formatDate(r.createdAt)}</span>
                          <span className="text-[11px] text-neutral-400">· {r.department}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusBadge tone={STATUS_TONE[r.status]} label={r.status} />
                        {r.status === 'Completed' ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadOne(r)}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            Download
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-400">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

        </div>
      </div>

      {generateOpen && (
        <GenerateReportModal
          form={generateForm}
          setForm={setGenerateForm}
          departmentOptions={departmentOptions}
          reportTypeOptions={predefinedReports.length ? predefinedReports.map((r) => r.title) : ['User Activity']}
          saving={generating}
          error={generateError}
          onClose={() => setGenerateOpen(false)}
          onSave={handleGenerate}
        />
      )}
    </main>
  );
};

export default ReportsAnalytics;
