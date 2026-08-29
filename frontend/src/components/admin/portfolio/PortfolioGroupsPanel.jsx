import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../context/ToastContext';
import { useConfirmDialog } from '../../../context/ConfirmDialogContext';
import { portfolioHierarchyApi } from '../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../utils/queryKeys';
import Button from '../../common/Button';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import DropdownMenu from '../../ui/DropdownMenu';
import ProgressBar from '../../ui/ProgressBar';
import { SectionEyebrow } from '../../shared/PortfolioOverviewPanel';
import UserPicker, { UserAvatar } from './UserPicker';
import IconAccentPicker from './IconAccentPicker';
import { getAccent } from './portfolioTheme';
import { HealthPill } from './PortfolioStatusPills';
import { timeAgo, WORKFLOW_PRESET_OPTIONS } from './portfolioStatus';

// Replaces the legacy "Pillars" (embedded sections[].items[]) block inside
// AdminPortfolioPage.jsx's detail view with a React-Query-driven view of the
// new PortfolioGroup -> PortfolioCategory hierarchy. The old sections/items
// UI/API calls elsewhere in AdminPortfolioPage.jsx are left completely
// untouched — this panel is self-contained and talks only to the
// /api/portfolio-hierarchy endpoints.
const unwrap = (res) => res?.data ?? res ?? {};

const STATUS_CHIPS = [
  { key: 'published', label: 'Published', tone: 'bg-emerald-500' },
  { key: 'in_progress', label: 'In Progress', tone: 'bg-blue-500' },
  { key: 'in_review', label: 'Review', tone: 'bg-amber-500' },
  { key: 'draft', label: 'Draft', tone: 'bg-neutral-400' },
];

const sumByStatus = (categories) => {
  const totals = {};
  categories.forEach((c) => {
    Object.entries(c.stats?.byStatus || {}).forEach(([status, count]) => { totals[status] = (totals[status] || 0) + count; });
  });
  return totals;
};

const CategoryRow = ({ category, onOpen }) => {
  const stats = category.stats || { total: 0, byStatus: {}, overdue: 0 };
  const summary = Object.entries(stats.byStatus || {})
    .map(([status, count]) => `${count} ${status.replace(/_/g, ' ')}`)
    .join(' · ');
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{category.title}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-400">
          {stats.total} asset{stats.total === 1 ? '' : 's'}{summary ? ` — ${summary}` : ''}
          {stats.overdue ? <span className="ml-1.5 font-semibold text-rose-500">· {stats.overdue} overdue</span> : null}
        </p>
      </div>
      {stats.healthStatus === 'needs_attention' && <HealthPill value="needs_attention" />}
    </button>
  );
};

const GroupFormFields = ({ form, setForm }) => (
  <>
    <Input label="Name *" name="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required autoFocus />
    <Input label="Purpose" name="purpose" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Awareness + Organic Demand" />
    <Input label="Description" name="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
    <UserPicker label="Owner" value={form.ownerId} user={form.ownerUser} onChange={(id, u) => setForm((f) => ({ ...f, ownerId: id, ownerUser: u }))} />
    <IconAccentPicker icon={form.icon} accent={form.accent} onIconChange={(icon) => setForm((f) => ({ ...f, icon }))} onAccentChange={(accent) => setForm((f) => ({ ...f, accent }))} />
  </>
);

const CategoryFormFields = ({ form, setForm }) => (
  <>
    <Input label="Category Name *" name="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required autoFocus />
    <Input label="Description" name="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
    <Input label="Purpose" name="purpose" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="Why this category exists" />
    <div className="grid grid-cols-2 gap-3">
      <Input label="Default Asset Type" name="defaultAssetType" value={form.defaultAssetType} onChange={(e) => setForm((f) => ({ ...f, defaultAssetType: e.target.value }))} placeholder="e.g. Blog post" />
      <Select label="Default Workflow" name="workflowKey" options={WORKFLOW_PRESET_OPTIONS} value={form.workflowKey} onChange={(e) => setForm((f) => ({ ...f, workflowKey: e.target.value }))} />
    </div>
    <UserPicker label="Default Owner" value={form.ownerId} user={form.ownerUser} onChange={(id, u) => setForm((f) => ({ ...f, ownerId: id, ownerUser: u }))} />
    <UserPicker label="Default Reviewer" value={form.reviewerId} user={form.reviewerUser} onChange={(id, u) => setForm((f) => ({ ...f, reviewerId: id, reviewerUser: u }))} />
    <IconAccentPicker icon={form.icon} accent={form.accent} onIconChange={(icon) => setForm((f) => ({ ...f, icon }))} onAccentChange={(accent) => setForm((f) => ({ ...f, accent }))} />
  </>
);

