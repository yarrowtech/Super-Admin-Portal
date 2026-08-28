import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirmDialog } from '../../../context/ConfirmDialogContext';
import { portfolioHierarchyApi } from '../../../services/portfolioHierarchy';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import Button from '../../common/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { ASSET_STATUS_LABELS, ASSET_STATUS_TRANSITIONS, ASSET_PRIORITY_OPTIONS } from './portfolioStatus';
import { StatusPill, PriorityPill } from './PortfolioStatusPills';

const unwrap = (res) => res?.data ?? res ?? {};

const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const EDITABLE_FIELDS = [
  'title', 'assetType', 'description', 'priority', 'targetAudience', 'market', 'channel', 'campaign',
  'summary', 'content', 'cta', 'headline', 'seoTitle', 'metaDescription', 'notes',
  'startDate', 'dueDate', 'reviewDate', 'publishDate', 'scheduleDate',
];
const DATE_FIELDS = ['startDate', 'dueDate', 'reviewDate', 'publishDate', 'scheduleDate'];

const buildFormFromAsset = (asset) => {
  const form = {};
  EDITABLE_FIELDS.forEach((field) => {
    form[field] = DATE_FIELDS.includes(field) ? toDateInput(asset[field]) : (asset[field] || '');
  });
  form.tags = Array.isArray(asset.tags) ? asset.tags.join(', ') : '';
  form.keywords = Array.isArray(asset.keywords) ? asset.keywords.join(', ') : '';
  return form;
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'content', label: 'Content' },
  { id: 'execution', label: 'Execution' },
  { id: 'history', label: 'History' },
];

const Field = ({ label, children }) => (
  <div>
    <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</span>
    {children}
  </div>
);

const textareaClass = 'min-h-24 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

