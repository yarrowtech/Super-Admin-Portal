import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { hrApi } from '../../services/hr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'workplace-harassment', label: 'Workplace Harassment' },
  { value: 'work-environment', label: 'Work Environment' },
  { value: 'policy-violation', label: 'Policy Violation' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'leave', label: 'Leave' },
  { value: 'other', label: 'Other' },
];

const statuses = [
  { value: 'all', label: 'All Status' },
  { value: 'pending-review', label: 'Pending Review' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'closed', label: 'Closed' },
];

const priorities = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const getPayload = (response) => response?.data || response || {};

const fullName = (user) => {
  if (!user) return 'Unassigned';
  if (typeof user === 'string') return user;
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown user';
};

const normalizeComplaint = (complaint) => ({
  id: complaint?._id || complaint?.id,
  code: complaint?.metadata?.code || complaint?._id?.slice?.(-6)?.toUpperCase() || 'CMP',
  title: complaint?.title || 'Untitled complaint',
  description: complaint?.description || '',
  category: complaint?.category || 'other',
  priority: complaint?.priority || 'medium',
  status: complaint?.status || 'pending-review',
  complainant: complaint?.metadata?.anonymous
    ? 'Anonymous'
    : fullName(complaint?.complainant),
  department: complaint?.complainant?.department || complaint?.metadata?.department || '-',
  assignedTo: fullName(complaint?.assignedTo),
  createdAt: complaint?.createdAt,
  resolvedDate: complaint?.resolvedDate,
  satisfactionRating: complaint?.satisfactionRating,
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const badgeClass = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100',
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100',
  investigating: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100',
  'pending-review': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100',
  escalated: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100',
  closed: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
};

const labelFor = (collection, value) => collection.find((item) => item.value === value)?.label || value;

const ComplaintSolutionsLive = () => {
  const { token, user } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useState({ category: 'all', status: 'all', priority: 'all' });
  const [search, setSearch] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [resolveTarget, setResolveTarget] = useState(null);
  const [solution, setSolution] = useState('');

  const loadComplaints = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 50,
        ...(filters.category === 'all' ? {} : { category: filters.category }),
        ...(filters.status === 'all' ? {} : { status: filters.status }),
        ...(filters.priority === 'all' ? {} : { priority: filters.priority }),
      };
      const response = await hrApi.getComplaints(token, params);
      const data = getPayload(response);
      const rows = Array.isArray(data.complaints) ? data.complaints : [];
      setComplaints(rows.map(normalizeComplaint));
      setMeta({
        total: data.total || rows.length,
        totalPages: data.totalPages || 1,
        currentPage: data.currentPage || 1,
      });
    } catch (error) {
      toast.error(error.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [filters, toast, token]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const visibleComplaints = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return complaints;
    return complaints.filter((complaint) =>
      [complaint.title, complaint.description, complaint.complainant, complaint.department, complaint.code]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [complaints, search]);

  const stats = useMemo(() => {
    const open = complaints.filter((item) => !['resolved', 'closed'].includes(item.status)).length;
    const resolved = complaints.filter((item) => item.status === 'resolved').length;
    const escalated = complaints.filter((item) => item.status === 'escalated').length;
    const urgent = complaints.filter((item) => ['urgent', 'high'].includes(item.priority)).length;
    return [
      { label: 'Open', value: open, icon: 'pending_actions' },
      { label: 'Resolved', value: resolved, icon: 'check_circle' },
      { label: 'Escalated', value: escalated, icon: 'priority_high' },
      { label: 'High Priority', value: urgent, icon: 'report' },
    ];
  }, [complaints]);

  const assignToMe = async (complaint) => {
    const userId = user?._id || user?.id;
    if (!userId || !complaint.id) return;
    setBusyId(complaint.id);
    try {
      await hrApi.assignComplaint(complaint.id, { assignedTo: userId }, token);
      toast.success('Complaint assigned.');
      await loadComplaints();
    } catch (error) {
      toast.error(error.message || 'Failed to assign complaint');
    } finally {
      setBusyId('');
    }
  };

  const resolveComplaint = async () => {
    if (!resolveTarget?.id || !solution.trim()) {
      toast.warning('Add a solution note before resolving.');
      return;
    }
    setBusyId(resolveTarget.id);
    try {
      await hrApi.resolveComplaint(
        resolveTarget.id,
        {
          solution: solution.trim(),
          actionTaken: solution.trim(),
        },
        token
      );
      setResolveTarget(null);
      setSolution('');
      toast.success('Complaint resolved.');
      await loadComplaints();
    } catch (error) {
      toast.error(error.message || 'Failed to resolve complaint');
    } finally {
      setBusyId('');
    }
  };

  const exportCsv = () => {
    const rows = [
      ['ID', 'Title', 'Complainant', 'Department', 'Category', 'Priority', 'Status', 'Assigned To', 'Created'],
      ...visibleComplaints.map((item) => [
        item.code,
        item.title,
        item.complainant,
        item.department,
        labelFor(categories, item.category),
        item.priority,
        item.status,
        item.assignedTo,
        formatDate(item.createdAt),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hr-complaints.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div>
            <h1 className="text-3xl font-black leading-tight text-neutral-800 dark:text-neutral-100">
              Complaints &amp; Solutions
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Review portal complaints and close HR actions.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export
          </button>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                <span className="material-symbols-outlined text-primary">{stat.icon}</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">{stat.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="relative min-w-[16rem] flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                placeholder="Search complaints"
                type="search"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                ['category', categories],
                ['status', statuses],
                ['priority', priorities],
              ].map(([key, options]) => (
                <select
                  key={key}
                  value={filters[key]}
                  onChange={(event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }))}
                  className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                >
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">ID</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Complainant</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Category</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Title</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Priority</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Assigned</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Created</th>
                  <th className="p-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-6 text-center text-sm text-neutral-500" colSpan={9}>
                      Loading complaints...
                    </td>
                  </tr>
                ) : visibleComplaints.length ? (
                  visibleComplaints.map((complaint) => (
                    <tr key={complaint.id} className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800">
                      <td className="p-4 text-sm font-semibold text-primary">{complaint.code}</td>
                      <td className="p-4">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{complaint.complainant}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{complaint.department}</p>
                      </td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">{labelFor(categories, complaint.category)}</td>
                      <td className="max-w-xs p-4">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{complaint.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">{complaint.description}</p>
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${badgeClass[complaint.priority] || badgeClass.medium}`}>
                          {complaint.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass[complaint.status] || badgeClass.closed}`}>
                          {labelFor(statuses, complaint.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">{complaint.assignedTo}</td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">{formatDate(complaint.createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === complaint.id || complaint.status === 'resolved'}
                            onClick={() => assignToMe(complaint)}
                            className="rounded-full p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-40 dark:hover:bg-blue-950/30"
                            aria-label="Assign complaint"
                          >
                            <span className="material-symbols-outlined text-xl">assignment_ind</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === complaint.id || complaint.status === 'resolved'}
                            onClick={() => setResolveTarget(complaint)}
                            className="rounded-full p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:hover:bg-emerald-950/30"
                            aria-label="Resolve complaint"
                          >
                            <span className="material-symbols-outlined text-xl">check_circle</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-6 text-center text-sm text-neutral-500" colSpan={9}>
                      No complaints found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
              <span>
                Showing {visibleComplaints.length} of {meta.total} complaints
              </span>
              <span>
                Page {meta.currentPage} of {meta.totalPages}
              </span>
            </div>
          </div>
        </section>
      </div>

      {resolveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Resolve Complaint</h2>
            <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">{resolveTarget.title}</p>
            <textarea
              value={solution}
              onChange={(event) => setSolution(event.target.value)}
              rows={5}
              className="mt-4 w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="Solution note"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setResolveTarget(null);
                  setSolution('');
                }}
                className="h-10 rounded-lg border border-neutral-200 px-4 text-sm font-bold dark:border-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resolveComplaint}
                disabled={busyId === resolveTarget.id}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default ComplaintSolutionsLive;
