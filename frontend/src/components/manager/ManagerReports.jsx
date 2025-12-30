import React, { useEffect, useMemo, useState } from 'react';
import { managerApi } from '../../api/manager';
import { useAuth } from '../../context/AuthContext';

const statusLabels = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  review: 'In Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    case 'review':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200';
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
    case 'cancelled':
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
    case 'reviewed':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
    case 'submitted':
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
  }
};

const getProductivityColor = (productivity) => {
  if (productivity >= 85) return 'text-green-600 dark:text-green-400';
  if (productivity >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getPeriodStart = (period) => {
  const now = new Date();
  const start = new Date(now);
  switch (period) {
    case 'week':
      start.setDate(now.getDate() - 7);
      return start;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      return start;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      return start;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      return start;
    default:
      return null;
  }
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
};

const ManagerReports = () => {
  const { token } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  const fetchReports = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await managerApi.getWorkReports(token, { page, limit: 10, uniqueTask: true });
      const payload = response?.data || {};
      setReports(payload.reports || []);
      setTotalPages(payload.totalPages || 1);
      setTotalReports(payload.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load work updates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token, page]);

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const startDate = getPeriodStart(selectedPeriod);
    return reports.filter((report) => {
      const reportStatus = report.taskStatus || report.status;
      if (selectedStatus !== 'all' && reportStatus !== selectedStatus) {
        return false;
      }
      if (startDate && report.reportDate) {
        const reportDate = new Date(report.reportDate);
        if (reportDate < startDate) return false;
      }
      if (query) {
        const employeeName = `${report.employee?.firstName || ''} ${report.employee?.lastName || ''}`.trim().toLowerCase();
        const projectName = report.project?.name?.toLowerCase() || '';
        const title = report.title?.toLowerCase() || '';
        if (!employeeName.includes(query) && !projectName.includes(query) && !title.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [reports, searchQuery, selectedPeriod, selectedStatus]);

  const stats = useMemo(() => {
    const submittedCount = reports.filter((report) => report.status === 'submitted').length;
    const approvedCount = reports.filter((report) => report.status === 'approved').length;
    const reviewedCount = reports.filter((report) => report.status === 'reviewed').length;
    return [
      { label: 'Total Updates', value: totalReports, change: `${filteredReports.length} shown`, color: 'text-blue-600' },
      { label: 'Submitted', value: submittedCount, change: 'Awaiting review', color: 'text-orange-600' },
      { label: 'Reviewed', value: reviewedCount, change: 'In progress', color: 'text-sky-600' },
      { label: 'Approved', value: approvedCount, change: 'Completed', color: 'text-green-600' },
    ];
  }, [filteredReports.length, reports, totalReports]);

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-900 dark:text-white">
              Team Work Updates
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Review completed task updates from your team in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-base">download</span>
              Export All
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{stat.label}</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
              <p className={`text-xs font-semibold ${stat.color}`}>{stat.change}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Work Updates</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  search
                </span>
                <input
                  className="h-10 rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  placeholder="Search updates..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 text-xs font-semibold uppercase text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Hours</th>
                  <th className="px-6 py-3">Tasks</th>
                  <th className="px-6 py-3">Productivity</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      Loading work updates...
                    </td>
                  </tr>
                )}
                {!loading && filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      No work updates found.
                    </td>
                  </tr>
                )}
                {!loading && filteredReports.map((report) => {
                  const employeeName = `${report.employee?.firstName || ''} ${report.employee?.lastName || ''}`.trim() || report.employee?.email || 'Employee';
                  const tasks = report.tasksCompleted || [];
                  const totalTasks = tasks.length;
                  const completedTasks = tasks.filter((task) => (task.status || 'completed') === 'completed').length;
                  const productivity = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
                  const taskLabel = totalTasks ? `${completedTasks}/${totalTasks}` : '-';
                  const reportStatus = report.taskStatus || report.status;
                  return (
                    <tr key={report._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                            {getInitials(employeeName)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">{employeeName}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{report.employee?.department || 'Team'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {report.project?.name || report.project?.projectCode || 'General'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">{report.totalHours || 0}h</td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{taskLabel}</td>
                      <td className={`px-6 py-4 text-sm font-semibold ${getProductivityColor(productivity)}`}>{productivity}%</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(reportStatus)}`}>
                          {statusLabels[reportStatus] || 'Submitted'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 px-6 py-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            <p>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ManagerReports;
