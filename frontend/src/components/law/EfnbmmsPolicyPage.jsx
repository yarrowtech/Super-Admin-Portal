import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { policyService } from '../../services/policy';
import { lawApi } from '../../services/law';
import { PortalHeader, StatusBadge, Tabs } from '../common';
import FilterToolbar from '../common/FilterToolbar';
import { Button, EmptyState, Input, Modal, SectionCard, Skeleton } from '../ui';
import EfnbmmsConsumerPreview from './EfnbmmsConsumerPreview';
import EfnbmmsApiClients from './EfnbmmsApiClients';

const STATUS_TONE = {
  DRAFT: 'neutral',
  IN_REVIEW: 'info',
  APPROVED: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'danger',
};

const STATUS_ICON = {
  DRAFT: 'edit_note',
  IN_REVIEW: 'rate_review',
  APPROVED: 'task_alt',
  PUBLISHED: 'public',
  ARCHIVED: 'inventory_2',
};

const NEXT_ACTION = {
  DRAFT: { label: 'Publish', call: 'publish', icon: 'public' },
  IN_REVIEW: { label: 'Approve', call: 'approve', icon: 'task_alt' },
  APPROVED: { label: 'Publish', call: 'publish', icon: 'public' },
  PUBLISHED: { label: 'Archive', call: 'archive', icon: 'inventory_2' },
};

const emptyForm = { title: '', policyCode: '', policyType: 'PRIVACY_POLICY', category: '', description: '', owner: '', content: '' };

const STAT_CARDS = [
  { key: 'DRAFT', label: 'Draft', icon: 'edit_note', tone: 'neutral' },
  { key: 'IN_REVIEW', label: 'In Review', icon: 'rate_review', tone: 'info' },
  { key: 'APPROVED', label: 'Approved', icon: 'task_alt', tone: 'warning' },
  { key: 'PUBLISHED', label: 'Published', icon: 'public', tone: 'success' },
  { key: 'ARCHIVED', label: 'Archived', icon: 'inventory_2', tone: 'danger' },
];

const STAT_ACCENT = {
  neutral: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
};

