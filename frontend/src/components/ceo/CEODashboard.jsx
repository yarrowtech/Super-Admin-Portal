import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ceoApi } from '../../services/ceo';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';
const CEOAnalyticsCharts = lazy(() => import('./CEOAnalyticsCharts'));

const defaultDashboard = {
  totalEmployees: 0,
  departmentStats: [],
  lastUpdated: new Date().toISOString(),
  executiveSnapshot: {
    revenue: { value: '₹12.8M', change: '+2.5%' },
    cost: { value: '₹8.4M', change: '+1.1%' },
    profit: { value: '₹4.4M', change: '+3.2%' },
    activeProjects: { value: '48', note: '+6 this month' },
    completedProjects: { value: '132', note: '89% success rate' },
    employeeStrength: { value: '1,240', note: '+12 net hires' },
    criticalApprovals: { value: '9', note: '4 overdue' },
    systemUptime: { value: '99.98%', change: '+0.01%' },
  },
  projectKpis: {
    rows: [
      { name: 'Phoenix ERP Modernization', revenue: '₹2.4M', cost: '₹1.6M', profit: '₹0.8M', status: 'Active', risk: 'Medium' },
      { name: 'Atlas Cloud Migration', revenue: '₹3.1M', cost: '₹2.2M', profit: '₹0.9M', status: 'Active', risk: 'High' },
      { name: 'Orion Media Expansion', revenue: '₹1.7M', cost: '₹1.1M', profit: '₹0.6M', status: 'Completed', risk: 'Low' },
    ],
    summary: { active: '48', completed: '132', successRate: '89%', allocatedEmployees: '768', availableEmployees: '472' },
  },
  departmentPerformance: {
    cards: [
      { name: 'Human Resources', status: 'On Track', metrics: [{ label: 'Hiring Velocity', value: '+18 roles' }, { label: 'Attrition Rate', value: '3.1%' }] },
      { name: 'Finance', status: 'Healthy', metrics: [{ label: 'Profit Margin', value: '+18.2%' }, { label: 'Cash Runway', value: '14 months' }] },
      { name: 'IT', status: 'At Risk', metrics: [{ label: 'Incident MTTR', value: '2.4 hrs' }, { label: 'Critical Tickets', value: '7' }] },
      { name: 'Media', status: 'Strong', metrics: [{ label: 'Engagement Rate', value: '6.8%' }, { label: 'Campaign ROI', value: '+220%' }] },
    ],
  },
  approvals: {
    budgetApprovals: { value: '6', note: '2 escalated' },
    highValueExpenses: { value: '3', note: '₹1.4M pending' },
    policyApprovals: { value: '4', note: 'Compliance updates' },
    exceptionApprovals: { value: '2', note: 'High priority' },
  },
  financials: {
    revenueSummary: { value: '₹12.8M', note: '+2.5% QTD' },
    expenseSummary: { value: '₹8.4M', note: '+1.1% QTD' },
    profitLoss: { value: '₹4.4M', note: 'Margin 34.2%' },
    cashFlow: { value: '₹3.6M', note: 'Net inflow' },
  },
  people: {
    totalEmployees: '1,240',
    attritionRate: '3.1%',
    retentionRate: '96.9%',
    hiringTrends: '+12 net',
    engagementIndex: '82',
  },
  complianceRisk: {
    legalCompliance: '98.6%',
    pendingLegalIssues: '3',
    highRiskAlerts: '4',
    dataSecurityAlerts: '3 warnings',
  },
  systemHealth: {
    uptime: '99.98%',
    incidents: '1 active',
    backupStatus: 'Last run 2h ago',
    securityAlerts: '3 warnings',
    disasterRecovery: 'Ready',
  },
  alerts: [
    { id: 1, icon: 'gpp_maybe', title: 'Data Security Risk Alert', description: 'Elevated privilege access detected in finance systems.', time: '20m ago', severity: 'high' },
    { id: 2, icon: 'policy', title: 'Policy Violation Report', description: 'Unapproved vendor onboarding in Media department.', time: '3h ago', severity: 'medium' },
    { id: 3, icon: 'warning', title: 'Pending Legal Issue', description: 'Contract dispute escalated with regional partner.', time: '1d ago', severity: 'high' },
  ],
  pendingApprovals: [
    { title: 'Budget: APAC Expansion', detail: '₹480k - 2 days pending', status: 'Overdue' },
    { title: 'High-Value Expense: Data Lake', detail: '₹320k - 18h pending', status: 'Review' },
    { title: 'Exception: Vendor SLA', detail: 'Finance - 1 day pending', status: 'Review' },
  ],
  analytics: {
    revenue: { mrr: 0, arr: 0, momGrowth: '+0%', yoyGrowth: '+0%', trend: [] },
    profitability: { revenue: 0, expenses: 0, netProfit: 0, burnRate: 0, runwayMonths: 0 },
    productPerformance: [],
    userAnalytics: { dailyNewUsers: [], monthlyNewUsers: [], retentionRate: 0, activeUsers: 0, inactiveUsers: 0, conversionRate: 0 },
    departmentKpis: { sales: { performanceScore: 0 }, hr: { efficiency: 0 }, it: { uptime: 0 }, finance: { accuracy: 0 } },
  }
};

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const CEODashboard = () => {
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
      analytics: { ...prev.analytics, ...data.analytics },
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
  const analytics = dashboardData.analytics || defaultDashboard.analytics;
  const topInsights = useMemo(() => ([
    `MRR ${snapshot.revenue.value} (${analytics.revenue?.momGrowth || '+0%'})`,
    `ARR ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(analytics.revenue?.arr || 0)}`,
    `Runway ${analytics.profitability?.runwayMonths || 0} months`,
    `Retention ${analytics.userAnalytics?.retentionRate || 0}%`,
  ]), [snapshot.revenue.value, analytics]);

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <main className="h-[calc(100vh-4rem)] flex-1 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
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
    <main className="h-[calc(100vh-4rem)] flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
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
              onClick={() => queryClient.invalidateQueries({ queryKey: ['ceo-dashboard', token] })}
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

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-2 xl:grid-cols-12">
          <div className="grid grid-cols-2 gap-2 xl:col-span-4">
            <KPICard title="Revenue" value={snapshot.revenue.value} icon="trending_up" colorScheme="green" subtitle={analytics.revenue?.momGrowth || snapshot.revenue.change} compact className="min-h-[86px]" />
            <KPICard title="Profit" value={snapshot.profit.value} icon="account_balance" colorScheme="blue" subtitle={snapshot.profit.change} compact className="min-h-[86px]" />
            <KPICard title="Growth" value={analytics.revenue?.yoyGrowth || '+0%'} icon="monitoring" colorScheme="purple" subtitle="YOY" compact className="min-h-[86px]" />
            <KPICard title="Active Users" value={(analytics.userAnalytics?.activeUsers || dashboardData.people?.totalEmployeesNumeric || 0).toLocaleString()} icon="groups" colorScheme="orange" subtitle={`${analytics.userAnalytics?.inactiveUsers || 0} inactive`} compact className="min-h-[86px]" />
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 xl:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Executive Focus</p>
                <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">Decision Signals</h2>
              </div>
              <Button variant="primary" className="min-h-8 px-2 py-1 text-xs" onClick={() => navigate('/admin/reports')} icon={<span className="material-symbols-outlined text-sm">download</span>}>Board Pack</Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-4">
              {topInsights.map((item) => (
                <div key={item} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-[11px] font-semibold dark:border-neutral-800 dark:bg-neutral-800/60">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500">Pending Approvals</p>
            <p className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-100">
              {dashboardData?.approvals?.budgetApprovals?.value || '0'}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500">High Risk Alerts</p>
            <p className="mt-1 text-xl font-black text-rose-600">{dashboardData?.complianceRisk?.highRiskAlerts || '0'}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500">System Uptime</p>
            <p className="mt-1 text-xl font-black text-emerald-600">{dashboardData?.systemHealth?.uptime || 'N/A'}</p>
          </div>
        </section>
        </div>

        <div className="min-h-0 flex-1">
        <Suspense fallback={<div className="mb-4 h-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}>
          <CEOAnalyticsCharts analytics={analytics} compact />
        </Suspense>
        </div>
      </div>
    </main>
  );
};

export default CEODashboard;
