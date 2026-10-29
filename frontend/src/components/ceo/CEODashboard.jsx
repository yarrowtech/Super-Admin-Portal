import { API_BASE_URL } from '../../config/backend';
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ceoApi } from '../../services/ceo';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/client';
import PortalHeader from '../common/PortalHeader';
import WarmGreeting from '../common/WarmGreeting';
import KPICard from '../common/KPICard';
import Button from '../common/Button';
const CEOAnalyticsCharts = lazy(() => import('./CEOAnalyticsCharts'));

const OutsourcingWidget = ({ token }) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!token) return;
    apiClient.get('/api/outsourcing/dashboard', token)
      .then(res => setData(res?.data || null))
      .catch(() => {});
  }, [token]);

  if (!data) return null;

  const jobs     = data.jobs     || data.recentJobs    || [];
  const total    = data.totalJobs       ?? jobs.length;
  const active   = data.activeJobs      ?? jobs.filter(j => j.status === 'in_progress').length;
  const done     = data.completedJobs   ?? jobs.filter(j => j.status === 'completed').length;
  const pending  = data.pendingContracts ?? 0;
  const spend    = data.totalSpend      ?? data.totalBudget ?? 0;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">handshake</span>
          <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Outsourcing Progress</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Total Jobs',   value: total,                     color: 'text-blue-600 dark:text-blue-400' },
          { label: 'In Progress',  value: active,                    color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Completed',    value: done,                      color: 'text-green-600 dark:text-green-400' },
          { label: 'Law Pending',  value: pending,                   color: 'text-rose-600 dark:text-rose-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-neutral-100 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-800/60">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      {spend > 0 && (
        <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          Total outsourcing spend: <span className="font-semibold text-neutral-700 dark:text-neutral-300">₹{spend.toLocaleString('en-IN')}</span>
        </p>
      )}
      {total > 0 && done > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
            <span>Completion rate</span>
            <span className="font-semibold text-green-600">{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </div>
        </div>
      )}
    </section>
  );
};

// An executive dashboard must never show a number the business did not produce.
// Every field here is empty or zero on purpose: anything the API does not return
// renders as "—" rather than as a plausible-looking placeholder figure.
const EMPTY_METRIC = { value: '—', change: '', note: '' };

const defaultDashboard = {
  totalEmployees: 0,
  departmentStats: [],
  lastUpdated: null,
  executiveSnapshot: {
    revenue: { ...EMPTY_METRIC },
    cost: { ...EMPTY_METRIC },
    profit: { ...EMPTY_METRIC },
    activeProjects: { ...EMPTY_METRIC },
    completedProjects: { ...EMPTY_METRIC },
    employeeStrength: { ...EMPTY_METRIC },
    criticalApprovals: { ...EMPTY_METRIC },
    systemUptime: { ...EMPTY_METRIC },
  },
  projectKpis: { rows: [], summary: {} },
  departmentPerformance: { cards: [] },
  approvals: {},
  financials: {},
  people: {},
  complianceRisk: {},
  systemHealth: {},
  alerts: [],
  pendingApprovals: [],
  analytics: null,
};

const SOCKET_URL = (API_BASE_URL).replace(/\/$/, '');

