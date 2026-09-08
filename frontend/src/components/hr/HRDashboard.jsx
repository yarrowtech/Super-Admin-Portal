import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHrDashboard } from '../../features/hr/hooks/useHrDashboard';
import { HrErrorState, HrLoadingState } from '../../features/hr/components/HrStates';
import PortalHeader from '../common/PortalHeader';
import WarmGreeting from '../common/WarmGreeting';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const leaveStatusTone = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

const workUpdateStatusMeta = {
  pending: { label: 'Pending', tone: 'warning' },
  'in-progress': { label: 'In Progress', tone: 'info' },
  review: { label: 'In Review', tone: 'info' },
  completed: { label: 'Done', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'warning' },
  reviewed: { label: 'Reviewed', tone: 'info' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

const normalizeWorkUpdateStatus = (status) => {
  if (!status) return 'submitted';
  const normalized = status.toString().trim().toLowerCase();
  if (['in review', 'in-review', 'review', 'in_review'].includes(normalized)) return 'review';
  if (['done', 'completed', 'complete', 'finished'].includes(normalized)) return 'completed';
  if (['in progress', 'in-progress', 'progress'].includes(normalized)) return 'in-progress';
  return normalized;
};

const alertLevelTone = { high: 'danger', medium: 'warning', low: 'info' };

// Page-scoped presentational primitives. Kept local (not promoted to
// components/common) since their layout is specific to this dashboard's
// section shape rather than something reused across other portals.
const SectionCard = ({ icon, title, subtitle, action, children, className = '', bodyClassName = '' }) => (
  <section className={`app-card-pad ${className}`}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--portal-accent-soft)' }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--portal-accent)' }}>
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>
          {subtitle && <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className={bodyClassName}>{children}</div>
  </section>
);

const EmptyState = ({ icon, title, message }) => (
  <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
      <span className="material-symbols-outlined text-[20px] text-neutral-400 dark:text-neutral-600">{icon}</span>
    </div>
    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{title}</p>
    {message && <p className="text-xs text-neutral-400 dark:text-neutral-500">{message}</p>}
  </div>
);

const ViewAllLink = ({ onClick, label = 'View all' }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex shrink-0 items-center gap-1 text-xs font-bold transition-colors hover:underline"
    style={{ color: 'var(--portal-accent)' }}
  >
    {label}
    <span className="material-symbols-outlined text-sm">arrow_forward</span>
  </button>
);

const QUICK_STAT_TONE_COLORS = {
  accent: 'var(--portal-accent)',
  success: '#059669',
  warning: '#d97706',
  danger: '#e11d48',
  info: '#0284c7',
  neutral: '#737373',
};

const QuickStatRow = ({ icon, label, value, tone = 'neutral' }) => (
  <div className="flex items-center justify-between gap-3 border-b border-neutral-100 py-2.5 first:pt-0 last:border-0 last:pb-0 dark:border-neutral-800">
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="material-symbols-outlined shrink-0 text-[18px]" style={{ color: QUICK_STAT_TONE_COLORS[tone] || QUICK_STAT_TONE_COLORS.neutral }}>
        {icon}
      </span>
      <span className="truncate text-sm text-neutral-600 dark:text-neutral-300">{label}</span>
    </div>
    <span className="shrink-0 text-sm font-bold text-neutral-900 dark:text-neutral-100">{value}</span>
  </div>
);

