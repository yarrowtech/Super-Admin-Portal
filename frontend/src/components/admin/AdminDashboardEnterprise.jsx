import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/admin';
import { QK } from '../../utils/queryKeys';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import AttentionPanel from '../common/AttentionPanel';
import QuickActions from '../common/QuickActions';
import SectionCard from '../ui/SectionCard';
import Button from '../common/Button';

const roleLabels = {
  admin: 'Admin',
  ceo: 'CEO',
  it: 'IT',
  law: 'Law',
  hr: 'HR',
  media: 'Media',
  finance: 'Finance',
  manager: 'Manager',
  sales: 'Sales',
  research_operator: 'Research',
  employee: 'Employee',
  freelancer: 'Freelancer',
};

const COLORS = ['#60a5fa', '#34d399', '#f97316', '#a78bfa', '#22d3ee', '#fb7185', '#facc15', '#818cf8'];
const OTHER_SLICE_COLOR = '#94a3b8';

const HEALTH_LABEL = { good: 'Good', warning: 'Watch', critical: 'Critical' };
const HEALTH_TONE = { good: 'success', warning: 'warning', critical: 'danger' };

const formatDate = (value) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const formatPct = (value) => `${Number(value || 0).toFixed(0)}%`;

const AdminDashboardEnterprise = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: QK.admin.dashboard(),
    queryFn: () => adminApi.getDashboard(token),
    enabled: Boolean(token),
  });

  const dashboardData = data?.data || null;

  const metrics = useMemo(() => {
    const totalUsers = dashboardData?.totalUsers || 0;
    const activeUsers = dashboardData?.activeUsers || 0;
    const inactiveUsers = dashboardData?.inactiveUsers || 0;
    const activeRate = dashboardData?.summary?.activeUserRate || (totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0);
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      activeRate,
      totalDepartments: dashboardData?.totalDepartments || 0,
      newUsersLast7Days: dashboardData?.summary?.newUsersLast7Days || 0,
      systemHealth: dashboardData?.summary?.systemHealth || 'good',
      employeeCount: dashboardData?.workforce?.employees || 0,
      managerCount: dashboardData?.workforce?.managers || 0,
      outsourcingOpenJobs: dashboardData?.workforce?.externalWorkload?.openJobs || 0,
      activeContracts: dashboardData?.workforce?.externalWorkload?.activeContracts || 0,
      pendingLogs: dashboardData?.workforce?.externalWorkload?.pendingLogs || 0,
    };
  }, [dashboardData]);

  const usersByRole = useMemo(() => dashboardData?.usersByRole || [], [dashboardData]);
  const departmentStats = useMemo(() => dashboardData?.departmentStats || [], [dashboardData]);
  const recentUsers = useMemo(() => dashboardData?.users?.recent || [], [dashboardData]);
  const topDepartment = dashboardData?.insights?.topDepartment || null;
  const largestRole = dashboardData?.insights?.largestRole || null;
  const generatedAt = dashboardData?.summary?.generatedAt;

  const departmentBars = departmentStats.slice(0, 8).map((row) => ({
    name: row._id,
    value: row.count,
  }));

  // Pie charts read poorly past ~6 slices — fold the long tail into "Other".
  const departmentPie = useMemo(() => {
    if (departmentStats.length === 0) return [];
    if (departmentStats.length <= 6) {
      return departmentStats.map((row) => ({ name: row._id, value: row.count }));
    }
    const sorted = [...departmentStats].sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, 5);
    const otherTotal = sorted.slice(5).reduce((sum, row) => sum + row.count, 0);
    return [...top.map((row) => ({ name: row._id, value: row.count })), { name: 'Other', value: otherTotal }];
  }, [departmentStats]);

  const recentActivityTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    const counts = days.map((day) => {
      const key = day.toDateString();
      return recentUsers.filter((userItem) => new Date(userItem.createdAt || 0).toDateString() === key).length;
    });
    return days.map((day, index) => ({
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      newUsers: counts[index],
    }));
  }, [recentUsers]);

  const roleBreakdown = useMemo(() => usersByRole.map((item) => ({
    name: roleLabels[item._id] || item._id,
    count: item.count,
  })), [usersByRole]);

  // Only ever built from fields the API genuinely returns — no placeholder items.
  const attentionItems = useMemo(() => {
    const items = [];

    if (metrics.systemHealth === 'critical' || metrics.systemHealth === 'warning') {
      items.push({
        id: 'system-health',
        label: metrics.systemHealth === 'critical' ? 'Platform health is critical' : 'Platform health needs review',
        context: `Active-user rate is ${formatPct(metrics.activeRate)}`,
        tone: metrics.systemHealth === 'critical' ? 'danger' : 'warning',
        actionLabel: 'Review users',
        onAction: () => navigate('/admin/users'),
      });
    }

    if (metrics.inactiveUsers > 0) {
      items.push({
        id: 'inactive-users',
        label: 'Inactive user accounts',
        context: `${metrics.inactiveUsers} of ${metrics.totalUsers} accounts are inactive`,
        tone: 'warning',
        actionLabel: 'Review users',
        onAction: () => navigate('/admin/users'),
      });
    }

    if (metrics.pendingLogs > 0) {
      items.push({
        id: 'pending-time-logs',
        label: 'Outsourcing time logs pending verification',
        context: `${metrics.pendingLogs} log${metrics.pendingLogs === 1 ? '' : 's'} awaiting review`,
        tone: 'warning',
        actionLabel: 'Review logs',
        onAction: () => navigate('/admin/outsourcing/dashboard'),
      });
    }

    return items;
  }, [metrics, navigate]);

  if (isLoading) {
    return (
      <main className="portal-page">
        <div className="portal-page-inner">
          <div className="mb-4 h-36 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-8">
              <div className="h-80 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-72 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="space-y-4 xl:col-span-4">
              <div className="h-72 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-72 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="portal-page p-4 dark:bg-neutral-900">
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-3xl text-red-600">error</span>
              <div className="min-w-0">
                <p className="font-semibold text-red-900 dark:text-red-200">Error Loading Dashboard</p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error?.message || 'Failed to load dashboard data'}</p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="mt-4 min-h-11" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="portal-page dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_36%),linear-gradient(180deg,#0f172a_0%,#111827_100%)]">
      <div className="portal-page-inner">
        <PortalHeader
          title="Admin Analytics"
          subtitle="Executive platform overview"
          user={user}
          icon="dashboard"
          lastUpdated={formatDateTime(generatedAt)}
          onRefresh={refetch}
          refreshing={isFetching}
          primaryAction={{ label: 'Create User', icon: 'person_add', onClick: () => navigate('/admin/users') }}
        />

        <WarmGreeting user={user} message="Wishing you a smooth day managing the platform." />

        <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Registered Users"
            value={metrics.totalUsers}
            icon="group"
            priority="primary"
            context={metrics.newUsersLast7Days > 0 ? `+${metrics.newUsersLast7Days} in the last 7 days` : 'No new signups in the last 7 days'}
          />
          <KPICard
            title="Active Accounts"
            value={metrics.activeUsers}
            icon="verified_user"
            tone="success"
            priority="primary"
            context={`${formatPct(metrics.activeRate)} of total users`}
          />
          <KPICard
            title="Departments"
            value={metrics.totalDepartments}
            icon="corporate_fare"
            priority="primary"
            context={topDepartment ? `Largest: ${topDepartment._id}` : undefined}
          />
          <KPICard
            title="System Health"
            value={HEALTH_LABEL[metrics.systemHealth] || metrics.systemHealth}
            icon="monitor_heart"
            tone={HEALTH_TONE[metrics.systemHealth] || 'neutral'}
            priority="primary"
            context={`Based on ${formatPct(metrics.activeRate)} active-user rate`}
            tooltip="Derived from the active-user rate: 70%+ is good, 40-70% needs review, below 40% is critical."
          />
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <KPICard title="Employees" value={metrics.employeeCount} icon="badge" priority="secondary" />
          <KPICard title="Managers" value={metrics.managerCount} icon="supervisor_account" priority="secondary" />
          <KPICard
            title="Outsourcing Open Jobs"
            value={metrics.outsourcingOpenJobs}
            icon="work"
            priority="secondary"
            context={metrics.activeContracts > 0 ? `${metrics.activeContracts} active contract${metrics.activeContracts === 1 ? '' : 's'}` : undefined}
          />
        </section>

        <div className="mb-4">
          <AttentionPanel
            title="Needs Attention"
            items={attentionItems}
            emptyTitle="Nothing needs attention"
            emptyDescription="Users, departments, and outsourcing workload are all in healthy ranges."
          />
        </div>

        <section className="mb-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Executive Focus</p>
              <h2 className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-100 sm:text-2xl">Decision signals</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Monitor users, departments, roles, and workforce health from one analytics workspace.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KPICard title="Active Rate" value={formatPct(metrics.activeRate)} icon="percent" tone="info" priority="secondary" />
              <KPICard title="New Users (7d)" value={metrics.newUsersLast7Days} icon="person_add" tone="info" priority="secondary" />
              {topDepartment && (
                <KPICard title="Top Department" value={topDepartment.count} icon="apartment" priority="secondary" context={topDepartment._id} />
              )}
              {largestRole && (
                <KPICard
                  title="Largest Role"
                  value={largestRole.count}
                  icon="shield_person"
                  priority="secondary"
                  context={roleLabels[largestRole._id] || largestRole._id}
                />
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/30">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">User Trend</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">New accounts created over the last 7 days</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recentActivityTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.16)" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="newUsers" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/30">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Department Load</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">User concentration across departments</p>
                  </div>
                </div>
                <div className="h-64">
                  {departmentBars.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentBars}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.16)" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#16a34a" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
                      No department data yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <SectionCard
              title="Role Distribution"
              description="Current user allocation by RBAC role."
              empty={roleBreakdown.length === 0}
              emptyTitle="No roles yet"
              emptyDescription="Roles will appear here once users are assigned."
              noBodyPadding
            >
              <div className="h-80 p-4 lg:p-5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.16)" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={120} stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#2563eb" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <div className="xl:col-span-5">
            <SectionCard
              title="Department Mix"
              description="Share of users by department."
              empty={departmentPie.length === 0}
              emptyTitle="No department data"
              emptyDescription="Assign departments to users to see the breakdown here."
              noBodyPadding
            >
              <div className="h-80 p-4 lg:p-5">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={departmentPie} dataKey="value" nameKey="name" outerRadius={110} innerRadius={62} paddingAngle={3} label>
                      {departmentPie.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.name === 'Other' ? OTHER_SLICE_COLOR : COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <SectionCard
              title="Recent Users"
              description="Latest accounts created in the system."
              action={{ label: 'Manage', onClick: () => navigate('/admin/users') }}
              empty={recentUsers.length === 0}
              emptyTitle="No recent users"
              emptyDescription="New accounts will appear here as they're created."
            >
              <div className="space-y-3">
                {recentUsers.map((item) => {
                  const initials = `${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}`.toUpperCase() || '?';
                  return (
                    <div key={item._id || item.email} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary dark:bg-primary/20">{initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.firstName} {item.lastName}</p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{item.email}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge tone={item.isActive ? 'success' : 'neutral'} label={item.isActive ? 'Active' : 'Inactive'} />
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{roleLabels[item.role] || item.role} &middot; {formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <aside className="xl:col-span-5">
            <SectionCard title="Quick Actions">
              <QuickActions
                actions={[
                  { label: 'Export Users', icon: 'download', onClick: () => navigate('/admin/users') },
                  { label: 'Security', icon: 'security', onClick: () => navigate('/admin/security') },
                  { label: 'Reports', icon: 'bar_chart', onClick: () => navigate('/admin/reports') },
                ]}
              />
            </SectionCard>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default AdminDashboardEnterprise;
