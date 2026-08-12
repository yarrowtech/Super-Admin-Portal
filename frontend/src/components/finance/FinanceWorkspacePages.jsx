import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import KPICard from '../common/KPICard';
import { financeApi } from '../../services/finance';
import { useAuth } from '../../context/AuthContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const card = 'rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950';
const inner = 'p-5 lg:p-6';
const statBox = 'rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900';
const input = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';

const tone = {
  draft: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  sent: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  unpaid: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  processed: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  disbursed: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  reconciled: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  verified: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  filed: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  posted: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  'on-track': 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  over: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  high: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  submitted: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  'at-risk': 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
};

const Pill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[String(value || '').toLowerCase().replace(/[\s_]+/g, '-')] || tone.draft}`}>
    {String(value || 'Unknown')}
  </span>
);

const SectionHdr = ({ title, subtitle, action }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Header = ({ title, subtitle, icon, user, crumbs = [], actions = null }) => (
  <PortalHeader title={title} subtitle={subtitle} user={user} icon={icon} showSearch={false} showNotifications showThemeToggle>
    {crumbs.map((crumb) => (
      <span key={crumb} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm dark:bg-neutral-800 dark:text-neutral-200">
        {crumb}
      </span>
    ))}
    {actions}
  </PortalHeader>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onChange(t.id)}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active === t.id ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const StatGrid = ({ items }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <div key={item.label} className={statBox}>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{item.label}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{item.value ?? '—'}</p>
        {item.subtext && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{item.subtext}</p>}
      </div>
    ))}
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const fmtDateOnly = (v) => {
  if (!v) return 'N/A';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const unwrap = (res) => res?.data ?? res ?? {};
const toList = (payload) => (Array.isArray(payload) ? payload : payload?.items || []);

const getInvoiceTotal = (invoice) => {
  const numericTotal = Number(invoice?.total ?? invoice?.amount ?? invoice?.totalAmount);
  if (!Number.isNaN(numericTotal) && numericTotal > 0) return numericTotal;
  const items = invoice?.items || [];
  const base = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
  const discount = Number(invoice?.discount || 0);
  const taxRate = Number(invoice?.gstRate ?? items?.[0]?.taxRate ?? invoice?.taxRate ?? 0);
  const taxable = Math.max(base - discount, 0);
  const tax = (taxRate / 100) * taxable;
  return taxable + tax;
};

const invoiceStatusLabel = (invoice) => (invoice.status === 'sent' ? 'unpaid' : invoice.status || 'draft');

const useAsync = (loader, deps = []) => {
  const [state, setState] = useState({ loading: true, error: '', data: {} });
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    const run = async () => {
      try {
        const raw = await loader();
        if (alive) setState({ loading: false, error: '', data: raw });
      } catch (err) {
        if (alive) setState({ loading: false, error: err.message || 'Failed to load data', data: {} });
      }
    };
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  const refetch = () => setReloadKey((k) => k + 1);
  return { ...state, refetch };
};

const SkeletonBlock = () => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
    ))}
  </div>
);

const FINANCE_DEPARTMENTS = ['IT', 'HR', 'Media', 'Law', 'Executive', 'Outsourcing'];

// ════════════════════════════════════════════════════════════════════════════
// Overview
// ════════════════════════════════════════════════════════════════════════════

export const FinanceOverviewPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [departmentScope, setDepartmentScope] = useState('All Departments');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const { loading, error, data } = useAsync(async () => {
    const [dashboardRes, invoicesRes, expensesRes, profitLossRes, balanceSheetRes] = await Promise.allSettled([
      financeApi.getDashboard(token),
      financeApi.getInvoices(token),
      financeApi.getExpenses(token),
      financeApi.getProfitLoss(token),
      financeApi.getBalanceSheet(token),
    ]);
    return {
      dashboard: dashboardRes.status === 'fulfilled' ? unwrap(dashboardRes.value) : null,
      invoices: invoicesRes.status === 'fulfilled' ? toList(unwrap(invoicesRes.value)) : [],
      expenses: expensesRes.status === 'fulfilled' ? toList(unwrap(expensesRes.value)) : [],
      profitLoss: profitLossRes.status === 'fulfilled' ? unwrap(profitLossRes.value) : { revenue: 0, expenses: 0, netIncome: 0 },
      balanceSheet: balanceSheetRes.status === 'fulfilled' ? unwrap(balanceSheetRes.value) : { assets: 0, liabilities: 0, equity: 0 },
    };
  }, [token]);

  const dashboard = data.dashboard || {};
  const invoices = data.invoices || [];
  const expenses = data.expenses || [];
  const profitLoss = data.profitLoss || { revenue: 0, expenses: 0, netIncome: 0 };
  const balanceSheet = data.balanceSheet || { assets: 0, liabilities: 0, equity: 0 };
  const roleExperience = dashboard.roleExperience || (String(user?.role || '').toLowerCase() === 'finance_employee' ? 'employee' : 'head');
  const isFinanceHead = roleExperience === 'head';
  const departments = ['All Departments', 'IT', 'HR', 'Media', 'Law', 'Executive', 'Outsourcing'];
  const scopedDepartmentRows = useMemo(() => {
    const rows = dashboard.departmentFinancials || [];
    const scoped = departmentScope === 'All Departments' ? rows : rows.filter((row) => row.department === departmentScope);
    const query = dashboardSearch.trim().toLowerCase();
    if (!query) return scoped;
    return scoped.filter((row) => row.department.toLowerCase().includes(query) || row.status.toLowerCase().includes(query));
  }, [dashboard.departmentFinancials, dashboardSearch, departmentScope]);

  const outstandingInvoices = useMemo(
    () => invoices.filter((invoice) => Number(invoice.balanceDue || 0) > 0 && invoice.status !== 'paid'),
    [invoices]
  );

  const invoiceMetrics = useMemo(() => {
    const now = new Date();
    const metrics = { totalAmount: 0, overdueAmount: 0, outstandingAmount: 0, overdueCount: 0 };
    invoices.forEach((invoice) => {
      const total = getInvoiceTotal(invoice);
      const balanceDue = Number(invoice?.balanceDue ?? (invoice?.status === 'paid' ? 0 : total));
      metrics.totalAmount += Number(total) || 0;
      metrics.outstandingAmount += Number(balanceDue) || 0;
      const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
      if (dueDate && dueDate < now && invoice?.status !== 'paid' && balanceDue > 0) {
        metrics.overdueAmount += Number(balanceDue) || 0;
        metrics.overdueCount += 1;
      }
    });
    return metrics;
  }, [invoices]);

  const agingBuckets = useMemo(() => {
    const now = new Date();
    const buckets = {
      current: { label: 'Current', amount: 0, count: 0 },
      bucket1: { label: '1-30', amount: 0, count: 0 },
      bucket2: { label: '31-60', amount: 0, count: 0 },
      bucket3: { label: '61-90', amount: 0, count: 0 },
      bucket4: { label: '90+', amount: 0, count: 0 },
    };
    outstandingInvoices.forEach((invoice) => {
      const balance = Number(invoice?.balanceDue ?? getInvoiceTotal(invoice));
      if (!Number.isFinite(balance) || balance <= 0) return;
      const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
      if (!dueDate || dueDate >= now) {
        buckets.current.amount += balance;
        buckets.current.count += 1;
        return;
      }
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      const bucket = daysOverdue <= 30 ? buckets.bucket1 : daysOverdue <= 60 ? buckets.bucket2 : daysOverdue <= 90 ? buckets.bucket3 : buckets.bucket4;
      bucket.amount += balance;
      bucket.count += 1;
    });
    return Object.values(buckets);
  }, [outstandingInvoices]);

  const expenseSummary = useMemo(() => {
    let totalAmount = 0;
    let verifiedAmount = 0;
    let verifiedCount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    expenses.forEach((expense) => {
      const amount = Number(expense?.amount || 0);
      totalAmount += amount;
      if (expense?.status === 'verified') {
        verifiedAmount += amount;
        verifiedCount += 1;
      }
      if (expense?.status === 'submitted' || expense?.status === 'pending') {
        pendingCount += 1;
        pendingAmount += amount;
      }
    });
    return { totalAmount, verifiedAmount, verifiedCount, pendingCount, pendingAmount };
  }, [expenses]);

  const financeSummary = useMemo(() => {
    const revenue = Number(profitLoss?.revenue || 0);
    const totalExpenses = Number(profitLoss?.expenses || expenseSummary.totalAmount || 0);
    const net = Number(profitLoss?.netIncome || 0);
    const burnRate = revenue > 0 ? (totalExpenses / revenue) * 100 : 0;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;
    const assets = Number(balanceSheet?.assets || 0);
    const liabilities = Number(balanceSheet?.liabilities || 0);
    const equity = Number(balanceSheet?.equity || 0);
    const liquidity = liabilities > 0 ? assets / liabilities : assets > 0 ? 1 : 0;
    return {
      revenue,
      totalExpenses,
      net,
      burnRate,
      margin,
      assets,
      liabilities,
      equity,
      liquidity,
    };
  }, [balanceSheet, expenseSummary.totalAmount, profitLoss]);

  const backendKpis = useMemo(() => (dashboard.kpis || []).map((item) => ({
    label: item.label,
    icon:
      item.label === 'Total Cash' ? 'account_balance'
        : item.label === 'Total Budget' ? 'account_balance_wallet'
          : item.label === 'Total Expenses' ? 'request_quote'
            : item.label === 'Pending Requests' ? 'assignment'
              : item.label === 'Pending Approvals' ? 'approval'
                : item.label === 'Pending Payments' ? 'payments'
                  : item.label === 'Outstanding Receivables' ? 'receipt_long'
                    : 'receipt',
    value: typeof item.value === 'number' ? formatCurrency(item.value) : item.value,
    subtitle: `${Number(item.changePercent || 0).toFixed(1)}% vs prev`,
    trend: { direction: item.trend === 'down' ? 'down' : 'up', value: item.trend === 'down' ? 'Down' : 'Up' },
    drillDown: item.drillDown,
  })), [dashboard.kpis]);

  const kpis = useMemo(() => (backendKpis.length ? backendKpis : [
    {
      label: 'Revenue',
      icon: 'trending_up',
      value: formatCurrency(financeSummary.revenue),
      subtitle: `${invoices.length} invoices`,
      trend: financeSummary.revenue > 0 ? { direction: 'up', value: 'Booked' } : undefined,
    },
    {
      label: 'Expenses',
      icon: 'request_quote',
      value: formatCurrency(financeSummary.totalExpenses),
      subtitle: `${expenseSummary.pendingCount} pending`,
    },
    {
      label: 'Net Income',
      icon: 'account_balance_wallet',
      value: formatCurrency(financeSummary.net),
      subtitle: `${financeSummary.margin.toFixed(1)}% margin`,
      trend: financeSummary.net >= 0 ? { direction: 'up', value: 'Profit' } : { direction: 'down', value: 'Loss' },
    },
    {
      label: 'Receivables',
      icon: 'pending_actions',
      value: formatCurrency(invoiceMetrics.outstandingAmount),
      subtitle: `${invoiceMetrics.overdueCount} overdue`,
      trend: invoiceMetrics.overdueAmount > 0 ? { direction: 'down', value: 'Risk' } : undefined,
    },
  ]), [backendKpis, expenseSummary.pendingCount, financeSummary, invoiceMetrics, invoices.length]);

  const maxAgingAmount = useMemo(
    () => Math.max(...agingBuckets.map((bucket) => Number(bucket.amount || 0)), 1),
    [agingBuckets]
  );

  const recentInvoices = useMemo(
    () => [...invoices]
      .sort((a, b) => new Date(b.createdAt || b.issueDate || 0) - new Date(a.createdAt || a.issueDate || 0))
      .slice(0, 5),
    [invoices]
  );

  const topExpenses = useMemo(
    () => [...expenses]
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 5),
    [expenses]
  );

  const controlItems = [
    {
      label: 'Overdue AR',
      value: formatCurrency(invoiceMetrics.overdueAmount),
      detail: `${invoiceMetrics.overdueCount} invoices need follow-up`,
      icon: 'warning',
      tone: invoiceMetrics.overdueAmount > 0 ? 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50' : 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    },
    {
      label: 'Pending Expense Review',
      value: formatCurrency(expenseSummary.pendingAmount),
      detail: `${expenseSummary.pendingCount} submissions waiting`,
      icon: 'rate_review',
      tone: expenseSummary.pendingCount > 0 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50' : 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    },
    {
      label: 'Liquidity Ratio',
      value: financeSummary.liquidity.toFixed(2),
      detail: `${formatCurrency(financeSummary.assets)} assets`,
      icon: 'waterfall_chart',
      tone: financeSummary.liquidity >= 1 ? 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/50' : 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50',
    },
  ];
  const pendingRequests = dashboard.pendingRequests || [];
  const approvalQueue = dashboard.approvalQueue || [];
  const paymentQueue = dashboard.paymentQueue || [];
  const recentAuditActivity = dashboard.recentAuditActivity || [];
  const primaryQueue = isFinanceHead ? approvalQueue : pendingRequests;

  return (
    <main className="portal-page bg-[linear-gradient(180deg,#f8fafc_0%,#eef7f1_42%,#f8fafc_100%)] dark:bg-background-dark">
      <div className="portal-page-inner max-w-[1500px] space-y-5">
        <Header
          title="Finance Command Center"
          subtitle="Cash, receivables, spend, compliance, and approvals in one workspace"
          icon="account_balance"
          user={user}
          crumbs={['Finance', 'Live Operations']}
          actions={
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <div className="relative min-w-[220px] flex-1 sm:flex-none">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-neutral-400">search</span>
                <input
                  value={dashboardSearch}
                  onChange={(event) => setDashboardSearch(event.target.value)}
                  placeholder="Search finance..."
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </div>
              <select
                value={departmentScope}
                onChange={(event) => setDepartmentScope(event.target.value)}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              >
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={() => navigate('/finance/dashboard/reports')}>
                Reports
              </Button>
              <Button size="sm" variant="primary" onClick={() => navigate(isFinanceHead ? '/finance/dashboard/approvals' : '/finance/dashboard/activity')}>
                {isFinanceHead ? 'Approval Center' : 'My Queue'}
              </Button>
            </div>
          }
        />

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        {loading ? (
          <SkeletonBlock />
        ) : (
          <>
            <section className="portal-kpi-grid">
              {kpis.map((item) => (
                <button key={item.label} type="button" onClick={() => item.drillDown && navigate(item.drillDown)} className="min-w-0 text-left">
                  <KPICard title={item.label} value={item.value} icon={item.icon} subtitle={item.subtitle} trend={item.trend} />
                </button>
              ))}
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr
                    title={isFinanceHead ? 'Approval Center' : 'My Work Queue'}
                    subtitle={isFinanceHead ? 'Controlled requests waiting for Finance Head decision' : 'Assigned requests, verifications and missing information'}
                    action={<Pill value={isFinanceHead ? 'Finance Head' : 'Finance Employee'} />}
                  />
                  <div className="space-y-3">
                    {primaryQueue.length === 0 ? (
                      <EmptyState icon={isFinanceHead ? 'approval' : 'assignment_turned_in'} title={isFinanceHead ? 'No pending approvals' : 'No assigned finance work'} />
                    ) : primaryQueue.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{item.requestId}</p>
                            <Pill value={item.type || item.status} />
                            {item.approvalRequired && <Pill value="Approval Required" />}
                          </div>
                          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {item.department || 'Finance'} - {item.requester || item.budgetImpact || 'Workflow'} - {fmtDateOnly(item.submittedDate || item.submittedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                          <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(item.amount)}</p>
                          <Button
                            size="sm"
                            variant={isFinanceHead ? 'primary' : 'secondary'}
                            onClick={() => navigate(isFinanceHead ? '/finance/dashboard/approvals' : '/finance/dashboard/expenses')}
                          >
                            {isFinanceHead ? 'Decide' : 'Review'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Department Financial Overview" subtitle="Budget, spend, reservations and risk by department" action={<Button size="sm" variant="secondary" onClick={() => navigate('/finance/dashboard/project-overview')}>Open Profiles</Button>} />
                  {scopedDepartmentRows.length === 0 ? <EmptyState icon="domain" title="No department finance data" /> : (
                    <div className="space-y-3">
                      {scopedDepartmentRows.map((row) => (
                        <button
                          key={row.department}
                          type="button"
                          onClick={() => navigate(`/finance/dashboard/project-overview?department=${encodeURIComponent(row.department)}`)}
                          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-emerald-800"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{row.department}</p>
                              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                Spent {formatCurrency(row.spent)} of {formatCurrency(row.budget)} - Reserved {formatCurrency(row.reserved)}
                              </p>
                            </div>
                            <Pill value={row.status} />
                          </div>
                          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                            <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-neutral-950">
                              <div
                                className={`h-full rounded-full ${row.utilization >= 100 ? 'bg-rose-500' : row.utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(Math.max(Number(row.utilization || 0), 3), 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-neutral-700 dark:text-neutral-300">{row.utilization}%</span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <span className="rounded-lg bg-white px-2 py-1 text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">{row.pendingRequests} requests</span>
                            <span className="rounded-lg bg-white px-2 py-1 text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">{row.pendingInvoices} invoices</span>
                            <span className="rounded-lg bg-white px-2 py-1 text-neutral-600 dark:bg-neutral-950 dark:text-neutral-300">{row.pendingPayments} payments</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.9fr]">
              <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <div className="border-b border-neutral-100 p-5 dark:border-neutral-800 lg:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Cash Position</p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-100">{formatCurrency(financeSummary.assets - financeSummary.liabilities)}</h2>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Assets less liabilities, backed by current balance sheet data.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Finance live
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Assets', value: financeSummary.assets, icon: 'account_balance' },
                      { label: 'Liabilities', value: financeSummary.liabilities, icon: 'receipt' },
                      { label: 'Equity', value: financeSummary.equity, icon: 'savings' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/70">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{item.label}</p>
                          <span className="material-symbols-outlined text-[18px] text-emerald-700 dark:text-emerald-300">{item.icon}</span>
                        </div>
                        <p className="mt-2 truncate text-lg font-black text-neutral-950 dark:text-neutral-100">{formatCurrency(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={inner}>
                  <SectionHdr title="Receivables aging" subtitle="Open invoice balances by overdue band" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{outstandingInvoices.length} open invoices</p>} />
                  <div className="space-y-3">
                    {agingBuckets.map((bucket) => (
                      <div key={bucket.label} className="grid grid-cols-[72px_1fr_auto] items-center gap-3">
                        <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">{bucket.label}d</p>
                        <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className={`h-full rounded-full ${bucket.label === '90+' || bucket.label === '61-90' ? 'bg-rose-500' : bucket.label === '31-60' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max((Number(bucket.amount || 0) / maxAgingAmount) * 100, bucket.amount > 0 ? 8 : 0)}%` }}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(bucket.amount)}</p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{bucket.count} rows</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className={card}>
                  <div className={inner}>
                    <SectionHdr title="Controls that need attention" subtitle="Operational finance exceptions" />
                    <div className="space-y-3">
                      {controlItems.map((item) => (
                        <div key={item.label} className={`rounded-xl border p-4 ${item.tone}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-wide opacity-80">{item.label}</p>
                              <p className="mt-1 truncate text-xl font-black">{item.value}</p>
                              <p className="mt-1 text-xs opacity-80">{item.detail}</p>
                            </div>
                            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={card}>
                  <div className={inner}>
                    <SectionHdr title="Quick actions" subtitle="Jump into daily finance work" />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Billing', icon: 'receipt_long', path: '/finance/dashboard/invoices' },
                        { label: 'Payments', icon: 'payments', path: '/finance/dashboard/payments' },
                        { label: 'Expenses', icon: 'request_quote', path: '/finance/dashboard/expenses' },
                        { label: 'Reports', icon: 'bar_chart', path: '/finance/dashboard/reports' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => navigate(item.path)}
                          className="flex min-h-[76px] items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
                        >
                          <span className="material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[20px] text-emerald-700 shadow-sm dark:bg-neutral-950 dark:text-emerald-300">{item.icon}</span>
                          <span className="text-sm font-black text-neutral-800 dark:text-neutral-100">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Recent invoices" subtitle="Latest billing activity" action={<Button size="sm" variant="secondary" onClick={() => navigate('/finance/dashboard/invoices')}>Open Billing</Button>} />
                  {recentInvoices.length === 0 ? <EmptyState icon="receipt_long" title="No invoices yet" /> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left">
                        <thead>
                          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                            <th className="py-2 pr-3">Client</th>
                            <th className="px-3 py-2">Due</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="py-2 pl-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentInvoices.map((invoice) => (
                            <tr key={invoice._id || invoice.id || invoice.invoiceNumber} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                              <td className="py-3 pr-3">
                                <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{invoice.clientName || invoice.customerName || 'Client'}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{invoice.invoiceNumber || invoice.reference || 'Invoice'}</p>
                              </td>
                              <td className="px-3 py-3 text-sm text-neutral-600 dark:text-neutral-300">{fmtDateOnly(invoice.dueDate)}</td>
                              <td className="px-3 py-3"><Pill value={invoiceStatusLabel(invoice)} /></td>
                              <td className="py-3 pl-3 text-right text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(getInvoiceTotal(invoice))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Expense control" subtitle="Largest expenses and review status" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{expenses.length} entries</p>} />
                  <div className="space-y-3">
                    {topExpenses.length === 0 ? <EmptyState icon="request_quote" title="No expenses recorded" /> : topExpenses.map((expense) => (
                      <div key={expense._id || expense.id || expense.title} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{expense.title || expense.category || 'Expense'}</p>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{expense.department || 'Finance'} - {fmtDateOnly(expense.createdAt || expense.date)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(expense.amount)}</p>
                          <Pill value={expense.status || 'submitted'} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Payment Queue" subtitle="Prepared payments and reconciliation work" action={<Button size="sm" variant="secondary" onClick={() => navigate('/finance/dashboard/payments')}>Open Payments</Button>} />
                  <div className="space-y-3">
                    {paymentQueue.length === 0 ? <EmptyState icon="payments" title="No pending payments" /> : paymentQueue.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{payment.paymentId} - {payment.payee}</p>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{payment.method || 'bank'} - account {payment.accountMasked}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(payment.amount)}</p>
                          <Pill value={payment.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Recent Audit Activity" subtitle="Important finance actions are traceable" action={<Button size="sm" variant="secondary" onClick={() => navigate('/finance/dashboard/activity')}>Open Audit</Button>} />
                  <div className="space-y-3">
                    {recentAuditActivity.length === 0 ? <EmptyState icon="policy" title="No audit events yet" /> : recentAuditActivity.slice(0, 6).map((event) => (
                      <div key={event._id || event.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        <span className="material-symbols-outlined flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[18px] text-emerald-700 dark:bg-neutral-950 dark:text-emerald-300">policy</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{String(event.action || 'Finance action').replace(/_/g, ' ')}</p>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{event.actorRole || 'System'} - {event.resourceType || 'finance'} {event.resourceId || ''}</p>
                        </div>
                        <p className="text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400">{fmtDate(event.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Invoices
// ════════════════════════════════════════════════════════════════════════════

export const FinanceDepartmentProfilesPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDepartment = searchParams.get('department') || 'IT';
  const activeTab = searchParams.get('tab') || 'overview';

  const { loading, error, data } = useAsync(async () => {
    const [departmentsRes, profileRes] = await Promise.all([
      financeApi.getDepartmentFinancials(token),
      financeApi.getDepartmentFinancialProfile(token, selectedDepartment),
    ]);
    return {
      departments: toList(unwrap(departmentsRes)),
      profile: unwrap(profileRes),
    };
  }, [token, selectedDepartment]);

  const departments = data.departments || [];
  const profileData = data.profile || {};
  const profile = profileData.profile || departments.find((item) => item.department === selectedDepartment) || {};
  const tabRows = {
    requests: profileData.requests || [],
    expenses: profileData.expenses || [],
    invoices: profileData.invoices || [],
    budget: profileData.budgets || [],
    payments: profileData.payments || [],
    transactions: profileData.transactions || [],
    documents: profileData.documents || [],
    activity: profileData.activity || [],
  };
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'requests', label: 'Requests' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'budget', label: 'Budget' },
    { id: 'payments', label: 'Payments' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'documents', label: 'Documents' },
    { id: 'activity', label: 'Activity' },
  ];
  const setDepartment = (department) => setSearchParams({ department, tab: activeTab });
  const setTab = (tab) => setSearchParams({ department: selectedDepartment, tab });

  const renderRowList = (rows, emptyTitle) => (
    rows.length === 0 ? <EmptyState icon="list_alt" title={emptyTitle} /> : (
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id || row._id || row.requestId || row.invoiceNumber || row.reference} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{row.requestId || row.invoiceNumber || row.title || row.reference || row.label || row.action || row.type || 'Finance record'}</p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {row.type || row.category || row.resourceType || selectedDepartment} - {fmtDateOnly(row.submittedDate || row.createdAt || row.dueDate)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {(row.amount !== undefined || row.total !== undefined || row.budget !== undefined) && (
                <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(row.amount ?? row.total ?? row.budget)}</p>
              )}
              <Pill value={row.status || row.riskFlag || 'tracked'} />
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <main className="portal-page">
      <div className="portal-page-inner max-w-[1500px] space-y-5">
        <Header
          title={`${selectedDepartment} Financial Profile`}
          subtitle="Department financial context only: budgets, requests, payments, transactions and audit"
          icon="domain"
          user={user}
          crumbs={['Finance', selectedDepartment]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select className={input} value={selectedDepartment} onChange={(event) => setDepartment(event.target.value)}>
                {FINANCE_DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              <Button size="sm" variant="secondary" onClick={() => navigate('/finance/dashboard')}>Command Center</Button>
            </div>
          }
        />
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        {loading ? <SkeletonBlock /> : (
          <>
            <section className="portal-kpi-grid">
              {[
                { title: 'Budget', value: profile.budget, icon: 'account_balance_wallet', subtitle: 'Allocated' },
                { title: 'Spent', value: profile.spent, icon: 'request_quote', subtitle: `${profile.utilization || 0}% used` },
                { title: 'Reserved', value: profile.reserved, icon: 'pending_actions', subtitle: `${profile.pendingRequests || 0} requests` },
                { title: 'Remaining', value: profile.remaining, icon: 'savings', subtitle: profile.status || 'healthy' },
              ].map((item) => (
                <KPICard key={item.title} title={item.title} value={formatCurrency(item.value)} icon={item.icon} subtitle={item.subtitle} trend={item.title === 'Remaining' && Number(item.value) < 0 ? { direction: 'down', value: 'Over' } : undefined} />
              ))}
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.4fr]">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="All Departments" subtitle="Click to drill into financial profile" />
                  <div className="space-y-2">
                    {departments.map((row) => (
                      <button
                        key={row.department}
                        type="button"
                        onClick={() => setDepartment(row.department)}
                        className={`w-full rounded-xl border p-3 text-left transition ${row.department === selectedDepartment ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-neutral-200 bg-neutral-50 hover:border-emerald-300 dark:border-neutral-800 dark:bg-neutral-900'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{row.department}</p>
                          <Pill value={row.status} />
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white dark:bg-neutral-950">
                          <div className={`h-full rounded-full ${row.utilization >= 100 ? 'bg-rose-500' : row.utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(Math.max(Number(row.utilization || 0), 3), 100)}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{formatCurrency(row.spent)} spent - {formatCurrency(row.remaining)} remaining</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className={card}>
                <div className={inner}>
                  <TabBar tabs={tabs} active={activeTab} onChange={setTab} />
                  <div className="mt-4">
                    {activeTab === 'overview' && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className={statBox}><p className="text-xs font-bold uppercase text-neutral-500">Pending Requests</p><p className="mt-2 text-2xl font-black">{profile.pendingRequests || 0}</p></div>
                        <div className={statBox}><p className="text-xs font-bold uppercase text-neutral-500">Pending Invoices</p><p className="mt-2 text-2xl font-black">{profile.pendingInvoices || 0}</p></div>
                        <div className={statBox}><p className="text-xs font-bold uppercase text-neutral-500">Pending Payments</p><p className="mt-2 text-2xl font-black">{profile.pendingPayments || 0}</p></div>
                      </div>
                    )}
                    {activeTab !== 'overview' && renderRowList(tabRows[activeTab] || [], `No ${activeTab} for ${selectedDepartment}`)}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

const emptyInvoiceForm = {
  clientName: '',
  clientEmail: '',
  status: 'draft',
  dueDate: '',
  description: '',
  quantity: 1,
  rate: 0,
  taxRate: 0,
  gstRate: 18,
  tdsRate: 0,
  discount: 0,
};

export const FinanceInvoicesPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { loading, error, data, refetch } = useAsync(async () => {
    const [invoicesRes, notesRes] = await Promise.all([financeApi.getInvoices(token), financeApi.getInvoiceNotes(token)]);
    return { invoices: toList(unwrap(invoicesRes)), notes: toList(unwrap(notesRes)) };
  }, [token]);

  const invoices = data.invoices || [];
  const notes = data.notes || [];

  const [form, setForm] = useState(emptyInvoiceForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const startEdit = (invoice) => {
    setEditingId(invoice._id);
    const firstItem = invoice.items?.[0] || {};
    setForm({
      clientName: invoice.clientName || '',
      clientEmail: invoice.clientEmail || '',
      status: invoice.status || 'draft',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      description: firstItem.description || '',
      quantity: firstItem.quantity || 1,
      rate: firstItem.rate || 0,
      taxRate: firstItem.taxRate || 0,
      gstRate: invoice.gstRate ?? firstItem.taxRate ?? 18,
      tdsRate: invoice.tdsRate || 0,
      discount: invoice.discount || 0,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        status: form.status,
        dueDate: form.dueDate || undefined,
        discount: Number(form.discount) || 0,
        gstRate: Number(form.gstRate) || 0,
        tdsRate: Number(form.tdsRate) || 0,
        items: [{ description: form.description, quantity: Number(form.quantity) || 0, rate: Number(form.rate) || 0, taxRate: Number(form.gstRate ?? form.taxRate) || 0 }],
      };
      if (editingId) {
        await financeApi.updateInvoice(editingId, payload, token);
      } else {
        await financeApi.createInvoice(payload, token);
      }
      setForm(emptyInvoiceForm);
      setEditingId(null);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async (invoiceId) => {
    try {
      await financeApi.updateInvoice(invoiceId, { status: 'paid' }, token);
      refetch();
    } catch { /* surfaced via list error state on next load */ }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Invoices & Billing" subtitle="Create, edit and track client invoices" icon="receipt_long" user={user} crumbs={['Finance', 'Invoices']} />

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title={editingId ? 'Update Invoice' : 'Create Invoice'} />
              <form onSubmit={handleSubmit} className="space-y-3">
                <input className={input} placeholder="Client name" value={form.clientName} onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))} required />
                <input className={input} placeholder="Client email" value={form.clientEmail} onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))} />
                <input className={input} placeholder="Item description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                <div className="grid grid-cols-3 gap-2">
                  <input className={input} placeholder="Qty" type="number" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
                  <input className={input} placeholder="Rate" type="number" value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))} />
                  <input className={input} placeholder="GST %" type="number" value={form.gstRate} onChange={(e) => setForm((p) => ({ ...p, gstRate: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input className={input} type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
                  <input className={input} placeholder="TDS %" type="number" value={form.tdsRate} onChange={(e) => setForm((p) => ({ ...p, tdsRate: e.target.value }))} />
                  <input className={input} placeholder="Discount" type="number" value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))} />
                </div>
                <select className={input} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>
                    {submitting ? 'Saving…' : editingId ? 'Update Invoice' : 'Save Invoice'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingId(null); setForm(emptyInvoiceForm); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Latest Notes</h3>
                <div className="mt-3 space-y-2">
                  {notes.slice(0, 5).map((note) => (
                    <div key={note._id} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700">
                      <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                        <span className="font-semibold">{note.type} note</span>
                        <span>{formatCurrency(note.amount)}</span>
                      </div>
                      <p className="text-neutral-500">{note.reason || 'No reason provided'}</p>
                    </div>
                  ))}
                  {notes.length === 0 && <p className="text-xs text-neutral-500 dark:text-neutral-400">No notes yet.</p>}
                </div>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Invoice History" subtitle={`${invoices.length} records`} />
              <DataTable
                columns={[
                  { key: 'invoiceNumber', header: 'Invoice', render: (r) => <span className="font-semibold text-neutral-900 dark:text-white">{r.invoiceNumber}</span> },
                  { key: 'clientName', header: 'Client' },
                  { key: 'status', header: 'Status', render: (r) => <Pill value={invoiceStatusLabel(r)} /> },
                  { key: 'total', header: 'Total', render: (r) => formatCurrency(r.total) },
                  { key: 'balanceDue', header: 'Balance', render: (r) => formatCurrency(r.balanceDue) },
                  {
                    key: 'actions',
                    header: 'Action',
                    render: (r) => (
                      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                        {r.status !== 'paid' && (
                          <button type="button" onClick={() => markPaid(r._id)} className="text-xs font-semibold text-primary hover:underline">
                            Mark paid
                          </button>
                        )}
                        {r.status === 'draft' && (
                          <button type="button" onClick={() => startEdit(r)} className="text-xs font-semibold text-neutral-500 hover:underline">
                            Edit
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]}
                rows={invoices}
                rowKey="_id"
                loading={loading}
                emptyTitle="No invoices found"
                onRowClick={(r) => navigate(`/finance/dashboard/invoices/${r._id}`)}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Invoice Detail
// ════════════════════════════════════════════════════════════════════════════

export const FinanceInvoiceDetailPage = () => {
  const { token, user } = useAuth();
  const { invoiceId } = useParams();
  const { loading, error, data, refetch } = useAsync(async () => {
    const [invoicesRes, notesRes] = await Promise.all([financeApi.getInvoices(token), financeApi.getInvoiceNotes(token, { invoiceId })]);
    const invoices = toList(unwrap(invoicesRes));
    return { invoice: invoices.find((inv) => inv._id === invoiceId) || null, notes: toList(unwrap(notesRes)) };
  }, [token, invoiceId]);

  const invoice = data.invoice;
  const notes = data.notes || [];

  const [noteForm, setNoteForm] = useState({ type: 'credit', amount: 0, reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleAddNote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError('');
    try {
      await financeApi.createInvoiceNote(invoiceId, { type: noteForm.type, amount: Number(noteForm.amount) || 0, reason: noteForm.reason }, token);
      setNoteForm({ type: 'credit', amount: 0, reason: '' });
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async () => {
    setActionError('');
    try {
      await financeApi.updateInvoice(invoiceId, { status: 'paid' }, token);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to update invoice');
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title={invoice?.invoiceNumber || 'Invoice Detail'}
          subtitle="Invoice detail, notes and status"
          icon="receipt_long"
          user={user}
          crumbs={['Finance', 'Invoices', invoice?.invoiceNumber || 'Invoice']}
          actions={<Button variant="secondary" size="sm" onClick={() => window.history.back()}>Back</Button>}
        />
        {loading && <SkeletonBlock />}
        {!loading && error && <EmptyState icon="error" title="Failed to load invoice" description={error} />}
        {!loading && !error && !invoice && <EmptyState icon="search_off" title="Invoice not found" description="This invoice may have been removed." />}
        {!loading && invoice && (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Invoice Details" action={invoice.status !== 'paid' && <Button variant="primary" size="sm" onClick={markPaid}>Mark Paid</Button>} />
                  <StatGrid
                    items={[
                      { label: 'Status', value: invoiceStatusLabel(invoice) },
                      { label: 'Client', value: invoice.clientName || '—' },
                      { label: 'Total', value: formatCurrency(invoice.total) },
                      { label: 'Balance Due', value: formatCurrency(invoice.balanceDue) },
                    ]}
                  />
                  {actionError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{actionError}</p>}
                </div>
              </section>

              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Credit / Debit Notes" subtitle={`${notes.length} notes`} />
                  <div className="space-y-2">
                    {notes.length === 0 && <EmptyState icon="note" title="No notes yet" description="Add a credit or debit note below." />}
                    {notes.map((note) => (
                      <div key={note._id} className={statBox}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{note.type} note</span>
                          <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{formatCurrency(note.amount)}</span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{note.reason || 'No reason provided'}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddNote} className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <div className="grid grid-cols-2 gap-2">
                      <select className={input} value={noteForm.type} onChange={(e) => setNoteForm((p) => ({ ...p, type: e.target.value }))}>
                        <option value="credit">Credit Note</option>
                        <option value="debit">Debit Note</option>
                      </select>
                      <input className={input} type="number" placeholder="Amount" value={noteForm.amount} onChange={(e) => setNoteForm((p) => ({ ...p, amount: e.target.value }))} />
                    </div>
                    <input className={input} placeholder="Reason" value={noteForm.reason} onChange={(e) => setNoteForm((p) => ({ ...p, reason: e.target.value }))} />
                    <Button type="submit" variant="outline" size="sm" disabled={submitting} fullWidth>
                      {submitting ? 'Saving…' : 'Save Note'}
                    </Button>
                  </form>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Timeline" />
                  <div className="space-y-2">
                    {[
                      ['Issue Date', fmtDateOnly(invoice.issueDate)],
                      ['Due Date', fmtDateOnly(invoice.dueDate)],
                      ['GST Rate', `${invoice.gstRate ?? 0}%`],
                      ['TDS Rate', `${invoice.tdsRate ?? 0}%`],
                      ['Discount', formatCurrency(invoice.discount)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Payments
// ════════════════════════════════════════════════════════════════════════════

export const FinancePaymentsPage = () => {
  const { token, user } = useAuth();
  const { loading, error, data, refetch } = useAsync(async () => {
    const [paymentsRes, invoicesRes] = await Promise.all([financeApi.getPayments(token), financeApi.getInvoices(token)]);
    return { payments: toList(unwrap(paymentsRes)), invoices: toList(unwrap(invoicesRes)) };
  }, [token]);

  const payments = data.payments || [];
  const invoices = data.invoices || [];

  const outstandingInvoices = useMemo(() => invoices.filter((invoice) => Number(invoice.balanceDue || 0) > 0 && invoice.status !== 'paid'), [invoices]);
  const customerBalances = useMemo(() => {
    const map = {};
    outstandingInvoices.forEach((invoice) => {
      const name = invoice.clientName || 'Unknown';
      map[name] = (map[name] || 0) + Number(invoice.balanceDue || 0);
    });
    return Object.entries(map).map(([name, balance]) => ({ name, balance })).sort((a, b) => b.balance - a.balance);
  }, [outstandingInvoices]);

  const [form, setForm] = useState({ invoice: '', customerName: '', amount: 0, method: 'bank', reference: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createPayment(
        { invoice: form.invoice || undefined, customerName: form.customerName, amount: Number(form.amount) || 0, method: form.method, reference: form.reference },
        token
      );
      setForm({ invoice: '', customerName: '', amount: 0, method: 'bank', reference: '' });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const reconcile = async (paymentId) => {
    try {
      await financeApi.updatePayment(paymentId, { status: 'reconciled' }, token);
      refetch();
    } catch { /* surfaced via list error state on next load */ }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Payments" subtitle="Payment ledger and reconciliation" icon="payments" user={user} crumbs={['Finance', 'Payments']} />
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Record Payment" />
              <form onSubmit={handleSubmit} className="space-y-3">
                <input className={input} placeholder="Invoice id (optional)" value={form.invoice} onChange={(e) => setForm((p) => ({ ...p, invoice: e.target.value }))} />
                <input className={input} placeholder="Customer name" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} required />
                <input className={input} type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
                <select className={input} value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}>
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
                <input className={input} placeholder="Reference" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} />
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Payment'}</Button>
              </form>
            </div>
          </section>

          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Payment Ledger" subtitle={`${payments.length} records`} />
              <DataTable
                columns={[
                  { key: 'customerName', header: 'Customer', render: (r) => r.customerName || 'N/A' },
                  { key: 'method', header: 'Method' },
                  { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
                  { key: 'status', header: 'Status', render: (r) => <Pill value={r.status} /> },
                  {
                    key: 'actions',
                    header: 'Action',
                    render: (r) => r.status !== 'reconciled' && (
                      <button type="button" onClick={() => reconcile(r._id)} className="text-xs font-semibold text-primary hover:underline">
                        Reconcile
                      </button>
                    ),
                  },
                ]}
                rows={payments}
                rowKey="_id"
                loading={loading}
                emptyTitle="No payments recorded"
              />

              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <SectionHdr title="Outstanding Payments" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{formatCurrency(outstandingInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0))}</p>} />
                <div className="space-y-2">
                  {outstandingInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice._id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{invoice.clientName}</p>
                        <p className="text-neutral-500">{invoice.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-neutral-700 dark:text-neutral-200">{formatCurrency(invoice.balanceDue)}</p>
                        <p className="text-neutral-500">{invoiceStatusLabel(invoice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <SectionHdr title="Customer Balances" subtitle={`${customerBalances.length} customers`} />
                <div className="space-y-2">
                  {customerBalances.slice(0, 5).map((customer) => (
                    <div key={customer.name} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-100">{customer.name}</p>
                      <p className="text-neutral-700 dark:text-neutral-200">{formatCurrency(customer.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Expenses
// ════════════════════════════════════════════════════════════════════════════

export const FinanceExpensesPage = () => {
  const { token, user } = useAuth();
  const { loading, error, data, refetch } = useAsync(async () => ({ expenses: toList(unwrap(await financeApi.getExpenses(token))) }), [token]);
  const expenses = data.expenses || [];

  const [form, setForm] = useState({ title: '', category: '', amount: 0, status: 'submitted', department: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createExpense({ title: form.title, category: form.category, amount: Number(form.amount) || 0, status: form.status, department: form.department }, token);
      setForm({ title: '', category: '', amount: 0, status: 'submitted', department: '' });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (expenseId) => {
    try {
      await financeApi.updateRequestAction(expenseId, 'verify', { comment: 'Documents verified from Expense Management' }, token);
      refetch();
    } catch { /* surfaced via list error state on next load */ }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Expenses" subtitle="Expense submissions and verification" icon="request_quote" user={user} crumbs={['Finance', 'Expenses']} />
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Submit Expense" />
              <form onSubmit={handleSubmit} className="space-y-3">
                <input className={input} placeholder="Expense title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                <input className={input} placeholder="Category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                <input className={input} type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
                <input className={input} placeholder="Department" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
                <select className={input} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="paid">Paid</option>
                </select>
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Expense'}</Button>
              </form>
            </div>
          </section>

          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Expense Overview" subtitle={`${expenses.length} records`} />
              {loading ? <SkeletonBlock /> : expenses.length === 0 ? <EmptyState icon="request_quote" title="No expenses yet" /> : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{expense.title}</p>
                          <p className="text-xs text-neutral-500">{expense.category} · {expense.department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(expense.amount)}</p>
                          <Pill value={expense.status} />
                        </div>
                      </div>
                      {['submitted', 'under_review', 'needs_information'].includes(String(expense.status || '').toLowerCase()) && (
                        <button type="button" onClick={() => verify(expense._id)} className="mt-2 text-xs font-semibold text-primary hover:underline">
                          Verify documents
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Budgets (+ Cost Centers)
// ════════════════════════════════════════════════════════════════════════════

export const FinanceBudgetsPage = () => {
  const { token, user } = useAuth();
  const { loading, error, data, refetch } = useAsync(async () => {
    const [budgetsRes, costCentersRes] = await Promise.all([financeApi.getBudgets(token), financeApi.getCostCenters(token)]);
    return { budgets: toList(unwrap(budgetsRes)), costCenters: toList(unwrap(costCentersRes)) };
  }, [token]);
  const budgets = data.budgets || [];
  const costCenters = data.costCenters || [];

  const [budgetForm, setBudgetForm] = useState({ department: '', fiscalYear: '', allocated: 0, spent: 0, notes: '' });
  const [costCenterForm, setCostCenterForm] = useState({ name: '', code: '', department: '', budget: 0, spent: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const saveBudget = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createBudget({ department: budgetForm.department, fiscalYear: budgetForm.fiscalYear, allocated: Number(budgetForm.allocated) || 0, spent: Number(budgetForm.spent) || 0, notes: budgetForm.notes }, token);
      setBudgetForm({ department: '', fiscalYear: '', allocated: 0, spent: 0, notes: '' });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save budget');
    } finally {
      setSubmitting(false);
    }
  };

  const saveCostCenter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createCostCenter({ name: costCenterForm.name, code: costCenterForm.code, department: costCenterForm.department, budget: Number(costCenterForm.budget) || 0, spent: Number(costCenterForm.spent) || 0 }, token);
      setCostCenterForm({ name: '', code: '', department: '', budget: 0, spent: 0 });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save cost center');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Budgets" subtitle="Budget allocation and cost centers" icon="account_balance_wallet" user={user} crumbs={['Finance', 'Budgets']} />
        {(error || formError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error || formError}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Allocate Budget" />
              <form onSubmit={saveBudget} className="space-y-3">
                <input className={input} placeholder="Department" value={budgetForm.department} onChange={(e) => setBudgetForm((p) => ({ ...p, department: e.target.value }))} required />
                <input className={input} placeholder="Fiscal year" value={budgetForm.fiscalYear} onChange={(e) => setBudgetForm((p) => ({ ...p, fiscalYear: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} type="number" placeholder="Allocated" value={budgetForm.allocated} onChange={(e) => setBudgetForm((p) => ({ ...p, allocated: e.target.value }))} />
                  <input className={input} type="number" placeholder="Spent" value={budgetForm.spent} onChange={(e) => setBudgetForm((p) => ({ ...p, spent: e.target.value }))} />
                </div>
                <textarea className={input} placeholder="Notes" rows={3} value={budgetForm.notes} onChange={(e) => setBudgetForm((p) => ({ ...p, notes: e.target.value }))} />
                <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Budget'}</Button>
              </form>

              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cost Centers</h3>
                <form onSubmit={saveCostCenter} className="mt-3 space-y-2">
                  <input className={input} placeholder="Cost center name" value={costCenterForm.name} onChange={(e) => setCostCenterForm((p) => ({ ...p, name: e.target.value }))} required />
                  <input className={input} placeholder="Code" value={costCenterForm.code} onChange={(e) => setCostCenterForm((p) => ({ ...p, code: e.target.value }))} />
                  <input className={input} placeholder="Department" value={costCenterForm.department} onChange={(e) => setCostCenterForm((p) => ({ ...p, department: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={input} type="number" placeholder="Budget" value={costCenterForm.budget} onChange={(e) => setCostCenterForm((p) => ({ ...p, budget: e.target.value }))} />
                    <input className={input} type="number" placeholder="Spent" value={costCenterForm.spent} onChange={(e) => setCostCenterForm((p) => ({ ...p, spent: e.target.value }))} />
                  </div>
                  <Button type="submit" variant="outline" size="sm" disabled={submitting} fullWidth>Add Cost Center</Button>
                </form>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Budget Utilization" subtitle={`${budgets.length} records`} />
              {loading ? <SkeletonBlock /> : (
                <div className="space-y-3">
                  {budgets.map((budget) => (
                    <div key={budget._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{budget.department}</p>
                          <p className="text-xs text-neutral-500">FY {budget.fiscalYear}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(budget.spent)} / {formatCurrency(budget.allocated)}</p>
                          <Pill value={budget.status} />
                        </div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-neutral-100 dark:bg-neutral-700">
                        <div
                          className={`h-2 rounded-full ${budget.status === 'over' ? 'bg-red-500' : budget.status === 'at-risk' ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(budget.utilization || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {budgets.length === 0 && <EmptyState icon="account_balance_wallet" title="No budgets yet" />}
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cost Centers</h3>
                <div className="mt-3 space-y-2">
                  {costCenters.map((center) => (
                    <div key={center._id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{center.name}</p>
                        <p className="text-xs text-neutral-500">{center.code}</p>
                      </div>
                      <p className="text-xs text-neutral-500">{formatCurrency(center.spent)} / {formatCurrency(center.budget)}</p>
                    </div>
                  ))}
                  {costCenters.length === 0 && <p className="text-xs text-neutral-500 dark:text-neutral-400">No cost centers yet.</p>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Payroll
// ════════════════════════════════════════════════════════════════════════════

export const FinancePayrollPage = () => {
  const { token, user } = useAuth();
  const { loading, error, data, refetch } = useAsync(async () => ({ payrolls: toList(unwrap(await financeApi.getPayrolls(token))) }), [token]);
  const payrolls = data.payrolls || [];

  const [form, setForm] = useState({ employeeName: '', periodStart: '', periodEnd: '', grossPay: 0, deductions: 0, status: 'draft' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createPayroll(
        { employeeName: form.employeeName, periodStart: form.periodStart, periodEnd: form.periodEnd, grossPay: Number(form.grossPay) || 0, deductions: Number(form.deductions) || 0, status: form.status },
        token
      );
      setForm({ employeeName: '', periodStart: '', periodEnd: '', grossPay: 0, deductions: 0, status: 'draft' });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to process payroll');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Payroll" subtitle="Payroll runs and disbursement" icon="badge" user={user} crumbs={['Finance', 'Payroll']} />
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Process Payroll" />
              <form onSubmit={handleSubmit} className="space-y-3">
                <input className={input} placeholder="Employee name" value={form.employeeName} onChange={(e) => setForm((p) => ({ ...p, employeeName: e.target.value }))} required />
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} type="date" value={form.periodStart} onChange={(e) => setForm((p) => ({ ...p, periodStart: e.target.value }))} />
                  <input className={input} type="date" value={form.periodEnd} onChange={(e) => setForm((p) => ({ ...p, periodEnd: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} type="number" placeholder="Gross pay" value={form.grossPay} onChange={(e) => setForm((p) => ({ ...p, grossPay: e.target.value }))} />
                  <input className={input} type="number" placeholder="Deductions" value={form.deductions} onChange={(e) => setForm((p) => ({ ...p, deductions: e.target.value }))} />
                </div>
                <select className={input} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="processed">Processed</option>
                  <option value="disbursed">Disbursed</option>
                </select>
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Payroll'}</Button>
              </form>
            </div>
          </section>

          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Payroll Runs" subtitle={`${payrolls.length} records`} />
              {loading ? <SkeletonBlock /> : payrolls.length === 0 ? <EmptyState icon="badge" title="No payroll runs yet" /> : (
                <div className="space-y-3">
                  {payrolls.map((payroll) => (
                    <div key={payroll._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{payroll.employeeName || 'Employee'}</p>
                          <p className="text-xs text-neutral-500">{fmtDateOnly(payroll.periodStart)} - {fmtDateOnly(payroll.periodEnd)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(payroll.netPay)}</p>
                          <Pill value={payroll.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Accounting (Chart of Accounts / Journal Entries)
// ════════════════════════════════════════════════════════════════════════════

const ACCOUNTING_TABS = [
  { id: 'accounts', label: 'Chart of Accounts' },
  { id: 'journals', label: 'Journal Entries' },
];

export const FinanceAccountingPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'accounts';

  const { loading, error, data, refetch } = useAsync(async () => {
    const [accountsRes, journalsRes] = await Promise.all([financeApi.getAccounts(token), financeApi.getJournalEntries(token)]);
    return { accounts: toList(unwrap(accountsRes)), journalEntries: toList(unwrap(journalsRes)) };
  }, [token]);
  const accounts = data.accounts || [];
  const journalEntries = data.journalEntries || [];

  const [accountForm, setAccountForm] = useState({ code: '', name: '', type: 'asset', normalBalance: 'debit' });
  const [journalForm, setJournalForm] = useState({ memo: '', entryDate: '', debitAccount: '', creditAccount: '', amount: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const saveAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createAccount(accountForm, token);
      setAccountForm({ code: '', name: '', type: 'asset', normalBalance: 'debit' });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  const saveJournalEntry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const amount = Number(journalForm.amount) || 0;
      await financeApi.createJournalEntry(
        { memo: journalForm.memo, entryDate: journalForm.entryDate || undefined, lines: [{ account: journalForm.debitAccount, debit: amount, credit: 0 }, { account: journalForm.creditAccount, debit: 0, credit: amount }] },
        token
      );
      setJournalForm({ memo: '', entryDate: '', debitAccount: '', creditAccount: '', amount: 0 });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const postEntry = async (entryId) => {
    try {
      await financeApi.postJournalEntry(entryId, token);
      refetch();
    } catch { /* surfaced via list error state on next load */ }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Accounting" subtitle="Chart of accounts and journal entries" icon="menu_book" user={user} crumbs={['Finance', 'Accounting']} />
        <TabBar tabs={ACCOUNTING_TABS} active={tab} onChange={(id) => setSearchParams({ tab: id })} />
        {(error || formError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error || formError}</div>}

        {tab === 'accounts' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Chart of Accounts" />
                <form onSubmit={saveAccount} className="space-y-3">
                  <input className={input} placeholder="Account code" value={accountForm.code} onChange={(e) => setAccountForm((p) => ({ ...p, code: e.target.value }))} required />
                  <input className={input} placeholder="Account name" value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} required />
                  <div className="grid grid-cols-2 gap-2">
                    <select className={input} value={accountForm.type} onChange={(e) => setAccountForm((p) => ({ ...p, type: e.target.value }))}>
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                      <option value="equity">Equity</option>
                      <option value="revenue">Revenue</option>
                      <option value="expense">Expense</option>
                    </select>
                    <select className={input} value={accountForm.normalBalance} onChange={(e) => setAccountForm((p) => ({ ...p, normalBalance: e.target.value }))}>
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Account'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Accounts" subtitle={`${accounts.length} records`} />
                <DataTable
                  columns={[
                    { key: 'code', header: 'Code', render: (r) => <span className="font-semibold text-neutral-900 dark:text-white">{r.code}</span> },
                    { key: 'name', header: 'Name' },
                    { key: 'type', header: 'Type' },
                    { key: 'normalBalance', header: 'Normal' },
                  ]}
                  rows={accounts}
                  rowKey="_id"
                  loading={loading}
                  emptyTitle="No accounts yet"
                />
              </div>
            </section>
          </div>
        )}

        {tab === 'journals' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Journal Entry" />
                <form onSubmit={saveJournalEntry} className="space-y-3">
                  <input className={input} placeholder="Memo" value={journalForm.memo} onChange={(e) => setJournalForm((p) => ({ ...p, memo: e.target.value }))} />
                  <input className={input} type="date" value={journalForm.entryDate} onChange={(e) => setJournalForm((p) => ({ ...p, entryDate: e.target.value }))} />
                  <select className={input} value={journalForm.debitAccount} onChange={(e) => setJournalForm((p) => ({ ...p, debitAccount: e.target.value }))} required>
                    <option value="">Select debit account</option>
                    {accounts.map((account) => <option key={account._id} value={account._id}>{account.code} - {account.name}</option>)}
                  </select>
                  <select className={input} value={journalForm.creditAccount} onChange={(e) => setJournalForm((p) => ({ ...p, creditAccount: e.target.value }))} required>
                    <option value="">Select credit account</option>
                    {accounts.map((account) => <option key={account._id} value={account._id}>{account.code} - {account.name}</option>)}
                  </select>
                  <input className={input} type="number" placeholder="Amount" value={journalForm.amount} onChange={(e) => setJournalForm((p) => ({ ...p, amount: e.target.value }))} />
                  <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Entry'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Journal Register" subtitle={`${journalEntries.length} records`} />
                {loading ? <SkeletonBlock /> : journalEntries.length === 0 ? <EmptyState icon="menu_book" title="No journal entries yet" /> : (
                  <div className="space-y-3">
                    {journalEntries.map((entry) => (
                      <div key={entry._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-neutral-800 dark:text-neutral-100">{entry.entryNumber}</p>
                            <p className="text-xs text-neutral-500">{entry.memo || 'No memo'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(entry.totalDebit)}</p>
                            <Pill value={entry.status} />
                          </div>
                        </div>
                        {entry.status !== 'posted' && (
                          <button type="button" onClick={() => postEntry(entry._id)} className="mt-2 text-xs font-semibold text-primary hover:underline">
                            Post entry
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Reports (Archive / ERP Statements)
// ════════════════════════════════════════════════════════════════════════════

const REPORT_TABS = [
  { id: 'archive', label: 'Report Archive' },
  { id: 'erp', label: 'ERP Statements' },
];

export const FinanceReportsPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'archive';

  const { loading, error, data, refetch } = useAsync(async () => {
    const [reportsRes, trialRes, sheetRes, plRes, taxRes, itrRes] = await Promise.all([
      financeApi.getReports(token),
      financeApi.getTrialBalance(token),
      financeApi.getBalanceSheet(token),
      financeApi.getProfitLoss(token),
      financeApi.getTaxSummary(token),
      financeApi.getItrSummary(token),
    ]);
    return {
      reports: toList(unwrap(reportsRes)),
      trialBalance: unwrap(trialRes) || { rows: [], totals: { debit: 0, credit: 0 } },
      balanceSheet: unwrap(sheetRes) || { assets: 0, liabilities: 0, equity: 0 },
      profitLoss: unwrap(plRes) || { revenue: 0, expenses: 0, netIncome: 0 },
      taxSummary: unwrap(taxRes) || { taxableSales: 0, gstCollected: 0, tdsWithheld: 0 },
      itrSummary: unwrap(itrRes) || { totalIncome: 0, totalExpenses: 0, taxableIncome: 0, estimatedTax: 0 },
    };
  }, [token]);

  const reports = data.reports || [];
  const trialBalance = data.trialBalance || { rows: [], totals: { debit: 0, credit: 0 } };
  const balanceSheet = data.balanceSheet || { assets: 0, liabilities: 0, equity: 0 };
  const profitLoss = data.profitLoss || { revenue: 0, expenses: 0, netIncome: 0 };
  const taxSummary = data.taxSummary || { taxableSales: 0, gstCollected: 0, tdsWithheld: 0 };
  const itrSummary = data.itrSummary || { totalIncome: 0, totalExpenses: 0, taxableIncome: 0, estimatedTax: 0 };

  const [form, setForm] = useState({ type: 'profit-loss', periodStart: '', periodEnd: '', summary: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createReport(form, token);
      setForm({ type: 'profit-loss', periodStart: '', periodEnd: '', summary: '' });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Reports" subtitle="Financial reports and ERP statements" icon="bar_chart" user={user} crumbs={['Finance', 'Reports']} />
        <TabBar tabs={REPORT_TABS} active={tab} onChange={(id) => setSearchParams({ tab: id })} />
        {(error || formError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error || formError}</div>}

        {tab === 'archive' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Generate Report" />
                <form onSubmit={handleSubmit} className="space-y-3">
                  <select className={input} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                    <option value="profit-loss">Profit & Loss</option>
                    <option value="expense-summary">Expense Summary</option>
                    <option value="revenue">Revenue Report</option>
                    <option value="cash-flow">Cash Flow Statement</option>
                    <option value="tax">Tax Report</option>
                    <option value="monthly">Monthly Summary</option>
                    <option value="yearly">Yearly Summary</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={input} type="date" value={form.periodStart} onChange={(e) => setForm((p) => ({ ...p, periodStart: e.target.value }))} />
                    <input className={input} type="date" value={form.periodEnd} onChange={(e) => setForm((p) => ({ ...p, periodEnd: e.target.value }))} />
                  </div>
                  <textarea className={input} rows={3} placeholder="Summary" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
                  <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Report'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Report Archive" subtitle={`${reports.length} records`} />
                {loading ? <SkeletonBlock /> : reports.length === 0 ? <EmptyState icon="bar_chart" title="No reports yet" /> : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div key={report._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{report.type}</p>
                        <p className="text-xs text-neutral-500">{fmtDateOnly(report.periodStart)} - {fmtDateOnly(report.periodEnd)}</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">{report.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === 'erp' && (
          <div className="space-y-6">
            <StatGrid items={[
              { label: 'Assets', value: formatCurrency(balanceSheet.assets) },
              { label: 'Liabilities', value: formatCurrency(balanceSheet.liabilities) },
              { label: 'Equity', value: formatCurrency(balanceSheet.equity) },
            ]} />
            <StatGrid items={[
              { label: 'Revenue', value: formatCurrency(profitLoss.revenue) },
              { label: 'Expenses', value: formatCurrency(profitLoss.expenses) },
              { label: 'Net Income', value: formatCurrency(profitLoss.netIncome) },
            ]} />
            <StatGrid items={[
              { label: 'GST Collected', value: formatCurrency(taxSummary.gstCollected), subtext: `Taxable Sales: ${formatCurrency(taxSummary.taxableSales)}` },
              { label: 'TDS Withheld', value: formatCurrency(taxSummary.tdsWithheld) },
              { label: 'Estimated ITR Tax', value: formatCurrency(itrSummary.estimatedTax), subtext: `Taxable Income: ${formatCurrency(itrSummary.taxableIncome)}` },
            ]} />
            <StatGrid items={[
              { label: 'Total Income', value: formatCurrency(itrSummary.totalIncome) },
              { label: 'Total Expenses', value: formatCurrency(itrSummary.totalExpenses) },
              { label: 'Taxable Income', value: formatCurrency(itrSummary.taxableIncome) },
            ]} />
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Trial Balance" action={<div className="text-xs text-neutral-500 dark:text-neutral-400">Debit: {formatCurrency(trialBalance.totals.debit)} · Credit: {formatCurrency(trialBalance.totals.credit)}</div>} />
                <DataTable
                  columns={[
                    { key: 'account', header: 'Account', render: (r) => `${r.code} - ${r.name}` },
                    { key: 'debit', header: 'Debit', render: (r) => formatCurrency(r.debit) },
                    { key: 'credit', header: 'Credit', render: (r) => formatCurrency(r.credit) },
                  ]}
                  rows={trialBalance.rows}
                  rowKey="accountId"
                  loading={loading}
                  emptyTitle="No trial balance data"
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Compliance
// ════════════════════════════════════════════════════════════════════════════

export const FinanceCompliancePage = () => {
  const { token, user } = useAuth();
  const { loading, error, data, refetch } = useAsync(async () => ({ compliance: toList(unwrap(await financeApi.getCompliance(token))) }), [token]);
  const compliance = data.compliance || [];

  const [form, setForm] = useState({ type: 'gst', periodLabel: '', dueDate: '', status: 'pending', reference: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createCompliance(form, token);
      setForm({ type: 'gst', periodLabel: '', dueDate: '', status: 'pending', reference: '' });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save compliance record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Compliance" subtitle="GST, TDS and statutory tracking" icon="gavel" user={user} crumbs={['Finance', 'Compliance']} />
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Compliance Record" />
              <form onSubmit={handleSubmit} className="space-y-3">
                <select className={input} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="gst">GST</option>
                  <option value="tds">TDS</option>
                  <option value="statutory">Statutory</option>
                  <option value="audit">Audit</option>
                  <option value="other">Other</option>
                </select>
                <input className={input} placeholder="Period label" value={form.periodLabel} onChange={(e) => setForm((p) => ({ ...p, periodLabel: e.target.value }))} />
                <input className={input} type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
                <select className={input} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="filed">Filed</option>
                  <option value="overdue">Overdue</option>
                </select>
                <input className={input} placeholder="Reference" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} />
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Compliance'}</Button>
              </form>
            </div>
          </section>

          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Compliance Tracker" subtitle={`${compliance.length} records`} />
              {loading ? <SkeletonBlock /> : compliance.length === 0 ? <EmptyState icon="gavel" title="No compliance records yet" /> : (
                <div className="space-y-3">
                  {compliance.map((record) => (
                    <div key={record._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{record.type}</p>
                        <Pill value={record.status} />
                      </div>
                      <p className="text-xs text-neutral-500">{record.periodLabel}</p>
                      <p className="text-xs text-neutral-500">Due {fmtDateOnly(record.dueDate)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Directory (Vendors / Clients)
// ════════════════════════════════════════════════════════════════════════════

const DIRECTORY_TABS = [
  { id: 'vendors', label: 'Vendors' },
  { id: 'clients', label: 'Clients' },
];

export const FinanceDirectoryPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'vendors';

  const { loading, error, data, refetch } = useAsync(async () => {
    const [vendorsRes, clientsRes] = await Promise.all([financeApi.getVendors(token), financeApi.getClients(token)]);
    return { vendors: toList(unwrap(vendorsRes)), clients: toList(unwrap(clientsRes)) };
  }, [token]);
  const vendors = data.vendors || [];
  const clients = data.clients || [];

  const [vendorForm, setVendorForm] = useState({ name: '', contactEmail: '', paymentTerms: '', balance: 0 });
  const [clientForm, setClientForm] = useState({ name: '', contactEmail: '', paymentTerms: '', balance: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const saveVendor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createVendor({ ...vendorForm, balance: Number(vendorForm.balance) || 0 }, token);
      setVendorForm({ name: '', contactEmail: '', paymentTerms: '', balance: 0 });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const saveClient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createClient({ ...clientForm, balance: Number(clientForm.balance) || 0 }, token);
      setClientForm({ name: '', contactEmail: '', paymentTerms: '', balance: 0 });
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Directory" subtitle="Vendors and clients" icon="contacts" user={user} crumbs={['Finance', 'Directory']} />
        <TabBar tabs={DIRECTORY_TABS} active={tab} onChange={(id) => setSearchParams({ tab: id })} />
        {(error || formError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error || formError}</div>}

        {tab === 'vendors' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Vendor Profile" />
                <form onSubmit={saveVendor} className="space-y-3">
                  <input className={input} placeholder="Vendor name" value={vendorForm.name} onChange={(e) => setVendorForm((p) => ({ ...p, name: e.target.value }))} required />
                  <input className={input} placeholder="Contact email" value={vendorForm.contactEmail} onChange={(e) => setVendorForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                  <input className={input} placeholder="Payment terms" value={vendorForm.paymentTerms} onChange={(e) => setVendorForm((p) => ({ ...p, paymentTerms: e.target.value }))} />
                  <input className={input} type="number" placeholder="Balance" value={vendorForm.balance} onChange={(e) => setVendorForm((p) => ({ ...p, balance: e.target.value }))} />
                  <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Vendor'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Vendor Directory" subtitle={`${vendors.length} records`} />
                {loading ? <SkeletonBlock /> : vendors.length === 0 ? <EmptyState icon="storefront" title="No vendors yet" /> : (
                  <div className="space-y-3">
                    {vendors.map((vendor) => (
                      <div key={vendor._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{vendor.name}</p>
                        <p className="text-xs text-neutral-500">{vendor.contactEmail}</p>
                        <p className="text-xs text-neutral-500">Terms: {vendor.paymentTerms || 'N/A'}</p>
                        <p className="text-xs text-neutral-500">Balance: {formatCurrency(vendor.balance)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === 'clients' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Client Profile" />
                <form onSubmit={saveClient} className="space-y-3">
                  <input className={input} placeholder="Client name" value={clientForm.name} onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))} required />
                  <input className={input} placeholder="Contact email" value={clientForm.contactEmail} onChange={(e) => setClientForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                  <input className={input} placeholder="Payment terms" value={clientForm.paymentTerms} onChange={(e) => setClientForm((p) => ({ ...p, paymentTerms: e.target.value }))} />
                  <input className={input} type="number" placeholder="Balance" value={clientForm.balance} onChange={(e) => setClientForm((p) => ({ ...p, balance: e.target.value }))} />
                  <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Saving…' : 'Save Client'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Client Directory" subtitle={`${clients.length} records`} />
                {loading ? <SkeletonBlock /> : clients.length === 0 ? <EmptyState icon="groups" title="No clients yet" /> : (
                  <div className="space-y-3">
                    {clients.map((client) => (
                      <div key={client._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{client.name}</p>
                        <p className="text-xs text-neutral-500">{client.contactEmail}</p>
                        <p className="text-xs text-neutral-500">Terms: {client.paymentTerms || 'N/A'}</p>
                        <p className="text-xs text-neutral-500">Balance: {formatCurrency(client.balance)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Activity (Transactions / Audit Log)
// ════════════════════════════════════════════════════════════════════════════

const ACTIVITY_TABS = [
  { id: 'requests', label: 'Request Center' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'audit', label: 'Audit Log' },
];

export const FinanceActivityPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = String(user?.role || '').toLowerCase();
  const isFinanceHead = ['finance_manager', 'admin', 'super_admin'].includes(role);
  const inferredTab = searchParams.get('type') === 'requests' || searchParams.get('status') ? 'requests' : 'transactions';
  const tab = searchParams.get('tab') || inferredTab;
  const [filters, setFilters] = useState({
    search: '',
    department: searchParams.get('department') || '',
    status: searchParams.get('status') || '',
    requestType: '',
    priority: '',
  });
  const [actionError, setActionError] = useState('');
  const [actingRequest, setActingRequest] = useState(null);

  const { loading, error, data, refetch } = useAsync(async () => {
    const [requestsRes, transactionsRes, auditRes] = await Promise.all([
      financeApi.getRequests(token, { page: 1, limit: 25, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) }),
      financeApi.getTransactions(token, { page: 1, limit: 25 }),
      financeApi.getAuditLogs(token, { page: 1, limit: 25 }),
    ]);
    return { requests: toList(unwrap(requestsRes)), transactions: toList(unwrap(transactionsRes)), auditLogs: toList(unwrap(auditRes)) };
  }, [token, filters.search, filters.department, filters.status, filters.requestType, filters.priority]);
  const requests = data.requests || [];
  const transactions = data.transactions || [];
  const auditLogs = data.auditLogs || [];
  const availableRequestActions = (row) => {
    const status = String(row.status || '').toLowerCase();
    const actions = [];
    if (['submitted', 'pending'].includes(status)) actions.push({ id: 'review', label: 'Review', variant: 'secondary' });
    if (['submitted', 'pending', 'under_review', 'needs_information'].includes(status)) actions.push({ id: 'verify', label: 'Verify', variant: 'secondary' });
    if (['submitted', 'pending', 'under_review', 'verified', 'pending_approval'].includes(status)) actions.push({ id: 'request_information', label: 'Need Info', variant: 'secondary' });
    if (status === 'verified' && row.approvalRequired) actions.push({ id: 'send_for_approval', label: 'Send Approval', variant: 'primary' });
    if (isFinanceHead && ['verified', 'pending_approval'].includes(status)) actions.push({ id: 'approve', label: 'Approve', variant: 'primary' });
    if (isFinanceHead && ['submitted', 'under_review', 'needs_information', 'verified', 'pending_approval'].includes(status)) actions.push({ id: 'reject', label: 'Reject', variant: 'danger' });
    if (['approved'].includes(status)) actions.push({ id: 'process', label: 'Process', variant: 'secondary' });
    if (['processing'].includes(status)) actions.push({ id: 'complete', label: 'Complete', variant: 'primary' });
    return actions;
  };

  const runRequestAction = async () => {
    if (!actingRequest) return;
    setActionError('');
    try {
      await financeApi.updateRequestAction(actingRequest.row.id, actingRequest.action.id, { comment: actingRequest.comment || '' }, token);
      setActingRequest(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to update finance request');
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Activity" subtitle="Transaction ledger and audit trail" icon="history" user={user} crumbs={['Finance', 'Activity']} />
        <TabBar tabs={ACTIVITY_TABS} active={tab} onChange={(id) => setSearchParams({ tab: id })} />
        {(error || actionError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error || actionError}</div>}

        {tab === 'requests' && (
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Finance Request Center" subtitle="Department generated financial requests with lifecycle tracking" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{requests.length} rows</p>} />
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                <input className={`${input} md:col-span-2`} placeholder="Search request ID, employee, department..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
                <select className={input} value={filters.department} onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}>
                  <option value="">All Departments</option>
                  {FINANCE_DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <select className={input} value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                  <option value="">All Status</option>
                  {['submitted', 'under_review', 'needs_information', 'verified', 'pending_approval', 'approved', 'rejected', 'processing', 'completed'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select className={input} value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}>
                  <option value="">All Priority</option>
                  {['Normal', 'High', 'Critical'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </div>
              {loading ? <SkeletonBlock /> : requests.length === 0 ? <EmptyState icon="assignment" title="No finance requests found" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                        <th className="py-2 pr-3">Request</th>
                        <th className="px-3 py-2">Department</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Priority</th>
                        <th className="px-3 py-2">Submitted</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Assigned</th>
                        <th className="py-2 pl-3 text-right">Amount</th>
                        <th className="py-2 pl-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((row) => (
                        <tr key={row.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                          <td className="py-3 pr-3 font-black text-neutral-900 dark:text-neutral-100">{row.requestId}</td>
                          <td className="px-3 py-3">{row.department}</td>
                          <td className="px-3 py-3">{row.type}</td>
                          <td className="px-3 py-3"><Pill value={row.priority} /></td>
                          <td className="px-3 py-3">{fmtDateOnly(row.submittedDate)}</td>
                          <td className="px-3 py-3"><Pill value={row.status} /></td>
                          <td className="px-3 py-3">{row.assignedEmployee || 'Unassigned'}</td>
                          <td className="py-3 pl-3 text-right font-black">{formatCurrency(row.amount)}</td>
                          <td className="py-3 pl-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              {availableRequestActions(row).slice(0, 3).map((action) => (
                                <Button key={action.id} size="sm" variant={action.variant} onClick={() => setActingRequest({ row, action, comment: '' })}>
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'transactions' && (
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Transactions" subtitle="Merged ledger of invoices, expenses, and vendor payments, most recent first." action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{transactions.length} rows</p>} />
              {loading ? <SkeletonBlock /> : transactions.length === 0 ? <EmptyState icon="receipt_long" title="No transactions recorded yet" /> : (
                <div className="space-y-3">
                  {transactions.map((row) => (
                    <div key={row.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <div>
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{row.reference || row.category}</p>
                        <p className="text-xs text-neutral-500">{row.type} • {row.party} • {row.department}</p>
                        <p className="text-xs text-neutral-500">{fmtDate(row.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${row.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {row.type === 'expense' ? '-' : '+'}{formatCurrency(row.amount)}
                        </p>
                        <Pill value={row.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'audit' && (
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Audit Logs" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{auditLogs.length} rows</p>} />
              {loading ? <SkeletonBlock /> : auditLogs.length === 0 ? <EmptyState icon="policy" title="No audit activity yet" /> : (
                <div className="space-y-3">
                  {auditLogs.map((row) => (
                    <div key={row._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{row.action}</p>
                      <p className="text-xs text-neutral-500">{row.resourceType} • {row.riskFlag}</p>
                      <p className="text-xs text-neutral-500">{fmtDate(row.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        {actingRequest && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-neutral-950 dark:text-neutral-100">{actingRequest.action.label} {actingRequest.row.requestId}</p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {actingRequest.row.department} - {formatCurrency(actingRequest.row.amount)} - current status {actingRequest.row.status}
                  </p>
                </div>
                <button type="button" onClick={() => setActingRequest(null)} className="material-symbols-outlined text-neutral-400">close</button>
              </div>
              <textarea
                className={`${input} mt-4 min-h-[90px]`}
                placeholder={actingRequest.action.id === 'request_information' ? 'What information is missing?' : 'Comment for audit trail'}
                value={actingRequest.comment}
                onChange={(event) => setActingRequest((prev) => ({ ...prev, comment: event.target.value }))}
              />
              <div className="mt-4 flex justify-between gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/finance/dashboard/project-overview?department=${encodeURIComponent(actingRequest.row.department)}&tab=requests`)}>
                  Department Profile
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setActingRequest(null)}>Cancel</Button>
                  <Button type="button" variant={actingRequest.action.variant} size="sm" onClick={runRequestAction}>
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Approvals
// ════════════════════════════════════════════════════════════════════════════

export const FinanceApprovalsPage = () => {
  const { token, user } = useAuth();
  const isFinanceHead = ['finance_manager', 'admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());
  const { loading, error, data, refetch } = useAsync(
    async () => ({ approvals: toList(unwrap(await financeApi.getApprovals(token, { page: 1, limit: 25 }))) }),
    [token]
  );
  const approvals = data.approvals || [];
  const [actionError, setActionError] = useState('');
  const [decidingId, setDecidingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const decide = async () => {
    if (!confirmAction) return;
    const { id, decision } = confirmAction;
    setDecidingId(id);
    setActionError('');
    try {
      await financeApi.decideApproval(id, { decision, remarks: confirmAction.remarks || '' }, token);
      setConfirmAction(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to record decision');
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Approval Center" subtitle="Finance Head controlled approvals and exceptions" icon="approval" user={user} crumbs={['Finance', 'Approvals']} />
        {(error || actionError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error || actionError}</div>}

        <section className={card}>
          <div className={inner}>
            <SectionHdr title="Pending Decisions" subtitle="High value, budget, payment, payroll and exception approvals" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{approvals.length} rows</p>} />
            {!isFinanceHead && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                Finance Employee can review workflow status here, but final approval actions require Finance Head permission.
              </div>
            )}
            {loading ? <SkeletonBlock /> : approvals.length === 0 ? <EmptyState icon="approval" title="No approvals pending" /> : (
              <div className="space-y-3">
                {approvals.map((row) => {
                  const hasPendingStepForMe = isFinanceHead && Array.isArray(row.steps) && row.steps.some((step) => step.status === 'pending' && ['finance_manager', 'admin', 'super_admin'].includes(String(step.role || '').toLowerCase()));
                  return (
                    <div key={row._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{row.module} • {row.entityType}</p>
                          <p className="text-xs text-neutral-500">Entity: {row.entityId}</p>
                        </div>
                        <Pill value={row.status} />
                      </div>
                      {row.status === 'pending' && hasPendingStepForMe && (
                        <div className="mt-3 flex gap-2">
                          <Button variant="primary" size="sm" disabled={decidingId === row._id} onClick={() => setConfirmAction({ id: row._id, decision: 'approve', row })}>
                            Approve
                          </Button>
                          <Button variant="danger" size="sm" disabled={decidingId === row._id} onClick={() => setConfirmAction({ id: row._id, decision: 'reject', row })}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        {confirmAction && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-neutral-950 dark:text-neutral-100">{confirmAction.decision === 'approve' ? 'Approve Request?' : 'Reject Request?'}</p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">This decision updates workflow status and writes a finance audit event.</p>
                </div>
                <button type="button" onClick={() => setConfirmAction(null)} className="material-symbols-outlined text-neutral-400">close</button>
              </div>
              <div className="mt-4 space-y-2 rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
                <p><span className="font-bold">Request:</span> {confirmAction.row?.entityType} {confirmAction.row?.entityId}</p>
                <p><span className="font-bold">Module:</span> {confirmAction.row?.module || 'finance'}</p>
                <p><span className="font-bold">Status:</span> {confirmAction.row?.status}</p>
              </div>
              <textarea
                className={`${input} mt-4 min-h-[90px]`}
                placeholder="Approval comment or rejection reason"
                value={confirmAction.remarks || ''}
                onChange={(event) => setConfirmAction((prev) => ({ ...prev, remarks: event.target.value }))}
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
                <Button type="button" variant={confirmAction.decision === 'approve' ? 'primary' : 'danger'} size="sm" disabled={decidingId === confirmAction.id} onClick={decide}>
                  {confirmAction.decision === 'approve' ? 'Approve Request' : 'Reject Request'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
