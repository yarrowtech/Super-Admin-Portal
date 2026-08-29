import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { useConfirmDialog } from '../../../../context/ConfirmDialogContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import DataTable from '../../../ui/DataTable';
import Pagination from '../../../ui/Pagination';
import Button from '../../../common/Button';
import Select from '../../../ui/Select';
import UserPicker, { UserAvatar } from '../UserPicker';
import { isOverdue, ASSET_STATUS_OPTIONS, ASSET_PRIORITY_OPTIONS } from '../portfolioStatus';
import { StatusPill, PriorityPill } from '../PortfolioStatusPills';

const unwrap = (res) => res?.data ?? res ?? {};

const fmtDate = (v) => {
  if (!v) return 'No due date';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return 'No due date';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const DUE_OPTIONS = [
  { value: '', label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: '7d', label: 'Due in 7 days' },
  { value: 'none', label: 'No due date' },
];

const SORT_OPTIONS = [
  { value: 'updatedAt:-1', label: 'Recently updated' },
  { value: 'title:1', label: 'Title (A–Z)' },
  { value: 'dueDate:1', label: 'Due date' },
  { value: 'priority:-1', label: 'Priority' },
];

const CategoryAssetsTab = ({ portfolioId, categoryId, searchParams, setSearchParams, onOpenAsset, onNewAsset }) => {
  const { token } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkOwner, setBulkOwner] = useState({ id: null, user: null });

  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const owner = searchParams.get('owner') || '';
  const due = searchParams.get('due') || '';
  const sort = searchParams.get('sort') || 'updatedAt:-1';
  const [sortField, sortDir] = sort.split(':');

  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const assetsParams = { page, limit: 10, search, status, priority, owner, due, sortField, sortDir };
  const assetsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.assets(categoryId, assetsParams),
    queryFn: () => portfolioHierarchyApi.getAssets(token, categoryId, assetsParams),
    enabled: Boolean(token && categoryId),
    placeholderData: (previous) => previous,
    ...cachePolicyFor(QK.portfolioHierarchy.assets(categoryId, assetsParams)),
  });
  const assetsData = unwrap(assetsQuery.data);
  const rows = assetsData.items || [];
  const pagination = assetsData.pagination || { page: 1, totalPages: 1, total: 0 };

  const invalidateAssets = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'assets', categoryId] });
    invalidate({ portfolioId, categoryId });
  };

  const archiveMutation = useMutation({
    mutationFn: (assetId) => portfolioHierarchyApi.deleteAsset(token, assetId),
    onSuccess: () => { toast.success('Asset archived.'); invalidateAssets(); },
    onError: (err) => toast.error(err?.message || 'Failed to archive asset'),
  });

  const updateOwnerMutation = useMutation({
    mutationFn: ({ assetId, ownerId }) => portfolioHierarchyApi.updateAsset(token, assetId, { ownerId }),
  });

  const handleBulkStatus = async () => {
    if (!bulkStatus || !selected.length) return;
    await Promise.all(selected.map((id) => portfolioHierarchyApi.changeAssetStatus(token, id, bulkStatus).catch(() => null)));
    toast.success(`Updated status for ${selected.length} asset(s).`);
    setBulkStatus('');
    setSelected([]);
    invalidateAssets();
  };

  const handleBulkOwner = async () => {
    if (!selected.length) return;
    await Promise.all(selected.map((id) => updateOwnerMutation.mutateAsync({ assetId: id, ownerId: bulkOwner.id })));
    toast.success(`Updated owner for ${selected.length} asset(s).`);
    setBulkOwner({ id: null, user: null });
    setSelected([]);
    invalidateAssets();
  };

  const handleBulkArchive = async () => {
    if (!selected.length) return;
    const ok = await confirm({
      title: `Archive ${selected.length} asset(s)?`,
      message: 'They will be hidden from this list and can be restored later.',
      confirmLabel: 'Archive',
      tone: 'warning',
    });
    if (!ok) return;
    await Promise.all(selected.map((id) => portfolioHierarchyApi.deleteAsset(token, id).catch(() => null)));
    toast.success(`Archived ${selected.length} asset(s).`);
    setSelected([]);
    invalidateAssets();
  };

  const sortHeader = (label, field) => (
    <button type="button" onClick={() => setParam('sort', `${field}:${sortField === field && sortDir === '1' ? '-1' : '1'}`)} className="inline-flex items-center gap-1 hover:text-primary">
      {label}
      {sortField === field ? <span className="material-symbols-outlined text-[14px]">{sortDir === '1' ? 'arrow_upward' : 'arrow_downward'}</span> : null}
    </button>
  );

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
            placeholder="Search assets…"
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto sm:min-w-[16rem]"
          />
          <div className="grid grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <select value={status} onChange={(e) => setParam('status', e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
              <option value="">All Status</option>
              {ASSET_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={priority} onChange={(e) => setParam('priority', e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
              <option value="">All Priority</option>
              {ASSET_PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={due} onChange={(e) => setParam('due', e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
              {DUE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-auto">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Button variant="primary" size="sm" className="w-full sm:ml-auto sm:w-auto" onClick={onNewAsset} icon={<span className="material-symbols-outlined text-lg">add</span>}>
            New Asset
          </Button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 ring-1 ring-primary/20">
            <span className="w-full text-xs font-bold text-primary sm:w-auto">{selected.length} selected</span>
            <div className="flex flex-wrap items-center gap-2">
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                <option value="">Set status…</option>
                {ASSET_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Button size="sm" variant="secondary" disabled={!bulkStatus} onClick={handleBulkStatus}>Apply</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-44"><UserPicker value={bulkOwner.id} user={bulkOwner.user} onChange={(id, u) => setBulkOwner({ id, user: u })} placeholder="Set owner…" /></div>
              <Button size="sm" variant="secondary" disabled={!bulkOwner.id} onClick={handleBulkOwner}>Apply</Button>
            </div>
            <Button size="sm" variant="danger" className="w-full sm:ml-auto sm:w-auto" onClick={handleBulkArchive}>Archive selected</Button>
          </div>
        )}
      </div>

      <DataTable
        columns={[
          { key: 'title', header: sortHeader('Title', 'title'), render: (r) => (
            <span className="font-semibold text-neutral-900 dark:text-white">
              {r.title}
              {isOverdue(r) ? <span className="ml-2 text-xs font-semibold text-rose-500">Overdue</span> : null}
            </span>
          ) },
          { key: 'assetType', header: 'Type', render: (r) => r.assetType || 'No type' },
          { key: 'status', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
          { key: 'priority', header: sortHeader('Priority', 'priority'), render: (r) => <PriorityPill value={r.priority} /> },
          { key: 'ownerId', header: 'Owner', render: (r) => (r.ownerId ? (
            <span className="inline-flex items-center gap-1.5"><UserAvatar user={{ name: `${r.ownerId.firstName || ''} ${r.ownerId.lastName || ''}`.trim() || r.ownerId.email }} size={18} />{`${r.ownerId.firstName || ''} ${r.ownerId.lastName || ''}`.trim() || r.ownerId.email}</span>
          ) : <span className="text-neutral-400">Unassigned</span>) },
          { key: 'reviewerId', header: 'Reviewer', render: (r) => (r.reviewerId ? `${r.reviewerId.firstName || ''} ${r.reviewerId.lastName || ''}`.trim() || r.reviewerId.email : <span className="text-neutral-400">Unassigned</span>) },
          { key: 'dueDate', header: sortHeader('Due', 'dueDate'), render: (r) => fmtDate(r.dueDate) },
          { key: 'updatedAt', header: sortHeader('Updated', 'updatedAt'), render: (r) => fmtDate(r.updatedAt) },
        ]}
        rows={rows}
        rowKey="_id"
        loading={assetsQuery.isLoading}
        selectable
        onSelectionChange={setSelected}
        emptyTitle="No assets yet"
        emptyDescription="Create your first asset in this category."
        emptyAction={{ label: 'New Asset', onClick: onNewAsset }}
        onRowClick={(r) => onOpenAsset(r._id)}
        rowActions={(r) => [
          { label: 'Open', icon: 'open_in_new', onClick: () => onOpenAsset(r._id) },
          { label: 'Archive', icon: 'archive', tone: 'danger', onClick: () => archiveMutation.mutate(r._id) },
        ]}
      />
      {rows.length > 0 && <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => setParam('page', String(p))} />}
    </section>
  );
};

export default CategoryAssetsTab;