const ReorderModal = ({ open, onClose, groups, portfolioId, token }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [order, setOrder] = useState([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds local edit-order state from the (already-fetched) tree whenever the modal opens or the tree refetches
    if (open) setOrder(groups);
  }, [open, groups]);
  const list = order.length ? order : groups;

  const saveMutation = useMutation({
    mutationFn: async (next) => {
      await Promise.all(next.map((g, idx) => portfolioHierarchyApi.updateGroup(token, g._id, { order: idx })));
    },
    onSuccess: () => {
      toast.success('Order saved.');
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.tree(portfolioId) });
      onClose();
    },
    onError: (err) => toast.error(err?.message || 'Failed to save order'),
  });

  const move = (index, dir) => {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  return (
    <Modal open={open} title="Reorder Portfolio Groups" onClose={onClose}>
      <div className="space-y-2">
        {list.map((g, i) => (
          <div key={g._id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-800">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{g.title}</span>
            <div className="flex gap-1">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"><span className="material-symbols-outlined text-[16px]">arrow_upward</span></button>
              <button type="button" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"><span className="material-symbols-outlined text-[16px]">arrow_downward</span></button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate(list)}>Save order</Button>
      </div>
    </Modal>
  );
};

const PortfolioGroupsPanel = ({ portfolioId, token, pillarsRef }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const [groupModal, setGroupModal] = useState(null);
  const [editGroup, setEditGroup] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [reorderOpen, setReorderOpen] = useState(false);

  const treeQuery = useQuery({
    queryKey: QK.portfolioHierarchy.tree(portfolioId),
    queryFn: () => portfolioHierarchyApi.getPortfolioTree(token, portfolioId),
    enabled: Boolean(token && portfolioId),
    ...cachePolicyFor(QK.portfolioHierarchy.tree(portfolioId)),
  });
  const tree = unwrap(treeQuery.data);
  const groups = tree.groups || [];

  const invalidateTree = () => queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.tree(portfolioId) });

  const createGroupMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.createGroup(token, portfolioId, body),
    onSuccess: () => { toast.success('Portfolio group created.'); invalidateTree(); setGroupModal(null); },
    onError: (err) => toast.error(err?.message || 'Failed to create group'),
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, body }) => portfolioHierarchyApi.updateGroup(token, groupId, body),
    onSuccess: () => { toast.success('Group updated.'); invalidateTree(); setEditGroup(null); },
    onError: (err) => toast.error(err?.message || 'Failed to update group'),
  });

  const createCategoryMutation = useMutation({
    mutationFn: ({ groupId, body }) => portfolioHierarchyApi.createCategory(token, groupId, body),
    onSuccess: () => { toast.success('Category created.'); invalidateTree(); setCategoryModal(null); },
    onError: (err) => toast.error(err?.message || 'Failed to create category'),
  });

  const archiveGroupMutation = useMutation({
    mutationFn: (groupId) => portfolioHierarchyApi.archiveGroup(token, groupId),
    onSuccess: () => { toast.success('Group archived.'); invalidateTree(); },
    onError: (err) => toast.error(err?.message || 'Failed to archive group'),
  });

  const handleArchiveGroup = async (group) => {
    const ok = await confirm({
      title: 'Archive this portfolio group?',
      message: `"${group.title}" and its categories will be hidden from the portfolio. This can be restored later.`,
      confirmLabel: 'Archive group',
      tone: 'warning',
    });
    if (ok) archiveGroupMutation.mutate(group._id);
  };

  const openGroupModal = () => setGroupModal({ title: '', purpose: '', description: '', ownerId: null, ownerUser: null, icon: 'view_column', accent: 'indigo' });
  const openEditGroup = (group) => setEditGroup({
    _id: group._id, title: group.title, purpose: group.purpose || '', description: group.description || '',
    ownerId: group.ownerId?._id || group.ownerId || null,
    ownerUser: group.ownerId && typeof group.ownerId === 'object' ? group.ownerId : null,
    icon: group.icon || 'view_column', accent: group.accent || 'indigo',
  });
  const openCategoryModal = (groupId) => setCategoryModal({
    groupId, title: '', description: '', purpose: '', defaultAssetType: '', workflowKey: 'content_publishing',
    ownerId: null, ownerUser: null, reviewerId: null, reviewerUser: null, icon: 'folder_open', accent: 'indigo',
  });

  return (
    <div ref={pillarsRef} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <SectionEyebrow>Portfolios</SectionEyebrow>
          <p className="mt-2 text-xs text-neutral-400">
            {groups.length} portfolio group{groups.length === 1 ? '' : 's'} · {tree.totals?.total || 0} tracked assets
          </p>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          {groups.length > 1 && <Button variant="secondary" size="sm" onClick={() => setReorderOpen(true)} icon={<span className="material-symbols-outlined text-lg">swap_vert</span>}>Reorder</Button>}
          <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" onClick={openGroupModal} icon={<span className="material-symbols-outlined text-lg">add</span>}>
            Add Portfolio Group
          </Button>
        </div>
      </div>

      {treeQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <span className="material-symbols-outlined mb-2 text-3xl text-neutral-300 dark:text-neutral-700">view_column</span>
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">No portfolio groups yet.</p>
          <Button size="sm" className="mt-4" onClick={openGroupModal} icon={<span className="material-symbols-outlined text-lg">add</span>}>
            Add your first group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const categories = group.categories || [];
            const groupTotal = categories.reduce((sum, c) => sum + (c.stats?.total || 0), 0);
            const byStatus = sumByStatus(categories);
            const pct = groupTotal === 0 ? 0 : Math.round(((byStatus.published || 0) / groupTotal) * 100);
            const accent = getAccent(group.accent);
            const owner = group.ownerId && typeof group.ownerId === 'object' ? group.ownerId : null;

            return (
              <div key={group._id} className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-neutral-900">
                <div className={`h-1.5 w-full bg-gradient-to-r ${accent.grad}`} />
                <div className="flex items-start justify-between gap-2 px-4 pt-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black uppercase tracking-wide text-neutral-900 dark:text-white">{group.title}</h3>
                    {group.purpose ? <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{group.purpose}</p> : null}
                  </div>
                  <DropdownMenu
                    items={[
                      { label: 'Edit', icon: 'edit', onClick: () => openEditGroup(group) },
                      { label: 'Archive', icon: 'archive', tone: 'danger', onClick: () => handleArchiveGroup(group) },
                    ]}
                  />
                </div>

                <p className="px-4 pt-2 text-[11px] font-semibold text-neutral-400">{categories.length} Categories · {groupTotal} Assets</p>

                <div className="px-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-neutral-900 dark:text-white">{pct}%</span>
                    <div className="flex-1"><ProgressBar value={pct} colorClass={pct === 100 ? 'bg-emerald-500' : accent.bar} /></div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_CHIPS.filter((c) => byStatus[c.key]).map((c) => (
                      <span key={c.key} className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${c.tone}`} /> {byStatus[c.key]} {c.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-0.5 p-2.5">
                  {categories.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-neutral-400">No categories yet.</p>
                  ) : (
                    categories.map((category) => (
                      <CategoryRow key={category._id} category={category} onOpen={() => navigate(`/admin/digital-portfolio/${portfolioId}/category/${category._id}`)} />
                    ))
                  )}
                </div>
                <div className="p-2.5 pt-0">
                  <button
                    type="button"
                    onClick={() => openCategoryModal(group._id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-400 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-neutral-700"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add category
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400 dark:border-neutral-800">
                  <span>Updated {timeAgo(group.updatedAt)}</span>
                  {owner && <span className="inline-flex items-center gap-1"><UserAvatar user={owner} size={14} />{owner.name}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(groupModal)} title="Add Portfolio Group" onClose={() => setGroupModal(null)}>
        {groupModal ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createGroupMutation.mutate(groupModal); }}>
            <GroupFormFields form={groupModal} setForm={setGroupModal} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setGroupModal(null)}>Cancel</Button>
              <Button type="submit" loading={createGroupMutation.isPending}>Create Portfolio Group</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(editGroup)} title="Edit Portfolio Group" onClose={() => setEditGroup(null)}>
        {editGroup ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); updateGroupMutation.mutate({ groupId: editGroup._id, body: editGroup }); }}>
            <GroupFormFields form={editGroup} setForm={setEditGroup} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditGroup(null)}>Cancel</Button>
              <Button type="submit" loading={updateGroupMutation.isPending}>Save changes</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(categoryModal)} title="Add Category" onClose={() => setCategoryModal(null)}>
        {categoryModal ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createCategoryMutation.mutate({ groupId: categoryModal.groupId, body: categoryModal }); }}>
            <CategoryFormFields form={categoryModal} setForm={setCategoryModal} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCategoryModal(null)}>Cancel</Button>
              <Button type="submit" loading={createCategoryMutation.isPending}>Create Category</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ReorderModal open={reorderOpen} onClose={() => setReorderOpen(false)} groups={groups} portfolioId={portfolioId} token={token} />
    </div>
  );
};

export default PortfolioGroupsPanel;
