import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '../../services/hr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { QK } from '../../utils/queryKeys';

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
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
];

const emptyForm = {
  title: '',
  message: '',
  audience: 'all',
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
  recipientCount: notice?.recipientCount || 1,
});

const getPayload = (response) => response?.data || response || {};

const NoticesLive = () => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('all');
  const [saving, setSaving] = useState(false);

  const noticesParams = useMemo(
    () => ({ page: 1, limit: 100, ...(status === 'all' ? {} : { status }) }),
    [status]
  );

  const noticesQuery = useQuery({
    queryKey: QK.hr.notices(noticesParams),
    queryFn: () => hrApi.getNotices(token, noticesParams),
    enabled: Boolean(token),
    select: (response) => {
      const data = getPayload(response);
      const rows = Array.isArray(data.notices) ? data.notices : [];
      return rows.map(normalizeNotice);
    },
  });
  const notices = useMemo(() => noticesQuery.data || [], [noticesQuery.data]);
  const loading = noticesQuery.isLoading;
  const loadNotices = () => queryClient.invalidateQueries({ queryKey: ['hr', 'notices'] });

  const counts = useMemo(
    () => ({
      all: notices.length,
      published: notices.filter((notice) => notice.status === 'published').length,
      scheduled: notices.filter((notice) => notice.status === 'scheduled').length,
      draft: notices.filter((notice) => notice.status === 'draft').length,
    }),
    [notices]
  );

  const submitNotice = async (nextStatus) => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.warning('Add a title and message before publishing.');
      return;
    }
    setSaving(true);
    try {
      await hrApi.createNotice(
        {
          title: form.title.trim(),
          message: form.message.trim(),
          audience: form.audience,
          publishDate: form.publishDate,
          status: nextStatus,
        },
        token
      );
      setForm(emptyForm);
      toast.success('Notice saved and sent to the selected portal users.');
      await loadNotices();
    } catch (error) {
      toast.error(error.message || 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  const deleteNotice = async (id) => {
    if (!id) return;
    setSaving(true);
    try {
      await hrApi.deleteNotice(id, token);
      toast.success('Notice removed.');
      await loadNotices();
    } catch (error) {
      toast.error(error.message || 'Failed to remove notice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex min-w-72 flex-col gap-2">
            <h1 className="text-3xl font-black leading-tight text-neutral-800 dark:text-neutral-100">
              Notices &amp; Announcements
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Publish updates to employees, CEO, managers, outsourcing, and department portals.
            </p>
          </div>
          <button
            type="button"
            onClick={loadNotices}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">New Announcement</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Title
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal dark:border-neutral-700 dark:bg-neutral-950"
                  placeholder="Announcement title"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Message
                <textarea
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  rows={9}
                  className="resize-none rounded-lg border border-neutral-200 bg-white p-3 text-sm font-normal dark:border-neutral-700 dark:bg-neutral-950"
                  placeholder="Write the notice content"
                />
              </label>
            </div>
          </section>

          <aside className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Publishing Options</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Audience
                <select
                  value={form.audience}
                  onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
                  className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal dark:border-neutral-700 dark:bg-neutral-950"
                >
                  {audienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Publish Date
                <input
                  type="date"
                  value={form.publishDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, publishDate: event.target.value }))}
                  className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>
              <div className="grid gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitNotice('published')}
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitNotice('scheduled')}
                  className="h-10 rounded-lg bg-neutral-100 px-4 text-sm font-bold text-neutral-800 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  Schedule
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitNotice('draft')}
                  className="text-sm font-semibold text-primary disabled:opacity-60"
                >
                  Save Draft
                </button>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-8">
          <div className="flex border-b border-neutral-200 dark:border-neutral-800">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={`px-4 py-3 text-sm ${
                  status === tab.value
                    ? 'border-b-2 border-primary font-semibold text-primary'
                    : 'font-medium text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {tab.label} ({counts[tab.value] || 0})
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-b-xl border-x border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Title</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Audience</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Recipients</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Date</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="p-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-6 text-center text-sm text-neutral-500" colSpan={6}>
                      Loading notices...
                    </td>
                  </tr>
                ) : notices.length ? (
                  notices.map((notice) => (
                    <tr key={notice.id} className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800">
                      <td className="max-w-md p-4">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{notice.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">{notice.message}</p>
                      </td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">
                        {audienceOptions.find((option) => option.value === notice.audience)?.label || notice.audience}
                      </td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">{notice.recipientCount}</td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">{formatDate(notice.publishDate)}</td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold capitalize text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                          {notice.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => deleteNotice(notice.id)}
                          className="rounded-full p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          aria-label="Delete notice"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-6 text-center text-sm text-neutral-500" colSpan={6}>
                      No notices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default NoticesLive;
