import React, { useEffect, useMemo, useState } from 'react';
import { hrApi } from '../../services/hr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import ProgressBar from '../ui/ProgressBar';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import CardSkeleton from '../ui/CardSkeleton';
import Skeleton from '../ui/Skeleton';

const periodOptions = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'quarterly', label: 'This Quarter' },
  { value: 'yearly', label: 'This Year' },
];

// Maps the rating strings the backend already computes (performanceSystem.service.js
// getRating — thresholds unchanged here) to display tone only.
const ratingMeta = {
  Excellent: { tone: 'success', bar: 'bg-emerald-500' },
  Good: { tone: 'info', bar: 'bg-sky-500' },
  Average: { tone: 'neutral', bar: 'bg-neutral-400' },
  'Needs Improvement': { tone: 'warning', bar: 'bg-amber-500' },
  'Critical Performance Alert': { tone: 'danger', bar: 'bg-rose-500' },
};
const getRatingMeta = (rating) => ratingMeta[rating] || ratingMeta.Average;

const cycleStatusTone = {
  draft: 'neutral',
  active: 'success',
  closed: 'info',
  archived: 'neutral',
};

const cycleTypeOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];
const cycleStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];
const defaultCycleForm = {
  name: '',
  cycleType: 'quarterly',
  startDate: '',
  endDate: '',
  reviewDeadline: '',
  status: 'draft',
  notes: '',
};

