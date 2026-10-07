// Finance Control Tower, Disputes, Refunds and Non-Compliance.
//
// Kept in its own module rather than appended to FinanceWorkspacePages.jsx, which is
// already ~5k lines; these four pages share their own helpers and nothing else needs them.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import SectionCard from '../ui/SectionCard';
import StatusBadge from '../common/StatusBadge';
import { financeApi } from '../../services/finance';
import { useAuth } from '../../context/AuthContext';

const card = 'rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950';
const inner = 'p-5 lg:p-6';

const FINANCE_HEAD_ROLES = ['finance_manager', 'admin', 'super_admin', 'superadmin'];
const isHeadRole = (role) => FINANCE_HEAD_ROLES.includes(String(role || '').toLowerCase());

const money = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v) || 0);
// Right-aligned, tabular figures so a column of amounts can be compared vertically; the
// shared DataTable applies no per-column alignment, so the cell carries it.
const MoneyCell = ({ value }) => (
  <span className="block text-right font-semibold tabular-nums">{money(value)}</span>
);
const moneyHeader = (label) => <span className="block text-right">{label}</span>;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const unwrap = (res) => (res && typeof res === 'object' && 'data' in res ? res.data : res);
const toList = (v) => (Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : []);

// Same contract as the workspace file's hook: `loading` is derived from whether the stored
// result belongs to the current request, so stale data stays visible while refetching.
const useAsync = (loader, deps = []) => {
  const [state, setState] = useState({ key: null, error: '', data: {} });
  const [reloadKey, setReloadKey] = useState(0);
  const key = JSON.stringify([...deps.map((d) => (typeof d === 'object' ? String(d) : d)), reloadKey]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await loader();
        if (alive) setState({ key, error: '', data: raw });
      } catch (err) {
        if (alive) setState((prev) => ({ key, error: err.message || 'Failed to load data', data: prev.data || {} }));
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);
  return { loading: state.key !== key, error: state.key === key ? state.error : '', data: state.data, refetch };
};

const SkeletonBlock = () => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />)}
  </div>
);

const Notice = ({ children, onDismiss }) => (
  <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
    <span>{children}</span>
    {onDismiss && <button type="button" onClick={onDismiss} className="text-xs font-semibold underline">Dismiss</button>}
  </div>
);

// ─── Control Tower ───────────────────────────────────────────────────────────

