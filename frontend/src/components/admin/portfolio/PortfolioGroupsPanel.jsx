import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../context/ToastContext';
import { useConfirmDialog } from '../../../context/ConfirmDialogContext';
import { portfolioHierarchyApi } from '../../../services/portfolioHierarchy';
import { QK } from '../../../utils/queryKeys';
import Button from '../../common/Button';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import { SectionEyebrow } from '../../shared/PortfolioOverviewPanel';

// Replaces the legacy "Pillars" (embedded sections[].items[]) block inside
// AdminPortfolioPage.jsx's detail view with a React-Query-driven view of the
// new PortfolioGroup -> PortfolioCategory hierarchy (Foundation phase). The
// old sections/items UI/API calls elsewhere in AdminPortfolioPage.jsx are left
// completely untouched — this panel is self-contained and talks only to the
// new /api/portfolio-hierarchy endpoints.
const unwrap = (res) => res?.data ?? res ?? {};

const CategoryRow = ({ category, onOpen, onArchive }) => {
  const stats = category.stats || { total: 0, byStatus: {}, overdue: 0, needsReview: 0 };
  const summary = Object.entries(stats.byStatus || {})
    .map(([status, count]) => `${count} ${status.replace(/_/g, ' ')}`)
    .join(' · ');
  return (
    <div className="group flex items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{category.title}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-400">
          {stats.total} asset{stats.total === 1 ? '' : 's'}{summary ? ` — ${summary}` : ''}
          {stats.overdue ? <span className="ml-1.5 font-semibold text-rose-500">· {stats.overdue} overdue</span> : null}
        </p>
      </button>
      <button
        type="button"
        onClick={onArchive}
        title="Move category to trash"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-900/20"
        aria-label="Move category to trash"
      >
        <span className="material-symbols-outlined text-[15px]">delete</span>
      </button>
    </div>
  );
};

