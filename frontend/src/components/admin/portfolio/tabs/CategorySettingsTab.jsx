import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { useConfirmDialog } from '../../../../context/ConfirmDialogContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import Button from '../../../common/Button';
import Input from '../../../ui/Input';
import UserPicker from '../UserPicker';
import IconAccentPicker from '../IconAccentPicker';
import { ASSET_STATUS_OPTIONS, ASSET_PRIORITY_OPTIONS, WORKFLOW_PRESETS } from '../portfolioStatus';
import { StatusPill } from '../PortfolioStatusPills';

const SectionCard = ({ title, description, children }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
    <h3 className="text-sm font-black text-neutral-900 dark:text-white">{title}</h3>
    {description && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
    <div className="mt-4 space-y-3">{children}</div>
  </div>
);

const REQUIRED_FIELD_OPTIONS = [
  { key: 'owner', label: 'Owner required' },
  { key: 'reviewer', label: 'Reviewer required' },
  { key: 'dueDate', label: 'Due date required' },
  { key: 'campaign', label: 'Campaign required' },
  { key: 'assetType', label: 'Asset type required' },
];

const buildForm = (category) => ({
  title: category.title || '',
  description: category.description || '',
  purpose: category.purpose || '',
  defaultAssetType: category.defaultAssetType || '',
  workflowKey: category.workflowKey || 'content_publishing',
  defaultPriority: category.defaultPriority || 'medium',
  ownerId: category.ownerId?._id || category.ownerId || null,
  ownerUser: category.ownerId && typeof category.ownerId === 'object' ? category.ownerId : null,
  reviewerId: category.reviewerId?._id || category.reviewerId || null,
  reviewerUser: category.reviewerId && typeof category.reviewerId === 'object' ? category.reviewerId : null,
  requiredFields: { owner: false, reviewer: false, dueDate: false, campaign: false, assetType: false, ...(category.requiredFields || {}) },
  icon: category.icon || 'folder_open',
  accent: category.accent || 'indigo',
});

const CategorySettingsTab = ({ portfolioId, categoryId, category }) => {
  const { token } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [form, setForm] = useState(() => buildForm(category));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs the form whenever the category record refetches (e.g. after another tab's mutation invalidates it)
    setForm(buildForm(category));
  }, [category]);

  const saveMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.updateCategory(token, categoryId, body),
    onSuccess: () => {
      toast.success('Settings saved.');
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'category', categoryId] });
      invalidate({ portfolioId, categoryId });
    },
    onError: (err) => toast.error(err?.message || 'Failed to save settings'),
  });

  const archiveMutation = useMutation({
    mutationFn: () => portfolioHierarchyApi.archiveCategory(token, categoryId),
    onSuccess: () => {
      toast.success('Category archived.');
      invalidate({ portfolioId, categoryId });
      navigate(`/admin/digital-portfolio`);
    },
    onError: (err) => toast.error(err?.message || 'Failed to archive category'),
  });

  const save = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      title: form.title,
      description: form.description,
      purpose: form.purpose,
      defaultAssetType: form.defaultAssetType,
      workflowKey: form.workflowKey,
      defaultPriority: form.defaultPriority,
      ownerId: form.ownerId,
      reviewerId: form.reviewerId,
      requiredFields: form.requiredFields,
      icon: form.icon,
      accent: form.accent,
    });
  };

  const handleArchive = async () => {
    const ok = await confirm({
      title: 'Archive this category?',
      message: `"${category.title}" and its assets will be hidden from the portfolio. This can be restored later — it is not a permanent delete.`,
      confirmLabel: 'Archive category',
      tone: 'warning',
    });
    if (ok) archiveMutation.mutate();
  };

  const activeWorkflow = WORKFLOW_PRESETS.find((w) => w.key === form.workflowKey) || WORKFLOW_PRESETS[0];

  return (
    <form onSubmit={save} className="space-y-4">
      <SectionCard title="General">
        <Input label="Category Name" name="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        <Input label="Description" name="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <div>
          <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Purpose</span>
          <textarea
            value={form.purpose}
            onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
            rows={2}
            placeholder="Why this category exists — shown in the workspace header."
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      </SectionCard>

      <SectionCard title="Defaults" description="Pre-filled whenever a new asset is created in this category.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Default Asset Type" name="defaultAssetType" value={form.defaultAssetType} onChange={(e) => setForm((f) => ({ ...f, defaultAssetType: e.target.value }))} placeholder="e.g. Blog post" />
          <div>
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Default Priority</span>
            <select value={form.defaultPriority} onChange={(e) => setForm((f) => ({ ...f, defaultPriority: e.target.value }))} className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              {ASSET_PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <UserPicker label="Default Owner" value={form.ownerId} user={form.ownerUser} onChange={(id, u) => setForm((f) => ({ ...f, ownerId: id, ownerUser: u }))} />
          <UserPicker label="Default Reviewer" value={form.reviewerId} user={form.reviewerUser} onChange={(id, u) => setForm((f) => ({ ...f, reviewerId: id, reviewerUser: u }))} />
        </div>
      </SectionCard>

      <SectionCard title="Required Fields" description="An asset can't be created (or leave draft) without these.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REQUIRED_FIELD_OPTIONS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={Boolean(form.requiredFields[f.key])}
                onChange={(e) => setForm((prev) => ({ ...prev, requiredFields: { ...prev.requiredFields, [f.key]: e.target.checked } }))}
                className="h-4 w-4 rounded border-neutral-300 accent-primary"
              />
              {f.label}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Visual">
        <IconAccentPicker icon={form.icon} accent={form.accent} onIconChange={(icon) => setForm((f) => ({ ...f, icon }))} onAccentChange={(accent) => setForm((f) => ({ ...f, accent }))} />
      </SectionCard>

      <SectionCard title="Workflow" description="Which status pipeline this category's assets follow. The backend validates every transition against it.">
        <select value={form.workflowKey} onChange={(e) => setForm((f) => ({ ...f, workflowKey: e.target.value }))} className="min-h-11 w-full max-w-sm rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
          {WORKFLOW_PRESETS.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
        </select>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {activeWorkflow.stages.map((s) => <StatusPill key={s} value={s} />)}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" loading={saveMutation.isPending}>Save Settings</Button>
      </div>

      <SectionCard title="Danger Zone">
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Archive this category</p>
            <p className="text-xs text-rose-600 dark:text-rose-400">Hides it and its assets from the portfolio. Can be restored later.</p>
          </div>
          <Button type="button" variant="danger" size="sm" className="w-full shrink-0 sm:w-auto" onClick={handleArchive} loading={archiveMutation.isPending}>Archive Category</Button>
        </div>
      </SectionCard>
    </form>
  );
};

export default CategorySettingsTab;
