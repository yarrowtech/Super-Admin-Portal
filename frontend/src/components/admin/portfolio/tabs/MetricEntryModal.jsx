import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import Modal from '../../../ui/Modal';
import Button from '../../../common/Button';
import Input from '../../../ui/Input';
import Select from '../../../ui/Select';

const unwrap = (res) => res?.data ?? res ?? [];
const today = () => new Date().toISOString().slice(0, 10);

const MetricEntryModal = ({ open, onClose, portfolioId, categoryId, definitions = [] }) => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [form, setForm] = useState({ metricKey: definitions[0]?.key || '', assetId: '', value: '', date: today(), note: '' });
  const [error, setError] = useState('');

  const assetsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.assets(categoryId, { limit: 100 }),
    queryFn: () => portfolioHierarchyApi.getAssets(token, categoryId, { limit: 100 }),
    enabled: Boolean(token && categoryId && open),
    ...cachePolicyFor(QK.portfolioHierarchy.assets(categoryId, { limit: 100 })),
  });
  const assets = unwrap(assetsQuery.data).items || [];

  const mutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.addMetric(token, categoryId, body),
    onSuccess: () => {
      toast.success('Metric recorded.');
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'metrics', categoryId] });
      invalidate({ portfolioId, categoryId });
      onClose();
    },
    onError: (err) => setError(err?.message || 'Failed to record metric'),
  });

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const value = Number(form.value);
    if (!form.metricKey) return setError('Choose a metric');
    if (!Number.isFinite(value)) return setError('Value must be a number');
    mutation.mutate({ metricKey: form.metricKey, assetId: form.assetId || null, value, date: form.date, note: form.note });
  };

  return (
    <Modal open={open} title="Add Metric" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <Select label="Metric" name="metricKey" value={form.metricKey} onChange={(e) => setForm((f) => ({ ...f, metricKey: e.target.value }))} options={definitions.map((d) => ({ value: d.key, label: d.label }))} />
        <Select label="Asset (optional — leave blank for category-level)" name="assetId" value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))} options={[{ value: '', label: 'Category-level' }, ...assets.map((a) => ({ value: a._id, label: a.title }))]} />
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" step="any" label="Value" name="value" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} required />
          <Input type="date" label="Date" name="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </div>
        <Input label="Note (optional)" name="note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Save metric</Button>
        </div>
      </form>
    </Modal>
  );
};

export default MetricEntryModal;
