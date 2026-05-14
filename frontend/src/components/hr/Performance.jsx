import React, { useEffect, useMemo, useState } from 'react';
import { hrApi } from '../../services/hr';
import { useAuth } from '../../context/AuthContext';
import HrPageShell from '../../features/hr/components/HrPageShell';

const periodOptions = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'quarterly', label: 'This Quarter' },
  { value: 'yearly', label: 'This Year' },
];

const ratingStyles = {
  Excellent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  Good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  Average: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  'Needs Improvement': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
  'Critical Performance Alert': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const compactNumber = (value) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value || 0);

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

const Performance = () => {
  const { token } = useAuth();
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

  useEffect(() => {
    if (!token) return;

    const load = async () => {
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
            limit: 5,
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

    load();
  }, [token, selectedPeriod, department, search]);

  const departmentOptions = useMemo(() => {
    const values = new Set();
    overview.forEach((item) => {
      if (item.employee?.department) values.add(item.employee.department);
    });
    snapshots.forEach((item) => {
      if (item.employee?.department) values.add(item.employee.department);
    });
    return Array.from(values).sort();
  }, [overview, snapshots]);

  const stats = [
    {
      label: 'Average Score',
      value: `${compactNumber(summary?.averageScore)} / 100`,
      hint: `${summary?.employeeCount || 0} employees in current view`,
    },
    {
      label: 'Excellent Ratings',
      value: compactNumber(summary?.ratingCounts?.Excellent || 0),
      hint: 'Top performers in selected period',
    },
    {
      label: 'Needs Attention',
      value: compactNumber(
        (summary?.ratingCounts?.['Needs Improvement'] || 0) +
          (summary?.ratingCounts?.['Critical Performance Alert'] || 0)
      ),
      hint: 'Employees needing follow-up',
    },
    {
      label: 'Active Appraisal Cycles',
      value: compactNumber(cycles.filter((cycle) => cycle.status === 'active').length),
      hint: `${cycles.length} total cycles available`,
    },
  ];

  const handleRecalculate = async (employeeId) => {
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
          limit: 5,
          periodType: selectedPeriod,
          department: department || undefined,
        }),
      ]);
      setOverview(overviewRes?.data?.items || []);
      setSummary(overviewRes?.data?.summary || null);
      setSnapshots(snapshotsRes?.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to recalculate employee performance');
    } finally {
      setActionId('');
    }
  };

  return (
    <HrPageShell
      title="Performance & Appraisal"
      subtitle="Automated scorecards, appraisal snapshots, and cycle governance"
      icon="insights"
    >
    <section className="space-y-6">
      <div className="rounded-2xl border border-violet-200/60 bg-violet-50/70 p-4 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
        This module is focused on HR appraisal operations: performance scores, review cycles, and manager follow-up priorities.
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{stat.value}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Automated Performance Overview</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Live scorecards generated from tasks, attendance, and work reports.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="">All departments</option>
                {departmentOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {periodOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Task Completion</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading performance data...
                    </td>
                  </tr>
                )}
                {!loading && overview.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No performance data found for the selected filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  overview.map((item) => (
                    <tr key={item.employee._id} className="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.employee.firstName} {item.employee.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.employee.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{item.employee.department || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">{compactNumber(item.autoScore)}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ratingStyles[item.rating] || ratingStyles.Average}`}>
                          {item.rating}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {compactNumber(item.taskMetrics.completionRate)}%
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {compactNumber(item.attendanceMetrics.consistencyScore)}%
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.workReportMetrics.reportsSubmitted} submitted
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleRecalculate(item.employee._id)}
                          disabled={actionId === item.employee._id}
                          className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary disabled:opacity-50"
                        >
                          {actionId === item.employee._id ? 'Recalculating...' : 'Recalculate'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <h3 className="text-base font-black text-gray-900 dark:text-white">Recent Snapshots</h3>
            <div className="mt-4 space-y-3">
              {snapshots.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No generated snapshots yet.</p>
              )}
              {snapshots.map((snapshot) => (
                <div key={snapshot._id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {snapshot.employee?.firstName} {snapshot.employee?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(snapshot.periodStart)} to {formatDate(snapshot.periodEnd)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ratingStyles[snapshot.rating] || ratingStyles.Average}`}>
                      {snapshot.rating}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">{compactNumber(snapshot.autoScore)} / 100</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <h3 className="text-base font-black text-gray-900 dark:text-white">Appraisal Cycles</h3>
            <div className="mt-4 space-y-3">
              {cycles.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No appraisal cycles configured.</p>
              )}
              {cycles.slice(0, 5).map((cycle) => (
                <div key={cycle._id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{cycle.name}</p>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {cycle.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {cycle.cycleType} • {formatDate(cycle.startDate)} to {formatDate(cycle.endDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
    </HrPageShell>
  );
};

export default Performance;
