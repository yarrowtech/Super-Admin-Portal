import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import Skeleton from '../../../ui/Skeleton';
import Button from '../../../common/Button';
import Modal from '../../../ui/Modal';
import Select from '../../../ui/Select';
import { StatusPill } from '../PortfolioStatusPills';
import { RELATION_TYPE_LABELS, RELATION_TYPE_OPTIONS } from '../portfolioStatus';

const unwrap = (res) => res?.data ?? res ?? {};

const AddRelationModal = ({ open, onClose, categoryId, assetId }) => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [relatedAssetId, setRelatedAssetId] = useState('');
  const [type, setType] = useState('related');
  const [error, setError] = useState('');

  const assetsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.assets(categoryId, { limit: 100 }),
    queryFn: () => portfolioHierarchyApi.getAssets(token, categoryId, { limit: 100 }),
    enabled: Boolean(token && categoryId && open),
    ...cachePolicyFor(QK.portfolioHierarchy.assets(categoryId, { limit: 100 })),
  });
  const options = (unwrap(assetsQuery.data).items || []).filter((a) => a._id !== assetId);

  const mutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.createRelation(token, assetId, body),
    onSuccess: () => {
      toast.success('Relation added.');
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.relations(assetId) });
      setRelatedAssetId(''); setError('');
      onClose();
    },
    onError: (err) => setError(err?.message || 'Failed to add relation'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!relatedAssetId) return setError('Choose an asset');
    mutation.mutate({ relatedAssetId, type });
  };

  return (
    <Modal open={open} title="Add Relation" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <Select label="Asset" name="relatedAssetId" value={relatedAssetId} onChange={(e) => setRelatedAssetId(e.target.value)} options={[{ value: '', label: 'Select an asset…' }, ...options.map((a) => ({ value: a._id, label: a.title }))]} />
        <Select label="Relation type" name="type" value={type} onChange={(e) => setType(e.target.value)} options={RELATION_TYPE_OPTIONS} />
        {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Add relation</Button>
        </div>
      </form>
    </Modal>
  );
};

const AssetRelationsTab = ({ portfolioId, categoryId, assetId }) => {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const query = useQuery({
    queryKey: QK.portfolioHierarchy.relations(assetId),
    queryFn: () => portfolioHierarchyApi.getRelations(token, assetId),
    enabled: Boolean(token && assetId),
    ...cachePolicyFor(QK.portfolioHierarchy.relations(assetId)),
  });
  const grouped = unwrap(query.data);

  const deleteMutation = useMutation({
    mutationFn: (relationId) => portfolioHierarchyApi.deleteRelation(token, relationId),
    onSuccess: () => { toast.success('Relation removed.'); queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.relations(assetId) }); },
    onError: (err) => toast.error(err?.message || 'Failed to remove relation'),
  });

  if (query.isError) return <ErrorState title="Could not load relations" description={query.error?.message} onRetry={() => query.refetch()} />;

  const types = Object.keys(RELATION_TYPE_LABELS).filter((t) => (grouped[t] || []).length);

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-neutral-900 dark:text-white">Related Assets</h3>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)} icon={<span className="material-symbols-outlined text-lg">add</span>}>Add Relation</Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : types.length === 0 ? (
        <EmptyState icon="link" title="No relations yet" description="Link this asset to related content." actionLabel="Add Relation" onAction={() => setAddOpen(true)} />
      ) : (
        <div className="space-y-4">
          {types.map((type) => (
            <div key={type}>
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-neutral-400">{RELATION_TYPE_LABELS[type]}</p>
              <div className="space-y-2">
                {grouped[type].map((r) => (
                  <div key={r._id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 px-4 py-3 dark:border-neutral-800">
                    <button type="button" onClick={() => navigate(`/admin/digital-portfolio/${portfolioId}/category/${categoryId}/asset/${r.asset?._id}`)} className="min-w-0 flex-1 text-left">
                      <span className="truncate font-semibold text-neutral-800 hover:text-primary dark:text-neutral-100">{r.asset?.title}</span>
                    </button>
                    {r.asset?.status && <StatusPill value={r.asset.status} />}
                    {r.direction === 'outgoing' && (
                      <button type="button" onClick={() => deleteMutation.mutate(r._id)} className="text-neutral-400 hover:text-rose-500" aria-label="Remove relation">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddRelationModal open={addOpen} onClose={() => setAddOpen(false)} portfolioId={portfolioId} categoryId={categoryId} assetId={assetId} />
    </section>
  );
};

export default AssetRelationsTab;
