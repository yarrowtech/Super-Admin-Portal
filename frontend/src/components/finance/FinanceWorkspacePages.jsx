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

// ════════════════════════════════════════════════════════════════════════════
// Overview
// ════════════════════════════════════════════════════════════════════════════

export const FinanceOverviewPage = () => {
  const { token, user } = useAuth();
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

  const invoices = data.invoices || [];
  const expenses = data.expenses || [];
  const profitLoss = data.profitLoss || { revenue: 0, expenses: 0, netIncome: 0 };
  const balanceSheet = data.balanceSheet || { assets: 0, liabilities: 0, equity: 0 };

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

  const kpis = useMemo(() => {
    const revenue = Number(profitLoss?.revenue || 0);
    const totalExpenses = Number(profitLoss?.expenses || expenseSummary.totalAmount || 0);
    const net = Number(profitLoss?.netIncome || 0);
    const pendingPayments = Number(invoiceMetrics.outstandingAmount || 0);
    const burnRate = revenue > 0 ? (totalExpenses / revenue) * 100 : 0;
    return [
      { label: 'Revenue', icon: 'trending_up', value: formatCurrency(revenue), subtitle: `${invoices.length} invoices` },
      { label: 'Expenses', icon: 'request_quote', value: formatCurrency(totalExpenses), subtitle: `${expenseSummary.pendingCount} pending items` },
      { label: 'Profit / Loss', icon: 'account_balance_wallet', value: formatCurrency(net), subtitle: net >= 0 ? 'Profit' : 'Loss' },
      { label: 'Pending Payments', icon: 'pending_actions', value: formatCurrency(pendingPayments), subtitle: `${invoiceMetrics.overdueCount} overdue invoices` },
      { label: 'Burn Rate', icon: 'percent', value: `${burnRate.toFixed(1)}%`, subtitle: formatCurrency(expenseSummary.pendingAmount) },
    ];
  }, [expenseSummary, invoices.length, invoiceMetrics, profitLoss]);

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Finance Overview" subtitle="Revenue, expenses and receivables at a glance" icon="account_balance" user={user} crumbs={['Finance']} />

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        {loading ? (
          <SkeletonBlock />
        ) : (
          <>
            <section className="portal-kpi-grid">
              {kpis.map((item) => (
                <KPICard key={item.label} title={item.label} value={item.value} icon={item.icon} subtitle={item.subtitle} />
              ))}
            </section>

            <section className="portal-kpi-grid">
              <KPICard icon="trending_up" title="Revenue" value={formatCurrency(profitLoss.revenue)} subtitle="Profit & loss" compact />
              <KPICard icon="request_quote" title="Expenses" value={formatCurrency(profitLoss.expenses)} subtitle="Operational spend" compact />
              <KPICard
                icon="account_balance_wallet"
                title="Net Income"
                value={formatCurrency(profitLoss.netIncome)}
                subtitle="After expenses"
                compact
                trend={profitLoss.netIncome >= 0 ? { direction: 'up', value: 'Profit' } : { direction: 'down', value: 'Loss' }}
              />
              <KPICard icon="savings" title="Equity" value={formatCurrency(balanceSheet.equity)} subtitle="Balance sheet" compact />
            </section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr,1fr]">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Receivables aging" subtitle="Open invoice balances by overdue band" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{outstandingInvoices.length} open</p>} />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {agingBuckets.map((bucket) => (
                      <div key={bucket.label} className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{bucket.label} days</p>
                        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{formatCurrency(bucket.amount)}</p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{bucket.count} invoices</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Expense snapshot" subtitle="Verified vs pending expenses" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{expenses.length} entries</p>} />
                  <div className="space-y-3">
                    <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total submitted</p>
                      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{formatCurrency(expenseSummary.totalAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Verified</p>
                      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{formatCurrency(expenseSummary.verifiedAmount)}</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{expenseSummary.verifiedCount} items</p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Pending review</p>
                      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{formatCurrency(expenseSummary.pendingAmount)}</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{expenseSummary.pendingCount} items</p>
                    </div>
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
      await financeApi.updateExpense(expenseId, { status: 'verified' }, token);
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
                      {expense.status === 'submitted' && (
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
  { id: 'transactions', label: 'Transactions' },
  { id: 'audit', label: 'Audit Log' },
];

export const FinanceActivityPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'transactions';

  const { loading, error, data } = useAsync(async () => {
    const [transactionsRes, auditRes] = await Promise.all([
      financeApi.getTransactions(token, { page: 1, limit: 25 }),
      financeApi.getAuditLogs(token, { page: 1, limit: 25 }),
    ]);
    return { transactions: toList(unwrap(transactionsRes)), auditLogs: toList(unwrap(auditRes)) };
  }, [token]);
  const transactions = data.transactions || [];
  const auditLogs = data.auditLogs || [];

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Activity" subtitle="Transaction ledger and audit trail" icon="history" user={user} crumbs={['Finance', 'Activity']} />
        <TabBar tabs={ACTIVITY_TABS} active={tab} onChange={(id) => setSearchParams({ tab: id })} />
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

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
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Approvals
// ════════════════════════════════════════════════════════════════════════════

export const FinanceApprovalsPage = () => {
  const { token, user } = useAuth();
  const { loading, error, data, refetch } = useAsync(
    async () => ({ approvals: toList(unwrap(await financeApi.getApprovals(token, { page: 1, limit: 25 }))) }),
    [token]
  );
  const approvals = data.approvals || [];
  const [actionError, setActionError] = useState('');
  const [decidingId, setDecidingId] = useState(null);

  const decide = async (id, decision) => {
    setDecidingId(id);
    setActionError('');
    try {
      await financeApi.decideApproval(id, { decision, remarks: '' }, token);
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
        <Header title="Approvals" subtitle="Approval workflows" icon="approval" user={user} crumbs={['Finance', 'Approvals']} />
        {(error || actionError) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error || actionError}</div>}

        <section className={card}>
          <div className={inner}>
            <SectionHdr title="Approval Workflows" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{approvals.length} rows</p>} />
            {loading ? <SkeletonBlock /> : approvals.length === 0 ? <EmptyState icon="approval" title="No approvals pending" /> : (
              <div className="space-y-3">
                {approvals.map((row) => {
                  const hasPendingStepForMe = Array.isArray(row.steps) && row.steps.some((step) => step.status === 'pending' && String(step.role || '').toLowerCase() === String(user?.role || '').toLowerCase());
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
                          <Button variant="primary" size="sm" disabled={decidingId === row._id} onClick={() => decide(row._id, 'approve')}>
                            Approve
                          </Button>
                          <Button variant="danger" size="sm" disabled={decidingId === row._id} onClick={() => decide(row._id, 'reject')}>
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
      </div>
    </main>
  );
};