const compactNumber = (value) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value || 0);

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Performance = () => {
  const { token } = useAuth();
  const toast = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [overview, setOverview] = useState([]);
  const [summary, setSummary] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [cycleForm, setCycleForm] = useState(defaultCycleForm);
  const [cycleFormError, setCycleFormError] = useState('');
  const [cycleSaving, setCycleSaving] = useState(false);

  const loadPerformanceData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');

      const [overviewRes, snapshotsRes, cyclesRes] = await Promise.all([
        hrApi.getPerformanceSystemOverview(token, {
          page: 1,
          limit: 10,
          periodType: selectedPeriod,
          department: department || undefined,
          search: search || undefined,
        }),
        hrApi.getPerformanceSystemSnapshots(token, {
          page: 1,
          limit: 6,
          periodType: selectedPeriod,
          department: department || undefined,
        }),
        hrApi.getPerformanceSystemAppraisalCycles(token, {}),
      ]);

      const overviewPayload = overviewRes?.data || {};
      const snapshotPayload = snapshotsRes?.data || {};
      const cyclePayload = cyclesRes?.data || {};

      setOverview(overviewPayload.items || []);
      setSummary(overviewPayload.summary || null);
      setSnapshots(snapshotPayload.items || []);
      setCycles(cyclePayload || []);
    } catch (err) {
      setError(err.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedPeriod, department, search]);

  const departmentOptions = useMemo(() => {
    const values = new Set();
    overview.forEach((item) => {
      if (item.employee?.department) values.add(item.employee.department);
    });
    snapshots.forEach((item) => {
      if (item.employee?.department) values.add(item.employee.department);
    });
    return [
      { value: '', label: 'All departments' },
      ...Array.from(values)
        .sort()
        .map((d) => ({ value: d, label: d })),
    ];
  }, [overview, snapshots]);

  const stats = [
    {
      label: 'Average Score',
      value: `${compactNumber(summary?.averageScore)} / 100`,
      context: `${summary?.employeeCount || 0} employees in current view`,
      icon: 'insights',
      tone: 'accent',
    },
    {
      label: 'Excellent Ratings',
      value: compactNumber(summary?.ratingCounts?.Excellent || 0),
      context: 'Top performers in selected period',
      icon: 'workspace_premium',
      tone: 'success',
    },
    {
      label: 'Needs Attention',
      value: compactNumber(
        (summary?.ratingCounts?.['Needs Improvement'] || 0) + (summary?.ratingCounts?.['Critical Performance Alert'] || 0)
      ),
      context: 'Employees requiring follow-up',
      icon: 'warning',
      tone: 'warning',
    },
    {
      label: 'Active Appraisal Cycles',
      value: compactNumber(cycles.filter((cycle) => cycle.status === 'active').length),
      context: `${cycles.length} total cycle${cycles.length === 1 ? '' : 's'} available`,
      icon: 'event_repeat',
      tone: 'info',
    },
  ];

  const handleRecalculate = async (employeeId) => {
    if (actionId) return;
    try {
      setActionId(employeeId);
      await hrApi.recalculatePerformanceSnapshot(employeeId, { periodType: selectedPeriod }, token);
      const [overviewRes, snapshotsRes] = await Promise.all([
        hrApi.getPerformanceSystemOverview(token, {
          page: 1,
          limit: 10,
          periodType: selectedPeriod,
          department: department || undefined,
          search: search || undefined,
        }),
        hrApi.getPerformanceSystemSnapshots(token, {
          page: 1,
          limit: 6,
          periodType: selectedPeriod,
          department: department || undefined,
        }),
      ]);
      setOverview(overviewRes?.data?.items || []);
      setSummary(overviewRes?.data?.summary || null);
      setSnapshots(snapshotsRes?.data?.items || []);
      toast.success('Score recalculated.');
    } catch (err) {
      toast.error(err.message || 'Unable to recalculate score.');
    } finally {
      setActionId('');
    }
  };

  const openCycleModal = () => {
    setCycleForm(defaultCycleForm);
    setCycleFormError('');
    setCycleModalOpen(true);
  };
  const closeCycleModal = () => {
    setCycleModalOpen(false);
    setCycleFormError('');
  };
  const handleCycleFormChange = (e) => {
    const { name, value } = e.target;
    setCycleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    if (!cycleForm.name.trim() || !cycleForm.startDate || !cycleForm.endDate) {
      setCycleFormError('Name, start date, and end date are required.');
      return;
    }
    setCycleSaving(true);
    setCycleFormError('');
    try {
      await hrApi.createPerformanceSystemAppraisalCycle(
        {
          name: cycleForm.name.trim(),
          cycleType: cycleForm.cycleType,
          startDate: cycleForm.startDate,
          endDate: cycleForm.endDate,
          reviewDeadline: cycleForm.reviewDeadline || undefined,
          status: cycleForm.status,
          notes: cycleForm.notes || undefined,
        },
        token
      );
      const cyclesRes = await hrApi.getPerformanceSystemAppraisalCycles(token, {});
      setCycles(cyclesRes?.data || []);
      toast.success('Appraisal cycle created.');
      closeCycleModal();
    } catch (err) {
      setCycleFormError(err.message || 'Failed to create appraisal cycle');
    } finally {
      setCycleSaving(false);
    }
  };

  const tableColumns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (item) => (
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {item.employee.firstName} {item.employee.lastName}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.employee.email}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{item.employee.department || 'Unassigned'}</p>
        </div>
      ),
    },
    {
      key: 'score',
      label: 'Score',
      render: (item) => {
        const meta = getRatingMeta(item.rating);
        return (
          <div className="w-24">
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{compactNumber(item.autoScore)} / 100</p>
            <div className="mt-1.5">
              <ProgressBar value={item.autoScore} colorClass={meta.bar} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (item) => <StatusBadge tone={getRatingMeta(item.rating).tone} label={item.rating} />,
    },
    {
      key: 'taskCompletion',
      label: 'Task Completion',
      render: (item) => <span className="text-sm text-neutral-600 dark:text-neutral-300">{compactNumber(item.taskMetrics.completionRate)}%</span>,
    },
    {
      key: 'attendance',
      label: 'Attendance',
      render: (item) => <span className="text-sm text-neutral-600 dark:text-neutral-300">{compactNumber(item.attendanceMetrics.consistencyScore)}%</span>,
    },
    {
      key: 'reports',
      label: 'Reports',
      render: (item) => <span className="text-sm text-neutral-600 dark:text-neutral-300">{item.workReportMetrics.reportsSubmitted} submitted</span>,
    },
    {
      key: 'action',
      label: '',
      render: (item) => {
        const isRecalculating = actionId === item.employee._id;
        return (
          <Button
            variant="secondary"
            size="sm"
            disabled={Boolean(actionId)}
            onClick={() => handleRecalculate(item.employee._id)}
            icon={<span className={`material-symbols-outlined text-[15px] ${isRecalculating ? 'animate-spin' : ''}`}>{isRecalculating ? 'progress_activity' : 'refresh'}</span>}
          >
            {isRecalculating ? 'Recalculating…' : 'Recalculate'}
          </Button>
        );
      },
    },
  ];

  const filtersActive = Boolean(search || department);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-sky-600 dark:text-sky-400">info</span>
        <p className="text-neutral-600 dark:text-neutral-400">
          Performance scorecards combine task completion, attendance, and submitted work reports.
        </p>
      </div>

      {loading && !summary ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <KPICard key={stat.label} title={stat.label} value={stat.value} context={stat.context} icon={stat.icon} tone={stat.tone} priority="secondary" />
          ))}
        </div>
      )}

      <section className="app-card-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Automated Performance Overview</h2>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">Live scorecards generated from tasks, attendance, and work reports.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-52">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">search</span>
              <Input aria-label="Search employees" placeholder="Search employees" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-10 pl-9" />
            </div>
            <Select aria-label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} options={departmentOptions} className="min-h-10 w-40" />
            <Select aria-label="Period" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} options={periodOptions} className="min-h-10 w-36" />
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorState description={error} onRetry={loadPerformanceData} />
          </div>
        ) : (
          <div className="mt-4">
            <DataTable
              columns={tableColumns}
              rows={overview}
              loading={loading}
              rowKey={(item) => item.employee._id}
              emptyTitle={filtersActive ? 'No employees match the selected filters' : 'No performance records found'}
              emptyAction={filtersActive ? { label: 'Clear filters', onClick: () => { setSearch(''); setDepartment(''); } } : undefined}
            />
          </div>
        )}
      </section>

      <section className="app-card-pad">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Recent Snapshots</h2>
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">Latest generated performance snapshots for the selected period.</p>
        {loading ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="mt-2">
            <EmptyState compact icon="history" title="No generated snapshots yet" description="Recalculate an employee's score to generate the first snapshot." />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {snapshots.map((snapshot) => {
              const meta = getRatingMeta(snapshot.rating);
              return (
                <div key={snapshot._id} className="rounded-xl border border-neutral-200 p-3.5 dark:border-neutral-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {snapshot.employee?.firstName} {snapshot.employee?.lastName}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDate(snapshot.periodStart)} – {formatDate(snapshot.periodEnd)}
                      </p>
                    </div>
                    <StatusBadge tone={meta.tone} label={snapshot.rating} dot={false} />
                  </div>
                  <p className="mt-2.5 text-base font-bold text-neutral-900 dark:text-neutral-100">{compactNumber(snapshot.autoScore)} / 100</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="app-card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Appraisal Cycles</h2>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">Review cycles that schedule employee and manager appraisals.</p>
          </div>
          <Button size="sm" onClick={openCycleModal} icon={<span className="material-symbols-outlined text-base">add</span>}>
            Create Cycle
          </Button>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : cycles.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              compact
              icon="event_repeat"
              title="No appraisal cycles configured"
              description="Create a review cycle to schedule employee appraisals and manager reviews."
              actionLabel="Create Cycle"
              onAction={openCycleModal}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {cycles.map((cycle) => (
              <div key={cycle._id} className="rounded-xl border border-neutral-200 p-3.5 dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{cycle.name}</p>
                  <StatusBadge tone={cycleStatusTone[cycle.status] || 'neutral'} label={cycle.status} />
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {cycleTypeOptions.find((o) => o.value === cycle.cycleType)?.label || cycle.cycleType} · {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
                  {cycle.reviewDeadline ? ` · Review due ${formatDate(cycle.reviewDeadline)}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={cycleModalOpen}
        onClose={closeCycleModal}
        title="Create Appraisal Cycle"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeCycleModal}>
              Cancel
            </Button>
            <Button type="submit" form="cycle-form" disabled={cycleSaving}>
              {cycleSaving ? 'Creating…' : 'Create Cycle'}
            </Button>
          </div>
        }
      >
        <form id="cycle-form" onSubmit={handleCreateCycle} className="space-y-4">
          {cycleFormError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {cycleFormError}
            </div>
          )}
          <Input label="Cycle Name *" name="name" value={cycleForm.name} onChange={handleCycleFormChange} required placeholder="e.g. Q1 2026 Performance Review" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Cycle Type" name="cycleType" value={cycleForm.cycleType} onChange={handleCycleFormChange} options={cycleTypeOptions} />
            <Select label="Status" name="status" value={cycleForm.status} onChange={handleCycleFormChange} options={cycleStatusOptions} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date *" type="date" name="startDate" value={cycleForm.startDate} onChange={handleCycleFormChange} required />
            <Input label="End Date *" type="date" name="endDate" value={cycleForm.endDate} onChange={handleCycleFormChange} required />
          </div>
          <Input label="Review Deadline" type="date" name="reviewDeadline" value={cycleForm.reviewDeadline} onChange={handleCycleFormChange} helperText="Optional — when manager reviews should be completed by." />
          <div>
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes</span>
            <textarea
              name="notes"
              value={cycleForm.notes}
              onChange={handleCycleFormChange}
              rows="2"
              className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="Optional context for this cycle…"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Performance;
