import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PortalHeader from '../common/PortalHeader';
import StatusBadge from '../common/StatusBadge';
import { Card, Modal, Input, Select, EmptyState, CardSkeleton } from '../ui';
import Button from '../common/Button';

const statusTone = { draft: 'neutral', open: 'success', closed: 'danger' };

const typeOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'remote', label: 'Remote' },
  { value: 'internship', label: 'Internship' },
];

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
];

const emptyForm = { title: '', location: 'Company HQ', type: 'full-time', experience: '', salaryRange: '', description: '', status: 'draft', openings: 1 };

/**
 * Department-parameterized recruitment postings page: list, filter by status,
 * create, edit and delete. `api` needs token-first `getJobPosts`, `createJobPost`,
 * `updateJobPost`, `deleteJobPost` (e.g. a createDepartmentModulesApi() instance).
 * Fields mirror backend/models/hr/JobPost.js, which HR's controller operates on;
 * every department's `/jobs` endpoint reuses those controller functions.
 * Edit/delete controls only render when the api supplies those functions.
 */
const DepartmentJobs = ({ api, portalLabel = 'Department' }) => {
  const { token } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const canEdit = Boolean(api?.updateJobPost);
  const canDelete = Boolean(api?.deleteJobPost);

  const fetchJobs = async () => {
    if (!token || !api?.getJobPosts) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getJobPosts(token);
      const list = res?.data || [];
      setJobs(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load job posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (job) => {
    setEditingId(job._id);
    setForm({
      title: job.title || '',
      location: job.location || '',
      type: job.type || 'full-time',
      experience: job.experience || '',
      salaryRange: job.salaryRange || '',
      description: job.description || '',
      status: job.status || 'draft',
      openings: job.openings || 1,
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, openings: Number(form.openings) || 1 };
      if (editingId) await api.updateJobPost(token, editingId, body);
      else await api.createJobPost(token, body);
      toast.success(editingId ? 'Job post updated successfully' : 'Job post created successfully');
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchJobs();
    } catch (err) {
      toast.error(err.message || 'Failed to save job post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteJobPost(token, deleteTarget._id);
      toast.success('Job post deleted');
      setDeleteTarget(null);
      fetchJobs();
    } catch (err) {
      toast.error(err.message || 'Failed to delete job post');
    } finally {
      setDeleting(false);
    }
  };

  const visibleJobs = statusFilter ? jobs.filter((job) => job.status === statusFilter) : jobs;
  const countFor = (value) => (value ? jobs.filter((job) => job.status === value).length : jobs.length);

  return (
    <div className="portal-page-inner space-y-5">
      <PortalHeader
        title={`${portalLabel} Jobs`}
        subtitle="Recruitment postings for this department."
        icon="work_outline"
        onRefresh={fetchJobs}
        refreshing={loading}
        primaryAction={{ label: 'New Job Post', icon: 'add', onClick: openCreate }}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          {error}
        </div>
      )}

      {loading ? (
        <CardSkeleton count={4} />
      ) : jobs.length === 0 ? (
        <EmptyState icon="work_outline" title="No job posts yet" description="Create your first job post using the button above." actionLabel="New Job Post" onAction={openCreate} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {statusFilters.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === option.value
                    ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`}
              >
                {option.label} ({countFor(option.value)})
              </button>
            ))}
          </div>

          {visibleJobs.length === 0 ? (
            <EmptyState icon="work_outline" title="No jobs with this status" description="Try a different status filter." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleJobs.map((job) => (
                <Card key={job._id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">{job.title}</h3>
                    <StatusBadge tone={statusTone[job.status] || 'neutral'} label={job.status} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{job.location} · {job.type}</p>
                  {job.description && <p className="mt-2 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">{job.description}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                    <span>{job.openings || 1} opening{(job.openings || 1) === 1 ? '' : 's'}</span>
                    {job.salaryRange && <span>{job.salaryRange}</span>}
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="mt-3 flex justify-end gap-1 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(job)}
                          aria-label={`Edit ${job.title}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(job)}
                          aria-label={`Delete ${job.title}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit Job Post' : 'New Job Post'}>
        <form onSubmit={handleSave} className="space-y-3">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={typeOptions} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Experience" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
            <Input label="Salary Range" value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} />
          </div>
          <Input label="Openings" type="number" min={1} value={form.openings} onChange={(e) => setForm({ ...form, openings: e.target.value })} />
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'draft', label: 'Draft' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Job Post'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete Job Post">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Delete <span className="font-semibold">{deleteTarget?.title}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" type="button" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button type="button" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default DepartmentJobs;
