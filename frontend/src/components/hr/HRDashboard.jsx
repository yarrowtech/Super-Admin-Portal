import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHrDashboard } from '../../features/hr/hooks/useHrDashboard';
import { HrErrorState, HrLoadingState } from '../../features/hr/components/HrStates';
import PortalHeader from '../common/PortalHeader';
import WarmGreeting from '../common/WarmGreeting';
import KPICard from '../common/KPICard';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const HRDashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    loading,
    error,
    dashboardData,
    pendingLeaves,
    leaveListMode,
    workUpdates,
    workUpdatesLoading,
    workUpdatesError,
    workUpdatesTotal,
    workUpdatesLabel,
    actionLoadingId,
    attendance,
    attendanceAction,
    attendanceCtaLabel,
    canCheckIn,
    canCheckOut,
    summary,
    advancedMetrics,
    aiInsights,
    predictiveAlerts,
    automationOverview,
    modules,
    formatTime,
    handleApprove,
    handleReject,
    handleAttendanceAction,
    refreshDashboard,
  } = useHrDashboard();

  const leaveStatusStyles = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  cancelled: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  };
  const workUpdateStatusStyles = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
};
const workUpdateStatusLabels = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  review: 'In Review',
  completed: 'Done',
  cancelled: 'Cancelled',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
  };
  const normalizeWorkUpdateStatus = (status) => {
    if (!status) return 'submitted';
    const normalized = status.toString().trim().toLowerCase();
    if (['in review', 'in-review', 'review', 'in_review'].includes(normalized)) return 'review';
    if (['done', 'completed', 'complete', 'finished'].includes(normalized)) return 'completed';
    if (['in progress', 'in-progress', 'progress'].includes(normalized)) return 'in-progress';
    return normalized;
  };

  if (loading) {
    return <HrLoadingState message="Loading HR dashboard..." />;
  }

  if (error) {
    return <HrErrorState message={error} onRetry={refreshDashboard} />;
  }

  return (
    <main className="portal-page">
      <div className="portal-page-inner">

        <PortalHeader
          title="HR Dashboard"
          subtitle="Workforce operations, recruitment, attendance, and approvals"
          icon="badge"
          user={user}
          actions={
            <button
              onClick={handleAttendanceAction}
              disabled={attendanceAction.loading || (!canCheckIn && !canCheckOut)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                canCheckIn
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                  : canCheckOut
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200'
                  : 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-500'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {canCheckIn ? 'login' : canCheckOut ? 'logout' : 'task_alt'}
              </span>
              <span className="hidden sm:inline">{attendanceAction.loading ? 'Processing...' : attendanceCtaLabel}</span>
            </button>
          }
        />

        <WarmGreeting user={user} message="Here's today's workforce activity and pending actions." />

        {/* Attendance feedback */}
        {(attendanceAction.error || attendanceAction.message) && (
          <div className={`mb-5 rounded-xl border p-3.5 text-sm font-semibold ${
            attendanceAction.error
              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100'
          }`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">
                {attendanceAction.error ? 'error' : 'check_circle'}
              </span>
              {attendanceAction.error || attendanceAction.message}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <section className="portal-kpi-grid mb-6">
          <KPICard icon="groups"        title="Total Employees"  value={summary.totalEmployees}     subtitle={`${summary.activeEmployees} active`} />
          <KPICard icon="event_busy"    title="Leave Requests"   value={summary.pendingLeavesCount} subtitle="Awaiting approval" />
          <KPICard icon="task_alt"      title="Work Updates"     value={workUpdatesTotal}            subtitle={workUpdatesLabel} />
          <KPICard icon="person_search" title="Active Applicants" value={summary.pendingApplicants} subtitle="In recruitment" />
          <KPICard icon="report_problem" title="Open Complaints" value={summary.openComplaints}     subtitle="Needs attention" />
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <article className="app-card-pad xl:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40">
                <span className="material-symbols-outlined text-sky-600 dark:text-sky-300">auto_awesome</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">AI Insights Panel</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Decision-support signals from workforce activity</p>
              </div>
            </div>
            <div className="space-y-3">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`rounded-xl border p-3 text-sm ${
                    insight.severity === 'critical'
                      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'
                      : insight.severity === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
                      : insight.severity === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
                      : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200'
                  }`}
                >
                  {insight.text}
                </div>
              ))}
            </div>
          </article>

          <article className="app-card-pad">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Predictive Alerts</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Risk and anomaly forecasting</p>
            <div className="mt-4 space-y-3">
              {predictiveAlerts.length ? (
                predictiveAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{alert.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        alert.level === 'high'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                      }`}>
                        {alert.level}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{alert.detail}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                  No major risks predicted right now.
                </p>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
              <p className="text-neutral-500 dark:text-neutral-400">Active vs Inactive</p>
              <p className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
                {advancedMetrics.activeRatio}% active / {advancedMetrics.inactiveRatio}% inactive
              </p>
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">Attrition rate: {advancedMetrics.attritionRate}%</p>
            </div>
            {automationOverview?.workflows?.length ? (
              <div className="mt-3 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Automation Queue</p>
                <div className="mt-2 space-y-1">
                  {automationOverview.workflows.slice(0, 3).map((flow) => (
                    <p key={flow.key} className="text-neutral-600 dark:text-neutral-300">
                      {flow.label}: {flow.pending} pending
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <article className="rounded-2xl border border-sky-200/60 bg-white/90 p-5 shadow-sm dark:border-sky-900/40 dark:bg-neutral-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-300">Employee Management</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{modules?.employeeManagement?.totalEmployees || summary.totalEmployees}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Active: {modules?.employeeManagement?.activeEmployees || summary.activeEmployees} | Inactive: {modules?.employeeManagement?.inactiveEmployees || 0}
            </p>
          </article>
          <article className="rounded-2xl border border-emerald-200/60 bg-white/90 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-neutral-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300">Attendance Management</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{modules?.attendanceManagement?.monthSummary?.totalRecords || summary.monthAttendanceRecords}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Tracking: Manual (No GPS) | Today: {summary.todayAttendance}
            </p>
          </article>
          <article className="rounded-2xl border border-amber-200/60 bg-white/90 p-5 shadow-sm dark:border-amber-900/40 dark:bg-neutral-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-300">Task & Work Updates</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{modules?.taskAndWorkUpdates?.total || summary.taskQueueTotal}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Pending: {modules?.taskAndWorkUpdates?.pending || summary.taskQueuePending} | In Progress: {modules?.taskAndWorkUpdates?.inProgress || 0}
            </p>
          </article>
          <article className="rounded-2xl border border-violet-200/60 bg-white/90 p-5 shadow-sm dark:border-violet-900/40 dark:bg-neutral-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">Performance & Appraisal</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{modules?.performanceAndAppraisal?.appraisalCyclesActive || summary.appraisalCyclesActive}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Active cycles | Reviews: {modules?.performanceAndAppraisal?.appraisalReviewsTotal || 0}
            </p>
          </article>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Pending Leave Approvals */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-900/80">
              <div className="border-b border-neutral-200/50 bg-gradient-to-r from-orange-50/50 to-amber-50/50 p-5 dark:border-neutral-800/50 dark:from-orange-950/20 dark:to-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-500/20">
                      <span className="material-symbols-outlined text-xl text-orange-600 dark:text-orange-400">pending_actions</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {leaveListMode === 'pending' ? 'Pending Leave Approvals' : 'Recent Leave Requests'}
                      </h2>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {pendingLeaves.length} request{pendingLeaves.length !== 1 ? 's' : ''}{' '}
                        {leaveListMode === 'pending' ? 'awaiting your review' : 'submitted recently'}
                      </p>
                    </div>
                  </div>
                  {pendingLeaves.length > 0 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                      {pendingLeaves.length}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5">
                {pendingLeaves.length ? (
                  <div className="space-y-3">
                    {pendingLeaves.map((leave) => (
                      <div key={leave._id} className="group overflow-hidden rounded-xl border border-neutral-200/70 bg-gradient-to-br from-white to-neutral-50/50 p-4 transition-all duration-200 hover:border-orange-300 hover:shadow-md dark:border-neutral-800/70 dark:from-neutral-900 dark:to-neutral-800/50 dark:hover:border-orange-700">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-1 gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                              <span className="material-symbols-outlined text-xl text-purple-600 dark:text-purple-400">event_note</span>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">
                                  {leave.employee?.firstName} {leave.employee?.lastName}
                                </h3>
                                <span className="rounded-full bg-purple-100 px-3 py-0.5 text-xs font-bold capitalize text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                  {leave.leaveType}
                                </span>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${leaveStatusStyles[leave.status] || leaveStatusStyles.pending}`}>
                                  {leave.status}
                                </span>
                              </div>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">{leave.employee?.email}</p>
                              <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="material-symbols-outlined text-base">calendar_today</span>
                                <span className="font-semibold">{new Date(leave.startDate).toLocaleDateString()}</span>
                                {leave.endDate && (
                                  <>
                                    <span className="text-neutral-400">→</span>
                                    <span className="font-semibold">{new Date(leave.endDate).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={() => handleReject(leave._id)}
                              disabled={actionLoadingId === leave._id}
                              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                              {actionLoadingId === leave._id ? 'Processing...' : 'Reject'}
                            </button>
                            <button
                              onClick={() => handleApprove(leave._id)}
                              disabled={actionLoadingId === leave._id}
                              className="flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2 text-sm font-bold text-green-600 transition-all hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                            >
                              <span className="material-symbols-outlined text-base">check</span>
                              {actionLoadingId === leave._id ? 'Processing...' : 'Approve'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
                      <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">check_circle</span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">All Caught Up!</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">No pending leave requests at the moment</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Activities */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-900/80">
              <div className="border-b border-neutral-200/50 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 p-5 dark:border-neutral-800/50 dark:from-blue-950/20 dark:to-cyan-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20">
                    <span className="material-symbols-outlined text-xl text-blue-600 dark:text-blue-400">history</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Recent Activities</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Latest HR actions and updates</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recentActivities.map((activity, index) => (
                      <div key={index} className="group flex items-start gap-4 rounded-xl border border-neutral-200/70 bg-gradient-to-br from-white to-neutral-50/50 p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:border-neutral-800/70 dark:from-neutral-900 dark:to-neutral-800/50 dark:hover:border-blue-700">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">{activity.icon || 'info'}</span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{activity.title}</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">{activity.description}</p>
                        </div>
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                          {activity.time || 'Just now'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                      <span className="material-symbols-outlined text-3xl text-neutral-400 dark:text-neutral-600">history</span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">No recent activities</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* Work Updates */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Work Updates</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Latest task status changes</p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{workUpdates.length} items</span>
              </div>
              {workUpdatesError && (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                  {workUpdatesError}
                </div>
              )}
              {workUpdatesLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading work updates...</p>
              ) : workUpdates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No updates available.</p>
              ) : (
                <div className="space-y-3">
                  {workUpdates.map((report) => {
                    const employeeName = `${report.employee?.firstName || ''} ${report.employee?.lastName || ''}`.trim() || report.employee?.email || 'Employee';
                    const rawStatus = report.taskStatus || report.status || 'submitted';
                    const reportStatus = normalizeWorkUpdateStatus(rawStatus);
                    const statusClass = workUpdateStatusStyles[reportStatus] || workUpdateStatusStyles.submitted;
                    const statusLabel = workUpdateStatusLabels[reportStatus] || workUpdateStatusLabels.submitted;
                    return (
                      <div key={report._id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{employeeName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{report.title || 'Task update'}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {report.project?.name || report.project?.projectCode || 'General'} -{' '}
                              {report.reportDate ? dateFormatter.format(new Date(report.reportDate)) : 'Today'}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Quick Stats */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-900/80">
              <div className="border-b border-neutral-200/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 p-4 dark:border-neutral-800/50 dark:from-purple-950/20 dark:to-pink-950/20">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Quick Stats</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Today's overview</p>
              </div>
              <div className="space-y-3 p-4">
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:shadow-blue-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-100">Today's Attendance</p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {summary.todayAttendance}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-2xl text-white">how_to_reg</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-4 shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:shadow-green-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-100">Active Employees</p>
                      <p className="mt-1 text-2xl font-bold text-white">{summary.activeEmployees}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-2xl text-white">groups</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:shadow-purple-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-100">Open Positions</p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {summary.openPositions}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-2xl text-white">work</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Department Overview */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-900/80">
              <div className="border-b border-neutral-200/50 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 p-4 dark:border-neutral-800/50 dark:from-indigo-950/20 dark:to-violet-950/20">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Departments</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Employee distribution</p>
              </div>
              <div className="space-y-2 p-4">
                {dashboardData?.departmentStats && dashboardData.departmentStats.length > 0 ? (
                  dashboardData.departmentStats.slice(0, 5).map((dept, index) => (
                    <div key={index} className="group flex items-center justify-between rounded-xl border border-neutral-200/70 bg-gradient-to-br from-white to-neutral-50/50 p-3 transition-all duration-200 hover:border-indigo-300 hover:shadow-md dark:border-neutral-800/70 dark:from-neutral-900 dark:to-neutral-800/50 dark:hover:border-indigo-700">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                          <span className="material-symbols-outlined text-base text-indigo-600 dark:text-indigo-400">corporate_fare</span>
                        </div>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{dept.name}</span>
                      </div>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{dept.count}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                      <span className="material-symbols-outlined text-2xl text-neutral-400 dark:text-neutral-600">corporate_fare</span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">No department data</p>
                  </div>
                )}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="overflow-hidden rounded-2xl border border-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm dark:border-purple-900/30 dark:from-purple-950/40 dark:to-pink-950/20">
              <div className="border-b border-purple-200/50 bg-white/50 p-4 dark:border-purple-900/30 dark:bg-neutral-900/50">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Quick Actions</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Common HR tasks</p>
              </div>
              <div className="space-y-2 p-4">
                <button
                  onClick={() => navigate('/hr/users?new=1')}
                  className="group flex w-full items-center gap-3 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-all duration-200 hover:scale-105 hover:border-purple-400 hover:bg-purple-50 hover:shadow-md dark:border-purple-900/50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-purple-700 dark:hover:bg-purple-900/20"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200 dark:bg-purple-900/40 dark:group-hover:bg-purple-800/60">
                    <span className="material-symbols-outlined text-lg text-purple-600 dark:text-purple-400">person_add</span>
                  </div>
                  Add Employee
                </button>
                <button className="group flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-all duration-200 hover:scale-105 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md dark:border-blue-900/50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-blue-700 dark:hover:bg-blue-900/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 dark:bg-blue-900/40 dark:group-hover:bg-blue-800/60">
                    <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">post_add</span>
                  </div>
                  Create Notice
                </button>
                <button className="group flex w-full items-center gap-3 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-all duration-200 hover:scale-105 hover:border-green-400 hover:bg-green-50 hover:shadow-md dark:border-green-900/50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-green-700 dark:hover:bg-green-900/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 group-hover:bg-green-200 dark:bg-green-900/40 dark:group-hover:bg-green-800/60">
                    <span className="material-symbols-outlined text-lg text-green-600 dark:text-green-400">work</span>
                  </div>
                  Post Job
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default HRDashboard;