const QuickActionRow = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-left text-sm font-semibold text-neutral-800 transition-colors hover:border-[var(--portal-accent)]/40 hover:bg-[var(--portal-accent-soft)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
  >
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style={{ background: 'var(--portal-accent-soft)' }}
    >
      <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--portal-accent)' }}>{icon}</span>
    </span>
    {label}
  </button>
);

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
    handleApprove,
    handleReject,
    handleAttendanceAction,
    refreshDashboard,
  } = useHrDashboard();

  if (loading) {
    return <HrLoadingState message="Loading HR dashboard..." />;
  }

  if (error) {
    return <HrErrorState message={error} onRetry={refreshDashboard} />;
  }

  const departmentStats = dashboardData?.departmentStats || [];
  const recentActivities = dashboardData?.recentActivities || [];

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
              <span className="hidden sm:inline">
                {attendanceAction.loading
                  ? canCheckIn
                    ? 'Checking in…'
                    : 'Checking out…'
                  : attendanceCtaLabel}
              </span>
            </button>
          }
        />

        <WarmGreeting user={user} message="Here's today's workforce activity and pending actions." />

        {(attendanceAction.error || attendanceAction.message) && (
          <div
            className={`mb-5 rounded-xl border p-3.5 text-sm font-semibold ${
              attendanceAction.error
                ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">
                {attendanceAction.error ? 'error' : 'check_circle'}
              </span>
              {attendanceAction.error || attendanceAction.message}
            </div>
          </div>
        )}

        {/* Primary KPI grid — the executive snapshot; every number here comes
            straight from the dashboard payload, nothing duplicated below. */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KPICard
            icon="groups"
            tone="info"
            title="Total Employees"
            value={summary.totalEmployees}
            subtitle={`${summary.activeEmployees} active`}
          />
          <KPICard
            icon="how_to_reg"
            tone="success"
            title="Today's Attendance"
            value={summary.todayAttendance}
            subtitle="Checked in today"
          />
          <KPICard
            icon="event_busy"
            tone="warning"
            title="Leave Requests"
            value={summary.pendingLeavesCount}
            subtitle="Awaiting approval"
          />
          <KPICard
            icon="person_search"
            tone="accent"
            title="Active Applicants"
            value={summary.pendingApplicants}
            subtitle="In recruitment"
          />
          <KPICard
            icon="task_alt"
            tone="neutral"
            title="Work Updates"
            value={workUpdatesTotal}
            subtitle={workUpdatesLabel}
          />
        </section>

        {/* Single continuous two-column flow for the rest of the page —
            actionable/insight content on the left (~70%), supporting and
            reference information on the right (~30%). AI Insights and
            Pending Approvals used to sit in a separate grid row from the
            cards below them; a shared grid row always sizes to its tallest
            cell, so whichever card was shorter left a dead gap before the
            next section. Stacking each column's cards in one flex-col
            instead means every column just grows to its own content. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <SectionCard
              icon="auto_awesome"
              title="AI Insights"
              subtitle="Decision-support signals from workforce activity"
              bodyClassName="space-y-2.5"
            >
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
            </SectionCard>

            <SectionCard
              icon="pending_actions"
              title={leaveListMode === 'pending' ? 'Pending Leave Approvals' : 'Recent Leave Requests'}
              subtitle={`${pendingLeaves.length} request${pendingLeaves.length !== 1 ? 's' : ''} ${
                leaveListMode === 'pending' ? 'awaiting your review' : 'submitted recently'
              }`}
              action={
                pendingLeaves.length > 0 && (
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'var(--portal-accent)' }}
                  >
                    {pendingLeaves.length}
                  </span>
                )
              }
            >
              {pendingLeaves.length ? (
                <div className="space-y-3">
                  {pendingLeaves.map((leave) => (
                    <div
                      key={leave._id}
                      className="rounded-xl border border-neutral-200 p-4 transition-colors hover:border-[var(--portal-accent)]/40 dark:border-neutral-800"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'var(--portal-accent-soft)' }}
                          >
                            <span className="material-symbols-outlined text-xl" style={{ color: 'var(--portal-accent)' }}>
                              event_note
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-neutral-900 dark:text-neutral-100">
                                {leave.employee?.firstName} {leave.employee?.lastName}
                              </h3>
                              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold capitalize text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                {leave.leaveType}
                              </span>
                              <StatusBadge tone={leaveStatusTone[leave.status] || 'warning'} label={leave.status} />
                            </div>
                            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{leave.employee?.email}</p>
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
                          <Button
                            variant="danger"
                            size="sm"
                            loading={actionLoadingId === leave._id}
                            disabled={actionLoadingId === leave._id}
                            onClick={() => handleReject(leave._id)}
                            icon={<span className="material-symbols-outlined text-base">close</span>}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            loading={actionLoadingId === leave._id}
                            disabled={actionLoadingId === leave._id}
                            onClick={() => handleApprove(leave._id)}
                            icon={<span className="material-symbols-outlined text-base">check</span>}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="check_circle" title="All caught up" message="No pending leave requests at the moment." />
              )}
            </SectionCard>

            <SectionCard icon="history" title="Recent Activity" subtitle="Latest HR actions and updates">
              {recentActivities.length ? (
                <div className="space-y-2">
                  {recentActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'var(--portal-accent-soft)' }}
                      >
                        <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--portal-accent)' }}>
                          {activity.icon || 'info'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{activity.title}</p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{activity.description}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                        {activity.time || 'Just now'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="history" title="No recent activities" message="New HR activity will appear here." />
              )}
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-1">
            <SectionCard icon="insights" title="Predictive Alerts" subtitle="Risk and anomaly forecasting" bodyClassName="space-y-3">
              <div className="space-y-2.5">
                {predictiveAlerts.length ? (
                  predictiveAlerts.map((alert) => (
                    <div key={alert.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">{alert.title}</p>
                        <StatusBadge tone={alertLevelTone[alert.level] || 'warning'} label={alert.level} dot={false} />
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

              <div className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <p className="text-neutral-500 dark:text-neutral-400">Active vs Inactive</p>
                <p className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
                  {advancedMetrics.activeRatio}% active / {advancedMetrics.inactiveRatio}% inactive
                </p>
                <p className="mt-1 text-neutral-500 dark:text-neutral-400">Attrition rate: {advancedMetrics.attritionRate}%</p>
              </div>

              {automationOverview?.workflows?.length ? (
                <div className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
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
            </SectionCard>

            <SectionCard
              icon="task_alt"
              title="Work Updates"
              subtitle="Latest task status changes"
              action={<ViewAllLink onClick={() => navigate('/hr/tasks?view=updates')} />}
            >
              {workUpdatesError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                  {workUpdatesError}
                </div>
              ) : workUpdatesLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                  ))}
                </div>
              ) : workUpdates.length === 0 ? (
                <EmptyState icon="task_alt" title="No updates yet" message="Task submissions will appear here." />
              ) : (
                <div className="space-y-2.5">
                  {workUpdates.map((report) => {
                    const employeeName =
                      `${report.employee?.firstName || ''} ${report.employee?.lastName || ''}`.trim() ||
                      report.employee?.email ||
                      'Employee';
                    const rawStatus = report.taskStatus || report.status || 'submitted';
                    const reportStatus = normalizeWorkUpdateStatus(rawStatus);
                    const meta = workUpdateStatusMeta[reportStatus] || workUpdateStatusMeta.submitted;
                    return (
                      <div key={report._id} className="rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-neutral-800 dark:text-white">{employeeName}</p>
                            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{report.title || 'Task update'}</p>
                            <p className="mt-1 truncate text-xs text-neutral-400 dark:text-neutral-500">
                              {report.project?.name || report.project?.projectCode || 'General'} ·{' '}
                              {report.reportDate ? dateFormatter.format(new Date(report.reportDate)) : 'Today'}
                            </p>
                          </div>
                          <StatusBadge tone={meta.tone} label={meta.label} dot={false} className="shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard icon="query_stats" title="Quick Stats" subtitle="Operational summary">
              <QuickStatRow icon="report_problem" label="Open Complaints" value={summary.openComplaints} tone={summary.openComplaints > 0 ? 'danger' : 'neutral'} />
              <QuickStatRow icon="sync" label="Tasks In Progress" value={modules?.taskAndWorkUpdates?.inProgress || 0} tone="info" />
              <QuickStatRow icon="trending_up" label="Active Appraisal Cycles" value={summary.appraisalCyclesActive} tone="accent" />
              <QuickStatRow icon="calendar_month" label="Attendance Records (Month)" value={summary.monthAttendanceRecords} tone="neutral" />
              <QuickStatRow icon="work" label="Open Positions" value={summary.openPositions} tone="neutral" />

              {/* Department breakdown only exists in the summary once the
                  backend actually returns it — folded in here instead of its
                  own card so there's no permanently-empty section taking up
                  a full card's worth of vertical space. */}
              {departmentStats.length > 0 && (
                <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    Departments
                  </p>
                  <div className="space-y-1.5">
                    {departmentStats.slice(0, 5).map((dept, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="truncate text-sm text-neutral-600 dark:text-neutral-300">{dept.name}</span>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }}
                        >
                          {dept.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard icon="bolt" title="Quick Actions" subtitle="Common HR tasks" bodyClassName="space-y-2">
              <QuickActionRow icon="person_add" label="Add Employee" onClick={() => navigate('/hr/users?new=1')} />
              <QuickActionRow icon="work" label="Post a Job" onClick={() => navigate('/hr/recruitment')} />
              <QuickActionRow icon="forum" label="Broadcast Notice" onClick={() => navigate('/hr/communication')} />
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
};

export default HRDashboard;
