import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { useConfirmDialog } from '../../../../context/ConfirmDialogContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import EmptyState from '../../../ui/EmptyState';
import Skeleton from '../../../ui/Skeleton';
import Button from '../../../common/Button';
import Modal from '../../../ui/Modal';
import { ASSET_STATUS_LABELS, timeAgo } from '../portfolioStatus';

const unwrap = (res) => res?.data ?? res ?? {};
const unwrapArr = (res) => res?.data ?? res ?? [];

const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const FIELD_LABELS = {
  title: 'Title', assetType: 'Asset type', description: 'Description', priority: 'Priority', tags: 'Tags',
  targetAudience: 'Target audience', market: 'Market', channel: 'Channel', campaign: 'Campaign',
  summary: 'Summary', content: 'Content', cta: 'CTA', headline: 'Headline', seoTitle: 'SEO title',
  metaDescription: 'Meta description', keywords: 'Keywords', angle: 'Angle', notes: 'Notes', status: 'Status',
  startDate: 'Start date', dueDate: 'Due date', reviewDate: 'Review date', publishDate: 'Publish date', scheduleDate: 'Schedule date',
};

const valueText = (v) => {
  if (v === null || v === undefined || v === '') return '(empty)';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(empty)';
  return String(v);
};

// Diffs a version's snapshot against the asset's current live values — a
// field-level diff, not a prose-level one (documented limitation).
const CompareModal = ({ open, onClose, version, asset }) => {
  if (!version) return null;
  const diffs = Object.keys(FIELD_LABELS).filter((key) => {
    const a = version.snapshot?.[key];
    const b = asset?.[key];
    return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
  });
  return (
    <Modal open={open} title={`Compare v${version.versionNumber} → Current`} onClose={onClose}>
      {diffs.length === 0 ? (
        <p className="text-sm text-neutral-400">No differences from the current version.</p>
      ) : (
        <div className="space-y-3">
          {diffs.map((key) => (
            <div key={key} className="rounded-lg border border-neutral-100 p-3 text-sm dark:border-neutral-800">
              <p className="mb-1 font-bold text-neutral-700 dark:text-neutral-200">{FIELD_LABELS[key]}</p>
              <p className="text-rose-500 line-through">{valueText(version.snapshot?.[key])}</p>
              <p className="text-emerald-600 dark:text-emerald-400">{valueText(asset?.[key])}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

const AssetHistoryTab = ({ portfolioId, categoryId, assetId, asset }) => {
  const { token } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [historyItems, setHistoryItems] = useState([]);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [compareVersion, setCompareVersion] = useState(null);

  const versionsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.assetVersions(assetId),
    queryFn: () => portfolioHierarchyApi.getAssetVersions(token, assetId),
    enabled: Boolean(token && assetId),
    ...cachePolicyFor(QK.portfolioHierarchy.assetVersions(assetId)),
  });
  const versions = unwrapArr(versionsQuery.data);

  const loadHistory = async (cursor) => {
    const res = await portfolioHierarchyApi.getAssetHistory(token, assetId, { cursor, limit: 20 });
    const data = unwrap(res);
    setHistoryItems((prev) => (cursor ? [...prev, ...(data.items || [])] : data.items || []));
    setHistoryCursor(data.nextCursor || null);
    setHistoryLoaded(true);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, same pattern as ITWorkspacePages.jsx's useAsync
    if (token && assetId) loadHistory(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const restoreMutation = useMutation({
    mutationFn: (versionId) => portfolioHierarchyApi.restoreAssetVersion(token, assetId, versionId),
    onSuccess: () => {
      toast.success('Version restored — a new version was created.');
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.assetVersions(assetId) });
      invalidate({ portfolioId, categoryId, assetId });
    },
    onError: (err) => toast.error(err?.message || 'Failed to restore version'),
  });

  const handleRestore = async (version) => {
    const ok = await confirm({
      title: `Restore version ${version.versionNumber}?`,
      message: 'This creates a new version with that snapshot\'s content — nothing is deleted.',
      confirmLabel: 'Restore',
      tone: 'warning',
    });
    if (ok) restoreMutation.mutate(version._id);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
        <h3 className="mb-3 text-sm font-black text-neutral-900 dark:text-white">Activity</h3>
        {!historyLoaded ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : historyItems.length === 0 ? (
          <EmptyState icon="history" title="No history yet" description="Changes to this asset will appear here." />
        ) : (
          <div className="space-y-3">
            {historyItems.map((entry) => (
              <div key={entry._id} className="rounded-xl border border-neutral-100 px-4 py-3 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{String(entry.action || '').replace(/_/g, ' ')}</p>
                  <p className="text-xs text-neutral-400">{timeAgo(entry.createdAt)}</p>
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  by {entry.actor ? `${entry.actor.firstName || ''} ${entry.actor.lastName || ''}`.trim() || entry.actor.email : 'System'}
                  {entry.metadata?.from && entry.metadata?.to ? ` — ${ASSET_STATUS_LABELS[entry.metadata.from] || entry.metadata.from} → ${ASSET_STATUS_LABELS[entry.metadata.to] || entry.metadata.to}` : ''}
                </p>
              </div>
            ))}
            {historyCursor && <Button variant="secondary" size="sm" onClick={() => loadHistory(historyCursor)}>Load more</Button>}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
        <h3 className="mb-3 text-sm font-black text-neutral-900 dark:text-white">Versions</h3>
        {versionsQuery.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : versions.length === 0 ? (
          <EmptyState icon="history_edu" title="No versions yet" />
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v._id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 px-4 py-3 dark:border-neutral-800">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">v{v.versionNumber}{v.versionNumber === asset?.currentVersion ? ' (current)' : ''}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-400">{v.changeSummary} · {fmtDateTime(v.createdAt)}{v.createdBy?.firstName ? ` · ${v.createdBy.firstName} ${v.createdBy.lastName || ''}`.trim() : ''}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setCompareVersion(v)}>Compare</Button>
                  {v.versionNumber !== asset?.currentVersion && (
                    <Button variant="secondary" size="sm" onClick={() => handleRestore(v)} loading={restoreMutation.isPending}>Restore</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CompareModal open={Boolean(compareVersion)} onClose={() => setCompareVersion(null)} version={compareVersion} asset={asset} />
    </div>
  );
};

export default AssetHistoryTab;