const PortfolioGroupsPanel = ({ portfolioId, token, pillarsRef }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const [groupModal, setGroupModal] = useState(null); // { title, description }
  const [categoryModal, setCategoryModal] = useState(null); // { groupId, title, description }

  const treeQuery = useQuery({
    queryKey: QK.portfolioHierarchy.tree(portfolioId),
    queryFn: () => portfolioHierarchyApi.getPortfolioTree(token, portfolioId),
    enabled: Boolean(token && portfolioId),
  });
  const tree = unwrap(treeQuery.data);
  const groups = tree.groups || [];

  const invalidateTree = () => queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.tree(portfolioId) });

  const createGroupMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.createGroup(token, portfolioId, body),
    onSuccess: () => { toast.success('Portfolio group created.'); invalidateTree(); setGroupModal(null); },
    onError: (err) => toast.error(err?.message || 'Failed to create group'),
  });

  const createCategoryMutation = useMutation({
    mutationFn: ({ groupId, body }) => portfolioHierarchyApi.createCategory(token, groupId, body),
    onSuccess: () => { toast.success('Category created.'); invalidateTree(); setCategoryModal(null); },
    onError: (err) => toast.error(err?.message || 'Failed to create category'),
  });

  const trashCategoryMutation = useMutation({
    mutationFn: (categoryId) => portfolioHierarchyApi.trashCategory(token, categoryId),
    onSuccess: () => { toast.success('Category moved to trash.'); invalidateTree(); },
    onError: (err) => toast.error(err?.message || 'Failed to trash category'),
  });

  const trashGroupMutation = useMutation({
    mutationFn: (groupId) => portfolioHierarchyApi.trashGroup(token, groupId),
    onSuccess: () => { toast.success('Group moved to trash.'); invalidateTree(); },
    onError: (err) => toast.error(err?.message || 'Failed to trash group'),
  });

  const handleTrashCategory = async (category) => {
    const ok = await confirm({
      title: 'Move category to trash?',
      message: `"${category.title}" and its assets will be hidden from the workspace. This can be restored later.`,
      confirmLabel: 'Move to trash',
      tone: 'danger',
    });
    if (ok) trashCategoryMutation.mutate(category._id);
  };

  const handleTrashGroup = async (group) => {
    const ok = await confirm({
      title: 'Move group to trash?',
      message: `"${group.title}" and its categories will be hidden from the workspace. This can be restored later.`,
      confirmLabel: 'Move to trash',
      tone: 'danger',
    });
    if (ok) trashGroupMutation.mutate(group._id);
  };

  return (
    <div ref={pillarsRef} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <SectionEyebrow>Portfolios</SectionEyebrow>
          <p className="mt-2 text-xs text-neutral-400">
            {groups.length} portfolio group{groups.length === 1 ? '' : 's'} · {tree.totals?.total || 0} tracked assets
          </p>
        </div>
        <Button variant="secondary" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => setGroupModal({ title: '', description: '' })} icon={<span className="material-symbols-outlined text-lg">add</span>}>
          Add Portfolio Group
        </Button>
      </div>

      {treeQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <span className="material-symbols-outlined mb-2 text-3xl text-neutral-300 dark:text-neutral-700">view_column</span>
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">No portfolio groups yet.</p>
          <Button size="sm" className="mt-4" onClick={() => setGroupModal({ title: '', description: '' })} icon={<span className="material-symbols-outlined text-lg">add</span>}>
            Add your first group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const categories = group.categories || [];
            const groupTotal = categories.reduce((sum, c) => sum + (c.stats?.total || 0), 0);
            const groupPublished = categories.reduce((sum, c) => sum + (c.stats?.byStatus?.published || 0), 0);
            const pct = groupTotal === 0 ? 0 : Math.round((groupPublished / groupTotal) * 100);
            return (
              <div key={group._id} className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-neutral-900">
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                <div className="flex items-center justify-between gap-2 px-4 pt-3">
                  <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-white">{group.title}</h3>
                  <button type="button" onClick={() => handleTrashGroup(group)} title="Move group to trash" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20" aria-label="Move group to trash">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
                {group.description ? <p className="px-4 pt-1 text-xs text-neutral-500 dark:text-neutral-400">{group.description}</p> : null}
                <p className="px-4 pt-2 text-[11px] font-semibold text-neutral-400">{groupPublished}/{groupTotal} published · {pct}%</p>

                <div className="flex-1 space-y-0.5 p-2.5">
                  {categories.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-neutral-400">No categories yet.</p>
                  ) : (
                    categories.map((category) => (
                      <CategoryRow
                        key={category._id}
                        category={category}
                        onOpen={() => navigate(`/admin/digital-portfolio/${portfolioId}/category/${category._id}`)}
                        onArchive={() => handleTrashCategory(category)}
                      />
                    ))
                  )}
                </div>
                <div className="p-2.5 pt-0">
                  <button
                    type="button"
                    onClick={() => setCategoryModal({ groupId: group._id, title: '', description: '' })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-400 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-neutral-700"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add category
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(groupModal)} title="Add Portfolio Group" onClose={() => setGroupModal(null)}>
        {groupModal ? (
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); createGroupMutation.mutate({ title: groupModal.title, description: groupModal.description }); }}
          >
            <Input label="Group title" name="groupTitle" value={groupModal.title} onChange={(e) => setGroupModal((f) => ({ ...f, title: e.target.value }))} required />
            <Input label="Purpose / description" name="groupDescription" value={groupModal.description} onChange={(e) => setGroupModal((f) => ({ ...f, description: e.target.value }))} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setGroupModal(null)}>Cancel</Button>
              <Button type="submit" loading={createGroupMutation.isPending}>Create group</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(categoryModal)} title="Add Category" onClose={() => setCategoryModal(null)}>
        {categoryModal ? (
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); createCategoryMutation.mutate({ groupId: categoryModal.groupId, body: { title: categoryModal.title, description: categoryModal.description } }); }}
          >
            <Input label="Category title" name="categoryTitle" value={categoryModal.title} onChange={(e) => setCategoryModal((f) => ({ ...f, title: e.target.value }))} required />
            <Input label="Description" name="categoryDescription" value={categoryModal.description} onChange={(e) => setCategoryModal((f) => ({ ...f, description: e.target.value }))} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCategoryModal(null)}>Cancel</Button>
              <Button type="submit" loading={createCategoryMutation.isPending}>Create category</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
};

export default PortfolioGroupsPanel;
