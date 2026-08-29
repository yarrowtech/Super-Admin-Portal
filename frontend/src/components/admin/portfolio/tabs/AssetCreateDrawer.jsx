import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import Drawer from '../../../ui/Drawer';
import Button from '../../../common/Button';
import Input from '../../../ui/Input';
import Select from '../../../ui/Select';
import UserPicker from '../UserPicker';
import { ASSET_STATUS_OPTIONS, ASSET_PRIORITY_OPTIONS } from '../portfolioStatus';

const unwrap = (res) => res?.data ?? res ?? {};

const emptyForm = (category) => ({
  title: '',
  assetType: category?.defaultAssetType || '',
  status: 'backlog',
  priority: category?.defaultPriority || 'medium',
  ownerId: category?.ownerId?._id || category?.ownerId || null,
  ownerUser: category?.ownerId && typeof category.ownerId === 'object' ? category.ownerId : null,
  reviewerId: category?.reviewerId?._id || category?.reviewerId || null,
  reviewerUser: category?.reviewerId && typeof category.reviewerId === 'object' ? category.reviewerId : null,
  dueDate: '',
});

// New assets are only ever created from here — never implicitly when a
// category is created (spec §6).
const AssetCreateDrawer = ({ open, onClose, portfolioId, categoryId, category }) => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [form, setForm] = useState(() => emptyForm(category));
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the form to the category's defaults each time the drawer opens
    if (open) { setForm(emptyForm(category)); setError(''); }
  }, [open, category]);

  const createMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.createAsset(token, categoryId, body),
    onSuccess: (res) => {
      toast.success('Asset created.');
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'assets', categoryId] });
      invalidate({ portfolioId, categoryId });
      const created = unwrap(res);
      onClose(created?._id);
    },
    onError: (err) => setError(err?.message || 'Failed to create asset'),
  });

  const required = category?.requiredFields || {};

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Title is required');
    if (required.assetType && !form.assetType.trim()) return setError('This category requires an asset type');
    if (required.owner && !form.ownerId) return setError('This category requires an owner');
    if (required.reviewer && !form.reviewerId) return setError('This category requires a reviewer');
    if (required.dueDate && !form.dueDate) return setError('This category requires a due date');
    createMutation.mutate({
      title: form.title.trim(),
      assetType: form.assetType.trim(),
      status: form.status,
      priority: form.priority,
      ownerId: form.ownerId,
      reviewerId: form.reviewerId,
      dueDate: form.dueDate || null,
    });
  };

  return (
    <Drawer open={open} title="New Asset" onClose={() => onClose()}>
      <form className="space-y-3" onSubmit={submit}>
        <Input label="Title *" name="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus required />
        <Input
          label={`Asset type${required.assetType ? ' *' : ''}`}
          name="assetType"
          value={form.assetType}
          onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}
          placeholder="e.g. Blog post"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" name="status" options={ASSET_STATUS_OPTIONS.filter((o) => !['measuring', 'archived'].includes(o.value))} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          <Select label="Priority" name="priority" options={ASSET_PRIORITY_OPTIONS} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
        </div>
        <UserPicker
          label={`Owner${required.owner ? ' *' : ''}`}
          value={form.ownerId}
          user={form.ownerUser}
          onChange={(id, u) => setForm((f) => ({ ...f, ownerId: id, ownerUser: u }))}
        />
        <UserPicker
          label={`Reviewer${required.reviewer ? ' *' : ''}`}
          value={form.reviewerId}
          user={form.reviewerUser}
          onChange={(id, u) => setForm((f) => ({ ...f, reviewerId: id, reviewerUser: u }))}
        />
        <Input type="date" label={`Due date${required.dueDate ? ' *' : ''}`} name="dueDate" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onClose()}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create Asset</Button>
        </div>
      </form>
    </Drawer>
  );
};

export default AssetCreateDrawer;
