import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PortalHeader from '../common/PortalHeader';
import WarmGreeting from '../common/WarmGreeting';
import Button from '../common/Button';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import AttentionPanel from '../common/AttentionPanel';
import QuickActions from '../common/QuickActions';
import SectionCard from '../ui/SectionCard';
import { statusToTone } from '../../utils/statusTone';
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
  failed: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  recorded: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  submitted: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  'at-risk': 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
};

const Pill = ({ value, label }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[String(value || '').toLowerCase().replace(/[\s_]+/g, '-')] || tone.draft}`}>
    {String(label || value || 'Unknown')}
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

// ─── Workflow primitives ──────────────────────────────────────────────────────

// Status filter kept in ?status= so the sidebar sub-items (Paid, Overdue, Failed…)
// and the on-page chips drive the same view.
const useStatusParam = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const setStatus = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('status', next);
    else params.delete('status');
    setSearchParams(params, { replace: true });
  };
  return [status, setStatus];
};

const StatusFilterBar = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value || 'all'}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(opt.value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-primary text-white shadow-sm' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}
        >
          {opt.label}
          <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-white/25' : 'bg-white text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400'}`}>{opt.count ?? 0}</span>
        </button>
      );
    })}
  </div>
);

// Horizontal lifecycle stepper; `current` is the active stage index, `failed` marks it a dead end.
const WorkflowSteps = ({ steps, current, failed = false }) => (
  <ol className="flex flex-wrap items-center gap-y-2 text-xs font-semibold">
    {steps.map((step, i) => {
      const done = i < current;
      const active = i === current;
      const dot = failed && active
        ? 'bg-rose-500 text-white'
        : done ? 'bg-emerald-500 text-white'
          : active ? 'bg-primary text-white'
            : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400';
      return (
        <li key={step} className="flex items-center">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${dot}`}>
            {done ? <span className="material-symbols-outlined text-[14px]">check</span> : i + 1}
          </span>
          <span className={`ml-2 ${active ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>{step}</span>
          {i < steps.length - 1 && <span className={`mx-3 h-px w-6 sm:w-10 ${done ? 'bg-emerald-400' : 'bg-neutral-200 dark:bg-neutral-700'}`} aria-hidden="true" />}
        </li>
      );
    })}
  </ol>
);

const Notice = ({ children, onDismiss }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200" role="status">
    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">check_circle</span>{children}</span>
    <button type="button" onClick={onDismiss} className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300" aria-label="Dismiss">
      <span className="material-symbols-outlined text-[18px]">close</span>
    </button>
  </div>
);

const todayIso = () => new Date().toISOString().split('T')[0];

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

// ─── Invoice lifecycle ────────────────────────────────────────────────────────
// draft (Pending verification) → sent (Approved) → paid. "Paid" is only reached by
// recording payments; the backend settles the balance and flips the status.

const INVOICE_STAGE_LABEL = { draft: 'Pending verification', sent: 'Approved', overdue: 'Overdue', paid: 'Paid', void: 'Void' };
const INVOICE_STEPS = ['Draft', 'Approved & sent', 'Paid'];
const INVOICE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Pending verification' },
  { value: 'sent', label: 'Approved' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
];

const invoiceBalance = (invoice) => Number(invoice?.balanceDue ?? getInvoiceTotal(invoice)) || 0;

// An approved invoice past its due date with money owed is overdue even before
// anything has re-stamped its stored status.
const invoiceStage = (invoice) => {
  const status = String(invoice?.status || 'draft').toLowerCase();
  if (status === 'sent' && invoice?.dueDate && new Date(invoice.dueDate) < new Date() && invoiceBalance(invoice) > 0) return 'overdue';
  return status;
};

const invoiceStepIndex = (stage) => (stage === 'paid' ? 2 : stage === 'draft' ? 0 : 1);

const isPayableInvoice = (invoice) => ['sent', 'overdue'].includes(invoiceStage(invoice)) && invoiceBalance(invoice) > 0;

// Mirrors the backend's calculateInvoiceTotals (tax and TDS on subtotal, discount off the end).
const previewInvoiceTotals = (form) => {
  const subtotal = (Number(form.quantity) || 0) * (Number(form.rate) || 0);
  const gstRate = Number(form.gstRate) || 0;
  const tdsRate = Number(form.tdsRate) || 0;
  const gst = (subtotal * gstRate) / 100;
  const tds = (subtotal * tdsRate) / 100;
  const discount = Number(form.discount) || 0;
  return { subtotal, gst, gstRate, tds, tdsRate, discount, total: subtotal + gst - tds - discount };
};

// Records a payment against an invoice. Mount it keyed by invoice id so each
// opening starts from that invoice's outstanding balance.
const RecordPaymentModal = ({ invoice, onClose, onSaved }) => {
  const { token } = useAuth();
  const balance = invoiceBalance(invoice);
  const [form, setForm] = useState({ amount: balance, method: 'bank', reference: '', paymentDate: todayIso() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const amount = Number(form.amount) || 0;
  const invalid = amount <= 0 || amount > balance;

  const submit = async () => {
    if (invalid) return;
    setSaving(true);
    setError('');
    try {
      await financeApi.createPayment({
        invoice: invoice._id,
        customerName: invoice.clientName,
        amount,
        method: form.method,
        reference: form.reference || undefined,
        paymentDate: form.paymentDate || undefined,
        departmentId: invoice.departmentId || undefined,
      }, token);
      onSaved(amount >= balance ? `${invoice.invoiceNumber} is now fully paid.` : `Payment of ${formatCurrency(amount)} recorded against ${invoice.invoiceNumber}.`);
    } catch (err) {
      setError(err.message || 'Failed to record payment');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Record payment · ${invoice.invoiceNumber}`}
      description={`${invoice.clientName || 'Client'} · balance due ${formatCurrency(balance)}`}
      className="sm:max-w-lg"
      footer={(
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" size="sm" disabled={saving || invalid} onClick={submit}>{saving ? 'Saving…' : 'Record payment'}</Button>
        </div>
      )}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Invoice total', getInvoiceTotal(invoice)], ['Paid so far', Number(invoice.amountPaid) || 0], ['Balance due', balance]].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-neutral-50 px-2 py-2.5 dark:bg-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
              <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">{formatCurrency(value)}</p>
            </div>
          ))}
        </div>
        <div>
          <Input label="Amount received" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className={invalid ? 'text-rose-600 dark:text-rose-300' : 'text-neutral-500 dark:text-neutral-400'}>
              {amount > balance ? 'Cannot exceed the balance due.' : amount <= 0 ? 'Enter an amount above zero.' : amount < balance ? `Part payment · ${formatCurrency(balance - amount)} will remain due.` : 'Settles the invoice in full.'}
            </span>
            {amount !== balance && (
              <button type="button" onClick={() => setForm((p) => ({ ...p, amount: balance }))} className="font-semibold text-primary hover:underline">Full balance</button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select label="Method" value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))} options={PAYMENT_METHOD_OPTIONS} />
          <Input label="Payment date" type="date" value={form.paymentDate} onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))} />
        </div>
        <Input label="Reference" placeholder="UTR / cheque / transaction ID" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} />
        {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      </div>
    </Modal>
  );
};

// ─── Payment lifecycle ────────────────────────────────────────────────────────
// recorded (money booked, awaiting bank match) → reconciled; or → failed, which
// the backend reverses off the linked invoice.

const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank', label: 'Bank transfer' },
  { value: 'online', label: 'Online / UPI' },
  { value: 'cash', label: 'Cash' },
];
const PAYMENT_STAGE_LABEL = { recorded: 'To reconcile', reconciled: 'Reconciled', failed: 'Failed', cancelled: 'Cancelled', completed: 'Completed' };
const PAYMENT_FILTERS = [
  { value: '', label: 'All' },
  { value: 'recorded', label: 'To reconcile' },
  { value: 'reconciled', label: 'Reconciled' },
  { value: 'failed', label: 'Failed' },
];

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

// Overview-only KPI classification. dashboard.kpis[] carries no explicit importance
// flag, so priority/polarity are assigned by domain judgement (see task notes).
const PRIMARY_FINANCE_KPI_LABELS = new Set(['Total Cash', 'Outstanding Receivables', 'Pending Approvals', 'Total Expenses']);
const FINANCE_KPI_TREND_POLARITY = {
  'Total Cash': 'higherIsBetter',
  'Total Budget': 'higherIsBetter',
  'Total Expenses': 'lowerIsBetter',
  'Pending Requests': 'lowerIsBetter',
  'Pending Approvals': 'lowerIsBetter',
  'Pending Payments': 'lowerIsBetter',
  'Outstanding Receivables': 'lowerIsBetter',
  'Outstanding Payables': 'lowerIsBetter',
};
const FINANCE_KPI_TONE = {
  'Total Cash': 'accent',
  'Total Budget': 'info',
  'Total Expenses': 'warning',
  'Pending Requests': 'warning',
  'Pending Approvals': 'warning',
  'Pending Payments': 'warning',
  'Outstanding Payables': 'warning',
};

// ════════════════════════════════════════════════════════════════════════════
// Overview
// ════════════════════════════════════════════════════════════════════════════

export const FinanceOverviewPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [departmentScope, setDepartmentScope] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const { loading, error, data, refetch } = useAsync(async () => {
    const [dashboardRes, invoicesRes, expensesRes, profitLossRes, balanceSheetRes, catalogRes] = await Promise.allSettled([
      financeApi.getDashboard(token),
      financeApi.getInvoices(token),
      financeApi.getExpenses(token),
      financeApi.getProfitLoss(token),
      financeApi.getBalanceSheet(token),
      financeApi.getDepartmentCatalog(token),
    ]);
    return {
      dashboard: dashboardRes.status === 'fulfilled' ? unwrap(dashboardRes.value) : null,
      invoices: invoicesRes.status === 'fulfilled' ? toList(unwrap(invoicesRes.value)) : [],
      expenses: expensesRes.status === 'fulfilled' ? toList(unwrap(expensesRes.value)) : [],
      profitLoss: profitLossRes.status === 'fulfilled' ? unwrap(profitLossRes.value) : { revenue: 0, expenses: 0, netIncome: 0 },
      balanceSheet: balanceSheetRes.status === 'fulfilled' ? unwrap(balanceSheetRes.value) : { assets: 0, liabilities: 0, equity: 0 },
      departmentCatalog: catalogRes.status === 'fulfilled' ? toList(unwrap(catalogRes.value)) : [],
      // Per-source failure reasons from Promise.allSettled — lets the Overview surface
      // a real error on just the section(s) whose backing call failed, instead of the
      // whole page silently rendering zeros.
      errors: {
        dashboard: dashboardRes.status === 'rejected' ? (dashboardRes.reason?.message || 'Failed to load the finance dashboard feed') : null,
        invoices: invoicesRes.status === 'rejected' ? (invoicesRes.reason?.message || 'Failed to load invoices') : null,
        expenses: expensesRes.status === 'rejected' ? (expensesRes.reason?.message || 'Failed to load expenses') : null,
        profitLoss: profitLossRes.status === 'rejected' ? (profitLossRes.reason?.message || 'Failed to load profit & loss') : null,
        balanceSheet: balanceSheetRes.status === 'rejected' ? (balanceSheetRes.reason?.message || 'Failed to load the balance sheet') : null,
      },
    };
  }, [token]);

  const dashboard = data.dashboard || {};
  const invoices = data.invoices || [];
  const expenses = data.expenses || [];
  const profitLoss = data.profitLoss || { revenue: 0, expenses: 0, netIncome: 0 };
  const balanceSheet = data.balanceSheet || { assets: 0, liabilities: 0, equity: 0 };
  const sourceErrors = data.errors || {};
  const roleExperience = dashboard.roleExperience || (String(user?.role || '').toLowerCase() === 'finance_employee' ? 'employee' : 'head');
  const isFinanceHead = roleExperience === 'head';
  const departmentCatalog = data.departmentCatalog || [];
  const departments = departmentCatalog.filter((d) => !d.isSystem);
  const scopedDepartmentRows = useMemo(() => {
    const rows = dashboard.departmentFinancials || [];
    const scoped = !departmentScope ? rows : rows.filter((row) => row.departmentId === departmentScope || row.code === departmentScope || row.department === departmentScope);
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

  const backendKpis = useMemo(() => (dashboard.kpis || []).map((item) => {
    const polarity = FINANCE_KPI_TREND_POLARITY[item.label] || 'higherIsBetter';
    const direction = item.trend === 'down' ? 'down' : 'up';
    const trendTone = direction === 'up'
      ? (polarity === 'higherIsBetter' ? 'positive' : 'negative')
      : (polarity === 'higherIsBetter' ? 'negative' : 'positive');
    const hasComparison = item.comparisonAvailable !== false && item.changePercent !== null && item.changePercent !== undefined;
    const changePercent = hasComparison ? Number(item.changePercent || 0) : 0;
    return {
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
      trend: { direction, value: hasComparison ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%` : 'New baseline', tone: hasComparison ? trendTone : 'neutral' },
      drillDown: item.drillDown,
      priority: PRIMARY_FINANCE_KPI_LABELS.has(item.label) ? 'primary' : 'secondary',
      tone: item.label === 'Outstanding Receivables'
        ? (invoiceMetrics.overdueAmount > 0 ? 'danger' : 'accent')
        : (FINANCE_KPI_TONE[item.label] || 'accent'),
    };
  }), [dashboard.kpis, invoiceMetrics.overdueAmount]);

  const kpis = useMemo(() => (backendKpis.length ? backendKpis : [
    {
      label: 'Revenue',
      icon: 'trending_up',
      value: formatCurrency(financeSummary.revenue),
      context: `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} booked`,
      priority: 'primary',
      tone: 'accent',
    },
    {
      label: 'Expenses',
      icon: 'request_quote',
      value: formatCurrency(financeSummary.totalExpenses),
      context: `${expenseSummary.pendingCount} pending review`,
      priority: 'secondary',
      tone: 'warning',
    },
    {
      label: 'Net Income',
      icon: 'account_balance_wallet',
      value: formatCurrency(financeSummary.net),
      context: `${financeSummary.margin.toFixed(1)}% margin`,
      priority: 'primary',
      tone: financeSummary.net >= 0 ? 'success' : 'danger',
    },
    {
      label: 'Receivables',
      icon: 'pending_actions',
      value: formatCurrency(invoiceMetrics.outstandingAmount),
      context: invoiceMetrics.overdueCount > 0 ? `${invoiceMetrics.overdueCount} overdue` : 'No overdue invoices',
      priority: 'primary',
      tone: invoiceMetrics.overdueAmount > 0 ? 'danger' : 'accent',
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

  // Same underlying data/counts as the previous hand-rolled "controls" cards, now
  // rendered through the shared AttentionPanel.
  const attentionItems = [
    {
      id: 'overdue-ar',
      label: 'Overdue AR',
      context: `${invoiceMetrics.overdueCount} invoice${invoiceMetrics.overdueCount === 1 ? '' : 's'} need follow-up`,
      tone: invoiceMetrics.overdueAmount > 0 ? 'danger' : 'neutral',
      statusLabel: formatCurrency(invoiceMetrics.overdueAmount),
      actionLabel: invoiceMetrics.overdueAmount > 0 ? 'Review' : undefined,
      onAction: invoiceMetrics.overdueAmount > 0 ? () => navigate('/finance/dashboard/invoices') : undefined,
    },
    {
      id: 'pending-expense-review',
      label: 'Pending Expense Review',
      context: `${expenseSummary.pendingCount} submission${expenseSummary.pendingCount === 1 ? '' : 's'} waiting`,
      tone: expenseSummary.pendingCount > 0 ? 'warning' : 'neutral',
      statusLabel: formatCurrency(expenseSummary.pendingAmount),
      actionLabel: expenseSummary.pendingCount > 0 ? 'Review' : undefined,
      onAction: expenseSummary.pendingCount > 0 ? () => navigate('/finance/dashboard/expenses') : undefined,
    },
    {
      id: 'liquidity-ratio',
      label: 'Liquidity Ratio',
      context: `${formatCurrency(financeSummary.assets)} assets vs ${formatCurrency(financeSummary.liabilities)} liabilities`,
      tone: financeSummary.liquidity >= 1 ? 'info' : 'danger',
      statusLabel: financeSummary.liquidity.toFixed(2),
      actionLabel: financeSummary.liquidity < 1 ? 'View' : undefined,
      onAction: financeSummary.liquidity < 1 ? () => navigate('/finance/dashboard/reports') : undefined,
    },
  ];
  const controlsError = sourceErrors.invoices || sourceErrors.expenses || sourceErrors.balanceSheet || null;

  // Capped at 3 per the shared QuickActions contract; Reports stays reachable via
  // the header's "Reports" button so no capability is dropped.
  const quickActionItems = [
    { label: 'Billing', icon: 'receipt_long', onClick: () => navigate('/finance/dashboard/invoices') },
    { label: 'Payments', icon: 'payments', onClick: () => navigate('/finance/dashboard/payments') },
    { label: 'Expenses', icon: 'request_quote', onClick: () => navigate('/finance/dashboard/expenses') },
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
                <option value="">All Departments</option>
                {departments.map((department) => (
                  <option key={department._id || department.code} value={department._id || department.code}>{department.name}</option>
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

        <WarmGreeting user={user} roleHint="financial overview" />

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

        {loading ? (
          <SkeletonBlock />
        ) : (
          <>
            <section className="portal-kpi-grid">
              {kpis.map((item) => {
                const cardEl = (
                  <KPICard
                    title={item.label}
                    value={item.value}
                    icon={item.icon}
                    trend={item.trend}
                    context={item.context}
                    tone={item.tone}
                    priority={item.priority}
                  />
                );
                return item.drillDown ? (
                  <button key={item.label} type="button" onClick={() => navigate(item.drillDown)} className="min-w-0 text-left">
                    {cardEl}
                  </button>
                ) : (
                  <div key={item.label} className="min-w-0">
                    {cardEl}
                  </div>
                );
              })}
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title={isFinanceHead ? 'Approval Center' : 'My Work Queue'}
                icon={isFinanceHead ? 'approval' : 'assignment_turned_in'}
                description={isFinanceHead ? 'Controlled requests waiting for Finance Head decision' : 'Assigned requests, verifications and missing information'}
                error={sourceErrors.dashboard}
                onRetry={refetch}
                empty={primaryQueue.length === 0}
                emptyIcon={isFinanceHead ? 'approval' : 'assignment_turned_in'}
                emptyTitle={isFinanceHead ? 'No pending approvals' : 'No assigned finance work'}
              >
                <div className="mb-3">
                  <StatusBadge tone="info" label={isFinanceHead ? 'Finance Head' : 'Finance Employee'} dot={false} />
                </div>
                <div className="space-y-3">
                  {primaryQueue.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{item.requestId}</p>
                          <StatusBadge tone={statusToTone(item.type || item.status)} label={item.type || item.status} dot={false} />
                          {item.approvalRequired && <StatusBadge tone="warning" label="Approval Required" dot={false} />}
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
              </SectionCard>

              <SectionCard
                title="Department Financial Overview"
                icon="domain"
                description="Budget, spend, reservations and risk by department"
                action={{ label: 'Open Profiles', onClick: () => navigate('/finance/dashboard/project-overview') }}
                error={sourceErrors.dashboard}
                onRetry={refetch}
                empty={scopedDepartmentRows.length === 0}
                emptyIcon="domain"
                emptyTitle="No department finance data"
              >
                <div className="space-y-3">
                  {scopedDepartmentRows.map((row) => (
                    <button
                      key={row.department}
                      type="button"
                      onClick={() => navigate(`/finance/dashboard/project-overview?department=${encodeURIComponent(row.departmentId || row.code || row.department)}`)}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-emerald-800"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{row.department}</p>
                          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            Spent {formatCurrency(row.spent)} of {formatCurrency(row.budget)} - Reserved {formatCurrency(row.reserved)}
                          </p>
                        </div>
                        <StatusBadge tone={statusToTone(row.status)} label={row.status} dot={false} />
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
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.9fr]">
              <div className="space-y-4">
                <SectionCard
                  title="Cash Position"
                  icon="account_balance"
                  description="Assets less liabilities, backed by current balance sheet data."
                  error={sourceErrors.balanceSheet}
                  onRetry={refetch}
                >
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Net Position</p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-100">{formatCurrency(financeSummary.assets - financeSummary.liabilities)}</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                </SectionCard>

                <SectionCard
                  title="Receivables Aging"
                  icon="pending_actions"
                  description="Open invoice balances by overdue band"
                  error={sourceErrors.invoices}
                  onRetry={refetch}
                >
                  <p className="mb-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400">{outstandingInvoices.length} open invoices</p>
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
                </SectionCard>
              </div>

              <div className="space-y-4">
                <AttentionPanel
                  title="Controls Needing Attention"
                  items={attentionItems}
                  error={controlsError ? { message: controlsError } : null}
                  onRetry={refetch}
                  maxItems={3}
                  emptyTitle="No control exceptions"
                  emptyDescription="Overdue AR, expense review and liquidity checks are all clear."
                />

                <SectionCard title="Quick Actions" icon="bolt" description="Jump into daily finance work">
                  <QuickActions actions={quickActionItems} />
                </SectionCard>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <SectionCard
                title="Recent Invoices"
                icon="receipt_long"
                description="Latest billing activity"
                action={{ label: 'Open Billing', onClick: () => navigate('/finance/dashboard/invoices') }}
                error={sourceErrors.invoices}
                onRetry={refetch}
                empty={recentInvoices.length === 0}
                emptyIcon="receipt_long"
                emptyTitle="No invoices yet"
              >
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
                          <td className="px-3 py-3"><StatusBadge tone={statusToTone(invoiceStatusLabel(invoice))} label={invoiceStatusLabel(invoice)} dot={false} /></td>
                          <td className="py-3 pl-3 text-right text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(getInvoiceTotal(invoice))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard
                title="Expense Control"
                icon="request_quote"
                description={`Largest expenses and review status — ${expenses.length} entries`}
                action={{ label: 'Open Expenses', onClick: () => navigate('/finance/dashboard/expenses') }}
                error={sourceErrors.expenses}
                onRetry={refetch}
                empty={topExpenses.length === 0}
                emptyIcon="request_quote"
                emptyTitle="No expenses recorded"
              >
                <div className="space-y-3">
                  {topExpenses.map((expense) => (
                    <div key={expense._id || expense.id || expense.title} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{expense.title || expense.category || 'Expense'}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{expense.department || 'Finance'} - {fmtDateOnly(expense.createdAt || expense.date)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(expense.amount)}</p>
                        <StatusBadge tone={statusToTone(expense.status || 'submitted')} label={expense.status || 'submitted'} dot={false} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard
                title="Payment Queue"
                icon="payments"
                description="Prepared payments and reconciliation work"
                action={{ label: 'Open Payments', onClick: () => navigate('/finance/dashboard/payments') }}
                error={sourceErrors.dashboard}
                onRetry={refetch}
                empty={paymentQueue.length === 0}
                emptyIcon="payments"
                emptyTitle="No pending payments"
              >
                <div className="space-y-3">
                  {paymentQueue.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{payment.paymentId} - {payment.payee}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{payment.method || 'bank'} - account {payment.accountMasked}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{formatCurrency(payment.amount)}</p>
                        <StatusBadge tone={statusToTone(payment.status)} label={payment.status} dot={false} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Recent Audit Activity"
                icon="policy"
                description="Important finance actions are traceable"
                action={{ label: 'Open Audit', onClick: () => navigate('/finance/dashboard/activity') }}
                error={sourceErrors.dashboard}
                onRetry={refetch}
                empty={recentAuditActivity.length === 0}
                emptyIcon="policy"
                emptyTitle="No audit events yet"
              >
                <div className="space-y-3">
                  {recentAuditActivity.slice(0, 6).map((event) => (
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
              </SectionCard>
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
  const requestedDepartment = searchParams.get('department') || '';
  const activeTab = searchParams.get('tab') || 'overview';

  const { loading, error, data } = useAsync(async () => {
    const departmentsRes = await financeApi.getDepartmentFinancials(token);
    const departments = toList(unwrap(departmentsRes));
    const selected = requestedDepartment || departments[0]?.departmentId || departments[0]?.code || '';
    const profileRes = selected ? await financeApi.getDepartmentFinancialProfile(token, selected) : { data: {} };
    return {
      departments,
      selectedDepartment: selected,
      profile: unwrap(profileRes),
    };
  }, [token, requestedDepartment]);

  const departments = data.departments || [];
  const selectedDepartment = data.selectedDepartment || requestedDepartment;
  const profileData = data.profile || {};
  const profile = profileData.profile || departments.find((item) => item.departmentId === selectedDepartment || item.code === selectedDepartment) || {};
  const selectedDepartmentName = profile.department || selectedDepartment;
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
                {row.type || row.category || row.resourceType || selectedDepartmentName} - {fmtDateOnly(row.submittedDate || row.createdAt || row.dueDate)}
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
          title={`${selectedDepartmentName} Financial Profile`}
          subtitle="Department financial context only: budgets, requests, payments, transactions and audit"
          icon="domain"
          user={user}
          crumbs={['Finance', selectedDepartmentName]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select className={input} value={selectedDepartment} onChange={(event) => setDepartment(event.target.value)}>
                {departments.map((department) => <option key={department.departmentId || department.code} value={department.departmentId || department.code}>{department.department}</option>)}
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
                        key={row.departmentId || row.code}
                        type="button"
                        onClick={() => setDepartment(row.departmentId || row.code)}
                        className={`w-full rounded-xl border p-3 text-left transition ${row.departmentId === selectedDepartment || row.code === selectedDepartment ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-neutral-200 bg-neutral-50 hover:border-emerald-300 dark:border-neutral-800 dark:bg-neutral-900'}`}
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
                    {activeTab !== 'overview' && renderRowList(tabRows[activeTab] || [], `No ${activeTab} for ${selectedDepartmentName}`)}
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
  dueDate: '',
  description: '',
  quantity: 1,
  rate: 0,
  gstRate: 18,
  tdsRate: 0,
  discount: 0,
  departmentId: '',
};

export const FinanceInvoicesPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useStatusParam();
  const [search, setSearch] = useState('');
  const { loading, error, data, refetch } = useAsync(async () => {
    const [invoicesRes, notesRes, catalogRes] = await Promise.all([financeApi.getInvoices(token), financeApi.getInvoiceNotes(token), financeApi.getDepartmentCatalog(token)]);
    return { invoices: toList(unwrap(invoicesRes)), notes: toList(unwrap(notesRes)), departmentCatalog: toList(unwrap(catalogRes)) };
  }, [token]);

  const invoices = useMemo(() => data.invoices || [], [data.invoices]);
  const notes = data.notes || [];
  const departmentCatalog = data.departmentCatalog || [];

  const stageCounts = useMemo(() => invoices.reduce((acc, invoice) => {
    const stage = invoiceStage(invoice);
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {}), [invoices]);

  const visibleInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) =>
      (!statusFilter || invoiceStage(invoice) === statusFilter)
      && (!query || `${invoice.invoiceNumber || ''} ${invoice.clientName || ''}`.toLowerCase().includes(query)));
  }, [invoices, search, statusFilter]);

  const receivable = useMemo(() => invoices.filter(isPayableInvoice).reduce((sum, invoice) => sum + invoiceBalance(invoice), 0), [invoices]);
  const overdueAmount = useMemo(() => invoices.filter((invoice) => invoiceStage(invoice) === 'overdue').reduce((sum, invoice) => sum + invoiceBalance(invoice), 0), [invoices]);

  const [form, setForm] = useState(emptyInvoiceForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const totals = previewInvoiceTotals(form);

  const startEdit = (invoice) => {
    setEditingId(invoice._id);
    setFormError('');
    const firstItem = invoice.items?.[0] || {};
    setForm({
      clientName: invoice.clientName || '',
      clientEmail: invoice.clientEmail || '',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      description: firstItem.description || '',
      quantity: firstItem.quantity || 1,
      rate: firstItem.rate || 0,
      gstRate: invoice.gstRate ?? firstItem.taxRate ?? 18,
      tdsRate: invoice.tdsRate || 0,
      discount: invoice.discount || 0,
      departmentId: invoice.departmentId || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyInvoiceForm);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totals.total <= 0) {
      setFormError('Invoice total must be greater than zero.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      // No status in the payload: new invoices start as drafts and move forward only
      // through Approve and Record payment.
      const payload = {
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        dueDate: form.dueDate || undefined,
        discount: Number(form.discount) || 0,
        gstRate: Number(form.gstRate) || 0,
        tdsRate: Number(form.tdsRate) || 0,
        departmentId: form.departmentId || undefined,
        items: [{ description: form.description, quantity: Number(form.quantity) || 0, rate: Number(form.rate) || 0, taxRate: Number(form.gstRate) || 0 }],
      };
      if (editingId) {
        await financeApi.updateInvoice(editingId, payload, token);
        setNotice('Draft invoice updated.');
      } else {
        await financeApi.createInvoice(payload, token);
        setNotice('Invoice saved as a draft — approve it to send.');
      }
      cancelEdit();
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (invoice) => {
    setApprovingId(invoice._id);
    setActionError('');
    try {
      await financeApi.updateInvoice(invoice._id, { status: 'sent' }, token);
      setNotice(`${invoice.invoiceNumber} approved and ready for payment.`);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to approve invoice');
    } finally {
      setApprovingId(null);
    }
  };

  const onPaymentSaved = (message) => {
    setPayingInvoice(null);
    setNotice(message);
    refetch();
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Invoices & Billing" subtitle="Draft → approve → collect payment" icon="receipt_long" user={user} crumbs={['Finance', 'Invoices']} />

        {error && <ErrorState description={error} onRetry={refetch} />}
        {actionError && <ErrorState title="Action failed" description={actionError} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        <StatGrid
          items={[
            { label: 'Pending verification', value: stageCounts.draft || 0, subtext: 'Drafts awaiting approval' },
            { label: 'Receivable', value: formatCurrency(receivable), subtext: `${invoices.filter(isPayableInvoice).length} approved, unpaid` },
            { label: 'Overdue', value: formatCurrency(overdueAmount), subtext: `${stageCounts.overdue || 0} past due date` },
            { label: 'Paid', value: stageCounts.paid || 0, subtext: 'Fully settled invoices' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1.7fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr
                title={editingId ? 'Edit draft invoice' : 'New invoice'}
                subtitle={editingId ? 'Only drafts can be edited' : 'Saved as a draft for verification'}
                action={editingId && <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>}
              />
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input label="Client name" placeholder="e.g. Acme Corp" value={form.clientName} onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))} required />
                <Input label="Client email" type="email" placeholder="billing@client.com" value={form.clientEmail} onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))} />
                <Input label="Item description" placeholder="e.g. Consulting services" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
                <div className="grid grid-cols-3 gap-2">
                  <Input label="Qty" type="number" min="0" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
                  <Input label="Rate" type="number" min="0" step="0.01" value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))} />
                  <Input label="GST %" type="number" min="0" value={form.gstRate} onChange={(e) => setForm((p) => ({ ...p, gstRate: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
                  <Input label="TDS %" type="number" min="0" value={form.tdsRate} onChange={(e) => setForm((p) => ({ ...p, tdsRate: e.target.value }))} />
                  <Input label="Discount" type="number" min="0" value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))} />
                </div>
                <Select
                  label="Department"
                  value={form.departmentId}
                  onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                  options={[{ value: '', label: 'No department' }, ...departmentCatalog.filter((d) => !d.isSystem).map((d) => ({ value: d._id, label: d.name }))]}
                />

                <dl className="space-y-1.5 rounded-xl bg-neutral-50 p-3 text-xs dark:bg-neutral-900">
                  {[
                    ['Subtotal', formatCurrency(totals.subtotal)],
                    [`GST (${totals.gstRate}%)`, `+ ${formatCurrency(totals.gst)}`],
                    [`TDS (${totals.tdsRate}%)`, `− ${formatCurrency(totals.tds)}`],
                    ['Discount', `− ${formatCurrency(totals.discount)}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-neutral-200 pt-1.5 text-sm font-bold text-neutral-900 dark:border-neutral-700 dark:text-white">
                    <dt>Invoice total</dt>
                    <dd className={totals.total <= 0 ? 'text-rose-600 dark:text-rose-300' : ''}>{formatCurrency(totals.total)}</dd>
                  </div>
                </dl>

                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting || totals.total <= 0} fullWidth>
                  {submitting ? 'Saving…' : editingId ? 'Update draft' : 'Save as draft'}
                </Button>
              </form>

              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Latest credit / debit notes</h3>
                <div className="mt-3 space-y-2">
                  {notes.slice(0, 5).map((note) => (
                    <div key={note._id} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700">
                      <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                        <span className="font-semibold capitalize">{note.type} note</span>
                        <span>{formatCurrency(note.amount)}</span>
                      </div>
                      <p className="text-neutral-500">{note.reason || 'No reason provided'}</p>
                    </div>
                  ))}
                  {notes.length === 0 && <p className="text-xs text-neutral-500 dark:text-neutral-400">No notes yet. Add them from an invoice's detail page.</p>}
                </div>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className={`${inner} space-y-4`}>
              <SectionHdr
                title="Invoices"
                subtitle={`${visibleInvoices.length} of ${invoices.length} shown`}
                action={(
                  <div className="w-full sm:w-56">
                    <Input placeholder="Search number or client" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search invoices" />
                  </div>
                )}
              />
              <StatusFilterBar
                value={statusFilter}
                onChange={setStatusFilter}
                options={INVOICE_FILTERS.map((f) => ({ ...f, count: f.value ? stageCounts[f.value] || 0 : invoices.length }))}
              />
              <DataTable
                columns={[
                  {
                    key: 'invoiceNumber',
                    header: 'Invoice',
                    render: (r) => (
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{r.invoiceNumber}</p>
                        <p className="text-xs text-neutral-500">{r.clientName || '—'}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'dueDate',
                    header: 'Due',
                    render: (r) => <span className={invoiceStage(r) === 'overdue' ? 'font-semibold text-rose-600 dark:text-rose-300' : ''}>{fmtDateOnly(r.dueDate)}</span>,
                  },
                  { key: 'status', header: 'Status', render: (r) => { const stage = invoiceStage(r); return <Pill value={stage} label={INVOICE_STAGE_LABEL[stage]} />; } },
                  { key: 'total', header: 'Total', render: (r) => formatCurrency(getInvoiceTotal(r)) },
                  { key: 'balanceDue', header: 'Balance', render: (r) => <span className="font-semibold">{formatCurrency(invoiceStage(r) === 'paid' ? 0 : invoiceBalance(r))}</span> },
                  {
                    key: 'actions',
                    header: 'Next step',
                    render: (r) => {
                      const stage = invoiceStage(r);
                      return (
                        <div className="flex justify-end gap-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {stage === 'draft' && (
                            <>
                              <button type="button" onClick={() => startEdit(r)} className="text-xs font-semibold text-neutral-500 hover:underline">Edit</button>
                              <button type="button" onClick={() => approve(r)} disabled={approvingId === r._id} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                                {approvingId === r._id ? 'Approving…' : 'Approve'}
                              </button>
                            </>
                          )}
                          {isPayableInvoice(r) && (
                            <button type="button" onClick={() => setPayingInvoice(r)} className="text-xs font-semibold text-primary hover:underline">Record payment</button>
                          )}
                          {stage === 'paid' && <span className="text-xs text-neutral-400">Settled</span>}
                        </div>
                      );
                    },
                  },
                ]}
                rows={visibleInvoices}
                rowKey="_id"
                loading={loading}
                emptyTitle={statusFilter ? `No ${INVOICE_STAGE_LABEL[statusFilter]?.toLowerCase() || statusFilter} invoices` : 'No invoices yet'}
                onRowClick={(r) => navigate(`/finance/dashboard/invoices/${r._id}`)}
              />
            </div>
          </section>
        </div>
      </div>

      {payingInvoice && <RecordPaymentModal key={payingInvoice._id} invoice={payingInvoice} onClose={() => setPayingInvoice(null)} onSaved={onPaymentSaved} />}
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Invoice Detail
// ════════════════════════════════════════════════════════════════════════════

export const FinanceInvoiceDetailPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const { loading, error, data, refetch } = useAsync(async () => {
    const [invoicesRes, notesRes, paymentsRes] = await Promise.all([
      financeApi.getInvoices(token),
      financeApi.getInvoiceNotes(token, { invoiceId }),
      financeApi.getPayments(token),
    ]);
    const invoices = toList(unwrap(invoicesRes));
    const payments = toList(unwrap(paymentsRes)).filter((p) => String(p.invoice?._id || p.invoice || '') === String(invoiceId));
    return { invoice: invoices.find((inv) => inv._id === invoiceId) || null, notes: toList(unwrap(notesRes)), payments };
  }, [token, invoiceId]);

  const invoice = data.invoice;
  const notes = data.notes || [];
  const payments = data.payments || [];
  const stage = invoice ? invoiceStage(invoice) : 'draft';
  const settled = ['paid', 'void'].includes(stage);

  const [noteForm, setNoteForm] = useState({ type: 'credit', amount: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [approving, setApproving] = useState(false);
  const [paying, setPaying] = useState(false);

  const handleAddNote = async (e) => {
    e.preventDefault();
    const amount = Number(noteForm.amount) || 0;
    if (amount <= 0) {
      setActionError('Note amount must be greater than zero.');
      return;
    }
    if (noteForm.type === 'credit' && amount > invoiceBalance(invoice)) {
      setActionError(`A credit note cannot exceed the balance due (${formatCurrency(invoiceBalance(invoice))}).`);
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      await financeApi.createInvoiceNote(invoiceId, { type: noteForm.type, amount, reason: noteForm.reason }, token);
      setNoteForm({ type: 'credit', amount: '', reason: '' });
      setNotice(`${noteForm.type === 'credit' ? 'Credit' : 'Debit'} note added — invoice total adjusted.`);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async () => {
    setActionError('');
    setApproving(true);
    try {
      await financeApi.updateInvoice(invoiceId, { status: 'sent' }, token);
      setNotice('Invoice approved and ready for payment.');
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to approve invoice');
    } finally {
      setApproving(false);
    }
  };

  const nextStep = !invoice ? null
    : stage === 'draft' ? { hint: 'Verify the amounts, then approve to send it to the client.', action: <Button variant="primary" size="sm" onClick={approve} disabled={approving}>{approving ? 'Approving…' : 'Approve & send'}</Button> }
      : isPayableInvoice(invoice) ? { hint: stage === 'overdue' ? 'Past its due date — follow up and record the payment when it arrives.' : 'Waiting on the client. Record each payment as it comes in.', action: <Button variant="primary" size="sm" onClick={() => setPaying(true)}>Record payment</Button> }
        : { hint: stage === 'void' ? 'This invoice was voided.' : 'Fully settled. No further action needed.', action: null };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title={invoice?.invoiceNumber || 'Invoice Detail'}
          subtitle={invoice ? `${invoice.clientName || 'Client'} · ${INVOICE_STAGE_LABEL[stage] || stage}` : 'Invoice detail, payments and notes'}
          icon="receipt_long"
          user={user}
          crumbs={['Finance', 'Invoices', invoice?.invoiceNumber || 'Invoice']}
          actions={<Button variant="secondary" size="sm" onClick={() => navigate('/finance/dashboard/invoices')}>All invoices</Button>}
        />
        {loading && <SkeletonBlock />}
        {!loading && error && <ErrorState title="Failed to load invoice" description={error} onRetry={refetch} />}
        {!loading && !error && !invoice && <EmptyState icon="search_off" title="Invoice not found" description="This invoice may have been removed." />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}
        {!loading && invoice && (
          <>
            <section className={card}>
              <div className={`${inner} space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <WorkflowSteps steps={INVOICE_STEPS} current={invoiceStepIndex(stage)} failed={stage === 'overdue' || stage === 'void'} />
                  {nextStep?.action}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{nextStep?.hint}</p>
                {actionError && <p className="text-sm text-rose-600 dark:text-rose-300">{actionError}</p>}
                <StatGrid
                  items={[
                    { label: 'Invoice total', value: formatCurrency(getInvoiceTotal(invoice)) },
                    { label: 'Paid', value: formatCurrency(invoice.amountPaid), subtext: `${payments.length} payment${payments.length === 1 ? '' : 's'}` },
                    { label: 'Balance due', value: formatCurrency(stage === 'paid' ? 0 : invoiceBalance(invoice)) },
                    { label: 'Due date', value: fmtDateOnly(invoice.dueDate), subtext: stage === 'overdue' ? 'Overdue' : undefined },
                  ]}
                />
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <section className={card}>
                  <div className={inner}>
                    <SectionHdr title="Payments received" subtitle={`${payments.length} recorded`} />
                    {payments.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{stage === 'draft' ? 'Payments can be recorded once the invoice is approved.' : 'No payments recorded yet.'}</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((payment) => (
                          <div key={payment._id} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                            <div>
                              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                              <p className="text-xs text-neutral-500">{fmtDateOnly(payment.paymentDate || payment.createdAt)} · {payment.method}{payment.reference ? ` · ${payment.reference}` : ''}</p>
                            </div>
                            <Pill value={payment.status} label={PAYMENT_STAGE_LABEL[payment.status]} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className={card}>
                  <div className={inner}>
                    <SectionHdr title="Credit / Debit notes" subtitle="Adjust the invoice total after approval" />
                    <div className="space-y-2">
                      {notes.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No notes yet.</p>}
                      {notes.map((note) => (
                        <div key={note._id} className={statBox}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold capitalize text-neutral-700 dark:text-neutral-200">{note.type} note</span>
                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{note.type === 'credit' ? '− ' : '+ '}{formatCurrency(note.amount)}</span>
                          </div>
                          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{note.reason || 'No reason provided'}</p>
                        </div>
                      ))}
                    </div>
                    {settled ? (
                      <p className="mt-4 border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">Notes can't be added to a settled invoice.</p>
                    ) : (
                      <form onSubmit={handleAddNote} className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            label="Note type"
                            value={noteForm.type}
                            onChange={(e) => setNoteForm((p) => ({ ...p, type: e.target.value }))}
                            options={[{ value: 'credit', label: 'Credit (reduce)' }, { value: 'debit', label: 'Debit (increase)' }]}
                          />
                          <Input label="Amount" type="number" min="0" step="0.01" value={noteForm.amount} onChange={(e) => setNoteForm((p) => ({ ...p, amount: e.target.value }))} required />
                        </div>
                        <Input label="Reason" placeholder="Why this note was raised" value={noteForm.reason} onChange={(e) => setNoteForm((p) => ({ ...p, reason: e.target.value }))} required />
                        <Button type="submit" variant="outline" size="sm" disabled={submitting} fullWidth>
                          {submitting ? 'Saving…' : 'Add note'}
                        </Button>
                      </form>
                    )}
                  </div>
                </section>
              </div>

              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Invoice details" />
                  <div className="space-y-2">
                    {[
                      ['Client', invoice.clientName || '—'],
                      ['Client email', invoice.clientEmail || '—'],
                      ['Issue date', fmtDateOnly(invoice.issueDate || invoice.createdAt)],
                      ['Due date', fmtDateOnly(invoice.dueDate)],
                      ['Subtotal', formatCurrency(invoice.subtotal)],
                      [`GST (${invoice.gstRate ?? 0}%)`, formatCurrency(invoice.gstAmount)],
                      [`TDS (${invoice.tdsRate ?? 0}%)`, formatCurrency(invoice.tdsAmount)],
                      ['Discount', formatCurrency(invoice.discount)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
                        <span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                  {(invoice.items || []).length > 0 && (
                    <div className="mt-4 space-y-1 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Line items</p>
                      {invoice.items.map((item, i) => (
                        <div key={item._id || i} className="flex justify-between text-sm text-neutral-700 dark:text-neutral-300">
                          <span className="truncate">{item.description || 'Item'} × {item.quantity}</span>
                          <span>{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {paying && invoice && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setPaying(false)}
          onSaved={(message) => { setPaying(false); setNotice(message); refetch(); }}
        />
      )}
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Payments
// ════════════════════════════════════════════════════════════════════════════

const emptyPaymentForm = { invoice: '', customerName: '', amount: '', method: 'bank', reference: '', paymentDate: '', departmentId: '' };

export const FinancePaymentsPage = () => {
  const { token, user } = useAuth();
  const [statusFilter, setStatusFilter] = useStatusParam();
  const { loading, error, data, refetch } = useAsync(async () => {
    const [paymentsRes, invoicesRes, catalogRes] = await Promise.all([financeApi.getPayments(token), financeApi.getInvoices(token), financeApi.getDepartmentCatalog(token)]);
    return { payments: toList(unwrap(paymentsRes)), invoices: toList(unwrap(invoicesRes)), departmentCatalog: toList(unwrap(catalogRes)) };
  }, [token]);

  const payments = useMemo(() => data.payments || [], [data.payments]);
  const invoices = useMemo(() => data.invoices || [], [data.invoices]);
  const departmentCatalog = data.departmentCatalog || [];
  const invoiceById = useMemo(() => Object.fromEntries(invoices.map((inv) => [inv._id, inv])), [invoices]);

  const payableInvoices = useMemo(() => invoices.filter(isPayableInvoice).sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)), [invoices]);
  const customerBalances = useMemo(() => {
    const map = {};
    payableInvoices.forEach((invoice) => {
      const name = invoice.clientName || 'Unknown';
      map[name] = (map[name] || 0) + invoiceBalance(invoice);
    });
    return Object.entries(map).map(([name, balance]) => ({ name, balance })).sort((a, b) => b.balance - a.balance);
  }, [payableInvoices]);

  const statusCounts = useMemo(() => payments.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {}), [payments]);
  const sumBy = (status) => payments.filter((p) => p.status === status).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const visiblePayments = useMemo(() => (statusFilter ? payments.filter((p) => p.status === statusFilter) : payments), [payments, statusFilter]);

  const [form, setForm] = useState(emptyPaymentForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const formRef = useRef(null);

  const linkedInvoice = form.invoice ? invoiceById[form.invoice] : null;
  const linkedBalance = linkedInvoice ? invoiceBalance(linkedInvoice) : null;
  const amount = Number(form.amount) || 0;
  const amountError = amount <= 0 ? 'Enter an amount above zero.' : linkedBalance !== null && amount > linkedBalance ? `Cannot exceed the invoice balance of ${formatCurrency(linkedBalance)}.` : '';

  const selectInvoice = (invoiceId) => {
    const invoice = invoiceById[invoiceId];
    setForm((p) => (invoice
      ? { ...p, invoice: invoiceId, customerName: invoice.clientName || '', amount: invoiceBalance(invoice), departmentId: invoice.departmentId || '' }
      : { ...p, invoice: '' }));
  };

  const collect = (invoice) => {
    selectInvoice(invoice._id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amountError) {
      setFormError(amountError);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createPayment(
        {
          invoice: form.invoice || undefined,
          customerName: form.customerName,
          amount,
          method: form.method,
          reference: form.reference || undefined,
          paymentDate: form.paymentDate || undefined,
          departmentId: form.departmentId || undefined,
        },
        token
      );
      setNotice(linkedInvoice
        ? `Payment recorded against ${linkedInvoice.invoiceNumber}${amount >= linkedBalance ? ' — invoice is now fully paid' : ''}. Reconcile it once it shows in the bank.`
        : 'Payment recorded. Reconcile it once it shows in the bank.');
      setForm(emptyPaymentForm);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const [reconcilingId, setReconcilingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [failing, setFailing] = useState(null);
  const [savingFailure, setSavingFailure] = useState(false);
  const closeFailing = useCallback(() => setFailing(null), [setFailing]);

  const reconcile = async (payment) => {
    setReconcilingId(payment._id);
    setActionError('');
    try {
      await financeApi.updatePayment(payment._id, { status: 'reconciled' }, token);
      setNotice(`${formatCurrency(payment.amount)} from ${payment.customerName || 'customer'} reconciled.`);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to reconcile payment');
    } finally {
      setReconcilingId(null);
    }
  };

  const markFailed = async () => {
    if (!failing?.reason.trim()) return;
    setSavingFailure(true);
    setActionError('');
    try {
      await financeApi.updatePayment(failing.payment._id, { status: 'failed', failureReason: failing.reason.trim() }, token);
      setNotice(failing.payment.invoice ? 'Payment marked failed — the amount is back on the invoice balance.' : 'Payment marked failed.');
      setFailing(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to update payment');
    } finally {
      setSavingFailure(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Payments" subtitle="Record → reconcile against the bank" icon="payments" user={user} crumbs={['Finance', 'Payments']} />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {actionError && <ErrorState title="Action failed" description={actionError} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        <StatGrid
          items={[
            { label: 'Receivable', value: formatCurrency(payableInvoices.reduce((sum, inv) => sum + invoiceBalance(inv), 0)), subtext: `${payableInvoices.length} open invoice${payableInvoices.length === 1 ? '' : 's'}` },
            { label: 'To reconcile', value: formatCurrency(sumBy('recorded')), subtext: `${statusCounts.recorded || 0} awaiting bank match` },
            { label: 'Reconciled', value: formatCurrency(sumBy('reconciled')), subtext: `${statusCounts.reconciled || 0} confirmed` },
            { label: 'Failed', value: statusCounts.failed || 0, subtext: 'Bounced or reversed' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1.7fr]">
          <div className="space-y-6">
            <section className={card} ref={formRef}>
              <div className={inner}>
                <SectionHdr title="Record payment" subtitle="Link it to an invoice to settle the balance" />
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Select
                    label="Against invoice"
                    value={form.invoice}
                    onChange={(e) => selectInvoice(e.target.value)}
                    options={[
                      { value: '', label: 'No invoice (on-account receipt)' },
                      ...payableInvoices.map((inv) => ({ value: inv._id, label: `${inv.invoiceNumber} · ${inv.clientName || 'Client'} · ${formatCurrency(invoiceBalance(inv))}` })),
                    ]}
                  />
                  <Input label="Customer name" placeholder="e.g. Acme Corp" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} required readOnly={Boolean(linkedInvoice)} />
                  <Input
                    label="Amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    error={form.amount !== '' && amountError ? amountError : undefined}
                    helperText={linkedInvoice ? `Balance due ${formatCurrency(linkedBalance)} — the invoice closes automatically when fully paid.` : undefined}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select label="Method" value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))} options={PAYMENT_METHOD_OPTIONS} />
                    <Input label="Payment date" type="date" value={form.paymentDate} onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))} />
                  </div>
                  <Input label="Reference" placeholder="UTR / cheque / transaction ID" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} />
                  <Select
                    label="Department"
                    value={form.departmentId}
                    onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                    options={[{ value: '', label: 'No department' }, ...departmentCatalog.filter((d) => !d.isSystem).map((d) => ({ value: d._id, label: d.name }))]}
                  />
                  {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                  <Button type="submit" variant="primary" size="sm" disabled={submitting || Boolean(amountError)} fullWidth>{submitting ? 'Saving…' : 'Record payment'}</Button>
                </form>
              </div>
            </section>

            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Awaiting payment" subtitle="Oldest due first" />
                <div className="space-y-2">
                  {payableInvoices.slice(0, 6).map((invoice) => (
                    <div key={invoice._id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-700">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-neutral-800 dark:text-neutral-100">{invoice.clientName}</p>
                        <p className={invoiceStage(invoice) === 'overdue' ? 'text-rose-600 dark:text-rose-300' : 'text-neutral-500'}>
                          {invoice.invoiceNumber} · due {fmtDateOnly(invoice.dueDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-200">{formatCurrency(invoiceBalance(invoice))}</span>
                        <button type="button" onClick={() => collect(invoice)} className="font-semibold text-primary hover:underline">Collect</button>
                      </div>
                    </div>
                  ))}
                  {payableInvoices.length === 0 && <p className="text-xs text-neutral-500 dark:text-neutral-400">No approved invoices are waiting on payment.</p>}
                </div>
                {customerBalances.length > 0 && (
                  <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Balance by customer</p>
                    <div className="space-y-1.5">
                      {customerBalances.slice(0, 5).map((customer) => (
                        <div key={customer.name} className="flex items-center justify-between text-xs">
                          <p className="truncate text-neutral-700 dark:text-neutral-300">{customer.name}</p>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(customer.balance)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className={card}>
            <div className={`${inner} space-y-4`}>
              <SectionHdr title="Payment ledger" subtitle={`${visiblePayments.length} of ${payments.length} shown`} />
              <StatusFilterBar
                value={statusFilter}
                onChange={setStatusFilter}
                options={PAYMENT_FILTERS.map((f) => ({ ...f, count: f.value ? statusCounts[f.value] || 0 : payments.length }))}
              />
              <DataTable
                columns={[
                  { key: 'paymentDate', header: 'Date', render: (r) => fmtDateOnly(r.paymentDate || r.createdAt) },
                  {
                    key: 'customerName',
                    header: 'Customer',
                    render: (r) => {
                      const inv = invoiceById[String(r.invoice?._id || r.invoice || '')];
                      return (
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">{r.customerName || 'N/A'}</p>
                          <p className="text-xs text-neutral-500">{inv ? inv.invoiceNumber : 'On account'}{r.reference ? ` · ${r.reference}` : ''}</p>
                        </div>
                      );
                    },
                  },
                  { key: 'method', header: 'Method', render: (r) => <span className="capitalize">{r.method}</span> },
                  { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => (
                      <div>
                        <Pill value={r.status} label={PAYMENT_STAGE_LABEL[r.status]} />
                        {r.status === 'failed' && r.failureReason && <p className="mt-1 max-w-[12rem] truncate text-xs text-rose-600 dark:text-rose-300" title={r.failureReason}>{r.failureReason}</p>}
                      </div>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Next step',
                    render: (r) => r.status === 'recorded' && (
                      <div className="flex justify-end gap-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setFailing({ payment: r, reason: '' })} className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300">Mark failed</button>
                        <button type="button" onClick={() => reconcile(r)} disabled={reconcilingId === r._id} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                          {reconcilingId === r._id ? 'Reconciling…' : 'Reconcile'}
                        </button>
                      </div>
                    ),
                  },
                ]}
                rows={visiblePayments}
                rowKey="_id"
                loading={loading}
                emptyTitle={statusFilter ? `No ${(PAYMENT_STAGE_LABEL[statusFilter] || statusFilter).toLowerCase()} payments` : 'No payments recorded'}
              />
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={Boolean(failing)}
        onClose={closeFailing}
        title="Mark payment as failed"
        description={failing ? `${formatCurrency(failing.payment.amount)} from ${failing.payment.customerName || 'customer'}${failing.payment.invoice ? ' — the amount goes back onto the invoice balance' : ''}` : ''}
        className="sm:max-w-lg"
        footer={failing && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeFailing}>Cancel</Button>
            <Button type="button" variant="danger" size="sm" disabled={savingFailure || !failing.reason.trim()} onClick={markFailed}>{savingFailure ? 'Saving…' : 'Mark failed'}</Button>
          </div>
        )}
      >
        {failing && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Reason</span>
            <textarea className={input} rows={3} placeholder="e.g. Cheque bounced, UTR not found in bank statement" value={failing.reason} onChange={(e) => setFailing((p) => ({ ...p, reason: e.target.value }))} />
          </label>
        )}
      </Modal>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Expenses
// ════════════════════════════════════════════════════════════════════════════

const financeExpenseRequestActions = (row, isFinanceHead) => {
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

// Actions whose outcome sends the request back or ends it need a written reason.
const EXPENSE_ACTIONS_NEEDING_COMMENT = ['reject', 'request_information'];
const EXPENSE_STEPS = ['Submitted', 'Verified', 'Approved', 'Processing', 'Completed'];
const expenseStepIndex = (status) => {
  const s = String(status || '').toLowerCase();
  if (['verified', 'pending_approval'].includes(s)) return 1;
  if (s === 'approved') return 2;
  if (s === 'processing') return 3;
  if (['completed', 'paid'].includes(s)) return 4;
  return 0;
};
const humanizeStatus = (status) => String(status || 'unknown').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const FinanceExpensesPage = () => {
  const { token, user } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const isFinanceHead = ['finance_manager', 'admin', 'super_admin'].includes(role);
  const { loading, error, data, refetch } = useAsync(async () => {
    const [requestsRes, catalogRes] = await Promise.all([financeApi.getRequests(token, { page: 1, limit: 100 }), financeApi.getDepartmentCatalog(token)]);
    return { expenses: toList(unwrap(requestsRes)), departmentCatalog: toList(unwrap(catalogRes)) };
  }, [token]);
  const expenses = useMemo(() => data.expenses || [], [data.expenses]);
  const departmentCatalog = data.departmentCatalog || [];
  const [statusFilter, setStatusFilter] = useStatusParam();

  const statusCounts = useMemo(() => expenses.reduce((acc, row) => {
    const s = String(row.status || '').toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {}), [expenses]);
  const visibleExpenses = useMemo(() => (statusFilter ? expenses.filter((row) => String(row.status || '').toLowerCase() === statusFilter) : expenses), [expenses, statusFilter]);
  const needsAction = expenses.filter((row) => financeExpenseRequestActions(row, isFinanceHead).length > 0).length;

  // New expenses always enter the workflow as "submitted"; the backend ignores any other status.
  const emptyExpenseForm = { title: '', category: '', amount: '', departmentId: '' };
  const [form, setForm] = useState(emptyExpenseForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [actingRequest, setActingRequest] = useState(null);
  const [runningAction, setRunningAction] = useState(false);
  const [actionError, setActionError] = useState('');
  // Stable so the Modal's focus-trap effect doesn't re-run (and steal focus) on every keystroke.
  const closeAction = useCallback(() => setActingRequest(null), []);
  const commentRequired = actingRequest && EXPENSE_ACTIONS_NEEDING_COMMENT.includes(actingRequest.action.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((Number(form.amount) || 0) <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createExpense({ title: form.title, category: form.category, amount: Number(form.amount) || 0, departmentId: form.departmentId }, token);
      setForm(emptyExpenseForm);
      setNotice('Expense submitted for verification.');
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const runRequestAction = async () => {
    if (!actingRequest) return;
    if (commentRequired && !actingRequest.comment.trim()) return;
    setActionError('');
    setRunningAction(true);
    try {
      await financeApi.updateRequestAction(actingRequest.row.id, actingRequest.action.id, { comment: actingRequest.comment.trim() }, token);
      setNotice(`${actingRequest.row.requestId || 'Expense'}: ${actingRequest.action.label.toLowerCase()} done.`);
      setActingRequest(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to update expense request');
    } finally {
      setRunningAction(false);
    }
  };

  const filterOptions = [
    { value: '', label: 'All', count: expenses.length },
    ...Object.keys(statusCounts).sort((a, b) => expenseStepIndex(a) - expenseStepIndex(b)).map((s) => ({ value: s, label: humanizeStatus(s), count: statusCounts[s] })),
  ];

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Expenses" subtitle="Submit → verify → approve → pay out" icon="request_quote" user={user} crumbs={['Finance', 'Expenses']} />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {actionError && <ErrorState title="Action failed" description={actionError} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        <section className={card}>
          <div className={`${inner} flex flex-wrap items-center justify-between gap-4`}>
            <WorkflowSteps steps={EXPENSE_STEPS} current={-1} />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              {needsAction} request{needsAction === 1 ? '' : 's'} waiting on you
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1.7fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Submit expense" subtitle="Enters the workflow as Submitted" />
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input label="Expense title" placeholder="e.g. Client dinner" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                <Input label="Category" placeholder="e.g. Travel" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                <Input label="Amount" type="number" min="0" step="0.01" placeholder="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
                <Select
                  label="Department"
                  value={form.departmentId}
                  onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                  required
                  options={[{ value: '', label: 'Select department' }, ...departmentCatalog.filter((d) => !d.isSystem).map((d) => ({ value: d._id, label: d.name }))]}
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Checked against the department's budget on submission.</p>
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting} fullWidth>{submitting ? 'Submitting…' : 'Submit expense'}</Button>
              </form>
            </div>
          </section>

          <section className={card}>
            <div className={`${inner} space-y-4`}>
              <SectionHdr title="Expense requests" subtitle={`${visibleExpenses.length} of ${expenses.length} shown`} />
              <StatusFilterBar value={statusFilter} onChange={setStatusFilter} options={filterOptions} />
              <DataTable
                columns={[
                  {
                    key: 'requestId',
                    header: 'Expense',
                    render: (r) => (
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{r.type || r.requestId}</p>
                        <p className="text-xs text-neutral-500">{r.category || '—'} · {r.department || 'Unassigned'}</p>
                      </div>
                    ),
                  },
                  { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
                  { key: 'status', header: 'Status', render: (r) => <Pill value={r.status} label={humanizeStatus(r.status)} /> },
                  {
                    key: 'actions',
                    header: 'Next step',
                    render: (r) => {
                      const actions = financeExpenseRequestActions(r, isFinanceHead);
                      if (!actions.length) return null;
                      return (
                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                          {actions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setActingRequest({ row: r, action, comment: '' }); }}
                              className={`text-xs font-semibold hover:underline ${action.variant === 'danger' ? 'text-rose-600 dark:text-rose-300' : 'text-primary'}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      );
                    },
                  },
                ]}
                rows={visibleExpenses}
                rowKey="id"
                loading={loading}
                emptyTitle={statusFilter ? `No ${humanizeStatus(statusFilter).toLowerCase()} expenses` : 'No expenses yet'}
              />
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={Boolean(actingRequest)}
        onClose={closeAction}
        title={actingRequest ? `${actingRequest.action.label} · ${actingRequest.row.requestId}` : ''}
        description={actingRequest ? `${actingRequest.row.department || 'Unassigned'} · ${formatCurrency(actingRequest.row.amount)} · currently ${humanizeStatus(actingRequest.row.status).toLowerCase()}` : ''}
        className="sm:max-w-lg"
        footer={
          actingRequest && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={closeAction}>Cancel</Button>
              <Button type="button" variant={actingRequest.action.variant} size="sm" disabled={runningAction || (commentRequired && !actingRequest.comment.trim())} onClick={runRequestAction}>
                {runningAction ? 'Saving…' : actingRequest.action.label}
              </Button>
            </div>
          )
        }
      >
        {actingRequest && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">
              {commentRequired ? (actingRequest.action.id === 'reject' ? 'Reason for rejection' : 'What information is needed?') : 'Comment (optional)'}
            </span>
            <textarea
              className={input}
              rows={3}
              value={actingRequest.comment}
              onChange={(e) => setActingRequest((p) => ({ ...p, comment: e.target.value }))}
              placeholder={commentRequired ? 'Required — shared with the requester' : 'Visible in the request history'}
            />
          </label>
        )}
      </Modal>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Budgets (+ Cost Centers)
// ════════════════════════════════════════════════════════════════════════════

const budgetUsedPct = (budget) => {
  const allocated = Number(budget?.allocated || 0);
  return allocated > 0 ? ((Number(budget.spent || 0) + Number(budget.reserved || 0)) / allocated) * 100 : 0;
};

export const FinanceBudgetsPage = () => {
  const { token, user } = useAuth();
  const { loading, error, data, refetch } = useAsync(async () => {
    const [budgetsRes, costCentersRes, catalogRes] = await Promise.all([financeApi.getBudgets(token), financeApi.getCostCenters(token), financeApi.getDepartmentCatalog(token)]);
    return { budgets: toList(unwrap(budgetsRes)), costCenters: toList(unwrap(costCentersRes)), departmentCatalog: toList(unwrap(catalogRes)) };
  }, [token]);
  const budgets = useMemo(() => data.budgets || [], [data.budgets]);
  const costCenters = data.costCenters || [];
  const departments = (data.departmentCatalog || []).filter((d) => !d.isSystem);
  const departmentOptions = [{ value: '', label: 'Select department' }, ...departments.map((d) => ({ value: d._id, label: d.name }))];

  // Worst first, so over-budget and at-risk departments are what you see.
  const rankedBudgets = useMemo(() => [...budgets].sort((a, b) => budgetUsedPct(b) - budgetUsedPct(a)), [budgets]);
  const totals = useMemo(() => budgets.reduce((acc, b) => {
    acc.allocated += Number(b.allocated || 0);
    acc.spent += Number(b.spent || 0);
    acc.reserved += Number(b.reserved || 0);
    if (b.status === 'over') acc.over += 1;
    if (b.status === 'at-risk') acc.atRisk += 1;
    return acc;
  }, { allocated: 0, spent: 0, reserved: 0, over: 0, atRisk: 0 }), [budgets]);

  const emptyBudgetForm = { departmentId: '', fiscalYear: String(new Date().getFullYear()), allocated: '', spent: '', notes: '' };
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);
  const [costCenterForm, setCostCenterForm] = useState({ name: '', code: '', departmentId: '', budget: '', spent: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [adjusting, setAdjusting] = useState(null);
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const closeAdjust = useCallback(() => { setAdjusting(null); setAdjustError(''); }, [setAdjusting, setAdjustError]);

  const duplicateBudget = budgetForm.departmentId
    ? budgets.find((b) => String(b.departmentId) === String(budgetForm.departmentId) && String(b.fiscalYear) === String(budgetForm.fiscalYear).trim())
    : null;

  const saveBudget = async (e) => {
    e.preventDefault();
    if (duplicateBudget) return;
    if ((Number(budgetForm.allocated) || 0) <= 0) {
      setFormError('Allocation must be greater than zero.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createBudget({ departmentId: budgetForm.departmentId, fiscalYear: budgetForm.fiscalYear.trim(), allocated: Number(budgetForm.allocated) || 0, spent: Number(budgetForm.spent) || 0, notes: budgetForm.notes }, token);
      setBudgetForm(emptyBudgetForm);
      setNotice('Budget allocated. Expenses and payroll for this department are now checked against it.');
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save budget');
    } finally {
      setSubmitting(false);
    }
  };

  const saveAdjustment = async () => {
    const allocated = Number(adjusting.allocated) || 0;
    if (allocated <= 0) { setAdjustError('Allocation must be greater than zero.'); return; }
    if (!adjusting.reason.trim()) { setAdjustError('Give a reason for the change.'); return; }
    setSavingAdjust(true);
    setAdjustError('');
    try {
      const stamp = `${new Date().toLocaleDateString('en-IN')}: ${formatCurrency(adjusting.budget.allocated)} → ${formatCurrency(allocated)} — ${adjusting.reason.trim()}`;
      await financeApi.updateBudget(adjusting.budget._id, { allocated, notes: [adjusting.budget.notes, stamp].filter(Boolean).join('\n') }, token);
      setNotice(`${adjusting.budget.department} allocation updated to ${formatCurrency(allocated)}.`);
      setAdjusting(null);
      refetch();
    } catch (err) {
      setAdjustError(err.message || 'Failed to update budget');
    } finally {
      setSavingAdjust(false);
    }
  };

  const saveCostCenter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createCostCenter({ name: costCenterForm.name, code: costCenterForm.code, departmentId: costCenterForm.departmentId, budget: Number(costCenterForm.budget) || 0, spent: Number(costCenterForm.spent) || 0 }, token);
      setCostCenterForm({ name: '', code: '', departmentId: '', budget: '', spent: '' });
      setNotice('Cost center added.');
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save cost center');
    } finally {
      setSubmitting(false);
    }
  };

  const adjustedAllocation = adjusting ? Number(adjusting.allocated) || 0 : 0;
  const adjustCommitted = adjusting ? Number(adjusting.budget.spent || 0) + Number(adjusting.budget.reserved || 0) : 0;

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Budgets" subtitle="Allocate → track spend → adjust" icon="account_balance_wallet" user={user} crumbs={['Finance', 'Budgets']} />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        <StatGrid
          items={[
            { label: 'Allocated', value: formatCurrency(totals.allocated), subtext: `${budgets.length} department budget${budgets.length === 1 ? '' : 's'}` },
            { label: 'Spent', value: formatCurrency(totals.spent), subtext: totals.allocated ? `${((totals.spent / totals.allocated) * 100).toFixed(1)}% of allocation` : undefined },
            { label: 'Reserved', value: formatCurrency(totals.reserved), subtext: 'Committed by open expenses' },
            { label: 'Needs attention', value: totals.over + totals.atRisk, subtext: `${totals.over} over · ${totals.atRisk} at risk` },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1.7fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Allocate budget" subtitle="One budget per department per year" />
              <form onSubmit={saveBudget} className="space-y-3">
                <Select
                  label="Department"
                  value={budgetForm.departmentId}
                  onChange={(e) => setBudgetForm((p) => ({ ...p, departmentId: e.target.value }))}
                  required
                  options={departmentOptions}
                />
                <Input label="Fiscal year" placeholder="e.g. 2026" value={budgetForm.fiscalYear} onChange={(e) => setBudgetForm((p) => ({ ...p, fiscalYear: e.target.value }))} required />
                {duplicateBudget && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                    <span>{duplicateBudget.department} already has a {duplicateBudget.fiscalYear} budget ({formatCurrency(duplicateBudget.allocated)}).</span>
                    <button type="button" className="shrink-0 font-semibold underline" onClick={() => setAdjusting({ budget: duplicateBudget, allocated: duplicateBudget.allocated, reason: '' })}>Adjust it</button>
                  </div>
                )}
                <Input label="Allocation" type="number" min="0" value={budgetForm.allocated} onChange={(e) => setBudgetForm((p) => ({ ...p, allocated: e.target.value }))} required />
                <Input
                  label="Already spent (optional)"
                  type="number"
                  min="0"
                  value={budgetForm.spent}
                  onChange={(e) => setBudgetForm((p) => ({ ...p, spent: e.target.value }))}
                  helperText="Only when starting mid-year. Spend is tracked automatically from expenses and payroll after this."
                />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes</span>
                  <textarea className={input} placeholder="Optional notes" rows={2} value={budgetForm.notes} onChange={(e) => setBudgetForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting || Boolean(duplicateBudget)} fullWidth>{submitting ? 'Saving…' : 'Allocate budget'}</Button>
              </form>

              <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <SectionHdr title="Add cost center" subtitle="Sub-divide a department's spend" />
                <form onSubmit={saveCostCenter} className="space-y-2">
                  <Input label="Cost center name" placeholder="e.g. Regional Ops" value={costCenterForm.name} onChange={(e) => setCostCenterForm((p) => ({ ...p, name: e.target.value }))} required />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Code" placeholder="e.g. RO-01" value={costCenterForm.code} onChange={(e) => setCostCenterForm((p) => ({ ...p, code: e.target.value }))} />
                    <Input label="Budget" type="number" min="0" value={costCenterForm.budget} onChange={(e) => setCostCenterForm((p) => ({ ...p, budget: e.target.value }))} />
                  </div>
                  <Select
                    label="Department"
                    value={costCenterForm.departmentId}
                    onChange={(e) => setCostCenterForm((p) => ({ ...p, departmentId: e.target.value }))}
                    options={departmentOptions}
                  />
                  <Button type="submit" variant="outline" size="sm" disabled={submitting} fullWidth>Add cost center</Button>
                </form>
              </div>
            </div>
          </section>

          <section className={card}>
            <div className={inner}>
              <SectionHdr
                title="Budget utilization"
                subtitle="Highest usage first"
                action={(
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Spent</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Reserved</span>
                  </div>
                )}
              />
              {loading ? <SkeletonBlock /> : (
                <div className="space-y-3">
                  {rankedBudgets.map((budget) => {
                    const allocated = Number(budget.allocated || 0);
                    const spent = Number(budget.spent || 0);
                    const reserved = Number(budget.reserved || 0);
                    const available = allocated - spent - reserved;
                    const pct = (v) => (allocated > 0 ? Math.min((v / allocated) * 100, 100) : 0);
                    const spentPct = pct(spent);
                    const reservedPct = Math.min(pct(reserved), 100 - spentPct);
                    return (
                      <div key={budget._id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-neutral-800 dark:text-neutral-100">{budget.department}</p>
                            <p className="text-xs text-neutral-500">FY {budget.fiscalYear} · {budgetUsedPct(budget).toFixed(0)}% used</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Pill value={budget.status} label={humanizeStatus(budget.status)} />
                            <button type="button" onClick={() => setAdjusting({ budget, allocated: budget.allocated, reason: '' })} className="text-xs font-semibold text-primary hover:underline">Adjust</button>
                          </div>
                        </div>
                        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" role="img" aria-label={`${spentPct.toFixed(0)}% spent, ${reservedPct.toFixed(0)}% reserved`}>
                          <div className={budget.status === 'over' ? 'bg-rose-500' : 'bg-emerald-500'} style={{ width: `${spentPct}%` }} />
                          <div className="bg-amber-400" style={{ width: `${reservedPct}%` }} />
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                          {[['Allocated', allocated], ['Spent', spent], ['Reserved', reserved], ['Available', available]].map(([label, value]) => (
                            <div key={label}>
                              <p className="text-neutral-500 dark:text-neutral-400">{label}</p>
                              <p className={`font-semibold ${label === 'Available' && value < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-neutral-800 dark:text-neutral-100'}`}>{formatCurrency(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {budgets.length === 0 && <EmptyState icon="account_balance_wallet" title="No budgets yet" description="Allocate a budget so department expenses and payroll can be approved against it." />}
                </div>
              )}

              <div className="mt-6">
                <SectionHdr title="Cost Centers" />
                <div className="space-y-2">
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

      <Modal
        open={Boolean(adjusting)}
        onClose={closeAdjust}
        title={adjusting ? `Adjust allocation · ${adjusting.budget.department}` : ''}
        description={adjusting ? `FY ${adjusting.budget.fiscalYear} · currently ${formatCurrency(adjusting.budget.allocated)}` : ''}
        className="sm:max-w-lg"
        footer={adjusting && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeAdjust}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" disabled={savingAdjust} onClick={saveAdjustment}>{savingAdjust ? 'Saving…' : 'Update allocation'}</Button>
          </div>
        )}
      >
        {adjusting && (
          <div className="space-y-3">
            <Input
              label="New allocation"
              type="number"
              min="0"
              value={adjusting.allocated}
              onChange={(e) => setAdjusting((p) => ({ ...p, allocated: e.target.value }))}
              helperText={`Change: ${adjustedAllocation >= Number(adjusting.budget.allocated || 0) ? '+' : '−'} ${formatCurrency(Math.abs(adjustedAllocation - Number(adjusting.budget.allocated || 0)))}`}
            />
            {adjustedAllocation > 0 && adjustedAllocation < adjustCommitted && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Below what's already spent or reserved ({formatCurrency(adjustCommitted)}). The budget will show as over and new spend will be blocked.
              </p>
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Reason</span>
              <textarea className={input} rows={2} placeholder="e.g. Q3 top-up approved by CFO" value={adjusting.reason} onChange={(e) => setAdjusting((p) => ({ ...p, reason: e.target.value }))} />
            </label>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">The change and reason are appended to the budget notes and written to the audit log.</p>
            {adjustError && <p className="text-sm text-rose-600 dark:text-rose-300">{adjustError}</p>}
          </div>
        )}
      </Modal>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Payroll
// ════════════════════════════════════════════════════════════════════════════

// draft → processed (approved, budget charged) → disbursed (paid out). Forward-only;
// the backend rejects moving back a stage.
const PAYROLL_STEPS = ['Draft', 'Processed', 'Disbursed'];
const PAYROLL_NEXT = {
  draft: { status: 'processed', label: 'Process', hint: 'Locks the amounts and charges the department budget.' },
  processed: { status: 'disbursed', label: 'Disburse', hint: 'Confirms the net pay has been paid out to the employee.' },
};
const PAYROLL_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'processed', label: 'Processed' },
  { value: 'disbursed', label: 'Disbursed' },
];
const emptyPayrollForm = { employeeName: '', departmentId: '', periodStart: '', periodEnd: '', grossPay: '', allowances: '', deductions: '' };

export const FinancePayrollPage = () => {
  const { token, user } = useAuth();
  const [statusFilter, setStatusFilter] = useStatusParam();
  const { loading, error, data, refetch } = useAsync(async () => {
    const [payrollRes, catalogRes] = await Promise.all([financeApi.getPayrolls(token), financeApi.getDepartmentCatalog(token)]);
    return { payrolls: toList(unwrap(payrollRes)), departmentCatalog: toList(unwrap(catalogRes)) };
  }, [token]);
  const payrolls = useMemo(() => data.payrolls || [], [data.payrolls]);
  const departments = useMemo(() => (data.departmentCatalog || []).filter((d) => !d.isSystem), [data.departmentCatalog]);
  const departmentName = (id) => departments.find((d) => String(d._id) === String(id))?.name;

  const statusCounts = useMemo(() => payrolls.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {}), [payrolls]);
  const sumNet = (status) => payrolls.filter((r) => r.status === status).reduce((sum, r) => sum + Number(r.netPay || 0), 0);
  const visiblePayrolls = useMemo(() => (statusFilter ? payrolls.filter((r) => r.status === statusFilter) : payrolls), [payrolls, statusFilter]);

  const [form, setForm] = useState(emptyPayrollForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [advancing, setAdvancing] = useState(null);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [actionError, setActionError] = useState('');
  const closeAdvance = useCallback(() => setAdvancing(null), []);

  const gross = (Number(form.grossPay) || 0) + (Number(form.allowances) || 0);
  const netPay = Math.max(gross - (Number(form.deductions) || 0), 0);
  const periodError = form.periodStart && form.periodEnd && form.periodEnd < form.periodStart ? 'Period end must be on or after the start.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (periodError) { setFormError(periodError); return; }
    if (netPay <= 0) { setFormError('Net pay must be greater than zero.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createPayroll(
        {
          employeeName: form.employeeName,
          departmentId: form.departmentId || undefined,
          periodStart: form.periodStart || undefined,
          periodEnd: form.periodEnd || undefined,
          grossPay: Number(form.grossPay) || 0,
          allowances: Number(form.allowances) || 0,
          deductions: Number(form.deductions) || 0,
          status: 'draft',
        },
        token
      );
      setForm(emptyPayrollForm);
      setNotice(`Draft payroll for ${form.employeeName} created — process it to charge the budget.`);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to create payroll');
    } finally {
      setSubmitting(false);
    }
  };

  const advance = async () => {
    if (!advancing) return;
    const next = PAYROLL_NEXT[advancing.status];
    setSavingAdvance(true);
    setActionError('');
    try {
      await financeApi.updatePayroll(advancing._id, { status: next.status }, token);
      setNotice(`${advancing.employeeName || 'Payroll'} ${next.status === 'processed' ? 'processed' : 'disbursed'}.`);
      setAdvancing(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to update payroll');
    } finally {
      setSavingAdvance(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Payroll" subtitle="Draft → process → disburse" icon="badge" user={user} crumbs={['Finance', 'Payroll']} />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {actionError && <ErrorState title="Action failed" description={actionError} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        <StatGrid
          items={[
            { label: 'Drafts', value: statusCounts.draft || 0, subtext: formatCurrency(sumNet('draft')) + ' to review' },
            { label: 'Awaiting disbursal', value: formatCurrency(sumNet('processed')), subtext: `${statusCounts.processed || 0} processed` },
            { label: 'Disbursed', value: formatCurrency(sumNet('disbursed')), subtext: `${statusCounts.disbursed || 0} paid out` },
            { label: 'Total runs', value: payrolls.length },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1.7fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="New payroll run" subtitle="Created as a draft for review" />
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input label="Employee name" placeholder="e.g. Priya Sharma" value={form.employeeName} onChange={(e) => setForm((p) => ({ ...p, employeeName: e.target.value }))} required />
                <Select
                  label="Department"
                  value={form.departmentId}
                  onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                  options={[{ value: '', label: 'No department (not budget-tracked)' }, ...departments.map((d) => ({ value: d._id, label: d.name }))]}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Period start" type="date" value={form.periodStart} onChange={(e) => setForm((p) => ({ ...p, periodStart: e.target.value }))} />
                  <Input label="Period end" type="date" value={form.periodEnd} onChange={(e) => setForm((p) => ({ ...p, periodEnd: e.target.value }))} error={periodError || undefined} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input label="Base pay" type="number" min="0" value={form.grossPay} onChange={(e) => setForm((p) => ({ ...p, grossPay: e.target.value }))} required />
                  <Input label="Allowances" type="number" min="0" value={form.allowances} onChange={(e) => setForm((p) => ({ ...p, allowances: e.target.value }))} />
                  <Input label="Deductions" type="number" min="0" value={form.deductions} onChange={(e) => setForm((p) => ({ ...p, deductions: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5 text-sm dark:bg-neutral-900">
                  <span className="text-neutral-600 dark:text-neutral-400">Gross {formatCurrency(gross)} → <span className="font-semibold">Net pay</span></span>
                  <span className="font-bold text-neutral-900 dark:text-white">{formatCurrency(netPay)}</span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Leave the period blank to use the current month.</p>
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting || netPay <= 0 || Boolean(periodError)} fullWidth>{submitting ? 'Saving…' : 'Create draft'}</Button>
              </form>
            </div>
          </section>

          <section className={card}>
            <div className={`${inner} space-y-4`}>
              <SectionHdr title="Payroll runs" subtitle={`${visiblePayrolls.length} of ${payrolls.length} shown`} />
              <StatusFilterBar
                value={statusFilter}
                onChange={setStatusFilter}
                options={PAYROLL_FILTERS.map((f) => ({ ...f, count: f.value ? statusCounts[f.value] || 0 : payrolls.length }))}
              />
              <DataTable
                columns={[
                  {
                    key: 'employeeName',
                    header: 'Employee',
                    render: (r) => (
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{r.employeeName || 'Employee'}</p>
                        <p className="text-xs text-neutral-500">{departmentName(r.departmentId) || 'No department'}</p>
                      </div>
                    ),
                  },
                  { key: 'period', header: 'Period', render: (r) => <span className="whitespace-nowrap">{fmtDateOnly(r.periodStart)} – {fmtDateOnly(r.periodEnd)}</span> },
                  { key: 'grossPay', header: 'Gross', render: (r) => formatCurrency(r.grossPay) },
                  { key: 'netPay', header: 'Net pay', render: (r) => <span className="font-semibold">{formatCurrency(r.netPay)}</span> },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => (
                      <div>
                        <Pill value={r.status} label={humanizeStatus(r.status)} />
                        {r.status === 'disbursed' && r.paidOn && <p className="mt-1 text-xs text-neutral-500">Paid {fmtDateOnly(r.paidOn)}</p>}
                      </div>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Next step',
                    render: (r) => PAYROLL_NEXT[r.status] && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setAdvancing(r); }} className="whitespace-nowrap text-xs font-semibold text-primary hover:underline">
                        {PAYROLL_NEXT[r.status].label}
                      </button>
                    ),
                  },
                ]}
                rows={visiblePayrolls}
                rowKey="_id"
                loading={loading}
                emptyTitle={statusFilter ? `No ${statusFilter} payroll runs` : 'No payroll runs yet'}
              />
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={Boolean(advancing)}
        onClose={closeAdvance}
        title={advancing ? `${PAYROLL_NEXT[advancing.status]?.label} payroll · ${advancing.employeeName || 'Employee'}` : ''}
        description={advancing ? PAYROLL_NEXT[advancing.status]?.hint : ''}
        className="sm:max-w-lg"
        footer={advancing && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeAdvance}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" disabled={savingAdvance} onClick={advance}>{savingAdvance ? 'Saving…' : PAYROLL_NEXT[advancing.status]?.label}</Button>
          </div>
        )}
      >
        {advancing && (
          <div className="space-y-4">
            <WorkflowSteps steps={PAYROLL_STEPS} current={PAYROLL_STEPS.findIndex((s) => s.toLowerCase() === advancing.status)} />
            <dl className="space-y-1.5 text-sm">
              {[
                ['Period', `${fmtDateOnly(advancing.periodStart)} – ${fmtDateOnly(advancing.periodEnd)}`],
                ['Department', departmentName(advancing.departmentId) || 'No department'],
                ['Gross', formatCurrency(advancing.grossPay)],
                ['Deductions', formatCurrency(advancing.deductions)],
                ['Net pay', formatCurrency(advancing.netPay)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
                  <dd className="font-semibold text-neutral-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">This can't be undone.</p>
          </div>
        )}
      </Modal>
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
const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
// Standard double-entry convention; the form pre-fills it from the type.
const NORMAL_BALANCE = { asset: 'debit', expense: 'debit', liability: 'credit', equity: 'credit', revenue: 'credit' };

export const FinanceAccountingPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'accounts';

  const { loading, error, data, refetch } = useAsync(async () => {
    const [accountsRes, journalsRes] = await Promise.all([financeApi.getAccounts(token), financeApi.getJournalEntries(token)]);
    return { accounts: toList(unwrap(accountsRes)), journalEntries: toList(unwrap(journalsRes)) };
  }, [token]);
  const accounts = useMemo(() => data.accounts || [], [data.accounts]);
  const journalEntries = useMemo(() => data.journalEntries || [], [data.journalEntries]);
  const accountLabel = (acct) => (acct && typeof acct === 'object' ? `${acct.code} · ${acct.name}` : accounts.find((a) => a._id === acct)?.name || '—');

  const [typeFilter, setTypeFilter] = useState('');
  const [journalFilter, setJournalFilter] = useState('');
  const typeCounts = useMemo(() => accounts.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {}), [accounts]);
  const journalCounts = useMemo(() => journalEntries.reduce((acc, j) => { acc[j.status] = (acc[j.status] || 0) + 1; return acc; }, {}), [journalEntries]);
  const visibleAccounts = useMemo(() => [...(typeFilter ? accounts.filter((a) => a.type === typeFilter) : accounts)].sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })), [accounts, typeFilter]);
  const visibleJournals = useMemo(() => (journalFilter ? journalEntries.filter((j) => j.status === journalFilter) : journalEntries), [journalEntries, journalFilter]);

  const emptyAccountForm = { code: '', name: '', type: 'asset', normalBalance: NORMAL_BALANCE.asset };
  const emptyJournalForm = { memo: '', entryDate: todayIso(), debitAccount: '', creditAccount: '', amount: '' };
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [journalForm, setJournalForm] = useState(emptyJournalForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const duplicateCode = accountForm.code.trim() && accounts.some((a) => String(a.code).toLowerCase() === accountForm.code.trim().toLowerCase());
  const journalAmount = Number(journalForm.amount) || 0;
  const journalError = journalForm.debitAccount && journalForm.debitAccount === journalForm.creditAccount
    ? 'Debit and credit must be different accounts.'
    : journalForm.amount !== '' && journalAmount <= 0 ? 'Amount must be greater than zero.' : '';

  const saveAccount = async (e) => {
    e.preventDefault();
    if (duplicateCode) return;
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createAccount({ ...accountForm, code: accountForm.code.trim(), name: accountForm.name.trim() }, token);
      setAccountForm(emptyAccountForm);
      setNotice(`Account ${accountForm.code.trim()} · ${accountForm.name.trim()} added.`);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  const saveJournalEntry = async (e) => {
    e.preventDefault();
    if (journalError || journalAmount <= 0) {
      setFormError(journalError || 'Amount must be greater than zero.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createJournalEntry(
        { memo: journalForm.memo, entryDate: journalForm.entryDate || undefined, lines: [{ account: journalForm.debitAccount, debit: journalAmount, credit: 0 }, { account: journalForm.creditAccount, debit: 0, credit: journalAmount }] },
        token
      );
      setJournalForm(emptyJournalForm);
      setNotice('Journal entry saved as a draft. Post it to include it in the ledgers and reports.');
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const [posting, setPosting] = useState(null);
  const [savingPost, setSavingPost] = useState(false);
  const [actionError, setActionError] = useState('');
  const closePosting = useCallback(() => setPosting(null), [setPosting]);

  const postEntry = async () => {
    if (!posting) return;
    setSavingPost(true);
    setActionError('');
    try {
      await financeApi.postJournalEntry(posting._id, token);
      setNotice(`${posting.entryNumber} posted to the ledger.`);
      setPosting(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to post journal entry');
    } finally {
      setSavingPost(false);
    }
  };

  const accountOptions = (placeholder) => [{ value: '', label: placeholder }, ...[...accounts].sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })).map((account) => ({ value: account._id, label: `${account.code} · ${account.name} (${account.type})` }))];

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Accounting" subtitle="Chart of accounts · draft → post journal entries" icon="menu_book" user={user} crumbs={['Finance', 'Accounting']} />
        <TabBar tabs={ACCOUNTING_TABS.map((t) => ({ ...t, label: `${t.label} (${t.id === 'accounts' ? accounts.length : journalEntries.length})` }))} active={tab} onChange={(id) => { setFormError(''); setSearchParams({ tab: id }); }} />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {actionError && <ErrorState title="Action failed" description={actionError} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        {tab === 'accounts' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="New account" subtitle="Normal balance follows the account type" />
                <form onSubmit={saveAccount} className="space-y-3">
                  <Input
                    label="Account code"
                    placeholder="e.g. 1000"
                    value={accountForm.code}
                    onChange={(e) => setAccountForm((p) => ({ ...p, code: e.target.value }))}
                    error={duplicateCode ? 'This code is already in use.' : undefined}
                    required
                  />
                  <Input label="Account name" placeholder="e.g. Cash in Bank" value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} required />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Type"
                      value={accountForm.type}
                      onChange={(e) => setAccountForm((p) => ({ ...p, type: e.target.value, normalBalance: NORMAL_BALANCE[e.target.value] }))}
                      options={ACCOUNT_TYPES.map((t) => ({ value: t, label: humanizeStatus(t) }))}
                    />
                    <Select
                      label="Normal balance"
                      value={accountForm.normalBalance}
                      onChange={(e) => setAccountForm((p) => ({ ...p, normalBalance: e.target.value }))}
                      options={[{ value: 'debit', label: 'Debit' }, { value: 'credit', label: 'Credit' }]}
                    />
                  </div>
                  {accountForm.normalBalance !== NORMAL_BALANCE[accountForm.type] && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">Unusual: {accountForm.type} accounts normally carry a {NORMAL_BALANCE[accountForm.type]} balance.</p>
                  )}
                  {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                  <Button type="submit" variant="primary" size="sm" disabled={submitting || Boolean(duplicateCode)} fullWidth>{submitting ? 'Saving…' : 'Add account'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={`${inner} space-y-4`}>
                <SectionHdr title="Chart of accounts" subtitle={`${visibleAccounts.length} of ${accounts.length} shown · sorted by code`} />
                <StatusFilterBar
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[{ value: '', label: 'All', count: accounts.length }, ...ACCOUNT_TYPES.map((t) => ({ value: t, label: humanizeStatus(t), count: typeCounts[t] || 0 }))]}
                />
                <DataTable
                  columns={[
                    { key: 'code', header: 'Code', render: (r) => <span className="font-mono font-semibold text-neutral-900 dark:text-white">{r.code}</span> },
                    { key: 'name', header: 'Name' },
                    { key: 'type', header: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
                    { key: 'normalBalance', header: 'Normal', render: (r) => <span className="capitalize">{r.normalBalance}</span> },
                  ]}
                  rows={visibleAccounts}
                  rowKey="_id"
                  loading={loading}
                  emptyTitle={typeFilter ? `No ${typeFilter} accounts` : 'No accounts yet'}
                />
              </div>
            </section>
          </div>
        )}

        {tab === 'journals' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="New journal entry" subtitle="Saved as a draft until posted" />
                {accounts.length < 2 ? (
                  <EmptyState icon="account_tree" title="Add accounts first" description="A journal entry needs at least two accounts in the chart of accounts." />
                ) : (
                  <form onSubmit={saveJournalEntry} className="space-y-3">
                    <Input label="Memo" placeholder="What is this entry for?" value={journalForm.memo} onChange={(e) => setJournalForm((p) => ({ ...p, memo: e.target.value }))} required />
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Entry date" type="date" value={journalForm.entryDate} onChange={(e) => setJournalForm((p) => ({ ...p, entryDate: e.target.value }))} />
                      <Input label="Amount" type="number" min="0" step="0.01" value={journalForm.amount} onChange={(e) => setJournalForm((p) => ({ ...p, amount: e.target.value }))} required />
                    </div>
                    <Select
                      label="Debit (Dr)"
                      value={journalForm.debitAccount}
                      onChange={(e) => setJournalForm((p) => ({ ...p, debitAccount: e.target.value }))}
                      required
                      options={accountOptions('Account receiving the debit')}
                    />
                    <Select
                      label="Credit (Cr)"
                      value={journalForm.creditAccount}
                      onChange={(e) => setJournalForm((p) => ({ ...p, creditAccount: e.target.value }))}
                      required
                      options={accountOptions('Account receiving the credit')}
                    />
                    {journalForm.debitAccount && journalForm.creditAccount && !journalError && journalAmount > 0 && (
                      <div className="rounded-xl bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                        <p>Dr {accountLabel(journalForm.debitAccount)} <span className="float-right">{formatCurrency(journalAmount)}</span></p>
                        <p className="pl-6">Cr {accountLabel(journalForm.creditAccount)} <span className="float-right">{formatCurrency(journalAmount)}</span></p>
                      </div>
                    )}
                    {(journalError || formError) && <p className="text-sm text-rose-600 dark:text-rose-300">{journalError || formError}</p>}
                    <Button type="submit" variant="primary" size="sm" disabled={submitting || Boolean(journalError)} fullWidth>{submitting ? 'Saving…' : 'Save draft entry'}</Button>
                  </form>
                )}
              </div>
            </section>
            <section className={card}>
              <div className={`${inner} space-y-4`}>
                <SectionHdr title="Journal register" subtitle={`${visibleJournals.length} of ${journalEntries.length} shown`} />
                <StatusFilterBar
                  value={journalFilter}
                  onChange={setJournalFilter}
                  options={[
                    { value: '', label: 'All', count: journalEntries.length },
                    { value: 'draft', label: 'Draft', count: journalCounts.draft || 0 },
                    { value: 'posted', label: 'Posted', count: journalCounts.posted || 0 },
                  ]}
                />
                <DataTable
                  columns={[
                    {
                      key: 'entryNumber',
                      header: 'Entry',
                      render: (r) => (
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">{r.entryNumber}</p>
                          <p className="text-xs text-neutral-500">{fmtDateOnly(r.entryDate || r.createdAt)}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'memo',
                      header: 'Memo / lines',
                      render: (r) => (
                        <div className="min-w-0">
                          <p className="truncate text-neutral-800 dark:text-neutral-200">{r.memo || 'No memo'}</p>
                          {(r.lines || []).map((line, i) => (
                            <p key={i} className={`truncate text-xs text-neutral-500 ${Number(line.credit) > 0 ? 'pl-4' : ''}`}>
                              {Number(line.debit) > 0 ? 'Dr' : 'Cr'} {accountLabel(line.account)}
                            </p>
                          ))}
                        </div>
                      ),
                    },
                    { key: 'totalDebit', header: 'Amount', render: (r) => <span className="font-semibold">{formatCurrency(r.totalDebit)}</span> },
                    { key: 'status', header: 'Status', render: (r) => <Pill value={r.status} label={humanizeStatus(r.status)} /> },
                    {
                      key: 'actions',
                      header: 'Next step',
                      render: (r) => r.status !== 'posted' && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPosting(r); }} className="whitespace-nowrap text-xs font-semibold text-primary hover:underline">
                          Post
                        </button>
                      ),
                    },
                  ]}
                  rows={visibleJournals}
                  rowKey="_id"
                  loading={loading}
                  emptyTitle={journalFilter ? `No ${journalFilter} entries` : 'No journal entries yet'}
                />
              </div>
            </section>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(posting)}
        onClose={closePosting}
        title={posting ? `Post ${posting.entryNumber}?` : ''}
        description="Posted entries flow into the trial balance, P&L and balance sheet, and can't be edited. Corrections need a reversing entry."
        className="sm:max-w-lg"
        footer={posting && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closePosting}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" disabled={savingPost} onClick={postEntry}>{savingPost ? 'Posting…' : 'Post to ledger'}</Button>
          </div>
        )}
      >
        {posting && (
          <div className="space-y-1 rounded-xl bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            <p className="font-sans text-sm font-semibold text-neutral-900 dark:text-white">{posting.memo || 'No memo'}</p>
            {(posting.lines || []).map((line, i) => (
              <p key={i} className={Number(line.credit) > 0 ? 'pl-6' : ''}>
                {Number(line.debit) > 0 ? 'Dr' : 'Cr'} {accountLabel(line.account)}
                <span className="float-right">{formatCurrency(Number(line.debit) || Number(line.credit))}</span>
              </p>
            ))}
          </div>
        )}
      </Modal>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Reports (Archive / ERP Statements)
// ════════════════════════════════════════════════════════════════════════════

const REPORT_TABS = [
  { id: 'erp', label: 'Financial Statements' },
  { id: 'archive', label: 'Report Archive' },
];
const REPORT_TYPE_LABEL = {
  'profit-loss': 'Profit & Loss',
  'expense-summary': 'Expense Summary',
  revenue: 'Revenue Report',
  'cash-flow': 'Cash Flow Statement',
  tax: 'Tax Report',
  monthly: 'Monthly Summary',
  yearly: 'Yearly Summary',
};

const CheckBadge = ({ ok, okText, badText }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'}`}>
    <span className="material-symbols-outlined text-[14px]">{ok ? 'check_circle' : 'error'}</span>
    {ok ? okText : badText}
  </span>
);

export const FinanceReportsPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'erp';

  const { loading, error, data, refetch } = useAsync(async () => {
    // Settled individually: one failing statement shouldn't blank the whole page.
    const results = await Promise.allSettled([
      financeApi.getReports(token),
      financeApi.getTrialBalance(token),
      financeApi.getBalanceSheet(token),
      financeApi.getProfitLoss(token),
      financeApi.getTaxSummary(token),
      financeApi.getItrSummary(token),
    ]);
    const [reportsRes, trialRes, sheetRes, plRes, taxRes, itrRes] = results.map((r) => (r.status === 'fulfilled' ? unwrap(r.value) : null));
    const failed = ['Report archive', 'Trial balance', 'Balance sheet', 'Profit & loss', 'Tax summary', 'ITR summary'].filter((_, i) => results[i].status === 'rejected');
    return {
      reports: toList(reportsRes || []),
      trialBalance: trialRes || { rows: [], totals: { debit: 0, credit: 0 } },
      balanceSheet: sheetRes || { assets: 0, liabilities: 0, equity: 0 },
      profitLoss: plRes || { revenue: 0, expenses: 0, netIncome: 0 },
      taxSummary: taxRes || { taxableSales: 0, gstCollected: 0, tdsWithheld: 0 },
      itrSummary: itrRes || { totalIncome: 0, totalExpenses: 0, taxableIncome: 0, estimatedTax: 0 },
      failed,
    };
  }, [token]);

  const reports = data.reports || [];
  const trialBalance = data.trialBalance || { rows: [], totals: { debit: 0, credit: 0 } };
  const balanceSheet = data.balanceSheet || { assets: 0, liabilities: 0, equity: 0 };
  const profitLoss = data.profitLoss || { revenue: 0, expenses: 0, netIncome: 0 };
  const taxSummary = data.taxSummary || { taxableSales: 0, gstCollected: 0, tdsWithheld: 0 };
  const itrSummary = data.itrSummary || { totalIncome: 0, totalExpenses: 0, taxableIncome: 0, estimatedTax: 0 };
  const failedSources = data.failed || [];

  const tbRows = trialBalance.rows || [];
  const tbDebit = Number(trialBalance.totals?.debit || 0);
  const tbCredit = Number(trialBalance.totals?.credit || 0);
  const tbBalanced = Math.abs(tbDebit - tbCredit) < 0.01;
  const bsGap = Number(balanceSheet.assets || 0) - Number(balanceSheet.liabilities || 0) - Number(balanceSheet.equity || 0);
  const margin = Number(profitLoss.revenue) > 0 ? (Number(profitLoss.netIncome || 0) / Number(profitLoss.revenue)) * 100 : null;

  const exportTrialBalance = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['Code', 'Account', 'Type', 'Debit', 'Credit'].map(esc).join(','),
      ...tbRows.map((r) => [r.code, r.name, r.type, Number(r.debit || 0).toFixed(2), Number(r.credit || 0).toFixed(2)].map(esc).join(',')),
      ['', 'Total', '', tbDebit.toFixed(2), tbCredit.toFixed(2)].map(esc).join(','),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const emptyReportForm = { type: 'profit-loss', periodStart: '', periodEnd: '', summary: '' };
  const [form, setForm] = useState(emptyReportForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const periodError = form.periodStart && form.periodEnd && form.periodEnd < form.periodStart ? 'Period end must be on or after the start.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (periodError) return;
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createReport(form, token);
      setForm(emptyReportForm);
      setNotice(`${REPORT_TYPE_LABEL[form.type]} saved to the archive.`);
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
        <Header title="Reports" subtitle="Statements from posted journal entries" icon="bar_chart" user={user} crumbs={['Finance', 'Reports']} />
        <TabBar tabs={REPORT_TABS} active={tab} onChange={(id) => setSearchParams({ tab: id })} />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {failedSources.length > 0 && (
          <ErrorState title="Some statements didn't load" description={`${failedSources.join(', ')} could not be fetched — the figures shown for them are zero.`} onRetry={refetch} />
        )}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        {tab === 'archive' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1.7fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Save report to archive" subtitle="Records a period report with your commentary" />
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Select
                    label="Report type"
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    options={Object.entries(REPORT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Period start" type="date" value={form.periodStart} onChange={(e) => setForm((p) => ({ ...p, periodStart: e.target.value }))} required />
                    <Input label="Period end" type="date" value={form.periodEnd} onChange={(e) => setForm((p) => ({ ...p, periodEnd: e.target.value }))} error={periodError || undefined} required />
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Summary</span>
                    <textarea className={input} rows={3} placeholder="Key findings for this period" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
                  </label>
                  {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                  <Button type="submit" variant="primary" size="sm" disabled={submitting || Boolean(periodError)} fullWidth>{submitting ? 'Saving…' : 'Save to archive'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Report archive" subtitle={`${reports.length} saved`} />
                <DataTable
                  columns={[
                    { key: 'type', header: 'Report', render: (r) => <span className="font-semibold text-neutral-900 dark:text-white">{REPORT_TYPE_LABEL[r.type] || r.type}</span> },
                    { key: 'period', header: 'Period', render: (r) => <span className="whitespace-nowrap">{fmtDateOnly(r.periodStart)} – {fmtDateOnly(r.periodEnd)}</span> },
                    { key: 'summary', header: 'Summary', render: (r) => <span className="line-clamp-2">{r.summary || '—'}</span> },
                    { key: 'createdAt', header: 'Saved', render: (r) => fmtDateOnly(r.createdAt) },
                  ]}
                  rows={reports}
                  rowKey="_id"
                  loading={loading}
                  emptyTitle="No reports saved yet"
                />
              </div>
            </section>
          </div>
        )}

        {tab === 'erp' && (
          <div className="space-y-6">
            {loading ? <SkeletonBlock /> : (
              <>
                <section className={card}>
                  <div className={`${inner} space-y-4`}>
                    <SectionHdr title="Profit & loss" subtitle="Posted revenue and expense accounts" action={margin !== null && <span className="text-xs font-semibold text-neutral-500">{margin.toFixed(1)}% net margin</span>} />
                    <StatGrid items={[
                      { label: 'Revenue', value: formatCurrency(profitLoss.revenue) },
                      { label: 'Expenses', value: formatCurrency(profitLoss.expenses) },
                      { label: 'Net income', value: formatCurrency(profitLoss.netIncome), subtext: Number(profitLoss.netIncome) < 0 ? 'Loss for the period' : undefined },
                    ]} />
                  </div>
                </section>

                <section className={card}>
                  <div className={`${inner} space-y-4`}>
                    <SectionHdr
                      title="Balance sheet"
                      subtitle="Assets = Liabilities + Equity"
                      action={<CheckBadge ok={Math.abs(bsGap) < 0.01} okText="Balanced" badText={`Off by ${formatCurrency(Math.abs(bsGap))}`} />}
                    />
                    <StatGrid items={[
                      { label: 'Assets', value: formatCurrency(balanceSheet.assets) },
                      { label: 'Liabilities', value: formatCurrency(balanceSheet.liabilities) },
                      { label: 'Equity', value: formatCurrency(balanceSheet.equity) },
                    ]} />
                    {Math.abs(bsGap) >= 0.01 && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">A gap usually means the period's net income hasn't been closed into equity yet, or an entry was posted to the wrong account type.</p>
                    )}
                  </div>
                </section>

                <section className={card}>
                  <div className={`${inner} space-y-4`}>
                    <SectionHdr title="Tax" subtitle="From invoices (GST/TDS) and income vs. expenses (ITR)" />
                    <StatGrid items={[
                      { label: 'GST collected', value: formatCurrency(taxSummary.gstCollected), subtext: `On taxable sales of ${formatCurrency(taxSummary.taxableSales)}` },
                      { label: 'TDS withheld', value: formatCurrency(taxSummary.tdsWithheld) },
                      { label: 'Taxable income', value: formatCurrency(itrSummary.taxableIncome), subtext: `${formatCurrency(itrSummary.totalIncome)} income − ${formatCurrency(itrSummary.totalExpenses)} expenses` },
                      { label: 'Estimated income tax', value: formatCurrency(itrSummary.estimatedTax), subtext: 'Indicative at a flat 25% — confirm with your CA' },
                    ]} />
                  </div>
                </section>

                <section className={card}>
                  <div className={`${inner} space-y-4`}>
                    <SectionHdr
                      title="Trial balance"
                      subtitle={`Debit ${formatCurrency(tbDebit)} · Credit ${formatCurrency(tbCredit)}`}
                      action={(
                        <div className="flex items-center gap-3">
                          <CheckBadge ok={tbBalanced} okText="Debits = credits" badText={`Difference ${formatCurrency(Math.abs(tbDebit - tbCredit))}`} />
                          <Button type="button" variant="secondary" size="sm" onClick={exportTrialBalance} disabled={tbRows.length === 0}>
                            <span className="material-symbols-outlined mr-1 text-[16px]">download</span>CSV
                          </Button>
                        </div>
                      )}
                    />
                    <DataTable
                      columns={[
                        { key: 'account', header: 'Account', render: (r) => <span><span className="font-mono text-neutral-500">{r.code}</span> {r.name}</span> },
                        { key: 'type', header: 'Type', render: (r) => <span className="capitalize">{r.type || '—'}</span> },
                        { key: 'debit', header: 'Debit', render: (r) => (Number(r.debit) ? formatCurrency(r.debit) : '—') },
                        { key: 'credit', header: 'Credit', render: (r) => (Number(r.credit) ? formatCurrency(r.credit) : '—') },
                      ]}
                      rows={tbRows}
                      rowKey="accountId"
                      loading={loading}
                      emptyTitle="No posted journal entries yet"
                    />
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Compliance
// ════════════════════════════════════════════════════════════════════════════

const COMPLIANCE_TYPE_LABEL = { gst: 'GST', tds: 'TDS', statutory: 'Statutory', audit: 'Audit', other: 'Other' };
const COMPLIANCE_STAGE_LABEL = { pending: 'Pending', due_soon: 'Due soon', overdue: 'Overdue', filed: 'Filed' };
const COMPLIANCE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_soon', label: 'Due in 7 days' },
  { value: 'pending', label: 'Upcoming' },
  { value: 'filed', label: 'Filed' },
];
const DAY_MS = 24 * 60 * 60 * 1000;

// Derived from the due date so "overdue" can't go stale or be set by hand.
const complianceStage = (row) => {
  if (row.status === 'filed') return 'filed';
  if (!row.dueDate) return 'pending';
  const days = (new Date(row.dueDate).setHours(23, 59, 59, 999) - Date.now()) / DAY_MS;
  if (days < 0) return 'overdue';
  return days <= 7 ? 'due_soon' : 'pending';
};
const COMPLIANCE_ORDER = { overdue: 0, due_soon: 1, pending: 2, filed: 3 };

export const FinanceCompliancePage = () => {
  const { token, user } = useAuth();
  const [statusFilter, setStatusFilter] = useStatusParam();
  const { loading, error, data, refetch } = useAsync(async () => ({ compliance: toList(unwrap(await financeApi.getCompliance(token))) }), [token]);
  const compliance = useMemo(() => data.compliance || [], [data.compliance]);

  const stageCounts = useMemo(() => compliance.reduce((acc, r) => { const s = complianceStage(r); acc[s] = (acc[s] || 0) + 1; return acc; }, {}), [compliance]);
  const visible = useMemo(() => compliance
    .filter((r) => !statusFilter || complianceStage(r) === statusFilter)
    .sort((a, b) => (COMPLIANCE_ORDER[complianceStage(a)] - COMPLIANCE_ORDER[complianceStage(b)]) || (new Date(a.dueDate || 8.64e15) - new Date(b.dueDate || 8.64e15))), [compliance, statusFilter]);

  const emptyForm = { type: 'gst', periodLabel: '', dueDate: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [filing, setFiling] = useState(null);
  const [savingFiling, setSavingFiling] = useState(false);
  const [filingError, setFilingError] = useState('');
  const closeFiling = useCallback(() => { setFiling(null); setFilingError(''); }, [setFiling, setFilingError]);

  const duplicate = form.periodLabel.trim() && compliance.some((r) => r.type === form.type && String(r.periodLabel || '').trim().toLowerCase() === form.periodLabel.trim().toLowerCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duplicate) return;
    setSubmitting(true);
    setFormError('');
    try {
      // Always starts pending; filing is a separate step that captures the reference.
      await financeApi.createCompliance({ ...form, periodLabel: form.periodLabel.trim(), status: 'pending' }, token);
      setForm(emptyForm);
      setNotice(`${COMPLIANCE_TYPE_LABEL[form.type]} ${form.periodLabel.trim()} added to the tracker.`);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save compliance record');
    } finally {
      setSubmitting(false);
    }
  };

  const markFiled = async () => {
    if (!filing.reference.trim()) { setFilingError('Enter the acknowledgement / reference number.'); return; }
    setSavingFiling(true);
    setFilingError('');
    try {
      const note = `Filed ${new Date(filing.filedOn).toLocaleDateString('en-IN')}`;
      await financeApi.updateCompliance(filing.row._id, {
        status: 'filed',
        reference: filing.reference.trim(),
        notes: [filing.row.notes, note].filter(Boolean).join('\n'),
      }, token);
      setNotice(`${COMPLIANCE_TYPE_LABEL[filing.row.type] || filing.row.type} ${filing.row.periodLabel || ''} marked as filed.`);
      setFiling(null);
      refetch();
    } catch (err) {
      setFilingError(err.message || 'Failed to update filing');
    } finally {
      setSavingFiling(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Compliance & Tax" subtitle="Track statutory filings: due → filed" icon="gavel" user={user} crumbs={['Finance', 'Compliance']} />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        <StatGrid
          items={[
            { label: 'Overdue', value: stageCounts.overdue || 0, subtext: 'Past due, not filed' },
            { label: 'Due in 7 days', value: stageCounts.due_soon || 0, subtext: 'File these next' },
            { label: 'Upcoming', value: stageCounts.pending || 0 },
            { label: 'Filed', value: stageCounts.filed || 0 },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1.7fr]">
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Add filing obligation" subtitle="Tracked until marked filed" />
              <form onSubmit={handleSubmit} className="space-y-3">
                <Select
                  label="Type"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  options={Object.entries(COMPLIANCE_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
                />
                <Input
                  label="Period"
                  placeholder="e.g. GSTR-3B Sep 2026, Q2 FY2026-27"
                  value={form.periodLabel}
                  onChange={(e) => setForm((p) => ({ ...p, periodLabel: e.target.value }))}
                  error={duplicate ? 'This filing is already being tracked.' : undefined}
                  required
                />
                <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} required />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes</span>
                  <textarea className={input} rows={2} placeholder="Optional — who files, portal used…" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
                {formError && <p className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={submitting || Boolean(duplicate)} fullWidth>{submitting ? 'Saving…' : 'Add to tracker'}</Button>
              </form>
            </div>
          </section>

          <section className={card}>
            <div className={`${inner} space-y-4`}>
              <SectionHdr title="Filing tracker" subtitle="Most urgent first" />
              <StatusFilterBar
                value={statusFilter}
                onChange={setStatusFilter}
                options={COMPLIANCE_FILTERS.map((f) => ({ ...f, count: f.value ? stageCounts[f.value] || 0 : compliance.length }))}
              />
              <DataTable
                columns={[
                  {
                    key: 'type',
                    header: 'Filing',
                    render: (r) => (
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{COMPLIANCE_TYPE_LABEL[r.type] || r.type}</p>
                        <p className="text-xs text-neutral-500">{r.periodLabel || '—'}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'dueDate',
                    header: 'Due',
                    render: (r) => {
                      const stage = complianceStage(r);
                      const days = r.dueDate ? Math.ceil((new Date(r.dueDate).setHours(23, 59, 59, 999) - Date.now()) / DAY_MS) : null;
                      return (
                        <div>
                          <p className={stage === 'overdue' ? 'font-semibold text-rose-600 dark:text-rose-300' : ''}>{fmtDateOnly(r.dueDate)}</p>
                          {stage !== 'filed' && days !== null && (
                            <p className="text-xs text-neutral-500">{days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'Due today' : `in ${days}d`}</p>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => {
                      const stage = complianceStage(r);
                      return (
                        <div>
                          <Pill value={stage === 'due_soon' ? 'at-risk' : stage} label={COMPLIANCE_STAGE_LABEL[stage]} />
                          {stage === 'filed' && r.reference && <p className="mt-1 text-xs text-neutral-500">Ref {r.reference}</p>}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    header: 'Next step',
                    render: (r) => r.status !== 'filed' && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setFiling({ row: r, reference: r.reference || '', filedOn: todayIso() }); }} className="whitespace-nowrap text-xs font-semibold text-primary hover:underline">
                        Mark filed
                      </button>
                    ),
                  },
                ]}
                rows={visible}
                rowKey="_id"
                loading={loading}
                emptyTitle={statusFilter ? `No ${(COMPLIANCE_STAGE_LABEL[statusFilter] || statusFilter).toLowerCase()} filings` : 'No filings tracked yet'}
              />
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={Boolean(filing)}
        onClose={closeFiling}
        title={filing ? `Mark filed · ${COMPLIANCE_TYPE_LABEL[filing.row.type] || filing.row.type} ${filing.row.periodLabel || ''}` : ''}
        description={filing ? `Due ${fmtDateOnly(filing.row.dueDate)}` : ''}
        className="sm:max-w-lg"
        footer={filing && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeFiling}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" disabled={savingFiling} onClick={markFiled}>{savingFiling ? 'Saving…' : 'Mark filed'}</Button>
          </div>
        )}
      >
        {filing && (
          <div className="space-y-3">
            <Input label="Acknowledgement / reference no." placeholder="e.g. ARN, challan or acknowledgement number" value={filing.reference} onChange={(e) => setFiling((p) => ({ ...p, reference: e.target.value }))} />
            <Input label="Filed on" type="date" value={filing.filedOn} max={todayIso()} onChange={(e) => setFiling((p) => ({ ...p, filedOn: e.target.value }))} />
            {filingError && <p className="text-sm text-rose-600 dark:text-rose-300">{filingError}</p>}
          </div>
        )}
      </Modal>
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
const PAYMENT_TERMS_OPTIONS = ['Due on receipt', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90'].map((t) => ({ value: t, label: t }));

export const FinanceDirectoryPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'vendors';

  const { loading, error, data, refetch } = useAsync(async () => {
    const [vendorsRes, clientsRes, invoicesRes] = await Promise.all([financeApi.getVendors(token), financeApi.getClients(token), financeApi.getInvoices(token)]);
    return { vendors: toList(unwrap(vendorsRes)), clients: toList(unwrap(clientsRes)), invoices: toList(unwrap(invoicesRes)) };
  }, [token]);
  const normName = (v) => String(v || '').trim().toLowerCase();
  const [search, setSearch] = useState('');
  const matches = (row) => !search.trim() || `${row.name} ${row.contactEmail || ''}`.toLowerCase().includes(search.trim().toLowerCase());

  // Receivables per client come from live invoices (matched by name), not a typed-in number.
  const receivables = useMemo(() => {
    const map = {};
    (data.invoices || []).filter(isPayableInvoice).forEach((inv) => {
      const key = normName(inv.clientName);
      if (!map[key]) map[key] = { amount: 0, count: 0, overdue: 0 };
      map[key].amount += invoiceBalance(inv);
      map[key].count += 1;
      if (invoiceStage(inv) === 'overdue') map[key].overdue += 1;
    });
    return map;
  }, [data.invoices]);
  const vendors = (data.vendors || []).filter(matches);
  const clients = (data.clients || []).filter(matches);
  const totalReceivable = Object.values(receivables).reduce((sum, r) => sum + r.amount, 0);

  const emptyPartyForm = { name: '', contactEmail: '', contactPhone: '', paymentTerms: 'Net 30', balance: '' };
  const [vendorForm, setVendorForm] = useState(emptyPartyForm);
  const [clientForm, setClientForm] = useState(emptyPartyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const vendorDuplicate = normName(vendorForm.name) && (data.vendors || []).some((v) => normName(v.name) === normName(vendorForm.name));
  const clientDuplicate = normName(clientForm.name) && (data.clients || []).some((c) => normName(c.name) === normName(clientForm.name));

  const saveVendor = async (e) => {
    e.preventDefault();
    if (vendorDuplicate) return;
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createVendor({ ...vendorForm, name: vendorForm.name.trim(), balance: Number(vendorForm.balance) || 0 }, token);
      setVendorForm(emptyPartyForm);
      setNotice(`Vendor ${vendorForm.name.trim()} added.`);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const saveClient = async (e) => {
    e.preventDefault();
    if (clientDuplicate) return;
    setSubmitting(true);
    setFormError('');
    try {
      await financeApi.createClient({ ...clientForm, name: clientForm.name.trim(), balance: Number(clientForm.balance) || 0 }, token);
      setClientForm(emptyPartyForm);
      setNotice(`Client ${clientForm.name.trim()} added — invoices raised in this name will roll up here.`);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const searchBox = (
    <div className="w-full sm:w-56">
      <Input placeholder={`Search ${tab}`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={`Search ${tab}`} />
    </div>
  );

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Vendors & Clients" subtitle="Who you pay and who pays you" icon="contacts" user={user} crumbs={['Finance', 'Directory']} />
        <TabBar
          tabs={DIRECTORY_TABS.map((t) => ({ ...t, label: `${t.label} (${(t.id === 'vendors' ? data.vendors : data.clients)?.length || 0})` }))}
          active={tab}
          onChange={(id) => { setSearch(''); setFormError(''); setSearchParams({ tab: id }); }}
        />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {formError && <ErrorState title="Couldn't save" description={formError} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        {tab === 'vendors' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Add vendor" subtitle="Suppliers and service providers you pay" />
                <form onSubmit={saveVendor} className="space-y-3">
                  <Input label="Vendor name" placeholder="e.g. Acme Supplies" value={vendorForm.name} onChange={(e) => setVendorForm((p) => ({ ...p, name: e.target.value }))} error={vendorDuplicate ? 'A vendor with this name already exists.' : undefined} required />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Contact email" type="email" placeholder="contact@vendor.com" value={vendorForm.contactEmail} onChange={(e) => setVendorForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                    <Input label="Phone" type="tel" placeholder="+91…" value={vendorForm.contactPhone} onChange={(e) => setVendorForm((p) => ({ ...p, contactPhone: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select label="Payment terms" value={vendorForm.paymentTerms} onChange={(e) => setVendorForm((p) => ({ ...p, paymentTerms: e.target.value }))} options={PAYMENT_TERMS_OPTIONS} />
                    <Input label="Opening payable" type="number" min="0" value={vendorForm.balance} onChange={(e) => setVendorForm((p) => ({ ...p, balance: e.target.value }))} />
                  </div>
                  <Button type="submit" variant="primary" size="sm" disabled={submitting || Boolean(vendorDuplicate)} fullWidth>{submitting ? 'Saving…' : 'Add vendor'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Vendors" subtitle={`${vendors.length} shown`} action={searchBox} />
                <DataTable
                  columns={[
                    {
                      key: 'name',
                      header: 'Vendor',
                      render: (r) => (
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">{r.name}</p>
                          <p className="text-xs text-neutral-500">{[r.contactEmail, r.contactPhone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                        </div>
                      ),
                    },
                    { key: 'paymentTerms', header: 'Terms', render: (r) => r.paymentTerms || '—' },
                    { key: 'status', header: 'Status', render: (r) => <Pill value={r.status || 'active'} label={humanizeStatus(r.status || 'active')} /> },
                    { key: 'balance', header: 'Payable', render: (r) => formatCurrency(r.balance) },
                  ]}
                  rows={vendors}
                  rowKey="_id"
                  loading={loading}
                  emptyTitle={search ? 'No vendors match your search' : 'No vendors yet'}
                />
              </div>
            </section>
          </div>
        )}

        {tab === 'clients' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1.6fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Add client" subtitle="Customers you invoice" />
                <form onSubmit={saveClient} className="space-y-3">
                  <Input
                    label="Client name"
                    placeholder="e.g. Nimbus Retail"
                    value={clientForm.name}
                    onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))}
                    error={clientDuplicate ? 'A client with this name already exists.' : undefined}
                    helperText={clientDuplicate ? undefined : 'Use the exact name you put on invoices so balances roll up.'}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Billing email" type="email" placeholder="billing@client.com" value={clientForm.contactEmail} onChange={(e) => setClientForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                    <Input label="Phone" type="tel" placeholder="+91…" value={clientForm.contactPhone} onChange={(e) => setClientForm((p) => ({ ...p, contactPhone: e.target.value }))} />
                  </div>
                  <Select label="Payment terms" value={clientForm.paymentTerms} onChange={(e) => setClientForm((p) => ({ ...p, paymentTerms: e.target.value }))} options={PAYMENT_TERMS_OPTIONS} />
                  <Button type="submit" variant="primary" size="sm" disabled={submitting || Boolean(clientDuplicate)} fullWidth>{submitting ? 'Saving…' : 'Add client'}</Button>
                </form>
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Clients" subtitle={`${clients.length} shown · ${formatCurrency(totalReceivable)} receivable`} action={searchBox} />
                <DataTable
                  columns={[
                    {
                      key: 'name',
                      header: 'Client',
                      render: (r) => (
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">{r.name}</p>
                          <p className="text-xs text-neutral-500">{[r.contactEmail, r.contactPhone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                        </div>
                      ),
                    },
                    { key: 'paymentTerms', header: 'Terms', render: (r) => r.paymentTerms || '—' },
                    {
                      key: 'openInvoices',
                      header: 'Open invoices',
                      render: (r) => {
                        const rec = receivables[normName(r.name)];
                        if (!rec) return <span className="text-neutral-400">None</span>;
                        return <span>{rec.count}{rec.overdue > 0 && <span className="ml-1 text-xs font-semibold text-rose-600 dark:text-rose-300">({rec.overdue} overdue)</span>}</span>;
                      },
                    },
                    {
                      key: 'balance',
                      header: 'Receivable',
                      render: (r) => {
                        const amount = (receivables[normName(r.name)]?.amount || 0) + Number(r.balance || 0);
                        return <span className="font-semibold">{formatCurrency(amount)}</span>;
                      },
                    },
                  ]}
                  rows={clients}
                  rowKey="_id"
                  loading={loading}
                  emptyTitle={search ? 'No clients match your search' : 'No clients yet'}
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
  const [notice, setNotice] = useState('');
  const [actingRequest, setActingRequest] = useState(null);
  const closeAction = useCallback(() => setActingRequest(null), [setActingRequest]);
  const commentRequired = actingRequest && EXPENSE_ACTIONS_NEEDING_COMMENT.includes(actingRequest.action.id);

  // Typing updates the box immediately; the request refetch waits for a pause.
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setFilters((p) => (p.search === searchInput ? p : { ...p, search: searchInput })), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { loading, error, data, refetch } = useAsync(async () => {
    const [requestsRes, transactionsRes, auditRes, catalogRes] = await Promise.all([
      financeApi.getRequests(token, { page: 1, limit: 25, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) }),
      financeApi.getTransactions(token, { page: 1, limit: 25 }),
      financeApi.getAuditLogs(token, { page: 1, limit: 25 }),
      financeApi.getDepartmentCatalog(token),
    ]);
    return {
      requests: toList(unwrap(requestsRes)),
      transactions: toList(unwrap(transactionsRes)),
      auditLogs: toList(unwrap(auditRes)),
      departmentCatalog: toList(unwrap(catalogRes)),
    };
  }, [token, filters.search, filters.department, filters.status, filters.requestType, filters.priority]);
  const requests = data.requests || [];
  const transactions = data.transactions || [];
  const auditLogs = data.auditLogs || [];
  const departmentCatalog = data.departmentCatalog || [];
  // Same rules as the Expenses page, so both screens offer identical next steps.
  const availableRequestActions = (row) => financeExpenseRequestActions(row, isFinanceHead);

  const [runningAction, setRunningAction] = useState(false);

  const runRequestAction = async () => {
    if (!actingRequest) return;
    if (commentRequired && !actingRequest.comment.trim()) return;
    setActionError('');
    setRunningAction(true);
    try {
      await financeApi.updateRequestAction(actingRequest.row.id, actingRequest.action.id, { comment: actingRequest.comment.trim() }, token);
      setNotice(`${actingRequest.row.requestId}: ${actingRequest.action.label.toLowerCase()} done.`);
      setActingRequest(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to update finance request');
    } finally {
      setRunningAction(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Activity" subtitle="Transaction ledger and audit trail" icon="history" user={user} crumbs={['Finance', 'Activity']} />
        <TabBar tabs={ACTIVITY_TABS} active={tab} onChange={(id) => setSearchParams({ tab: id })} />
        {(error || actionError) && <ErrorState description={error || actionError} onRetry={error ? refetch : undefined} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        {tab === 'requests' && (
          <section className={card}>
            <div className={inner}>
              <SectionHdr title="Finance Request Center" subtitle="Department generated financial requests with lifecycle tracking" action={<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{requests.length} rows</p>} />
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                <div className="md:col-span-2">
                  <Input label="Search" placeholder="Request ID, employee, department..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                </div>
                <Select
                  label="Department"
                  value={filters.department}
                  onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}
                  options={[{ value: '', label: 'All Departments' }, ...departmentCatalog.filter((d) => !d.isSystem).map((department) => ({ value: department._id, label: department.name }))]}
                />
                <Select
                  label="Status"
                  value={filters.status}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                  options={[{ value: '', label: 'All Status' }, ...['submitted', 'under_review', 'needs_information', 'verified', 'pending_approval', 'approved', 'rejected', 'processing', 'completed'].map((status) => ({ value: status, label: humanizeStatus(status) }))]}
                />
                <Select
                  label="Priority"
                  value={filters.priority}
                  onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}
                  options={[{ value: '', label: 'All Priority' }, ...['Normal', 'High', 'Critical'].map((priority) => ({ value: priority, label: priority }))]}
                />
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
                          <td className="px-3 py-3"><Pill value={row.status} label={humanizeStatus(row.status)} /></td>
                          <td className="px-3 py-3">{row.assignedEmployee || 'Unassigned'}</td>
                          <td className="py-3 pl-3 text-right font-black">{formatCurrency(row.amount)}</td>
                          <td className="py-3 pl-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              {availableRequestActions(row).map((action) => (
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
        <Modal
          open={Boolean(actingRequest)}
          onClose={closeAction}
          title={actingRequest ? `${actingRequest.action.label} · ${actingRequest.row.requestId}` : ''}
          description={actingRequest ? `${actingRequest.row.department} · ${formatCurrency(actingRequest.row.amount)} · currently ${humanizeStatus(actingRequest.row.status).toLowerCase()}` : ''}
          footer={
            actingRequest && (
              <div className="flex justify-between gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/finance/dashboard/project-overview?department=${encodeURIComponent(actingRequest.row.departmentId || actingRequest.row.department)}&tab=requests`)}>
                  Department Profile
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={closeAction}>Cancel</Button>
                  <Button type="button" variant={actingRequest.action.variant} size="sm" disabled={runningAction || (commentRequired && !actingRequest.comment.trim())} onClick={runRequestAction}>
                    {runningAction ? 'Saving…' : actingRequest.action.label}
                  </Button>
                </div>
              </div>
            )
          }
        >
          {actingRequest && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">
                {actingRequest.action.id === 'request_information' ? 'What information is missing?' : actingRequest.action.id === 'reject' ? 'Reason for rejection' : 'Comment for audit trail (optional)'}
              </span>
              <textarea
                className={`${input} min-h-[90px]`}
                placeholder={commentRequired ? 'Required — shared with the requester' : 'Add a comment'}
                value={actingRequest.comment}
                onChange={(event) => setActingRequest((prev) => ({ ...prev, comment: event.target.value }))}
              />
            </label>
          )}
        </Modal>
      </div>
    </main>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Approvals
// ════════════════════════════════════════════════════════════════════════════

const APPROVAL_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];
const APPROVAL_ENTITY_LINK = {
  expense: '/finance/dashboard/expenses',
  payment: '/finance/dashboard/payments',
  payroll: '/finance/dashboard/payroll',
  budget: '/finance/dashboard/budgets',
  invoice: '/finance/dashboard/invoices',
};
const STEP_DOT = { approved: 'bg-emerald-500', rejected: 'bg-rose-500', pending: 'bg-amber-400' };

export const FinanceApprovalsPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isFinanceHead = ['finance_manager', 'admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());
  const myId = String(user?._id || user?.id || '');
  const [statusParam, setStatusParam] = useStatusParam();
  // Opens on the queue that needs deciding; "all" is explicit.
  const statusFilter = statusParam || 'pending';

  const { loading, error, data, refetch } = useAsync(async () => {
    const countOf = async (status) => Number(unwrap(await financeApi.getApprovals(token, { status, page: 1, limit: 1 }))?.pagination?.total || 0);
    const [listRes, pending, approved, rejected] = await Promise.all([
      financeApi.getApprovals(token, { page: 1, limit: 50, ...(statusFilter === 'all' ? {} : { status: statusFilter }) }),
      countOf('pending'),
      countOf('approved'),
      countOf('rejected'),
    ]);
    const payload = unwrap(listRes);
    return { approvals: toList(payload), total: payload?.pagination?.total, counts: { pending, approved, rejected, all: pending + approved + rejected } };
  }, [token, statusFilter]);
  const approvals = data.approvals || [];
  const counts = data.counts || {};

  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const closeConfirm = useCallback(() => setConfirmAction(null), [setConfirmAction]);
  const reasonMissing = confirmAction?.decision === 'reject' && !confirmAction.remarks.trim();

  const decide = async () => {
    if (!confirmAction || reasonMissing) return;
    setDeciding(true);
    setActionError('');
    try {
      await financeApi.decideApproval(confirmAction.row._id, { decision: confirmAction.decision, remarks: confirmAction.remarks.trim() }, token);
      setNotice(`${humanizeStatus(confirmAction.row.entityType)} request ${confirmAction.decision === 'approve' ? 'approved' : 'rejected'}.`);
      setConfirmAction(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to record decision');
    } finally {
      setDeciding(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Approval Center" subtitle="Budget, payment, payroll and expense approvals" icon="approval" user={user} crumbs={['Finance', 'Approvals']} />
        {error && <ErrorState description={error} onRetry={refetch} />}
        {actionError && <ErrorState title="Action failed" description={actionError} />}
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

        <section className={card}>
          <div className={`${inner} space-y-4`}>
            <SectionHdr
              title={statusFilter === 'pending' ? 'Waiting for a decision' : `${APPROVAL_FILTERS.find((f) => f.value === statusFilter)?.label || 'All'} requests`}
              subtitle={data.total > approvals.length ? `Showing latest ${approvals.length} of ${data.total}` : `${approvals.length} request${approvals.length === 1 ? '' : 's'}`}
            />
            <StatusFilterBar
              value={statusFilter}
              onChange={(value) => setStatusParam(value === 'pending' ? '' : value)}
              options={APPROVAL_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
            />
            {!isFinanceHead && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                You can follow request status here. Approving or rejecting needs Finance Head permission.
              </div>
            )}
            {loading ? <SkeletonBlock /> : approvals.length === 0 ? (
              <EmptyState icon="task_alt" title={statusFilter === 'pending' ? 'All caught up' : 'Nothing here'} description={statusFilter === 'pending' ? 'No requests are waiting for a decision.' : undefined} />
            ) : (
              <div className="space-y-3">
                {approvals.map((row) => {
                  const ownRequest = myId && String(row.requestedBy?._id || row.requestedBy || '') === myId;
                  const canDecide = isFinanceHead && row.status === 'pending' && !ownRequest;
                  const link = row.module === 'finance' ? APPROVAL_ENTITY_LINK[String(row.entityType || '').toLowerCase()] : null;
                  const steps = [...(row.steps || [])].sort((a, b) => (a.level || 0) - (b.level || 0));
                  return (
                    <div key={row._id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{humanizeStatus(row.entityType)} approval</p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {humanizeStatus(row.module)} · ref …{String(row.entityId || '').slice(-6)} · requested {fmtDate(row.createdAt)}
                            {link && <> · <button type="button" onClick={() => navigate(link)} className="font-semibold text-primary hover:underline">Open {row.entityType}s</button></>}
                          </p>
                        </div>
                        <Pill value={row.status} label={humanizeStatus(row.status)} />
                      </div>

                      {steps.length > 0 && (
                        <ol className="mt-3 space-y-1.5 border-l-2 border-neutral-100 pl-3 dark:border-neutral-800">
                          {steps.map((step) => (
                            <li key={`${step.level}-${step.role}`} className="text-xs">
                              <span className="flex items-center gap-2">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${STEP_DOT[step.status] || STEP_DOT.pending}`} />
                                <span className="font-semibold text-neutral-700 dark:text-neutral-200">Level {step.level} · {humanizeStatus(step.role)}</span>
                                <span className="text-neutral-500">{step.status === 'pending' ? (step.optional ? 'optional' : 'waiting') : `${step.status} ${fmtDate(step.decidedAt)}`}</span>
                              </span>
                              {step.remarks && <span className="ml-4 block text-neutral-500 dark:text-neutral-400">“{step.remarks}”</span>}
                            </li>
                          ))}
                        </ol>
                      )}

                      {canDecide && (
                        <div className="mt-3 flex gap-2">
                          <Button variant="primary" size="sm" onClick={() => setConfirmAction({ decision: 'approve', row, remarks: '' })}>Approve</Button>
                          <Button variant="danger" size="sm" onClick={() => setConfirmAction({ decision: 'reject', row, remarks: '' })}>Reject</Button>
                        </div>
                      )}
                      {isFinanceHead && row.status === 'pending' && ownRequest && (
                        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">You raised this request, so another approver has to decide it.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(confirmAction)}
        onClose={closeConfirm}
        title={confirmAction ? `${confirmAction.decision === 'approve' ? 'Approve' : 'Reject'} ${humanizeStatus(confirmAction.row.entityType).toLowerCase()} request` : ''}
        description="Updates the workflow and writes a finance audit event."
        className="sm:max-w-lg"
        footer={confirmAction && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeConfirm}>Cancel</Button>
            <Button type="button" variant={confirmAction.decision === 'approve' ? 'primary' : 'danger'} size="sm" disabled={deciding || reasonMissing} onClick={decide}>
              {deciding ? 'Saving…' : confirmAction.decision === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        )}
      >
        {confirmAction && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">
              {confirmAction.decision === 'reject' ? 'Reason for rejection' : 'Comment (optional)'}
            </span>
            <textarea
              className={`${input} min-h-[90px]`}
              placeholder={confirmAction.decision === 'reject' ? 'Required — shared with the requester' : 'Visible in the approval trail'}
              value={confirmAction.remarks}
              onChange={(event) => setConfirmAction((prev) => ({ ...prev, remarks: event.target.value }))}
            />
          </label>
        )}
      </Modal>
    </main>
  );
};