// Traffic lights never rely on colour alone: each carries an icon and the status word, so
// the dashboard is still readable without colour vision.
const LIGHT = {
  green: { ring: 'ring-emerald-200 dark:ring-emerald-800', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', icon: 'check_circle', label: 'OK' },
  amber: { ring: 'ring-amber-200 dark:ring-amber-800', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', icon: 'warning', label: 'Watch' },
  red: { ring: 'ring-rose-200 dark:ring-rose-800', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', icon: 'error', label: 'Action needed' },
  unknown: { ring: 'ring-neutral-200 dark:ring-neutral-700', dot: 'bg-neutral-400', text: 'text-neutral-600 dark:text-neutral-400', icon: 'help', label: 'Unavailable' },
};

const TowerCard = ({ card: c, onOpen }) => {
  const light = LIGHT[c.status] || LIGHT.unknown;
  return (
    <button
      type="button"
      onClick={() => onOpen(c)}
      className={`${card} w-full p-5 text-left ring-1 ${light.ring} transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
      aria-label={`${c.label}: ${light.label}. ${c.headline}. Open details.`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{c.label}</p>
        <span className={`flex items-center gap-1 text-xs font-bold ${light.text}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${light.dot}`} aria-hidden="true" />
          {light.label}
        </span>
      </div>
      <p className="mt-3 text-base font-bold text-neutral-900 dark:text-white">{c.headline}</p>
      {c.error && <p className="mt-1 text-xs text-neutral-500">{c.error}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        {Object.entries(c.metrics || {}).map(([k, v]) => (
          <span key={k}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase())}: <strong className="text-neutral-700 dark:text-neutral-200">{v}</strong></span>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400">View details →</p>
    </button>
  );
};

// Columns differ per card because the drill-downs return different collections.
const DRILL_COLUMNS = {
  budget_health: [
    { key: 'department', header: 'Department', render: (r) => r.department || '—' },
    { key: 'fiscalYear', header: 'Year' },
    { key: 'scope', header: 'Scope' },
    { key: 'allocated', header: moneyHeader('Allocated'), render: (r) => <MoneyCell value={r.allocated} /> },
    { key: 'breachedAt', header: 'Breached', render: (r) => (r.breachedAt ? fmtDate(r.breachedAt) : '—') },
  ],
  payment_delays: [
    { key: 'invoiceNumber', header: 'Invoice', render: (r) => <span className="font-semibold">{r.invoiceNumber}</span> },
    { key: 'clientName', header: 'Customer' },
    { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) },
    { key: 'balanceDue', header: moneyHeader('Outstanding'), render: (r) => <MoneyCell value={r.balanceDue} /> },
  ],
  overdue_invoices: [
    { key: 'invoiceNumber', header: 'Invoice', render: (r) => <span className="font-semibold">{r.invoiceNumber}</span> },
    { key: 'clientName', header: 'Customer' },
    { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) },
    { key: 'balanceDue', header: moneyHeader('Outstanding'), render: (r) => <MoneyCell value={r.balanceDue} /> },
  ],
  open_disputes: [
    { key: 'disputeNumber', header: 'Dispute', render: (r) => <span className="font-semibold">{r.disputeNumber}</span> },
    { key: 'subjectType', header: 'Against' },
    { key: 'amountDisputed', header: moneyHeader('Amount'), render: (r) => <MoneyCell value={r.amountDisputed} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: 'Raised', render: (r) => fmtDate(r.createdAt) },
  ],
  non_compliance: [
    { key: 'ticketNumber', header: 'Ticket', render: (r) => <span className="font-semibold">{r.ticketNumber}</span> },
    { key: 'kind', header: 'Kind', render: (r) => String(r.kind || '').replace(/_/g, ' ') },
    { key: 'severity', header: 'Severity', render: (r) => <StatusBadge status={r.severity} /> },
    { key: 'financialImpact', header: moneyHeader('Impact'), render: (r) => <MoneyCell value={r.financialImpact} /> },
    { key: 'createdAt', header: 'Raised', render: (r) => fmtDate(r.createdAt) },
  ],
};

export const FinanceControlTowerPage = () => {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(null);
  const [pack, setPack] = useState(null);

  const { loading, error, data, refetch } = useAsync(
    async () => unwrap(await financeApi.getControlTower(token)),
    [token]
  );
  const cards = data?.cards || [];

  const drill = useAsync(
    async () => (open ? unwrap(await financeApi.getControlTowerCard(token, open.key, { limit: 50 })) : null),
    [token, open?.key]
  );

  const showPack = async () => {
    try { setPack(unwrap(await financeApi.getSummaryPack(token))); }
    catch (err) { setPack({ error: err.message }); }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortalHeader
          title="Finance Control Tower"
          subtitle="Budget, payment, dispute and compliance status at a glance"
          icon="inventory"
          user={user}
          crumbs={['Finance', 'Control Tower']}
        />
        {error && <ErrorState description={error} onRetry={refetch} />}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {data?.generatedAt ? `As at ${new Date(data.generatedAt).toLocaleString('en-IN')}` : ''}
            {data?.pendingJustifications ? ` · ${data.pendingJustifications} unanswered cost question(s)` : ''}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={refetch}>Refresh</Button>
            <Button type="button" size="sm" variant="secondary" onClick={showPack}>Summary pack</Button>
          </div>
        </div>

        {loading && !cards.length ? <SkeletonBlock /> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => <TowerCard key={c.key} card={c} onOpen={setOpen} />)}
          </div>
        )}

        <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open ? open.label : ''} description={open?.headline}>
          {drill.loading ? <SkeletonBlock /> : drill.error ? <ErrorState description={drill.error} onRetry={drill.refetch} /> : (
            <div className="space-y-3">
              <DataTable
                rows={toList(drill.data?.items)}
                rowKey="_id"
                columns={DRILL_COLUMNS[open?.key] || [{ key: '_id', header: 'Record' }]}
                emptyTitle="Nothing to show"
                emptyDescription="This indicator has no underlying records right now."
              />
              <p className="text-xs text-neutral-500">
                {drill.data?.pagination ? `${drill.data.pagination.total} record(s) — the same set this indicator counted.` : ''}
              </p>
            </div>
          )}
        </Modal>

        <Modal open={Boolean(pack)} onClose={() => setPack(null)} title="Summary pack" description="For CEO / Manager review">
          {pack?.error ? <ErrorState description={pack.error} /> : (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-neutral-900 dark:text-white">{pack?.narrative}</p>
              {(pack?.requiresAttention || []).length > 0 && (
                <ul className="list-disc space-y-1 pl-5">
                  {pack.requiresAttention.map((a) => <li key={a.key}><strong>{a.label}</strong>: {a.headline}</li>)}
                </ul>
              )}
              {(pack?.openJustifications || []).length > 0 && (
                <>
                  <p className="pt-2 font-semibold">Open cost questions</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {pack.openJustifications.map((j) => <li key={j.id}>{j.question} <span className="text-neutral-500">({j.responses} response(s))</span></li>)}
                  </ul>
                </>
              )}
              {(pack?.attachmentManifest || []).length > 0 && (
                <p className="text-xs text-neutral-500">{pack.attachmentManifest.length} supporting attachment(s) referenced.</p>
              )}
            </div>
          )}
        </Modal>
      </div>
    </main>
  );
};

// ─── Disputes ────────────────────────────────────────────────────────────────

const DISPUTE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
];
const RESOLUTIONS = [
  { value: 'released', label: 'Release — nothing owed changes' },
  { value: 'written_off', label: 'Write off — give up the receivable' },
  { value: 'converted_to_debit_note', label: 'Convert to a debit note' },
];
const emptyDispute = { subjectType: 'invoice', subjectId: '', raisedAgainst: 'client', amountDisputed: '', reason: '', departmentId: '', projectId: '', documentUrl: '', documentLabel: '' };

export const FinanceDisputesPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyDispute);
  const [saving, setSaving] = useState(false);

  const { loading, error: loadError, data, refetch } = useAsync(
    async () => unwrap(await financeApi.getDisputes(token, statusFilter ? { status: statusFilter } : {})),
    [token, statusFilter]
  );
  const items = toList(data?.items);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.documentUrl.trim()) { setError('A supporting document is required to raise a dispute.'); return; }
    setSaving(true);
    try {
      await financeApi.createDispute({
        subjectType: form.subjectType,
        subjectId: form.subjectId.trim(),
        raisedAgainst: form.raisedAgainst,
        amountDisputed: Number(form.amountDisputed),
        reason: form.reason.trim(),
        departmentId: form.departmentId.trim(),
        projectId: form.projectId.trim() || undefined,
        documents: [{ url: form.documentUrl.trim(), label: form.documentLabel.trim() }],
      }, token);
      setCreating(false);
      setForm(emptyDispute);
      setNotice('Dispute raised. Payment on the disputed record is now frozen until it is resolved.');
      refetch();
    } catch (err) { setError(err.message || 'Could not raise the dispute'); }
    finally { setSaving(false); }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortalHeader
          title="Disputes"
          subtitle="Contested invoices and bills. Raising a dispute freezes payment until it is resolved."
          icon="gavel"
          user={user}
          crumbs={['Finance', 'Disputes']}
        />
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}
        {loadError && <ErrorState description={loadError} onRetry={refetch} />}

        <div className="flex flex-wrap items-end justify-between gap-2">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
            options={DISPUTE_FILTERS}
          />
          <Button type="button" size="sm" variant="primary" onClick={() => setCreating(true)}>Raise a dispute</Button>
        </div>

        <section className={card}>
          <div className={inner}>
            {loading && !items.length ? <SkeletonBlock /> : (
              <DataTable
                rows={items}
                rowKey="_id"
                loading={loading}
                onRowClick={(r) => navigate(`/finance/dashboard/disputes/${r._id}`)}
                emptyTitle={statusFilter ? `No ${statusFilter.replace(/_/g, ' ')} disputes` : 'No disputes raised'}
                emptyDescription="A dispute freezes money movement on a document until it is resolved."
                columns={[
                  { key: 'disputeNumber', header: 'Dispute', render: (r) => <span className="font-semibold">{r.disputeNumber}</span> },
                  { key: 'subjectType', header: 'Subject', render: (r) => String(r.subjectType || '').replace(/_/g, ' ') },
                  { key: 'raisedAgainst', header: 'Against' },
                  { key: 'amountDisputed', header: moneyHeader('Amount'), render: (r) => <MoneyCell value={r.amountDisputed} /> },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'resolution', header: 'Resolution', render: (r) => (r.resolution ? String(r.resolution).replace(/_/g, ' ') : '—') },
                  { key: 'createdAt', header: 'Raised', render: (r) => fmtDate(r.createdAt) },
                ]}
              />
            )}
          </div>
        </section>

        <Modal
          open={creating}
          onClose={() => { setCreating(false); setError(''); }}
          title="Raise a dispute"
          description="Freezes payment on the record until the dispute is resolved. A written reason and a supporting document are required."
        >
          <form onSubmit={submit} className="space-y-3">
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
            <Select label="Subject type" value={form.subjectType} onChange={(e) => setForm((f) => ({ ...f, subjectType: e.target.value }))}
              options={[
                { value: 'invoice', label: 'Customer invoice' },
                { value: 'vendor_bill', label: 'Vendor bill' },
                { value: 'payment', label: 'Payment' },
                { value: 'expense', label: 'Expense' },
              ]} />
            <Input label="Subject record id" value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} required />
            <Select label="Raised against" value={form.raisedAgainst} onChange={(e) => setForm((f) => ({ ...f, raisedAgainst: e.target.value }))}
              options={[{ value: 'client', label: 'Client' }, { value: 'vendor', label: 'Vendor' }, { value: 'internal', label: 'Internal' }]} />
            <Input label="Amount disputed" type="number" min="0" step="0.01" value={form.amountDisputed}
              onChange={(e) => setForm((f) => ({ ...f, amountDisputed: e.target.value }))} required />
            <Input label="Department id" value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} required />
            <Input label="Project id (optional)" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} />
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Written justification
              <textarea
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                rows={3} required maxLength={2000}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </label>
            <Input label="Supporting document URL" value={form.documentUrl} onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))} required />
            <Input label="Document label" value={form.documentLabel} onChange={(e) => setForm((f) => ({ ...f, documentLabel: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" size="sm" variant="primary" disabled={saving}>{saving ? 'Raising…' : 'Raise dispute'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </main>
  );
};

// Append-only history of a dispute. Rendered newest-last so it reads as a narrative.
const DisputeTimeline = ({ timeline = [] }) => (
  <ol className="space-y-3">
    {timeline.map((t, i) => (
      <li key={i} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
            {String(t.action || '').replace(/_/g, ' ')}
            {t.from && t.to ? <span className="font-normal text-neutral-500"> · {t.from} → {t.to}</span> : null}
          </p>
          <p className="text-xs text-neutral-500">{t.at ? new Date(t.at).toLocaleString('en-IN') : ''}</p>
        </div>
        {t.comment && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{t.comment}</p>}
        {(t.documents || []).length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {t.documents.map((d, k) => (
              <li key={k}>
                <a href={d.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 underline dark:text-blue-400">
                  {d.label || 'Attachment'}
                </a>
              </li>
            ))}
          </ul>
        )}
      </li>
    ))}
  </ol>
);

export const FinanceDisputeDetailPage = () => {
  const { token, user } = useAuth();
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const isHead = isHeadRole(user?.role);
  const [acting, setActing] = useState(null);   // 'review' | 'resolve' | 'cancel'
  const [comment, setComment] = useState('');
  const [resolution, setResolution] = useState('released');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { loading, error: loadError, data, refetch } = useAsync(
    async () => unwrap(await financeApi.getDispute(token, disputeId)),
    [token, disputeId]
  );
  const dispute = data?.dispute;
  const active = dispute && ['open', 'under_review'].includes(dispute.status);

  const act = async () => {
    setError('');
    if (!comment.trim()) { setError('A comment is required.'); return; }
    setBusy(true);
    try {
      if (acting === 'review') await financeApi.reviewDispute(disputeId, { comment: comment.trim() }, token);
      if (acting === 'cancel') await financeApi.cancelDispute(disputeId, { comment: comment.trim() }, token);
      if (acting === 'resolve') await financeApi.resolveDispute(disputeId, { resolution, comment: comment.trim() }, token);
      setActing(null); setComment('');
      setNotice(acting === 'resolve' ? 'Dispute resolved. The freeze on the record has been lifted.' : 'Dispute updated.');
      refetch();
    } catch (err) { setError(err.message || 'Could not update the dispute'); }
    finally { setBusy(false); }
  };

  if (loading && !dispute) return <main className="portal-page"><div className="portal-page-inner"><SkeletonBlock /></div></main>;

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortalHeader
          title={dispute?.disputeNumber || 'Dispute'}
          subtitle={dispute ? `${String(dispute.subjectType).replace(/_/g, ' ')} · raised against ${dispute.raisedAgainst}` : ''}
          icon="gavel"
          user={user}
          crumbs={['Finance', 'Disputes', dispute?.disputeNumber || '']}
        />
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}
        {loadError && <ErrorState description={loadError} onRetry={refetch} />}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate('/finance/dashboard/disputes')}>Back</Button>
          {isHead && dispute?.status === 'open' && <Button type="button" size="sm" variant="secondary" onClick={() => setActing('review')}>Take under review</Button>}
          {isHead && active && <Button type="button" size="sm" variant="primary" onClick={() => setActing('resolve')}>Resolve</Button>}
          {isHead && active && <Button type="button" size="sm" variant="secondary" onClick={() => setActing('cancel')}>Cancel</Button>}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,1.3fr]">
          <SectionCard title="Dispute">
            <dl className="space-y-2 text-sm">
              {[
                ['Status', dispute?.status],
                ['Resolution', dispute?.resolution || '—'],
                ['Amount disputed', money(dispute?.amountDisputed)],
                ['Raised', fmtDate(dispute?.createdAt)],
                ['Resolved', dispute?.resolvedAt ? fmtDate(dispute.resolvedAt) : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="font-semibold text-neutral-900 dark:text-white">{String(v ?? '—').replace(/_/g, ' ')}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{dispute?.reason}</p>
            {active && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Payment on this record is frozen while the dispute is open.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Timeline" subtitle="Append-only: every transition is recorded and never rewritten">
            <DisputeTimeline timeline={dispute?.timeline} />
          </SectionCard>
        </div>

        <Modal open={Boolean(acting)} onClose={() => { setActing(null); setError(''); }} title={acting === 'resolve' ? 'Resolve dispute' : acting === 'cancel' ? 'Cancel dispute' : 'Take under review'}>
          <div className="space-y-3">
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
            {acting === 'resolve' && (
              <Select label="Resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} options={RESOLUTIONS} />
            )}
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Comment
              <textarea
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                rows={3} required maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setActing(null)}>Cancel</Button>
              <Button type="button" size="sm" variant="primary" onClick={act} disabled={busy}>{busy ? 'Saving…' : 'Confirm'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
};

// ─── Refunds ─────────────────────────────────────────────────────────────────

const emptyRefund = { invoice: '', payment: '', amount: '', reason: '', method: 'bank', reference: '' };

export const FinanceRefundsPage = () => {
  const { token, user } = useAuth();
  const isHead = isHeadRole(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyRefund);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { loading, error: loadError, data, refetch } = useAsync(
    async () => unwrap(await financeApi.getRefunds(token, statusFilter ? { status: statusFilter } : {})),
    [token, statusFilter]
  );
  const items = toList(data?.items);

  const create = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await financeApi.createRefund({
        invoice: form.invoice.trim(), payment: form.payment.trim(),
        amount: Number(form.amount), reason: form.reason.trim(),
        method: form.method, reference: form.reference.trim(),
      }, token);
      setCreating(false); setForm(emptyRefund);
      setNotice('Refund drafted. Submit it for approval before it can be processed.');
      refetch();
    } catch (err) { setError(err.message || 'Could not create the refund'); }
    finally { setBusy(false); }
  };

  const run = async (fn, id, successMessage) => {
    setNotice(''); setError('');
    try { await fn(id, token); setNotice(successMessage); refetch(); }
    catch (err) { setError(err.message || 'Action failed'); }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortalHeader
          title="Refunds"
          subtitle="Money returned against a receipt. A refund can never exceed what was collected and not yet returned."
          icon="undo"
          user={user}
          crumbs={['Finance', 'Refunds']}
        />
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}
        {error && <ErrorState description={error} />}
        {loadError && <ErrorState description={loadError} onRetry={refetch} />}

        <div className="flex flex-wrap items-end justify-between gap-2">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
            options={[
              { value: '', label: 'All' },
              { value: 'draft', label: 'Draft' },
              { value: 'submitted', label: 'Awaiting approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'processed', label: 'Processed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <Button type="button" size="sm" variant="primary" onClick={() => setCreating(true)}>New refund</Button>
        </div>

        <section className={card}>
          <div className={inner}>
            {loading && !items.length ? <SkeletonBlock /> : (
              <DataTable
                rows={items}
                rowKey="_id"
                loading={loading}
                emptyTitle={statusFilter ? `No ${statusFilter} refunds` : 'No refunds yet'}
                columns={[
                  { key: 'refundNumber', header: 'Refund', render: (r) => <span className="font-semibold">{r.refundNumber}</span> },
                  { key: 'amount', header: moneyHeader('Amount'), render: (r) => <MoneyCell value={r.amount} /> },
                  { key: 'method', header: 'Method' },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'createdAt', header: 'Raised', render: (r) => fmtDate(r.createdAt) },
                  {
                    key: 'actions',
                    header: '',
                    render: (r) => (
                      <div className="flex justify-end gap-2">
                        {r.status === 'draft' && (
                          <Button type="button" size="sm" variant="secondary" onClick={() => run(financeApi.submitRefund, r._id, 'Refund submitted for approval.')}>Submit</Button>
                        )}
                        {isHead && r.status === 'submitted' && (
                          <>
                            <Button type="button" size="sm" variant="primary" onClick={() => run((id, t) => financeApi.decideRefund(id, { decision: 'approve' }, t), r._id, 'Refund approved.')}>Approve</Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => run((id, t) => financeApi.decideRefund(id, { decision: 'return', note: 'Returned for revision' }, t), r._id, 'Refund returned.')}>Return</Button>
                          </>
                        )}
                        {isHead && r.status === 'approved' && (
                          <Button type="button" size="sm" variant="primary" onClick={() => run(financeApi.processRefund, r._id, 'Refund processed and posted to the ledger.')}>Process</Button>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </section>

        <Modal open={creating} onClose={() => { setCreating(false); setError(''); }} title="New refund" description="Anchored to the receipt being reversed, so it can never return more than was collected.">
          <form onSubmit={create} className="space-y-3">
            <Input label="Invoice id" value={form.invoice} onChange={(e) => setForm((f) => ({ ...f, invoice: e.target.value }))} required />
            <Input label="Payment id" value={form.payment} onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))} required />
            <Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            <Select label="Method" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              options={[{ value: 'bank', label: 'Bank transfer' }, { value: 'online', label: 'Online / UPI' }, { value: 'cash', label: 'Cash' }, { value: 'adjustment', label: 'Adjustment' }]} />
            <Input label="Reference (unique per payment)" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} required />
            <Input label="Reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" size="sm" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Create draft'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </main>
  );
};

// ─── Non-compliance ──────────────────────────────────────────────────────────

const KINDS = [
  { value: 'missed_deadline', label: 'Missed deadline' },
  { value: 'budget_overrun', label: 'Budget overrun' },
  { value: 'quality_deviation', label: 'Quality deviation' },
  { value: 'scope_deviation', label: 'Scope deviation' },
  { value: 'other', label: 'Other' },
];
const emptyNc = { kind: 'missed_deadline', severity: 'medium', party: 'vendor', description: '', departmentId: '', projectId: '', financialImpact: '', contractRef: '', subjectType: 'project', subjectId: '' };

export const FinanceNonCompliancePage = () => {
  const { token, user } = useAuth();
  const isHead = isHeadRole(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyNc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { loading, error: loadError, data, refetch } = useAsync(
    async () => unwrap(await financeApi.getNonCompliances(token, statusFilter ? { status: statusFilter } : {})),
    [token, statusFilter]
  );
  const items = toList(data?.items);

  const create = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await financeApi.createNonCompliance({
        ...form,
        financialImpact: form.financialImpact ? Number(form.financialImpact) : 0,
        projectId: form.projectId.trim() || undefined,
        subjectId: form.subjectId.trim() || undefined,
      }, token);
      setCreating(false); setForm(emptyNc);
      setNotice('Non-compliance recorded.');
      refetch();
    } catch (err) { setError(err.message || 'Could not record the breach'); }
    finally { setBusy(false); }
  };

  const act = async (fn, id, msg) => {
    setError(''); setNotice('');
    try { await fn(id, token); setNotice(msg); refetch(); }
    catch (err) { setError(err.message || 'Action failed'); }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortalHeader
          title="Non-Compliance"
          subtitle="Missed deadlines, budget overruns, and quality or scope deviations against what was agreed"
          icon="report"
          user={user}
          crumbs={['Finance', 'Non-Compliance']}
        />
        {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}
        {error && <ErrorState description={error} />}
        {loadError && <ErrorState description={loadError} onRetry={refetch} />}

        <div className="flex flex-wrap items-end justify-between gap-2">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
            options={[
              { value: '', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'acknowledged', label: 'Acknowledged' },
              { value: 'remediated', label: 'Remediated' },
              { value: 'waived', label: 'Waived' },
            ]}
          />
          <Button type="button" size="sm" variant="primary" onClick={() => setCreating(true)}>Record a breach</Button>
        </div>

        <section className={card}>
          <div className={inner}>
            {loading && !items.length ? <SkeletonBlock /> : (
              <DataTable
                rows={items}
                rowKey="_id"
                loading={loading}
                emptyTitle={statusFilter ? `No ${statusFilter} items` : 'No non-compliance recorded'}
                columns={[
                  { key: 'ticketNumber', header: 'Ticket', render: (r) => <span className="font-semibold">{r.ticketNumber}</span> },
                  { key: 'kind', header: 'Kind', render: (r) => String(r.kind || '').replace(/_/g, ' ') },
                  { key: 'severity', header: 'Severity', render: (r) => <StatusBadge status={r.severity} /> },
                  { key: 'party', header: 'Party' },
                  { key: 'financialImpact', header: 'Impact', render: (r) => (Number(r.financialImpact) ? money(r.financialImpact) : 'Not quantified') },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  {
                    key: 'actions',
                    header: '',
                    render: (r) => (
                      <div className="flex justify-end gap-2">
                        {r.status === 'open' && (
                          <Button type="button" size="sm" variant="secondary"
                            onClick={() => act((id, t) => financeApi.acknowledgeNonCompliance(id, { comment: 'Acknowledged' }, t), r._id, 'Acknowledged.')}>
                            Acknowledge
                          </Button>
                        )}
                        {isHead && !['remediated', 'waived'].includes(r.status) && (
                          <Button type="button" size="sm" variant="primary"
                            onClick={() => act((id, t) => financeApi.closeNonCompliance(id, { status: 'remediated', comment: 'Remediated' }, t), r._id, 'Closed as remediated.')}>
                            Close
                          </Button>
                        )}
                        {isHead && !r.disputeId && ['invoice', 'expense'].includes(r.subjectType) && (
                          <Button type="button" size="sm" variant="secondary"
                            onClick={() => act((id, t) => financeApi.escalateNonCompliance(id, {}, t), r._id, 'Escalated to a dispute; payment on the record is now frozen.')}>
                            Escalate
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </section>

        <Modal open={creating} onClose={() => { setCreating(false); setError(''); }} title="Record a breach">
          <form onSubmit={create} className="space-y-3">
            <Select label="Kind" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} options={KINDS} />
            <Select label="Severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} />
            <Select label="Party" value={form.party} onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))}
              options={[{ value: 'vendor', label: 'Vendor' }, { value: 'client', label: 'Client' }, { value: 'internal', label: 'Internal' }]} />
            <Select label="Attached to" value={form.subjectType} onChange={(e) => setForm((f) => ({ ...f, subjectType: e.target.value }))}
              options={[
                { value: 'project', label: 'Project' }, { value: 'invoice', label: 'Invoice' },
                { value: 'expense', label: 'Expense' }, { value: 'budget', label: 'Budget' }, { value: 'vendor', label: 'Vendor' },
              ]} />
            <Input label="Subject record id (optional)" value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} />
            <Input label="Department id" value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} required />
            <Input label="Project id (optional)" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} />
            <Input label="Financial impact (optional)" type="number" min="0" step="0.01" value={form.financialImpact}
              onChange={(e) => setForm((f) => ({ ...f, financialImpact: e.target.value }))} />
            <Input label="Contract reference (optional)" value={form.contractRef} onChange={(e) => setForm((f) => ({ ...f, contractRef: e.target.value }))} />
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Description
              <textarea
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                rows={3} required maxLength={2000} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" size="sm" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Record'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </main>
  );
};
