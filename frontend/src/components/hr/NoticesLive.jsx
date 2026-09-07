import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '../../services/hr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { QK } from '../../utils/queryKeys';
import { Card, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MultiSelectCombobox from '../ui/MultiSelectCombobox';
import DataTable from '../ui/DataTable';
import Skeleton from '../ui/Skeleton';
import ErrorState from '../ui/ErrorState';
import StatusBadge from '../common/StatusBadge';
import SectionHeader from '../common/SectionHeader';
import FilterToolbar from '../common/FilterToolbar';

import { useCommunicationDirectory, fetchCommunicationPages, employeeName } from '../../features/hr/useCommunicationDirectory';

const audienceOptions = [
  { value: 'all', label: 'All Portals' },
  { value: 'employee', label: 'Employees' },
  { value: 'ceo', label: 'CEO' },
  { value: 'manager', label: 'Managers' },
  { value: 'freelancer', label: 'Outsourcing' },
  { value: 'admin', label: 'Admin' },
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'law', label: 'Law' },
  { value: 'media', label: 'Media' },
  { value: 'finance', label: 'Finance' },
  { value: 'sales', label: 'Sales' },
  { value: 'research', label: 'Research' },
];

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
];

const statusTone = {
  published: 'success',
  pending_review: 'warning',
  scheduled: 'info',
  draft: 'neutral',
};

const statusLabel = {
  published: 'Published',
  pending_review: 'Pending Review',
  scheduled: 'Scheduled',
  draft: 'Draft',
};

