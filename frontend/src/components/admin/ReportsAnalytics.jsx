import React, { useMemo, useState } from 'react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);

const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);

const PageHdr = ({ title, subtitle, icon, action }) => (
  <header className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="h-1 w-full bg-indigo-600" />
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
        </div>
        <div>
          <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  </header>
);

const StatCard = ({ icon, label, value, sub, color = 'bg-indigo-600', trend }) => (
  <Card>
    <Inner className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
        <span className={`material-symbols-outlined rounded-xl p-2 text-[18px] text-white ${color}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{value}</p>
      {(sub || trend) && (
        <div className="flex items-center gap-1.5">
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>
              <span className="material-symbols-outlined text-[13px]">{trend.startsWith('+') ? 'trending_up' : 'trending_down'}</span>
              {trend}
            </span>
          )}
          {sub && <span className="text-xs text-neutral-400">{sub}</span>}
        </div>
      )}
    </Inner>
  </Card>
);

const statusStyle = {
  Completed:  'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  Processing: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  Failed:     'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  Queued:     'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
};

const StatusPill = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyle[status] || statusStyle.Queued}`}>
    {status}
  </span>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
const PREDEFINED = [
  { icon: 'monitoring',  title: 'User Activity',       description: 'Logins, signups, and feature usage.',       color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400', accent: 'border-indigo-200 dark:border-indigo-800' },
  { icon: 'article',     title: 'Content Statistics',  description: 'Views, shares, and engagement rates.',      color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400', accent: 'border-violet-200 dark:border-violet-800' },
  { icon: 'payments',    title: 'Financial Summaries', description: 'Revenue, expenses, and profit margins.',     color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', accent: 'border-emerald-200 dark:border-emerald-800' },
  { icon: 'dns',         title: 'System Performance',  description: 'Uptime, response times, and errors.',       color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400', accent: 'border-amber-200 dark:border-amber-800' },
];

const CUSTOM_REPORTS = [
  { id: 1, name: 'Q4 Financial Summary',      date: '2024-01-15', status: 'Completed',  size: '2.4 MB', type: 'Financial' },
  { id: 2, name: 'Monthly User Signup',        date: '2024-02-01', status: 'Completed',  size: '1.1 MB', type: 'Activity' },
  { id: 3, name: 'Content Performance Q1',     date: '2024-03-05', status: 'Processing', size: '—',      type: 'Content'  },
  { id: 4, name: 'System Uptime Report Mar',   date: '2024-03-10', status: 'Queued',     size: '—',      type: 'System'   },
  { id: 5, name: 'Annual Revenue Forecast',    date: '2024-03-12', status: 'Completed',  size: '5.7 MB', type: 'Financial'},
];

// SVG chart points for each period
const CHART_PATHS = {
  Week:  'M0 110C20 110 20 60 40 60C60 60 60 90 80 90C100 90 100 40 120 40C140 40 140 70 160 70C180 70 180 30 200 30C220 30 220 80 240 80',
  Month: 'M0 83C18 83 18 127 36 127C54 127 54 107 72 107C90 107 90 55 108 55C126 55 126 115 144 115C162 115 162 47 180 47C198 47 198 87 216 87C234 87 234 103 252 103C270 103 270 27 288 27C306 27 306 1 324 1C342 1 342 147 360 147C378 147 378 67 396 67C414 67 414 19 432 19C450 19 450 123 472 123',
  Year:  'M0 100C30 100 30 40 60 40C90 40 90 120 120 120C150 120 150 20 180 20C210 20 210 90 240 90C270 90 270 60 300 60C330 60 330 130 360 130C390 130 390 10 420 10C450 10 450 80 472 80',
};

const ReportsAnalytics = () => {
  const [reportType, setReportType]   = useState('User Activity');
  const [department, setDepartment]   = useState('All Departments');
  const [dateFrom, setDateFrom]       = useState('2024-01-01');
  const [dateTo, setDateTo]           = useState('2024-03-31');
  const [period, setPeriod]           = useState('Month');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredReports = useMemo(() => {
    if (statusFilter === 'All') return CUSTOM_REPORTS;
    return CUSTOM_REPORTS.filter((r) => r.status === statusFilter);
  }, [statusFilter]);

  const chartPath = CHART_PATHS[period];
  const chartWidth = period === 'Week' ? 240 : 472;

  return (
    <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 dark:bg-neutral-950 md:p-6">
      <div className="mx-auto w-full max-w-[1400px]">

        <PageHdr
          icon="bar_chart_4_bars"
          title="Reports & Analytics"
          subtitle="Generate, schedule, and download reports across all departments."
          action={
            <>
              <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Generate Report
              </button>
            </>
          }
        />

        {/* KPI Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="description"     label="Total Reports"     value="128"    trend="+14"    sub="vs last month"  color="bg-indigo-600" />
          <StatCard icon="schedule_send"   label="Generated Today"   value="9"      trend="+3"     sub="vs yesterday"   color="bg-violet-600" />
          <StatCard icon="storage"         label="Storage Used"      value="3.2 GB" sub="of 10 GB limit"               color="bg-amber-500" />
          <StatCard icon="avg_pace"        label="Avg. Gen. Time"    value="1.4 s"  trend="-0.2s"  sub="faster"         color="bg-emerald-600" />
        </div>

        {/* Filter Bar */}
        <Card className="mb-6">
          <Inner>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Filters</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <option>User Activity</option>
                  <option>Content Statistics</option>
                  <option>Financial Summary</option>
                  <option>System Performance</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <option>All Departments</option>
                  <option>Engineering</option>
                  <option>Marketing</option>
                  <option>Sales</option>
                  <option>Finance</option>
                </select>
              </div>

              <div className="flex items-end">
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                  <span className="material-symbols-outlined text-[16px]">filter_alt</span>
                  Apply Filters
                </button>
              </div>
            </div>
          </Inner>
        </Card>

        {/* Predefined Reports */}
        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Predefined Reports</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PREDEFINED.map((r) => (
              <div
                key={r.title}
                className={`group flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md cursor-pointer dark:bg-neutral-950 ${r.accent}`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${r.color}`}>
                  <span className="material-symbols-outlined text-[22px]">{r.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-bold text-neutral-900 dark:text-neutral-100">{r.title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{r.description}</p>
                </div>
                <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100 dark:text-indigo-400">
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  View Report
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Chart */}
          <Card className="lg:col-span-3">
            <Inner>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Content Engagement Rate</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">72.3%</p>
                    <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-600">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      +3.1% this month
                    </span>
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
                  { label: 'Total Views',   value: '284K', trend: '+8.2%' },
                  { label: 'Avg. Session',  value: '4m 31s', trend: '+0.4%' },
                  { label: 'Bounce Rate',   value: '31.4%', trend: '-1.1%' },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="text-xs text-neutral-500">{m.label}</p>
                    <p className="mt-0.5 font-bold text-neutral-900 dark:text-white">{m.value}</p>
                    <p className={`text-xs font-medium ${m.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>{m.trend}</p>
                  </div>
                ))}
              </div>

              {/* SVG Chart */}
              <div className="h-[180px] w-full overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-900">
                <svg
                  viewBox={`0 0 ${chartWidth} 150`}
                  preserveAspectRatio="none"
                  width="100%"
                  height="100%"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${chartPath}V149H0V${chartPath.split(' ')[1]}`} fill="url(#chartGrad)" />
                  <path d={chartPath} stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Inner>
          </Card>

          {/* Recent Custom Reports */}
          <Card className="lg:col-span-2">
            <Inner>
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Recent Reports</p>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                >
                  {['All', 'Completed', 'Processing', 'Queued'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              {filteredReports.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-700">description</span>
                  <p className="text-sm text-neutral-400">No reports match this filter.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReports.map((r) => (
                    <div key={r.id} className="group flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 transition hover:border-neutral-200 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
                        <span className="material-symbols-outlined text-[17px] text-indigo-600 dark:text-indigo-400">description</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[11px] text-neutral-400">{r.date}</span>
                          {r.size !== '—' && <span className="text-[11px] text-neutral-400">· {r.size}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusPill status={r.status} />
                        {r.status === 'Completed' ? (
                          <button className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
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

              <button className="mt-4 w-full rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                View All Reports
              </button>
            </Inner>
          </Card>

        </div>
      </div>
    </main>
  );
};

export default ReportsAnalytics;
