import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../services/portfolioHierarchy';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import Button from '../../common/Button';
import DataTable from '../../ui/DataTable';
import EmptyState from '../../ui/EmptyState';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import { isOverdue } from './portfolioStatus';
import { StatusPill, PriorityPill } from './PortfolioStatusPills';

const unwrap = (res) => res?.data ?? res ?? {};

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ownerName = (owner) => {
  if (!owner || typeof owner !== 'object') return '—';
  return `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email || '—';
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assets', label: 'Assets' },
];

const CategoryWorkspacePage = () => {
  const { portfolioId, categoryId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchParams, setSearchParams] = useSearchParams();
  const [createModal, setCreateModal] = useState(null);

  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';

  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const categoryQuery = useQuery({
    queryKey: QK.portfolioHierarchy.category(categoryId),
    queryFn: () => portfolioHierarchyApi.getCategory(token, categoryId),
    enabled: Boolean(token && categoryId),
  });
  const category = unwrap(categoryQuery.data);

  const statsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.categoryStats(categoryId),
    queryFn: () => portfolioHierarchyApi.getCategoryStats(token, categoryId),
    enabled: Boolean(token && categoryId),
  });
  const stats = unwrap(statsQuery.data);

  const assetsParams = { page, limit: 10, search, status, priority };
  const assetsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.assets(categoryId, assetsParams),
    queryFn: () => portfolioHierarchyApi.getAssets(token, categoryId, assetsParams),
    enabled: Boolean(token && categoryId) && activeTab === 'assets',
  });
  const assetsData = unwrap(assetsQuery.data);
  const assetRows = assetsData.items || [];

  const createAssetMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.createAsset(token, categoryId, body),
    onSuccess: (res) => {
      toast.success('Asset created.');
      setCreateModal(null);
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.assets(categoryId, {}) });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.categoryStats(categoryId) });
      const created = unwrap(res);
      if (created?._id) navigate(`/admin/digital-portfolio/${portfolioId}/category/${categoryId}/asset/${created._id}`);
    },
    onError: (err) => toast.error(err?.message || 'Failed to create asset'),
  });

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortalHeader
          title={category.title || 'Category Workspace'}
          subtitle={category.purpose || category.description || 'No category purpose has been added yet.'}
          icon={category.icon || 'folder_open'}
          user={user}
        >
          <Button variant="primary" size="sm" onClick={() => setCreateModal({ title: '', assetType: category.defaultAssetType || '', dueDate: '' })}>New Asset</Button>
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
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Total Assets', value: stats.total ?? 0 },
              { label: 'Published', value: stats.byStatus?.published || 0 },
              { label: 'Needs Review', value: stats.needsReview || 0 },
              { label: 'Overdue', value: stats.overdue || 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{item.label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'assets' && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <input
                value={search}
                onChange={(e) => setParam('search', e.target.value)}
                placeholder="Search assets…"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto sm:min-w-[16rem]"
              />
              <div className="grid grid-cols-2 gap-3 sm:flex sm:w-auto">
                <select value={status} onChange={(e) => setParam('status', e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
                  <option value="">All Status</option>
                  <option value="backlog">Backlog</option>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="changes_requested">Changes Requested</option>
                  <option value="approved">Approved</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <select value={priority} onChange={(e) => setParam('priority', e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
                  <option value="">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <Button variant="primary" size="sm" className="w-full sm:ml-auto sm:w-auto" onClick={() => setCreateModal({ title: '' })} icon={<span className="material-symbols-outlined text-lg">add</span>}>
                New Asset
              </Button>
            </div>
            <DataTable
              columns={[
                { key: 'title', header: 'Title', render: (r) => (
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {r.title}
                    {isOverdue(r) ? <span className="ml-2 text-xs font-semibold text-rose-500">Overdue</span> : null}
                  </span>
                ) },
                { key: 'assetType', header: 'Type', render: (r) => r.assetType || '—' },
                { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
                { key: 'priority', header: 'Priority', render: (r) => <PriorityPill value={r.priority} /> },
                { key: 'ownerId', header: 'Owner', render: (r) => ownerName(r.ownerId) },
                { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) },
                { key: 'updatedAt', header: 'Updated', render: (r) => fmtDate(r.updatedAt) },
              ]}
              rows={assetRows}
              rowKey="_id"
              loading={assetsQuery.isLoading}
              emptyTitle="No assets yet"
              emptyDescription="Create your first asset in this category."
              emptyAction={{ label: 'New Asset', onClick: () => setCreateModal({ title: '' }) }}
              onRowClick={(r) => navigate(`/admin/digital-portfolio/${portfolioId}/category/${categoryId}/asset/${r._id}`)}
            />
          </section>
        )}

      </div>

      <Modal open={Boolean(createModal)} title="New Asset" onClose={() => setCreateModal(null)}>
        {createModal ? (
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); if (createModal.title.trim() && createModal.assetType?.trim()) createAssetMutation.mutate(createModal); }}
          >
            <Input label="Asset title" name="assetTitle" value={createModal.title} onChange={(e) => setCreateModal((f) => ({ ...f, title: e.target.value }))} required autoFocus />
            <Input label="Asset type" name="assetType" value={createModal.assetType || ''} onChange={(e) => setCreateModal((f) => ({ ...f, assetType: e.target.value }))} required />
            <Input type="date" label="Due date" name="dueDate" value={createModal.dueDate || ''} onChange={(e) => setCreateModal((f) => ({ ...f, dueDate: e.target.value }))} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreateModal(null)}>Cancel</Button>
              <Button type="submit" loading={createAssetMutation.isPending}>Create asset</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </main>
  );
};

export default CategoryWorkspacePage;