// Turns a percentage string like "+12.4%" or "-8%" into a number, or null when the API
// gave something unparseable. Used only to decide whether a decline is worth surfacing.
const parsePercent = (value) => {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const CEODashboard = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [dashboardData, setDashboardData] = useState(defaultDashboard);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('30d');
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: ['ceo-dashboard', token],
    queryFn: async () => {
      if (!token) throw new Error('Authentication required. Please login again.');
      const response = await ceoApi.getDashboard(token);
      return response?.data || {};
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Charts are driven by a dedicated aggregation endpoint; the dashboard payload
  // itself carries no analytics block.
  const analyticsQuery = useQuery({
    queryKey: ['ceo-analytics', token, period],
    queryFn: async () => {
      if (!token) throw new Error('Authentication required. Please login again.');
      const months = period === '7d' ? 3 : period === '30d' ? 6 : 12;
      const response = await ceoApi.getExecutiveAnalytics(token, months);
      return response?.data || null;
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!dashboardQuery.data) return;
    setError('');
    const data = dashboardQuery.data || {};
    setDashboardData((prev) => ({
      ...prev,
      ...data,
      executiveSnapshot: { ...prev.executiveSnapshot, ...data.executiveSnapshot },
      projectKpis: {
        ...prev.projectKpis,
        ...data.projectKpis,
        rows: data.projectKpis?.rows || prev.projectKpis.rows,
        summary: { ...prev.projectKpis.summary, ...data.projectKpis?.summary },
      },
      departmentPerformance: {
        ...prev.departmentPerformance,
        ...data.departmentPerformance,
        cards: data.departmentPerformance?.cards || prev.departmentPerformance.cards,
      },
      approvals: { ...prev.approvals, ...data.approvals },
      financials: { ...prev.financials, ...data.financials },
      people: { ...prev.people, ...data.people },
      complianceRisk: { ...prev.complianceRisk, ...data.complianceRisk },
      systemHealth: { ...prev.systemHealth, ...data.systemHealth },
      alerts: data.alerts || prev.alerts,
      pendingApprovals: data.pendingApprovals || prev.pendingApprovals,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    }));
  }, [dashboardQuery.data]);

  useEffect(() => {
    if (!dashboardQuery.error) return;
    setError(dashboardQuery.error.message || 'Failed to fetch dashboard data');
  }, [dashboardQuery.error]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const onAlert = (alert) => {
      if (!alert) return;
      setDashboardData((prev) => ({
        ...prev,
        alerts: [
          {
            ...alert,
            id: alert.id || Date.now(),
            time: alert.time || 'now',
          },
          ...(prev.alerts || []),
        ].slice(0, 10),
      }));
    };

    socket.on('alert-update', onAlert);
    return () => {
      socket.off('alert-update', onAlert);
      socket.disconnect();
    };
  }, [token]);

  const snapshot = dashboardData.executiveSnapshot;
  const analytics = analyticsQuery.data || null;

  // Each signal is omitted entirely when its figure is absent, so the strip never
  // pads itself out with zeros that read as real measurements.
  const topInsights = useMemo(() => {
    if (!analytics) return [];
    const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });
    const items = [];
    if (analytics.revenue?.mrr) items.push({ label: 'MRR', value: inr.format(analytics.revenue.mrr), note: analytics.revenue.momGrowth });
    if (analytics.revenue?.arr) items.push({ label: 'ARR', value: inr.format(analytics.revenue.arr), note: 'annualised' });
    if (analytics.profitability?.margin != null) items.push({ label: 'Margin', value: `${analytics.profitability.margin}%`, note: inr.format(analytics.profitability.netProfit || 0) });
    if (analytics.profitability?.runwayMonths > 0) items.push({ label: 'Runway', value: `${analytics.profitability.runwayMonths} mo`, note: 'at current burn' });
    if (analytics.userAnalytics?.retentionRate != null) items.push({ label: 'Retention', value: `${analytics.userAnalytics.retentionRate}%`, note: `${analytics.userAnalytics.activeUsers || 0} active` });
    return items;
  }, [analytics]);

  // ── CEO Attention Required ────────────────────────────────────────────────
  // Each item is a condition the API actually reported, with a route to the module that
  // can resolve it. Nothing is inferred and nothing is invented: a quiet business produces
  // an empty panel, which is the correct answer rather than a reason to manufacture a
  // warning. Severity follows the portal's status colours — red critical, amber attention.
  const attentionItems = useMemo(() => {
    const items = [];
    const approvals = Array.isArray(dashboardData.pendingApprovals) ? dashboardData.pendingApprovals : [];
    // The API substitutes a placeholder row when nothing is pending; that is not a signal.
    const realApprovals = approvals.filter((a) => a?.status !== 'Clear');
    if (realApprovals.length) {
      items.push({
        id: 'approvals',
        severity: realApprovals.length > 5 ? 'critical' : 'warning',
        icon: 'approval',
        title: `${realApprovals.length} approval${realApprovals.length === 1 ? '' : 's'} pending`,
        detail: realApprovals[0]?.detail || realApprovals[0]?.title || 'Awaiting executive decision.',
        view: 'legalApproval',
        cta: 'Review approvals',
      });
    }

    // Month-on-month revenue decline, only when the API reported a negative figure.
    const mom = parsePercent(analytics?.revenue?.momGrowth);
    if (mom !== null && mom < 0) {
      items.push({
        id: 'revenue',
        severity: mom <= -10 ? 'critical' : 'warning',
        icon: 'trending_down',
        title: `Revenue down ${Math.abs(mom)}% month on month`,
        detail: `Monthly recurring revenue is ${snapshot.revenue.value}.`,
        view: 'revenueAnalytics',
        cta: 'Open Revenue Analytics',
      });
    }

    // Runway is a finance signal the CEO should never discover late.
    const runway = Number(analytics?.profitability?.runwayMonths);
    if (Number.isFinite(runway) && runway > 0 && runway < 6) {
      items.push({
        id: 'runway',
        severity: runway < 3 ? 'critical' : 'warning',
        icon: 'savings',
        title: `Cash runway is ${runway} month${runway === 1 ? '' : 's'}`,
        detail: 'Below the six-month threshold.',
        view: 'revenueAnalytics',
        cta: 'Open Revenue Analytics',
      });
    }

    // Compliance items the legal module reports as overdue.
    const legalOverdue = Number(String(dashboardData.complianceRisk?.pendingLegalIssues || '0').replace(/\D/g, ''));
    if (legalOverdue > 0) {
      items.push({
        id: 'legal',
        severity: legalOverdue > 3 ? 'critical' : 'warning',
        icon: 'gavel',
        title: `${legalOverdue} overdue compliance item${legalOverdue === 1 ? '' : 's'}`,
        detail: `Legal compliance at ${dashboardData.complianceRisk?.legalCompliance || 'n/a'}.`,
        view: 'legalApproval',
        cta: 'Open Legal Approval',
      });
    }

    // Anything the backend already classified as an error or warning.
    for (const alert of (Array.isArray(dashboardData.alerts) ? dashboardData.alerts : [])) {
      if (!alert || alert.type === 'info') continue;
      items.push({
        id: `alert-${alert.title || items.length}`,
        severity: alert.type === 'error' ? 'critical' : 'warning',
        icon: alert.type === 'error' ? 'error' : 'warning',
        title: alert.title || 'System alert',
        detail: alert.message || alert.detail || '',
        view: 'notifications',
        cta: 'View notifications',
      });
    }

    // Critical first, so the most serious item is read first.
    return items
      .sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1))
      .slice(0, 6);
  }, [dashboardData, analytics, snapshot.revenue.value]);

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <main className="portal-page h-[calc(100vh-4rem)]">
        <div className="portal-page-inner">
          <div className="mb-4 h-36 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="h-96 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800 xl:col-span-8" />
            <div className="h-96 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800 xl:col-span-4" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="mx-auto flex h-full w-full max-w-[1680px] flex-col gap-2 p-2 sm:p-3 lg:p-3">
        <div>
        <PortalHeader
          title="CEO Dashboard"
          subtitle="Executive command center"
          user={user}
          icon="business_center"
          showSearch
          showNotifications
          showThemeToggle
          onSearchChange={(event) => setQuery(event.target.value)}
          searchPlaceholder="Search departments..."
        >
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['ceo-dashboard', token] });
                queryClient.invalidateQueries({ queryKey: ['ceo-analytics', token, period] });
              }}
              className="min-h-9 rounded-lg bg-white px-3 text-xs font-bold uppercase text-neutral-700 transition-colors hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              Refresh
            </button>
            {['7d', '30d', '90d'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`min-h-9 rounded-lg px-3 text-xs font-bold uppercase transition-colors ${
                  period === item
                    ? 'bg-primary text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </PortalHeader>
        <WarmGreeting user={user} roleHint="executive overview" className="mb-2 px-1" />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* ── CEO Attention Required ──────────────────────────────────────── */}
        {/* Placed above the metrics on purpose: "what needs me" outranks "what are the
            numbers". Each row routes into the module that can act on it (§29), and the
            panel is simply absent when the business is quiet. */}
        {attentionItems.length > 0 && (
          <section className="mb-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-300">priority_high</span>
              <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">CEO Attention Required</h2>
              <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                {attentionItems.length}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {attentionItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate?.(item.view)}
                    disabled={!onNavigate}
                    className="flex w-full items-start gap-2 rounded-lg border border-neutral-200 bg-white p-2.5 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-default dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    aria-label={`${item.title}. ${item.cta}`}
                  >
                    <span
                      className={`material-symbols-outlined shrink-0 text-[18px] ${
                        item.severity === 'critical' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">{item.title}</span>
                      {item.detail && (
                        <span className="mt-0.5 block truncate text-[11px] text-neutral-500 dark:text-neutral-400">{item.detail}</span>
                      )}
                      {onNavigate && (
                        <span className="mt-1 block text-[10px] font-bold text-primary">{item.cta} →</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid grid-cols-1 gap-2 xl:grid-cols-12">
          {/* KPIs drill into their own module, so a number the CEO questions is one click
              from its detail (§29/§30). */}
          <div className="grid grid-cols-2 gap-2 xl:col-span-4">
            <KPICard title="Revenue" value={snapshot.revenue.value} icon="trending_up" colorScheme="green" subtitle={analytics?.revenue?.momGrowth || snapshot.revenue.change || '—'} compact className="min-h-[86px]" onClick={onNavigate ? () => onNavigate('revenueAnalytics') : undefined} />
            <KPICard title="Profit" value={snapshot.profit.value} icon="account_balance" colorScheme="blue" subtitle={snapshot.profit.change || '—'} compact className="min-h-[86px]" onClick={onNavigate ? () => onNavigate('revenueAnalytics') : undefined} />
            <KPICard title="Margin" value={analytics?.profitability?.margin != null ? `${analytics.profitability.margin}%` : '—'} icon="monitoring" colorScheme="purple" subtitle="net of recorded cost" compact className="min-h-[86px]" onClick={onNavigate ? () => onNavigate('revenueAnalytics') : undefined} />
            <KPICard title="Active Users" value={analytics?.userAnalytics?.activeUsers != null ? analytics.userAnalytics.activeUsers.toLocaleString() : '—'} icon="groups" colorScheme="orange" subtitle={analytics?.userAnalytics ? `${analytics.userAnalytics.inactiveUsers || 0} inactive` : '—'} compact className="min-h-[86px]" onClick={onNavigate ? () => onNavigate('employees') : undefined} />
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 xl:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Executive Focus</p>
                <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">Decision Signals</h2>
              </div>
              <Button variant="primary" className="min-h-8 px-2 py-1 text-xs" onClick={() => navigate('/admin/reports')} icon={<span className="material-symbols-outlined text-sm">download</span>}>Board Pack</Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-5">
              {analyticsQuery.isLoading && topInsights.length === 0
                ? Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-[52px] animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                  ))
                : topInsights.map((item) => (
                    <div key={item.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-800/60">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{item.label}</p>
                      <p className="mt-0.5 text-sm font-black tabular-nums text-neutral-900 dark:text-neutral-100">{item.value}</p>
                      {item.note && <p className="text-[10px] text-neutral-400">{item.note}</p>}
                    </div>
                  ))}
              {!analyticsQuery.isLoading && topInsights.length === 0 && (
                <p className="col-span-full py-3 text-center text-[11px] text-neutral-400">
                  No financial activity recorded for this period.
                </p>
              )}
            </div>
          </div>
        </section>
        <section className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500">Pending Approvals</p>
            <p className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-100">
              {dashboardData?.approvals?.budgetApprovals?.value ?? '—'}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500">High Risk Alerts</p>
            <p className="mt-1 text-xl font-black text-rose-600">{dashboardData?.complianceRisk?.highRiskAlerts ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500">System Uptime</p>
            <p className="mt-1 text-xl font-black text-emerald-600">{dashboardData?.systemHealth?.uptime ?? '—'}</p>
          </div>
        </section>
        </div>

        <OutsourcingWidget token={token} />

        <div className="min-h-0 flex-1">
        {analyticsQuery.isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            Analytics unavailable: {analyticsQuery.error?.message || 'could not load executive analytics'}
          </div>
        ) : analyticsQuery.isLoading && !analytics ? (
          <div className="h-full min-h-[240px] animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ) : (
          <Suspense fallback={<div className="mb-4 h-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}>
            <CEOAnalyticsCharts analytics={analytics} compact />
          </Suspense>
        )}
        </div>
      </div>
    </main>
  );
};

export default CEODashboard;
