import React, { useEffect, useMemo, useState } from 'react';
import { hrApi } from '../../api/hr';
import { useAuth } from '../../context/AuthContext';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

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

const StaffWorkReport = () => {
  const { token } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
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
      const response = await hrApi.getWorkReports(token, { page, limit: 10, uniqueTask: true });
      const payload = response?.data || {};
      setReports(payload.reports || []);
      setTotalPages(payload.totalPages || 1);
      setTotalReports(payload.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load work reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token, page]);

  const employeeFilterOptions = useMemo(() => {
    const optionsMap = new Map();
    reports.forEach((report) => {
      const id =
        report.employee?._id ||
        report.employee?.id ||
        report.employee?.email ||
        `${report.employee?.firstName || ''}-${report.employee?.lastName || ''}` ||
        'unknown';
      if (optionsMap.has(id)) return;
      const label =
        `${report.employee?.firstName || ''} ${report.employee?.lastName || ''}`.trim() ||
        report.employee?.email ||
        'Employee';
      optionsMap.set(id, { id, label });
    });
    return Array.from(optionsMap.values());
  }, [reports]);

  const projectFilterOptions = useMemo(() => {
    const optionsMap = new Map();
    reports.forEach((report) => {
      const id = report.project?._id || report.project?.projectCode || report.project?.name || 'general';
      if (optionsMap.has(id)) return;
      const label = report.project?.name || report.project?.projectCode || 'General';
      optionsMap.set(id, { id, label });
    });
    return Array.from(optionsMap.values());
  }, [reports]);

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
      const employeeId =
        report.employee?._id ||
        report.employee?.id ||
        report.employee?.email ||
        `${report.employee?.firstName || ''}-${report.employee?.lastName || ''}` ||
        'unknown';
      if (selectedEmployeeFilter !== 'all' && employeeId !== selectedEmployeeFilter) {
        return false;
      }
      const projectId = report.project?._id || report.project?.projectCode || report.project?.name || 'general';
      if (selectedProjectFilter !== 'all' && projectId !== selectedProjectFilter) {
        return false;
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
  }, [reports, searchQuery, selectedPeriod, selectedStatus, selectedEmployeeFilter, selectedProjectFilter]);

  const groupedReports = useMemo(() => {
    const groupMap = new Map();
    filteredReports.forEach((report, index) => {
      const employeeId =
        report.employee?._id ||
        report.employee?.id ||
        report.employee?.email ||
        `${report.employee?.firstName || ''}-${report.employee?.lastName || ''}` ||
        'unknown';
      const projectId =
        report.project?._id || report.project?.projectCode || report.project?.name || 'general';
      const key = `${employeeId}-${projectId}`;
      const employeeName =
        `${report.employee?.firstName || ''} ${report.employee?.lastName || ''}`.trim() ||
        report.employee?.email ||
        'Employee';
      const employeeMeta = report.employee?.department || report.employee?.role || 'Team';
      const projectLabel = report.project?.name || report.project?.projectCode || 'General';

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          employeeName,
          employeeMeta,
          projectLabel,
          order: index,
          updates: [],
        });
      }

      groupMap.get(key).updates.push(report);
    });

    const grouped = Array.from(groupMap.values());
    grouped.forEach((group) => {
      group.updates.sort((a, b) => {
        const dateA = a.reportDate ? new Date(a.reportDate).getTime() : 0;
        const dateB = b.reportDate ? new Date(b.reportDate).getTime() : 0;
        return dateB - dateA;
      });
    });

    grouped.sort((a, b) => a.order - b.order);
    return grouped;
  }, [filteredReports]);

  const stats = useMemo(() => {
    const submittedCount = reports.filter((report) => report.status === 'submitted').length;
    const approvedCount = reports.filter((report) => report.status === 'approved').length;
    const reviewedCount = reports.filter((report) => report.status === 'reviewed').length;
    return [
      { label: 'Total Reports', value: totalReports, change: `${filteredReports.length} shown`, color: 'text-blue-600' },
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
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Staff Work Report
            </h1>
            <p className="text-base font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Track and review employee work updates from completed tasks.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold leading-normal tracking-[0.015em] text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-base">download</span>
              <span className="truncate">Export Reports</span>
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
            <div key={stat.label} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{stat.value}</p>
              <p className={`text-sm font-semibold ${stat.color}`}>{stat.change}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                search
              </span>
              <input
                className="w-full rounded-lg border-neutral-200 bg-background-light py-2 pl-10 pr-4 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                placeholder="Search reports..."
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
              <div className="relative">
                <select
                  value={selectedEmployeeFilter}
                  onChange={(e) => {
                    setSelectedEmployeeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="all">All Employees</option>
                  {employeeFilterOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => {
                    setSelectedProjectFilter(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="all">All Projects</option>
                  {projectFilterOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Employee</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Project</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Task Details</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tasks</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      Loading work reports...
                    </td>
                  </tr>
                )}
                {!loading && groupedReports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      No work reports found.
                    </td>
                  </tr>
                )}
                {!loading && groupedReports.map((group, index) => {
                  const allTasks = group.updates.flatMap((update) => update.tasksCompleted || []);
                  const totalTasks = allTasks.length;
                  const completedTasks = allTasks.filter((task) => (task.status || 'completed') === 'completed').length;
                  const taskLabel = totalTasks ? `${completedTasks}/${totalTasks}` : '-';
                  const progressWidth = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
                  const latestUpdate = group.updates[0];
                  const reportStatus = latestUpdate?.taskStatus || latestUpdate?.status;
                  return (
                    <tr key={group.key} className={index !== groupedReports.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : ''}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                            {getInitials(group.employeeName)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{group.employeeName}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{group.employeeMeta}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{group.projectLabel}</td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">
                        <div className="space-y-3">
                          {group.updates.map((update, updateIndex) => {
                            const updateKey = update._id || update.id || `${group.key}-${updateIndex}`;
                            const updateTasks = update.tasksCompleted || [];
                            return (
                              <div
                                key={updateKey}
                                className="rounded-xl border border-neutral-100/70 bg-neutral-50/80 p-3 dark:border-neutral-800/60 dark:bg-neutral-900/40"
                              >
                                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                                  <span>{update.reportDate ? dateFormatter.format(new Date(update.reportDate)) : 'Recent'}</span>
                                  <span className="font-semibold uppercase tracking-wide">{statusLabels[update.taskStatus || update.status] || 'Submitted'}</span>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                  {update.title || 'Task update'}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {update.description || update.summary || 'Latest changes shared by the employee'}
                                </p>
                                {updateTasks.length > 0 && (
                                  <div className="mt-2 space-y-1 rounded-lg bg-white/70 p-2 text-xs dark:bg-neutral-800/60">
                                    {updateTasks.slice(0, 3).map((task, taskIndex) => (
                                      <div key={`${update._id}-task-${taskIndex}`} className="flex items-center gap-2">
                                        <span className="size-1.5 rounded-full bg-primary"></span>
                                        <div>
                                          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{task.title || task.name || 'Task'}</p>
                                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                            {statusLabels[task.status] || (task.status ? task.status : 'Completed')}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    {updateTasks.length > 3 && (
                                      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                                        +{updateTasks.length - 3} more tasks
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-neutral-800 dark:text-neutral-100 font-medium">{taskLabel}</span>
                          <div className="h-2 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${progressWidth}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(reportStatus)}`}>
                          {statusLabels[reportStatus] || 'Submitted'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="flex h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-600 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="flex h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-600 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default StaffWorkReport;
