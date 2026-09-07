import { useCommunicationDirectory, employeeName } from '../../features/hr/useCommunicationDirectory';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hrApi } from '../../services/hr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { QK } from '../../utils/queryKeys';
import { createLogger } from '../../utils/logger';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import CardSkeleton from '../ui/CardSkeleton';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Pagination from '../ui/Pagination';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import SectionHeader from '../common/SectionHeader';
import FilterToolbar from '../common/FilterToolbar';

const staffWorkReportLogger = createLogger({ module: 'staff-work-report' });

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

const statusTone = {
  pending: 'warning',
  'in-progress': 'info',
  review: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  submitted: 'warning',
  reviewed: 'info',
  approved: 'success',
  rejected: 'danger',
};

const periodOptions = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
];

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

const escapeCsvValue = (value) => {
  if (value === undefined || value === null) return '';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const getTaskSummary = (report) => {
  if (!report) return '';
  const candidateLists = [
    report.tasks,
    report.relatedTasks,
    report.taskUpdates,
    report.updateTasks,
    report.details?.tasks,
  ];
  const tasks = candidateLists.find((list) => Array.isArray(list) && list.length);
  if (!tasks) return '';
  return tasks
    .map((task) => {
      if (!task) return '';
      if (typeof task === 'string') return task;
      return task.title || task.name || task.taskTitle || '';
    })
    .filter(Boolean)
    .join(' | ');
};

const StaffWorkReport = ({
  embedded = false,
  title = 'Staff Work Report',
  subtitle = 'Track and review employee work updates from completed tasks.',
}) => {
  const { token } = useAuth();
  const toast = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const directory = useCommunicationDirectory(token);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const workReportsParams = useMemo(() => ({ page, limit: 10, uniqueTask: true, department: selectedDepartment || undefined, employee: selectedEmployeeFilter === 'all' ? undefined : selectedEmployeeFilter }), [page, selectedDepartment, selectedEmployeeFilter]);
  const reportsQuery = useQuery({
    queryKey: QK.hr.workReports(workReportsParams),
    queryFn: () => hrApi.getWorkReports(token, workReportsParams),
    enabled: Boolean(token),
  });
  const reports = useMemo(() => reportsQuery.data?.data?.reports || [], [reportsQuery.data]);
  const totalPages = reportsQuery.data?.data?.totalPages || 1;
  const totalReports = reportsQuery.data?.data?.total || 0;
  const loading = reportsQuery.isLoading;

  const employeeFilterOptions = (directory.data || []).filter((person) => !selectedDepartment || person.department === selectedDepartment).map((person) => ({ id: person._id, label: employeeName(person) }));

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

  const hasActiveFilters = Boolean(
    searchQuery || selectedStatus !== 'all' || selectedDepartment || selectedEmployeeFilter !== 'all' || selectedProjectFilter !== 'all'
  );
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedDepartment('');
    setSelectedEmployeeFilter('all');
    setSelectedProjectFilter('all');
    setPage(1);
  };

  const stats = useMemo(() => {
    const submittedCount = reports.filter((report) => report.status === 'submitted').length;
    const approvedCount = reports.filter((report) => report.status === 'approved').length;
    const reviewedCount = reports.filter((report) => report.status === 'reviewed').length;
    return [
      {
        label: 'Total Reports',
        value: totalReports,
        icon: 'summarize',
        tone: 'accent',
        context: hasActiveFilters ? `${filteredReports.length} of ${totalReports} shown` : 'Total reports',
      },
      { label: 'Submitted', value: submittedCount, icon: 'upload_file', tone: 'warning', context: 'Awaiting review' },
      { label: 'Reviewed', value: reviewedCount, icon: 'fact_check', tone: 'info', context: 'In progress' },
      { label: 'Approved', value: approvedCount, icon: 'task_alt', tone: 'success', context: 'Completed' },
    ];
  }, [filteredReports.length, reports, totalReports, hasActiveFilters]);

  const handleExportReports = useCallback(() => {
    if (exporting) return;
    if (!filteredReports.length) {
      toast.warning('No reports match the current filters to export.');
      return;
    }

    setExporting(true);

    try {
      const header = [
        'Employee',
        'Department / Role',
        'Project',
        'Report Title',
        'Status',
        'Report Date',
        'Tasks',
        'Summary',
      ];

      const rows = filteredReports.map((report) => {
        const employeeName =
          `${report.employee?.firstName || ''} ${report.employee?.lastName || ''}`.trim() ||
          report.employee?.email ||
          'Employee';
        const department = report.employee?.department || report.employee?.role || 'Team';
        const projectLabel = report.project?.name || report.project?.projectCode || 'General';
        const status = report.taskStatus || report.status || 'submitted';
        const formattedStatus = statusLabels[status] || status;
        const reportDate = report.reportDate ? dateFormatter.format(new Date(report.reportDate)) : '';
        const taskSummary = getTaskSummary(report);
        const summary = report.description || report.summary || '';

        return [
          employeeName,
          department,
          projectLabel,
          report.title || 'Task update',
          formattedStatus,
          reportDate,
          taskSummary,
          summary,
        ];
      });

      const csvContent = [header, ...rows]
        .map((row) => row.map(escapeCsvValue).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `staff-work-reports_${timestamp}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredReports.length} report${filteredReports.length === 1 ? '' : 's'} to CSV.`);
    } catch (exportError) {
      staffWorkReportLogger.error({ err: exportError }, 'Export reports error');
      toast.error('Failed to export reports. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [exporting, filteredReports, toast]);

  const statusOptions = [{ value: 'all', label: 'All Status' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))];
  const departmentOptions = [{ value: '', label: 'All departments' }, ...[...new Set((directory.data || []).map((person) => person.department).filter(Boolean))].sort().map((department) => ({ value: department, label: department }))];
  const employeeSelectOptions = [{ value: 'all', label: 'All Employees' }, ...employeeFilterOptions.map((employee) => ({ value: employee.id, label: employee.label }))];
  const projectSelectOptions = [{ value: 'all', label: 'All Projects' }, ...projectFilterOptions.map((project) => ({ value: project.id, label: project.label }))];

  const primaryFilters = [
    { key: 'period', label: 'Date range', value: selectedPeriod, onChange: setSelectedPeriod, options: periodOptions, width: 'w-36' },
    { key: 'status', label: 'Status', value: selectedStatus, onChange: setSelectedStatus, options: statusOptions, width: 'w-40' },
    { key: 'department', label: 'Department', value: selectedDepartment, onChange: (value) => { setSelectedDepartment(value); setSelectedEmployeeFilter('all'); setPage(1); }, options: departmentOptions, width: 'w-40' },
  ];
  const moreFilters = [
    { key: 'employee', label: 'Employee', value: selectedEmployeeFilter, onChange: (value) => { setSelectedEmployeeFilter(value); setPage(1); }, options: employeeSelectOptions, width: 'w-44' },
    { key: 'project', label: 'Project', value: selectedProjectFilter, onChange: (value) => { setSelectedProjectFilter(value); setPage(1); }, options: projectSelectOptions, width: 'w-44' },
  ];

  const activeChips = [
    selectedStatus !== 'all' && { key: 'status', label: `Status: ${statusLabels[selectedStatus] || selectedStatus}`, onRemove: () => setSelectedStatus('all') },
    selectedDepartment && { key: 'department', label: `Department: ${selectedDepartment}`, onRemove: () => { setSelectedDepartment(''); setSelectedEmployeeFilter('all'); } },
    selectedEmployeeFilter !== 'all' && { key: 'employee', label: `Employee: ${employeeSelectOptions.find((o) => o.value === selectedEmployeeFilter)?.label || selectedEmployeeFilter}`, onRemove: () => setSelectedEmployeeFilter('all') },
    selectedProjectFilter !== 'all' && { key: 'project', label: `Project: ${projectSelectOptions.find((o) => o.value === selectedProjectFilter)?.label || selectedProjectFilter}`, onRemove: () => setSelectedProjectFilter('all') },
  ].filter(Boolean);

  const content = (
    <div className={embedded ? '' : 'mx-auto max-w-[1360px]'}>
      <SectionHeader
        title={title}
        description={subtitle}
        actions={
          <Button variant="secondary" size="sm" onClick={handleExportReports} disabled={exporting} icon={<span className="material-symbols-outlined text-base">{exporting ? 'progress_activity' : 'download'}</span>}>
            {exporting ? 'Exporting…' : 'Export Reports'}
          </Button>
        }
      />

      {reportsQuery.isError && (
        <ErrorState className="mt-4" title="Unable to load work reports" description={reportsQuery.error?.message} onRetry={() => reportsQuery.refetch()} />
      )}

      {loading && !reports.length ? (
        <CardSkeleton count={4} className="mt-4" />
      ) : (
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <KPICard key={stat.label} variant="minimal" title={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} context={stat.context} />
          ))}
        </section>
      )}

      <FilterToolbar
        className="mt-4"
        search={{ value: searchQuery, onChange: setSearchQuery, label: 'Search reports', placeholder: 'Search reports…', width: 'w-64' }}
        primaryFilters={primaryFilters}
        moreFilters={moreFilters}
        activeChips={activeChips}
        onClearAll={hasActiveFilters ? clearFilters : undefined}
      />
      {directory.isError && (
        <button type="button" onClick={() => directory.refetch()} className="mt-2 text-sm text-rose-600">Employee list unavailable. Retry</button>
      )}

      <Card className="mt-3">
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Task Summary</th>
                  <th className="px-4 py-3">Task Count</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-8 w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800/60" />
                      </td>
                    </tr>
                  ))
                ) : groupedReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyState
                        compact
                        icon="assignment"
                        title={reports.length === 0 ? 'No reports submitted yet' : 'No matching reports'}
                        description={reports.length === 0 ? 'Staff reports will appear here once completed work is submitted.' : 'No reports match the selected filters.'}
                        actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
                        onAction={hasActiveFilters ? clearFilters : undefined}
                      />
                    </td>
                  </tr>
                ) : groupedReports.map((group) => {
                  const allTasks = group.updates.flatMap((update) => update.tasksCompleted || []);
                  const totalTasks = allTasks.length;
                  const completedTasks = allTasks.filter((task) => (task.status || 'completed') === 'completed').length;
                  const taskLabel = totalTasks ? `${completedTasks}/${totalTasks}` : '-';
                  const progressWidth = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
                  const latestUpdate = group.updates[0];
                  const reportStatus = latestUpdate?.taskStatus || latestUpdate?.status;
                  return (
                    <tr key={group.key}>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                            {getInitials(group.employeeName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{group.employeeName}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{group.employeeMeta}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-neutral-600 dark:text-neutral-400">{group.projectLabel}</td>
                      <td className="px-4 py-4 align-top text-sm text-neutral-600 dark:text-neutral-300">
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
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{taskLabel}</span>
                          <div className="h-2 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${progressWidth}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <StatusBadge tone={statusTone[reportStatus] || 'neutral'} label={statusLabels[reportStatus] || 'Submitted'} />
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-neutral-500 dark:text-neutral-400">
                        {latestUpdate?.reportDate ? dateFormatter.format(new Date(latestUpdate.reportDate)) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && groupedReports.length > 0 && <Pagination page={page} totalPages={totalPages} total={totalReports} onPageChange={setPage} />}
      </Card>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <main className="flex-1 overflow-y-auto p-8">{content}</main>;
};

export default StaffWorkReport;