const emptyForm = {
  title: '',
  message: '',
  audience: 'all',
  department: '',
  recipientIds: [],
  publishDate: new Date().toISOString().slice(0, 10),
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const normalizeNotice = (notice) => ({
  id: notice?._id || notice?.metadata?.noticeId || notice?.originalId,
  title: notice?.title || 'Untitled notice',
  message: notice?.message || '',
  audience: notice?.audience || notice?.metadata?.audience || 'all',
  status: notice?.status || notice?.metadata?.status || 'published',
  publishDate: notice?.publishDate || notice?.metadata?.publishDate || notice?.createdAt,
  recipientCount: notice?.recipientCount ?? 0,
  department: notice?.metadata?.targetDepartment || '',
  recipientIds: notice?.metadata?.recipientIds || [],
  recipientNames: notice?.metadata?.selectedRecipientNames || [],
});

const getPayload = (response) => response?.data || response || {};

const NoticesLive = () => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [status, setStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const directory = useCommunicationDirectory(token);
  const employees = directory.data || [];
  const departments = [...new Set(employees.map((person) => person.department).filter(Boolean))].sort();
  const eligibleEmployees = employees.filter((person) => !form.department || person.department === form.department);
  const employeeOptions = eligibleEmployees.map((person) => ({
    value: person._id,
    label: employeeName(person),
    meta: person.department || person.role,
  }));

  const noticesParams = useMemo(() => ({}), []);

  const noticesQuery = useQuery({
    queryKey: QK.hr.notices(noticesParams),
    queryFn: async () => ({ data: { notices: await fetchCommunicationPages(hrApi.getNotices, token, 'notices') } }),
    enabled: Boolean(token),
    select: (response) => {
      const data = getPayload(response);
      const rows = Array.isArray(data.notices) ? data.notices : [];
      return rows.map(normalizeNotice);
    },
  });
  const notices = useMemo(() => noticesQuery.data || [], [noticesQuery.data]);
  const visibleNotices = notices.filter((notice) => (status === 'all' || notice.status === status) && (!departmentFilter || notice.department === departmentFilter) && `${notice.title} ${notice.message} ${notice.recipientNames.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const loading = noticesQuery.isLoading;
  const loadNotices = () => queryClient.invalidateQueries({ queryKey: ['hr', 'notices'] });
  const hasActiveFilters = Boolean(search || departmentFilter || status !== 'all');
  const clearFilters = () => {
    setSearch('');
    setDepartmentFilter('');
    setStatus('all');
  };

  const counts = useMemo(
    () => ({
      all: notices.length,
      published: notices.filter((notice) => notice.status === 'published').length,
      pending_review: notices.filter((notice) => notice.status === 'pending_review').length,
      scheduled: notices.filter((notice) => notice.status === 'scheduled').length,
      draft: notices.filter((notice) => notice.status === 'draft').length,
    }),
    [notices]
  );

  const statusToastMessage = {
    published: 'Notice published to the selected recipients.',
    pending_review: 'Sent for review. Approve it from the Pending Review tab when it is ready to go out.',
    scheduled: 'Scheduled notice saved.',
    draft: 'Draft saved.',
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setAttemptedSubmit(false);
  };

  const editNotice = (notice) => {
    setEditingId(notice.id);
    setAttemptedSubmit(false);
    setForm({
      title: notice.title,
      message: notice.message,
      audience: notice.audience,
      department: notice.department,
      recipientIds: notice.recipientIds,
      publishDate: (notice.publishDate ? new Date(notice.publishDate) : new Date()).toISOString().slice(0, 10),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitNotice = async (nextStatus) => {
    setAttemptedSubmit(true);
    if (!form.title.trim() || !form.message.trim()) {
      toast.warning('Add a title and message before publishing.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
        department: form.department,
        recipientIds: form.recipientIds,
        publishDate: form.publishDate,
        status: nextStatus,
      };
      if (editingId) {
        await hrApi.updateNotice(editingId, payload, token);
      } else {
        await hrApi.createNotice(payload, token);
      }
      resetForm();
      toast.success(statusToastMessage[nextStatus] || 'Notice saved.');
      await loadNotices();
    } catch (error) {
      toast.error(error.message || 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  const approveNotice = async (notice) => {
    setApprovingId(notice.id);
    try {
      await hrApi.updateNotice(notice.id, { status: 'published' }, token);
      toast.success('Notice approved and published to the selected recipients.');
      await loadNotices();
    } catch (error) {
      toast.error(error.message || 'Failed to publish notice');
    } finally {
      setApprovingId('');
    }
  };

  const deleteNotice = async (id) => {
    if (!id) return;
    setSaving(true);
    try {
      await hrApi.deleteNotice(id, token);
      if (editingId === id) resetForm();
      toast.success('Notice removed.');
      await loadNotices();
    } catch (error) {
      toast.error(error.message || 'Failed to remove notice');
    } finally {
      setSaving(false);
    }
  };

  const departmentFilterOptions = [{ value: '', label: 'All departments' }, ...departments.map((department) => ({ value: department, label: department }))];

  const activeChips = [
    departmentFilter && { key: 'department', label: `Department: ${departmentFilter}`, onRemove: () => setDepartmentFilter('') },
    status !== 'all' && { key: 'status', label: `Status: ${statusLabel[status] || status}`, onRemove: () => setStatus('all') },
  ].filter(Boolean);

  const audienceSummary = form.recipientIds.length
    ? `Sending to ${form.recipientIds.length} selected employee${form.recipientIds.length === 1 ? '' : 's'}.`
    : form.department
    ? `Sending to all eligible employees in ${form.department}.`
    : 'Sending to all eligible employees across all departments.';

  const rowActions = (notice) =>
    [
      notice.status !== 'published' && { key: 'edit', label: 'Edit', icon: 'edit', onClick: () => editNotice(notice) },
      notice.status === 'pending_review' && {
        key: 'approve',
        label: 'Approve & publish',
        icon: 'check_circle',
        disabled: approvingId === notice.id,
        onClick: () => approveNotice(notice),
      },
      { key: 'delete', label: 'Delete', icon: 'delete', tone: 'danger', onClick: () => deleteNotice(notice.id) },
    ].filter(Boolean);

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (notice) => (
        <div className="max-w-md">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{notice.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400" title={notice.message}>
            {notice.message}
          </p>
        </div>
      ),
    },
    {
      key: 'audience',
      header: 'Audience',
      render: (notice) => (
        <div>
          <p>{notice.department || 'All departments'}</p>
          <p className="mt-0.5 truncate text-xs text-neutral-500" title={notice.recipientNames.join(', ')}>
            {notice.recipientNames.length ? notice.recipientNames.join(', ') : (audienceOptions.find((option) => option.value === notice.audience)?.label || notice.audience)}
          </p>
        </div>
      ),
    },
    { key: 'recipients', header: 'Recipients', render: (notice) => notice.recipientCount },
    { key: 'date', header: 'Date', render: (notice) => formatDate(notice.publishDate) },
    {
      key: 'status',
      header: 'Status',
      render: (notice) => <StatusBadge tone={statusTone[notice.status] || 'neutral'} label={statusLabel[notice.status] || notice.status} />,
    },
  ];

  return (
    <section>
      <SectionHeader
        title="Notices & Announcements"
        description="Publish targeted updates across employees, CEO, managers, outsourcing, and department portals."
        actions={
          <Button variant="secondary" size="sm" onClick={loadNotices} icon={<span className="material-symbols-outlined text-base">refresh</span>}>
            Refresh
          </Button>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.8fr_minmax(300px,0.9fr)]">
        <Card className="h-fit">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{editingId ? 'Edit Announcement' : 'Announcement Content'}</h3>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-sm font-semibold text-primary">
                  Cancel edit
                </button>
              )}
            </div>

            <Input
              label="Title"
              name="notice-title"
              value={form.title}
              disabled={saving}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Announcement title"
              error={attemptedSubmit && !form.title.trim() ? 'Title is required.' : undefined}
            />

            <div>
              <label htmlFor="notice-message" className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Message</label>
              <textarea
                id="notice-message"
                value={form.message}
                disabled={saving}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                className="min-h-[170px] max-h-[360px] w-full resize-y rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                placeholder="Write the notice content"
              />
              <span className={`mt-1 block text-xs ${attemptedSubmit && !form.message.trim() ? 'text-red-600' : 'text-neutral-400'}`}>
                {attemptedSubmit && !form.message.trim() ? 'Message is required.' : `Plain text • ${form.message.length} characters`}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardBody className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Publishing &amp; Audience</h3>

            <div className="space-y-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Recipients</p>

              {directory.isLoading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : directory.isError ? (
                <p role="alert" className="text-sm text-rose-600">
                  Unable to load employees.{' '}
                  <button type="button" onClick={() => directory.refetch()} className="font-semibold text-primary">
                    Retry
                  </button>
                </p>
              ) : (
                <>
                  <Select
                    label="Department"
                    name="notice-department"
                    value={form.department}
                    disabled={saving}
                    onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value, recipientIds: [], audience: 'all' }))}
                    options={departmentFilterOptions}
                  />

                  <MultiSelectCombobox
                    label="Employees (optional)"
                    options={employeeOptions}
                    value={form.recipientIds}
                    disabled={saving}
                    onChange={(recipientIds) => setForm((prev) => ({ ...prev, recipientIds, audience: 'all' }))}
                    placeholder="Search employees…"
                    triggerLabel="All eligible employees"
                    emptyMessage="No employees match this department."
                  />

                  <Select
                    label="Audience"
                    name="notice-audience"
                    disabled={saving || form.recipientIds.length > 0}
                    value={form.audience}
                    onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
                    options={audienceOptions}
                  />

                  <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="material-symbols-outlined text-[14px] text-neutral-400">info</span>
                    {audienceSummary}
                  </p>
                </>
              )}
            </div>

            <div className="space-y-3.5 border-t border-neutral-100 pt-3.5 dark:border-neutral-800">
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Publishing</p>
              <Input
                label="Publish Date"
                name="notice-publish-date"
                type="date"
                disabled={saving}
                value={form.publishDate}
                onChange={(event) => setForm((prev) => ({ ...prev, publishDate: event.target.value }))}
              />
            </div>

            <div className="grid gap-2 border-t border-neutral-100 pt-3.5 dark:border-neutral-800">
              <Button size="sm" disabled={saving || directory.isLoading || directory.isError} onClick={() => submitNotice('published')}>
                {saving ? 'Publishing…' : 'Publish Announcement'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" disabled={saving || directory.isLoading || directory.isError} onClick={() => submitNotice('pending_review')}>
                  Submit for Review
                </Button>
                <Button variant="secondary" size="sm" disabled={saving || directory.isLoading || directory.isError} onClick={() => submitNotice('scheduled')}>
                  Schedule
                </Button>
              </div>
              <Button variant="ghost" size="sm" disabled={saving || directory.isLoading || directory.isError} onClick={() => submitNotice('draft')}>
                Save Draft
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        <FilterToolbar
          search={{ value: search, onChange: setSearch, label: 'Search announcements', placeholder: 'Search announcements or employees', width: 'w-72' }}
          primaryFilters={[{ key: 'department', label: 'Department', value: departmentFilter, onChange: setDepartmentFilter, options: departmentFilterOptions, width: 'w-44' }]}
          activeChips={activeChips}
          onClearAll={hasActiveFilters ? clearFilters : undefined}
        />

        <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 dark:border-neutral-800">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`rounded-t-lg px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                status === tab.value
                  ? 'border-b-2 border-primary font-semibold text-primary'
                  : 'font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {tab.label} ({counts[tab.value] || 0})
            </button>
          ))}
        </div>

        {noticesQuery.isError ? (
          <ErrorState title="Unable to load notices" description={noticesQuery.error?.message} onRetry={() => noticesQuery.refetch()} />
        ) : (
          <Card>
            <DataTable
              columns={columns}
              rows={visibleNotices}
              loading={loading}
              rowActions={rowActions}
              emptyTitle={hasActiveFilters ? 'No matching notices' : 'No notices yet'}
              emptyDescription={hasActiveFilters ? 'No notices match your current filters.' : 'Published, scheduled, and draft notices will appear here.'}
              emptyAction={hasActiveFilters ? { label: 'Clear filters', onClick: clearFilters } : undefined}
            />
          </Card>
        )}
      </div>
    </section>
  );
};

export default NoticesLive;