const AssetDetailPage = () => {
  const { portfolioId, categoryId, assetId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [form, setForm] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [historyCursor, setHistoryCursor] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const initializedRef = useRef(false);
  const debounceRef = useRef(null);

  const assetQuery = useQuery({
    queryKey: QK.portfolioHierarchy.asset(assetId),
    queryFn: () => portfolioHierarchyApi.getAsset(token, assetId),
    enabled: Boolean(token && assetId),
  });
  const asset = unwrap(assetQuery.data);

  useEffect(() => {
    if (asset?._id && !initializedRef.current) {
      setForm(buildFormFromAsset(asset));
      initializedRef.current = true;
    }
  }, [asset]);

  const invalidateAsset = () => {
    queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.asset(assetId) });
    queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.categoryStats(categoryId) });
    queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.tree(portfolioId) });
  };

  const updateMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.updateAsset(token, assetId, body),
    onSuccess: () => { setSaveState('saved'); invalidateAsset(); },
    onError: () => setSaveState('error'),
  });

  // Autosave: debounced 1.5s after the form settles, per spec §22 — never per
  // keystroke. Backend (portfolioHierarchy.service.js updateAsset) only
  // creates a version snapshot when something actually changed.
  useEffect(() => {
    if (!form || !initializedRef.current) return undefined;
    setSaveState('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload = { ...form };
      payload.tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      payload.keywords = form.keywords.split(',').map((t) => t.trim()).filter(Boolean);
      DATE_FIELDS.forEach((field) => { payload[field] = form[field] || null; });
      updateMutation.mutate(payload);
    }, 1500);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const statusMutation = useMutation({
    mutationFn: (status) => portfolioHierarchyApi.changeAssetStatus(token, assetId, status),
    onSuccess: () => { toast.success('Status updated.'); invalidateAsset(); },
    onError: (err) => toast.error(err?.message || 'Failed to change status'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => portfolioHierarchyApi.deleteAsset(token, assetId),
    onSuccess: () => {
      toast.success('Asset moved to trash.');
      navigate(`/admin/digital-portfolio/${portfolioId}/category/${categoryId}`);
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete asset'),
  });

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Move asset to trash?',
      message: `"${asset.title}" will be hidden from the Assets list. This can be restored later.`,
      confirmLabel: 'Move to trash',
      tone: 'danger',
    });
    if (ok) deleteMutation.mutate();
  };

  const loadHistory = async (cursor) => {
    const res = await portfolioHierarchyApi.getAssetHistory(token, assetId, { cursor, limit: 20 });
    const data = unwrap(res);
    setHistoryItems((prev) => (cursor ? [...prev, ...(data.items || [])] : data.items || []));
    setHistoryCursor(data.nextCursor || null);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-tab-change, same pattern as ITWorkspacePages.jsx's useAsync
    if (activeTab === 'history' && token && assetId) loadHistory(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, assetId]);

  const allowedNextStatuses = ASSET_STATUS_TRANSITIONS[asset.status] || [];

  if (assetQuery.isLoading || !form) {
    return (
      <main className="portal-page">
        <div className="portal-page-inner"><div className="h-64 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" /></div>
      </main>
    );
  }

  if (assetQuery.isError) {
    return (
      <main className="portal-page">
        <div className="portal-page-inner"><EmptyState icon="error" title="Asset failed to load" description={assetQuery.error?.message} /></div>
      </main>
    );
  }

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortalHeader title={asset.title} subtitle={`v${asset.currentVersion || 1} · Category workspace`} icon="description" user={user}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill value={asset.status} />
            <PriorityPill value={asset.priority} />
            {saveState === 'saving' && <span className="text-xs font-medium text-neutral-400">Saving…</span>}
            {saveState === 'saved' && <span className="text-xs font-medium text-emerald-500">Saved</span>}
            {saveState === 'error' && <span className="text-xs font-medium text-rose-500">Save failed</span>}
            <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/digital-portfolio/${portfolioId}/category/${categoryId}`)}>Back</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} icon={<span className="material-symbols-outlined text-lg">delete</span>}>Delete</Button>
          </div>
        </PortalHeader>

        <div className="portal-tab-strip border-b border-neutral-200 dark:border-neutral-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Title" name="title" value={form.title} onChange={(e) => setField('title', e.target.value)} />
              <Input label="Asset type" name="assetType" value={form.assetType} onChange={(e) => setField('assetType', e.target.value)} placeholder="e.g. Blog post" />
              <Select label="Priority" name="priority" options={ASSET_PRIORITY_OPTIONS} value={form.priority} onChange={(e) => setField('priority', e.target.value)} />
              <Field label="Status">
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) statusMutation.mutate(e.target.value); }}
                  className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <option value="">Currently: {ASSET_STATUS_LABELS[asset.status] || asset.status}</option>
                  {allowedNextStatuses.map((s) => (
                    <option key={s} value={s}>Move to {ASSET_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </Field>
              <Input label="Target audience" name="targetAudience" value={form.targetAudience} onChange={(e) => setField('targetAudience', e.target.value)} />
              <Input label="Market / Location" name="market" value={form.market} onChange={(e) => setField('market', e.target.value)} />
              <Input label="Channel" name="channel" value={form.channel} onChange={(e) => setField('channel', e.target.value)} />
              <Input label="Campaign" name="campaign" value={form.campaign} onChange={(e) => setField('campaign', e.target.value)} />
              <Input label="Tags (comma separated)" name="tags" value={form.tags} onChange={(e) => setField('tags', e.target.value)} />
            </div>
            <Field label="Description">
              <textarea className={textareaClass} value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </Field>
            <div className="text-xs text-neutral-400">
              Owner: {asset.ownerId ? `${asset.ownerId.firstName || ''} ${asset.ownerId.lastName || ''}`.trim() || asset.ownerId.email : 'Unassigned'} · Reviewer: {asset.reviewerId ? `${asset.reviewerId.firstName || ''} ${asset.reviewerId.lastName || ''}`.trim() || asset.reviewerId.email : 'Unassigned'}
              <span className="ml-1 italic">(owner/reviewer assignment UI ships in a future update)</span>
            </div>
          </section>
        )}

        {activeTab === 'content' && (
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Headline" name="headline" value={form.headline} onChange={(e) => setField('headline', e.target.value)} />
              <Input label="CTA" name="cta" value={form.cta} onChange={(e) => setField('cta', e.target.value)} />
              <Input label="SEO Title" name="seoTitle" value={form.seoTitle} onChange={(e) => setField('seoTitle', e.target.value)} />
              <Input label="Keywords (comma separated)" name="keywords" value={form.keywords} onChange={(e) => setField('keywords', e.target.value)} />
            </div>
            <Field label="Meta description">
              <textarea className={textareaClass} rows={2} value={form.metaDescription} onChange={(e) => setField('metaDescription', e.target.value)} />
            </Field>
            <Field label="Summary">
              <textarea className={textareaClass} value={form.summary} onChange={(e) => setField('summary', e.target.value)} />
            </Field>
            <Field label="Full content">
              <textarea className={`${textareaClass} min-h-64`} value={form.content} onChange={(e) => setField('content', e.target.value)} />
            </Field>
            <Field label="Notes">
              <textarea className={textareaClass} rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </Field>
          </section>
        )}

        {activeTab === 'execution' && (
          <section className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 md:grid-cols-2 lg:p-6">
            <Input type="date" label="Start date" name="startDate" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
            <Input type="date" label="Due date" name="dueDate" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
            <Input type="date" label="Review date" name="reviewDate" value={form.reviewDate} onChange={(e) => setField('reviewDate', e.target.value)} />
            <Input type="date" label="Publish date" name="publishDate" value={form.publishDate} onChange={(e) => setField('publishDate', e.target.value)} />
            <Input type="date" label="Schedule date" name="scheduleDate" value={form.scheduleDate} onChange={(e) => setField('scheduleDate', e.target.value)} />
          </section>
        )}

        {activeTab === 'history' && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
            {historyItems.length === 0 ? (
              <EmptyState icon="history" title="No history yet" description="Changes to this asset will appear here." />
            ) : (
              <div className="space-y-3">
                {historyItems.map((entry) => (
                  <div key={entry._id} className="rounded-xl border border-neutral-100 px-4 py-3 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{String(entry.action || '').replace(/_/g, ' ')}</p>
                      <p className="text-xs text-neutral-400">{fmtDateTime(entry.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      by {entry.actor ? `${entry.actor.firstName || ''} ${entry.actor.lastName || ''}`.trim() || entry.actor.email : 'System'}
                      {entry.metadata?.from && entry.metadata?.to ? ` — ${entry.metadata.from} → ${entry.metadata.to}` : ''}
                    </p>
                  </div>
                ))}
                {historyCursor && (
                  <Button variant="secondary" size="sm" onClick={() => loadHistory(historyCursor)}>Load more</Button>
                )}
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
};

export default AssetDetailPage;
