import React, { useEffect, useState } from 'react';
import { ceoApi } from '../../services/ceo';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import { PieChartCard, BarChartCard } from './charts/ChartCards';
import { useQuery } from '@tanstack/react-query';

const normalizeStats = (payload) => {
  const base = payload?.departments || payload?.data || payload || [];
  if (!Array.isArray(base)) return [];
  return base.map((row) => {
    const users = Number(row?.users || 0);
    const completed = Number(row?.output || row?.completedTasks || 0);
    const total = Number(row?.target || row?.totalTasks || 0);
    const completionRate = total ? (completed / total) * 100 : 0;
    return {
      department: row?.department || row?._id || 'Unassigned',
      users,
      activeUsers: Number(row?.activeUsers || 0),
      totalTasks: total,
      openTasks: Number(row?.openTasks || 0),
      completedTasks: completed,
      completionRate,
    };
  });
};

const DepartmentStats = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const departmentsQ = useQuery({
    queryKey: ['ceo-department-analytics', token],
    queryFn: async () => normalizeStats((await ceoApi.getDepartmentAnalytics(token))?.data || {}),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    setStats(departmentsQ.data || []);
    setLoading(departmentsQ.isLoading);
  }, [departmentsQ.data, departmentsQ.isLoading]);

  return (
    <main className="min-h-screen flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
        <PortalHeader
          title="Department Stats"
          subtitle="Department performance and comparison charts"
          icon="monitoring"
          showSearch={false}
          showNotifications
          showThemeToggle
        />

      {loading && <div className="h-64 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}
      {!loading && stats.length === 0 && <p className="text-sm text-neutral-500">No department stats available.</p>}

      {!loading && stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChartCard title="Department KPI Score" data={stats.map((s) => ({ department: s.department, kpi: Number(s.completionRate.toFixed(1)) }))} xKey="department" bars={[{ key: 'kpi', color: '#2563eb' }]} />
          <BarChartCard title="Output vs Target" data={stats.map((s) => ({ department: s.department, output: s.completedTasks, target: s.totalTasks || 0 }))} xKey="department" bars={[{ key: 'output', color: '#16a34a' }, { key: 'target', color: '#ea580c' }]} />
          <PieChartCard title="Department Contribution" data={stats.map((s) => ({ department: s.department, value: s.totalTasks }))} nameKey="department" valueKey="value" />

          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Performance Table</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-left">Users</th>
                    <th className="px-3 py-2 text-left">Active</th>
                    <th className="px-3 py-2 text-left">Total Tasks</th>
                    <th className="px-3 py-2 text-left">Completed</th>
                    <th className="px-3 py-2 text-left">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {stats.map((s) => (
                    <tr key={`row-${s.department}`}>
                      <td className="px-3 py-2">{s.department}</td>
                      <td className="px-3 py-2">{s.users}</td>
                      <td className="px-3 py-2">{s.activeUsers}</td>
                      <td className="px-3 py-2">{s.totalTasks}</td>
                      <td className="px-3 py-2">{s.completedTasks}</td>
                      <td className="px-3 py-2">{s.completionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
};

export default DepartmentStats;
