import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirmDialog } from '../../../context/ConfirmDialogContext';
import { portfolioHierarchyApi } from '../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../utils/queryKeys';
import { usePortfolioInvalidate } from '../../../hooks/usePortfolioInvalidate';
import Button from '../../common/Button';
import DropdownMenu from '../../ui/DropdownMenu';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Skeleton from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import PortfolioBreadcrumb from './PortfolioBreadcrumb';
import UserPicker from './UserPicker';
import { ASSET_STATUS_LABELS, ASSET_PRIORITY_OPTIONS, SEMANTIC_ACTIONS, timeAgo } from './portfolioStatus';
import { StatusPill, PriorityPill } from './PortfolioStatusPills';
import CategoryFilesTab from './tabs/CategoryFilesTab';
import AssetCommentsTab from './tabs/AssetCommentsTab';
import AssetPerformanceTab from './tabs/AssetPerformanceTab';
import AssetHistoryTab from './tabs/AssetHistoryTab';
import AssetRelationsTab from './tabs/AssetRelationsTab';

const unwrap = (res) => res?.data ?? res ?? {};

const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const EDITABLE_FIELDS = [
  'title', 'assetType', 'description', 'targetAudience', 'market', 'channel', 'campaign',
  'summary', 'content', 'cta', 'headline', 'seoTitle', 'metaDescription', 'angle', 'notes',
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
  { id: 'files', label: 'Files' },
  { id: 'comments', label: 'Comments' },
  { id: 'performance', label: 'Performance' },
  { id: 'history', label: 'History' },
  { id: 'relations', label: 'Relations' },
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
  const { token } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const invalidate = usePortfolioInvalidate();

  const [activeTab, setActiveTab] = useState('overview');
  const [form, setForm] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const initializedRef = useRef(false);
  const debounceRef = useRef(null);

  const assetQuery = useQuery({
    queryKey: QK.portfolioHierarchy.asset(assetId),
    queryFn: () => portfolioHierarchyApi.getAsset(token, assetId),
    enabled: Boolean(token && assetId),
    ...cachePolicyFor(QK.portfolioHierarchy.asset(assetId)),
  });
  const asset = unwrap(assetQuery.data);

  // Same query keys CategoryWorkspacePage uses for its header — shared cache
  // entry, so navigating Category Workspace <-> Asset Detail for the same
  // category doesn't refetch either.
  const categoryQuery = useQuery({
    queryKey: QK.portfolioHierarchy.category(categoryId),
    queryFn: () => portfolioHierarchyApi.getCategory(token, categoryId),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(QK.portfolioHierarchy.category(categoryId)),
  });
  const category = unwrap(categoryQuery.data);

  const groupQuery = useQuery({
    queryKey: QK.portfolioHierarchy.group(category.groupId),
    queryFn: () => portfolioHierarchyApi.getGroup(token, category.groupId),
    enabled: Boolean(token && category.groupId),
    ...cachePolicyFor(QK.portfolioHierarchy.group(category.groupId)),
  });
  const group = unwrap(groupQuery.data);

  const transitionsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.assetTransitions(assetId),
    queryFn: () => portfolioHierarchyApi.getAssetTransitions(token, assetId),
    enabled: Boolean(token && assetId),
    ...cachePolicyFor(QK.portfolioHierarchy.assetTransitions(assetId)),
  });
  const allowed = unwrap(transitionsQuery.data).allowed || [];

  useEffect(() => {
    if (asset?._id && !initializedRef.current) {
      setForm(buildFormFromAsset(asset));
      initializedRef.current = true;
    }
  }, [asset]);

  const invalidateAll = () => invalidate({ portfolioId, categoryId, assetId });

  const updateMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.updateAsset(token, assetId, body),
    onSuccess: () => { setSaveState('saved'); invalidateAll(); },
    onError: () => setSaveState('error'),
  });

  const flush = () => {
    if (!form) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const payload = { ...form };
    payload.tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    payload.keywords = form.keywords.split(',').map((t) => t.trim()).filter(Boolean);
    DATE_FIELDS.forEach((field) => { payload[field] = form[field] || null; });
    updateMutation.mutate(payload);
  };

  // Autosave: debounced 1.5s after the form settles — never per keystroke.
  // Backend only creates a version snapshot when something actually changed.
  useEffect(() => {
    if (!form || !initializedRef.current) return undefined;
    setSaveState('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flush, 1500);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const statusMutation = useMutation({
    mutationFn: (status) => portfolioHierarchyApi.changeAssetStatus(token, assetId, status),
    onSuccess: () => { toast.success('Status updated.'); invalidateAll(); },
    onError: (err) => toast.error(err?.message || 'Failed to change status'),
  });

  const ownerMutation = useMutation({
    mutationFn: (ownerId) => portfolioHierarchyApi.updateAsset(token, assetId, { ownerId }),
    onSuccess: () => { toast.success('Owner updated.'); invalidateAll(); },
    onError: (err) => toast.error(err?.message || 'Failed to update owner'),
  });
  const reviewerMutation = useMutation({
    mutationFn: (reviewerId) => portfolioHierarchyApi.updateAsset(token, assetId, { reviewerId }),
    onSuccess: () => { toast.success('Reviewer updated.'); invalidateAll(); },
    onError: (err) => toast.error(err?.message || 'Failed to update reviewer'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => portfolioHierarchyApi.deleteAsset(token, assetId),
    onSuccess: () => {
      toast.success('Asset moved to trash.');
      invalidate({ portfolioId, categoryId });
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

  if (assetQuery.isLoading || !form) {
    return (
      <main className="portal-page">
        <div className="portal-page-inner"><Skeleton className="h-64 rounded-2xl" /></div>
      </main>
    );
  }

  if (assetQuery.isError) {
    return (
      <main className="portal-page">
        <div className="portal-page-inner"><ErrorState title="Asset failed to load" description={assetQuery.error?.message} onRetry={() => assetQuery.refetch()} /></div>
      </main>
    );
  }

  const semanticButtons = SEMANTIC_ACTIONS.filter((a) => allowed.includes(a.targetStatus));
  const otherTransitions = allowed.filter((s) => !SEMANTIC_ACTIONS.some((a) => a.targetStatus === s));

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortfolioBreadcrumb
          items={[
            { label: 'Digital Portfolios', to: '/admin/digital-portfolio' },
            { label: group.title || '…' },
            { label: category.title || '…', to: `/admin/digital-portfolio/${portfolioId}/category/${categoryId}` },
            { label: asset.title },
          ]}
        />

        <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/admin/digital-portfolio/${portfolioId}/category/${categoryId}`)}
                className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                {category.title}
              </button>
              <h1 className="truncate text-lg font-black tracking-tight text-neutral-900 dark:text-white sm:text-xl">{asset.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill value={asset.status} />
                <PriorityPill value={asset.priority} />
                {saveState === 'saving' && <span className="text-xs font-medium text-neutral-400">Saving…</span>}
                {saveState === 'saved' && <span className="text-xs font-medium text-emerald-500">Saved</span>}
                {saveState === 'error' && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500">
                    Save failed — <button type="button" onClick={flush} className="underline">Retry</button>
                  </span>
                )}
                {saveState === 'idle' && asset.updatedAt && <span className="text-xs text-neutral-400">Last saved {timeAgo(asset.updatedAt)}</span>}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {semanticButtons.map((a) => (
                <Button key={a.targetStatus} variant="primary" size="sm" loading={statusMutation.isPending} onClick={() => statusMutation.mutate(a.targetStatus)} icon={<span className="material-symbols-outlined text-lg">{a.icon}</span>}>
                  {a.label}
                </Button>
              ))}
              <Button variant="secondary" size="sm" onClick={flush}>Save</Button>
              <DropdownMenu
                items={[
                  ...otherTransitions.map((s) => ({ label: `Move to ${ASSET_STATUS_LABELS[s]}`, icon: 'sync_alt', onClick: () => statusMutation.mutate(s) })),
                  { label: 'Delete', icon: 'delete', tone: 'danger', onClick: handleDelete },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:grid-cols-2 sm:max-w-md">
            <UserPicker
              label="Owner"
              value={asset.ownerId?._id || null}
              user={asset.ownerId ? { name: `${asset.ownerId.firstName || ''} ${asset.ownerId.lastName || ''}`.trim() || asset.ownerId.email, profileImage: asset.ownerId.profileImage } : null}
              onChange={(id) => ownerMutation.mutate(id)}
            />
            <UserPicker
              label="Reviewer"
              value={asset.reviewerId?._id || null}
              user={asset.reviewerId ? { name: `${asset.reviewerId.firstName || ''} ${asset.reviewerId.lastName || ''}`.trim() || asset.reviewerId.email, profileImage: asset.reviewerId.profileImage } : null}
              onChange={(id) => reviewerMutation.mutate(id)}
            />
          </div>
        </header>

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
              <Select
                label="Priority"
                name="priority"
                options={ASSET_PRIORITY_OPTIONS}
                value={asset.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
              />
              <Input label="Target audience" name="targetAudience" value={form.targetAudience} onChange={(e) => setField('targetAudience', e.target.value)} />
              <Input label="Market / Location" name="market" value={form.market} onChange={(e) => setField('market', e.target.value)} />
              <Input label="Channel" name="channel" value={form.channel} onChange={(e) => setField('channel', e.target.value)} />
              <Input label="Campaign" name="campaign" value={form.campaign} onChange={(e) => setField('campaign', e.target.value)} />
              <Input label="Tags (comma separated)" name="tags" value={form.tags} onChange={(e) => setField('tags', e.target.value)} />
            </div>
            <Field label="Description">
              <textarea className={textareaClass} value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </Field>
          </section>
        )}

        {activeTab === 'content' && (
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Headline" name="headline" value={form.headline} onChange={(e) => setField('headline', e.target.value)} />
              <Input label="CTA" name="cta" value={form.cta} onChange={(e) => setField('cta', e.target.value)} />
              <Input label="SEO Title" name="seoTitle" value={form.seoTitle} onChange={(e) => setField('seoTitle', e.target.value)} />
              <Input label="Keywords (comma separated)" name="keywords" value={form.keywords} onChange={(e) => setField('keywords', e.target.value)} />
              <Input label="Angle" name="angle" value={form.angle} onChange={(e) => setField('angle', e.target.value)} placeholder="The unique take this piece takes" />
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

        {activeTab === 'files' && <CategoryFilesTab portfolioId={portfolioId} categoryId={categoryId} assetId={assetId} />}
        {activeTab === 'comments' && <AssetCommentsTab assetId={assetId} />}
        {activeTab === 'performance' && <AssetPerformanceTab categoryId={categoryId} assetId={assetId} />}
        {activeTab === 'history' && <AssetHistoryTab portfolioId={portfolioId} categoryId={categoryId} assetId={assetId} asset={asset} />}
        {activeTab === 'relations' && <AssetRelationsTab portfolioId={portfolioId} categoryId={categoryId} assetId={assetId} />}
      </div>
    </main>
  );
};

export default AssetDetailPage;