export default function EfnbmmsPolicyPage() {
  const { token, user } = useAuth();

  // Projects come straight from the database (the same source the IP &
  // Copyright screen uses) — nothing here is hardcoded to EFNBMMS.
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectId, setProjectId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const closeCreateModal = useCallback(() => setCreateOpen(false), []);
  const openCreate = useCallback(() => {
    if (!projectId) { setError('Select a project before creating a policy.'); return; }
    setForm(emptyForm); setCreateOpen(true);
  }, [projectId]);
  const closeEditModal = useCallback(() => setEditOpen(false), []);
  const [actionBusy, setActionBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  const [mainTab, setMainTab] = useState('policies');
  const [detailTab, setDetailTab] = useState('content');

  useEffect(() => {
    if (!token) return;
    setProjectsLoading(true);
    lawApi.getProjects(token, { limit: 100 })
      .then((res) => setProjects(res?.data?.items || []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [token]);

  const selectedProject = useMemo(() => projects.find((item) => item._id === projectId) || null, [projects, projectId]);

  const loadPolicies = useCallback(async () => {
    if (!projectId) { setPolicies([]); return; }
    setLoading(true); setError('');
    try {
      const list = await policyService.list(token, { projectId, search: search || undefined, limit: 100 });
      setPolicies(list?.data?.items || list?.data || []);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load policies.');
    } finally { setLoading(false); }
  }, [token, projectId, search]);

  useEffect(() => {
    if (!token) return;
    setSelected(null); setDetail(null); setVersions([]); setStatusFilter('');
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId, search]);

  const visiblePolicies = useMemo(
    () => (statusFilter ? policies.filter((item) => item.status === statusFilter) : policies),
    [policies, statusFilter]
  );

  const openPolicy = async (item) => {
    setSelected(item);
    setDetail(null);
    setDetailTab('content');
    setDetailLoading(true);
    try {
      const [versionRes, detailRes] = await Promise.all([
        policyService.versions(token, item._id),
        policyService.get(token, item._id),
      ]);
      setVersions(versionRes?.data?.items || []);
      setDetail(detailRes?.data || null);
    } catch { setVersions([]); setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (!projectId) return;
    setSaving(true); setError('');
    try {
      await policyService.create(token, { ...form, projectId });
      setCreateOpen(false); setForm(emptyForm);
      await loadPolicies();
    } catch (requestError) { setError(requestError?.message || 'Unable to create policy.'); }
    finally { setSaving(false); }
  };

  const runTransition = async (item, call) => {
    const action = call || NEXT_ACTION[item.status]?.call;
    if (!action) return;
    setActionBusy(true); setError('');
    try {
      await policyService[action](token, item._id);
      await loadPolicies();
      if (selected?._id === item._id) await openPolicy(item);
    } catch (requestError) { setError(requestError?.message || 'Action failed.'); }
    finally { setActionBusy(false); }
  };

  const openEdit = () => {
    if (!selected) return;
    setForm({
      title: selected.title || '',
      policyCode: selected.policyCode || '',
      policyType: selected.type || 'PRIVACY_POLICY',
      category: selected.category || '',
      description: selected.description || '',
      owner: selected.owner || '',
      content: detail?.currentVersion?.content || '',
    });
    setEditOpen(true);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true); setError('');
    try {
      await policyService.update(token, selected._id, {
        title: form.title,
        description: form.description,
      });
      setEditOpen(false);
      await loadPolicies();
      await openPolicy({ ...selected });
    } catch (requestError) { setError(requestError?.message || 'Unable to update policy.'); }
    finally { setSaving(false); }
  };

  const deletePolicy = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
    setDeleteBusy(true); setError('');
    try {
      await policyService.remove(token, selected._id);
      setSelected(null); setDetail(null); setVersions([]);
      await loadPolicies();
    } catch (requestError) { setError(requestError?.message || 'Unable to delete policy.'); }
    finally { setDeleteBusy(false); }
  };

  const clearAll = () => { setSearch(''); setProjectId(''); setStatusFilter(''); };
  const toggleStatus = (key) => setStatusFilter((current) => (current === key ? '' : key));

  const counts = useMemo(() => {
    const byStatus = { DRAFT: 0, IN_REVIEW: 0, APPROVED: 0, PUBLISHED: 0, ARCHIVED: 0 };
    policies.forEach((item) => { byStatus[item.status] = (byStatus[item.status] || 0) + 1; });
    return byStatus;
  }, [policies]);

  const nextAction = selected ? NEXT_ACTION[selected.status] : null;
  const projectLabel = selectedProject?.name || selectedProject?.projectCode || '';

  return (
    <div className="pb-10">
      <PortalHeader
        title="Privacy and Policy Management"
        icon="policy"
        user={user}
        primaryAction={{ label: 'New Policy', icon: 'add', onClick: openCreate }}
      />

      <div className="mx-4 mt-5 lg:mx-6">
        <FilterToolbar
          search={{ value: search, onChange: setSearch, placeholder: 'Search privacy & policy records', label: 'Search policies' }}
          primaryFilters={[{
            key: 'project',
            label: 'Project',
            value: projectId,
            onChange: setProjectId,
            width: 'w-48',
            options: [
              { value: '', label: projectsLoading ? 'Loading…' : 'Select Project' },
              ...projects.map((item) => ({ value: item._id, label: item.name || item.projectCode })),
            ],
          }]}
          activeChips={[
            ...(projectId ? [{ key: 'project', label: `Project: ${projectLabel}`, onRemove: () => setProjectId('') }] : []),
            ...(statusFilter ? [{ key: 'status', label: `Status: ${statusFilter.replace('_', ' ')}`, onRemove: () => setStatusFilter('') }] : []),
          ]}
          onClearAll={(projectId || search || statusFilter) ? clearAll : undefined}
        />
      </div>

      {projectId && (
        <div className="mx-4 mt-5 lg:mx-6">
          <Tabs
            items={[
              { key: 'policies', label: 'Policy Workspace', icon: 'policy' },
              { key: 'api', label: 'API Access', icon: 'vpn_key' },
            ]}
            activeKey={mainTab}
            onChange={setMainTab}
          />
        </div>
      )}

      {error && (
        <div role="alert" className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 lg:mx-6">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      {!projectId ? (
        <div className="mx-4 mt-5 lg:mx-6">
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <EmptyState
              icon="folder_managed"
              title="No project selected"
              description="Choose a project from the selector above to view and manage its privacy policies."
            />
          </div>
        </div>
      ) : mainTab === 'policies' ? <>
      <div className="mx-4 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mx-6 lg:grid-cols-5">
        {STAT_CARDS.map(({ key, label, icon, tone }) => {
          const active = statusFilter === key;
          return (
          <button
            type="button"
            key={key}
            onClick={() => toggleStatus(key)}
            aria-pressed={active}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors dark:bg-neutral-900 ${active ? 'border-[var(--portal-accent)] ring-2 ring-[var(--portal-accent)]/30' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800'}`}
            style={{ boxShadow: 'var(--erp-shadow-soft)' }}
          >
            <div className="flex items-start justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${STAT_ACCENT[tone]}`}>
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
              </span>
              <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{loading ? '–' : counts[key]}</p>
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
          </button>
          );
        })}
      </div>

      <div className="mx-4 mt-5 grid grid-cols-1 gap-4 lg:mx-6 lg:grid-cols-5 lg:items-start">
        <SectionCard
          className="lg:col-span-2"
          title="Policies"
          icon="folder_managed"
          description={projectLabel}
          loading={loading}
          skeletonRows={4}
          empty={!loading && !visiblePolicies.length}
          emptyIcon="policy"
          emptyTitle="No policies found"
          emptyDescription={(search || statusFilter) ? 'No policies match the current filters.' : `Create the first policy for ${projectLabel}.`}
          emptyAction={{ label: (search || statusFilter) ? 'Clear filters' : 'New Policy', onClick: (search || statusFilter) ? clearAll : openCreate }}
          noBodyPadding
        >
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {visiblePolicies.map((item) => {
              const isActive = selected?._id === item._id;
              const versionNumber = (typeof item.currentVersion === 'object' ? item.currentVersion?.versionNumber : item.currentVersion) || 1;
              return (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => openPolicy(item)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${isActive ? 'bg-neutral-50 dark:bg-neutral-800/60' : ''}`}
                    style={isActive ? { boxShadow: 'inset 3px 0 0 var(--portal-accent)' } : undefined}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STAT_ACCENT[STATUS_TONE[item.status]] || STAT_ACCENT.neutral}`}>
                      <span className="material-symbols-outlined text-[18px]">{STATUS_ICON[item.status] || 'policy'}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.title}</p>
                      <p className="truncate text-xs text-neutral-500">{item.policyCode} · v{versionNumber}</p>
                    </div>
                    <StatusBadge tone={STATUS_TONE[item.status] || 'neutral'} label={item.status?.replace('_', ' ')} />
                  </button>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <div className="lg:col-span-3">
          {!selected ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
              <EmptyState icon="policy" title="Select a policy" description="Choose a policy on the left to review its content, versions, and consumer preview." />
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900" style={{ boxShadow: 'var(--erp-shadow-soft)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-black text-neutral-900 dark:text-neutral-100">{selected.title}</h2>
                    <StatusBadge tone={STATUS_TONE[selected.status] || 'neutral'} label={selected.status?.replace('_', ' ')} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{selected.policyCode} · owner: {selected.owner || 'Unassigned'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
                    <span className="material-symbols-outlined text-base">visibility</span>
                    Consumer Preview
                  </Button>
                  <Button variant="secondary" size="sm" onClick={openEdit}>
                    <span className="material-symbols-outlined text-base">edit</span>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" disabled={deleteBusy} onClick={deletePolicy}>
                    <span className="material-symbols-outlined text-base">delete</span>
                    {deleteBusy ? 'Deleting…' : 'Delete'}
                  </Button>
                  {nextAction && (
                    <Button size="sm" disabled={actionBusy} onClick={() => runTransition(selected)}>
                      <span className="material-symbols-outlined text-base">{nextAction.icon}</span>
                      {actionBusy ? 'Working…' : nextAction.label}
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-b border-neutral-100 px-5 pt-3 dark:border-neutral-800">
                <Tabs
                  items={[
                    { key: 'content', label: 'Content', icon: 'description' },
                    { key: 'versions', label: 'Versions', icon: 'history', badge: versions.length || undefined },
                  ]}
                  activeKey={detailTab}
                  onChange={setDetailTab}
                />
              </div>

              <div className="p-5">
                {detailTab === 'content' && (
                  detailLoading ? <Skeleton className="h-32 w-full" /> : (
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 text-sm leading-6 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-300">
                      {detail?.currentVersion?.content || detail?.description || 'No content written yet for this version.'}
                    </div>
                  )
                )}

                {detailTab === 'versions' && (
                  detailLoading ? <Skeleton className="h-24 w-full" /> : (
                    <ul className="space-y-1.5">
                      {versions.map((version) => (
                        <li key={version._id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm dark:border-neutral-800">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">v{version.versionNumber} <span className="font-normal text-neutral-400">— {version.status}</span></span>
                          <span className="text-xs text-neutral-500">{version.publishedAt ? new Date(version.publishedAt).toLocaleDateString() : 'not published'}</span>
                        </li>
                      ))}
                      {!versions.length && <li className="text-sm text-neutral-500">No versions yet.</li>}
                    </ul>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </> : (
        <div className="mx-4 mt-5 lg:mx-6">
          <EfnbmmsApiClients token={token} projectId={projectId} projectLabel={projectLabel} />
        </div>
      )}

      <Modal
        open={createOpen}
        title="New Policy"
        description={`Draft a policy for ${projectLabel}. It starts in Draft status.`}
        onClose={closeCreateModal}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={closeCreateModal}>Cancel</Button><Button type="submit" form="efnbmms-policy-form" disabled={saving}>{saving ? 'Saving…' : 'Create policy'}</Button></div>}
      >
        <form id="efnbmms-policy-form" onSubmit={submitCreate} className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1"><Input label="Title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
            <span className="mb-2.5 shrink-0 rounded-lg bg-neutral-100 px-3 py-2.5 text-sm font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">v1</span>
          </div>
          <Input label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Policy content (shown to end users)</span>
            <textarea
              className="min-h-32 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder="Full policy text the end user will read and agree to…"
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={editOpen}
        title="Edit Policy"
        description="Updates title and description only. To change published content, publish this version and create a new draft version."
        onClose={closeEditModal}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={closeEditModal}>Cancel</Button><Button type="submit" form="efnbmms-policy-edit-form" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></div>}
      >
        <form id="efnbmms-policy-edit-form" onSubmit={submitEdit} className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1"><Input label="Title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
            <span className="mb-2.5 shrink-0 rounded-lg bg-neutral-100 px-3 py-2.5 text-sm font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              v{(typeof selected?.currentVersion === 'object' ? selected.currentVersion?.versionNumber : selected?.currentVersion) || 1}
            </span>
          </div>
          <Input label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </form>
      </Modal>

      <EfnbmmsConsumerPreview
        open={previewOpen}
        onClose={closePreview}
        policy={selected}
        detail={detail}
        token={token}
        projectId={projectId}
      />
    </div>
  );
}
