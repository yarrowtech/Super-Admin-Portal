import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';

const moduleCards = [
  { title: 'User Management', description: 'Accounts, roles, permissions, status controls, and exports.', icon: 'group', route: '/admin/users', tone: 'blue', status: 'Live' },
  { title: 'Departments', description: 'Portal access, routing, and module operations.', icon: 'corporate_fare', route: '/admin/departments', tone: 'green', status: 'Live' },
  { title: 'Security', description: 'Security policy, account risk, login controls, and sessions.', icon: 'security', route: '/admin/security', tone: 'red', status: 'Review' },
  { title: 'Reports', description: 'Operational analytics, exports, and business intelligence.', icon: 'bar_chart', route: '/admin/reports', tone: 'purple', status: 'Live' },
  { title: 'Control Center', description: 'Project allocation, workspace access, and governance.', icon: 'admin_panel_settings', route: '/admin/control-center', tone: 'orange', status: 'Live' },
  { title: 'Workflows', description: 'Workflow rules and process automation.', icon: 'account_tree', route: '/admin/workflows', tone: 'indigo', status: 'Configured' },
];

const toneClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  red: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20',
  purple: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20',
  orange: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
};

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

const formatDate = (value) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatPct = (value) => `${Number(value || 0).toFixed(0)}%`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    let alive = true;
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await adminApi.getDashboard(token);
        if (alive) setDashboardData(response?.data || null);
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load dashboard data');
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (token) fetchDashboard();
    return () => {
      alive = false;
    };
  }, [token]);

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
      roleCoverage: dashboardData?.summary?.roleCoverage || 0,
      systemHealth: dashboardData?.summary?.systemHealth || 'good',
      employeeCount: dashboardData?.workforce?.employees || 0,
      managerCount: dashboardData?.workforce?.managers || 0,
      outsourcingOpenJobs: dashboardData?.workforce?.externalWorkload?.openJobs || 0,
      recentLoginCount: dashboardData?.summary?.recentLoginCount || 0,
    };
  }, [dashboardData]);

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return moduleCards;
    return moduleCards.filter((item) => `${item.title} ${item.description} ${item.status}`.toLowerCase().includes(q));
  }, [searchQuery]);

  const usersByRole = dashboardData?.usersByRole || [];
  const departmentStats = dashboardData?.departmentStats || [];
  const recentUsers = dashboardData?.users?.recent || [];
  const largestRole = dashboardData?.insights?.largestRole;
  const topDepartment = dashboardData?.insights?.topDepartment;
  const maxRoleCount = Math.max(...usersByRole.map((item) => item.count), 1);
  const maxDeptCount = Math.max(...departmentStats.map((item) => item.count), 1);

  const rolePie = usersByRole.slice(0, 6).map((row) => ({
    name: roleLabels[row._id] || row._id || 'Unknown',
    value: row.count || 0,
  }));

  const departmentBars = departmentStats.slice(0, 8).map((row) => ({
    name: row._id,
    value: row.count,
  }));

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

  const roleBreakdown = usersByRole.map((item) => ({
    name: roleLabels[item._id] || item._id,
    count: item.count,
  }));

  const topInsights = useMemo(() => [
    `Active rate ${formatPct(metrics.activeRate)}`,
    `New users ${metrics.newUsersLast7Days}`,
    `Role coverage ${metrics.roleCoverage}`,
    `Uptime ${dashboardData?.summary?.systemHealth === 'critical' ? 'needs review' : 'healthy'}`,
  ], [dashboardData?.summary?.systemHealth, metrics.activeRate, metrics.newUsersLast7Days, metrics.roleCoverage]);

  if (loading) {
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

  if (error) {
    return (
      <main className="portal-page p-4 dark:bg-neutral-900">
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-3xl text-red-600">error</span>
              <div className="min-w-0">
                <p className="font-semibold text-red-900 dark:text-red-200">Error Loading Dashboard</p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="mt-4 min-h-11" onClick={() => window.location.reload()}>
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
          showSearch
          showNotifications
          showThemeToggle
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          searchPlaceholder="Search admin modules..."
        >
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {['7d', '30d', '90d'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`min-h-9 rounded-lg px-3 text-xs font-bold uppercase transition-colors ${
                  period === item
                    ? 'bg-primary text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </PortalHeader>

        <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Registered Users" value={metrics.totalUsers} icon="group" colorScheme="blue" subtitle="TOTAL" compact className="min-h-[150px]" />
          <KPICard title="Active Accounts" value={metrics.activeUsers} icon="verified_user" colorScheme="green" subtitle={`${metrics.activeRate}% ACTIVE`} compact className="min-h-[150px]" />
          <KPICard title="Departments" value={metrics.totalDepartments} icon="corporate_fare" colorScheme="purple" subtitle="MODULES" compact className="min-h-[150px]" />
          <KPICard title="System Health" value={metrics.systemHealth} icon="monitor_heart" colorScheme={metrics.systemHealth === 'critical' ? 'red' : metrics.systemHealth === 'warning' ? 'orange' : 'green'} subtitle="PLATFORM" compact className="min-h-[150px]" />
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <KPICard title="Employees" value={metrics.employeeCount} icon="badge" compact />
          <KPICard title="Managers" value={metrics.managerCount} icon="supervisor_account" compact />
          <KPICard title="Outsourcing Open Jobs" value={metrics.outsourcingOpenJobs} icon="work" compact />
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2 lg:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Executive Focus</p>
                <h2 className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-100 sm:text-2xl">Decision signals</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  Monitor users, departments, roles, security posture, and workforce health from one analytics workspace.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                className="min-h-11"
                onClick={() => navigate('/admin/users')}
                icon={<span className="material-symbols-outlined text-lg">person_add</span>}
              >
                Create User
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {topInsights.map((item) => (
                <div key={item} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-[11px] font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200">
                  {item}
                </div>
              ))}
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
                      <YAxis stroke="#94a3b8" fontSize={12} />
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.16)" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#16a34a" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Executive Snapshot</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">Largest Role</span>
                <span className="max-w-36 truncate text-sm font-bold capitalize text-neutral-900 dark:text-neutral-100">{roleLabels[largestRole?._id] || largestRole?._id || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">Top Department</span>
                <span className="max-w-36 truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{topDepartment?._id || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">Recent Logins</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{metrics.recentLoginCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">Generated</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{formatDate(dashboardData?.summary?.generatedAt)}</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 xl:col-span-7 lg:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Role Distribution</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Current user allocation by RBAC role.</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.16)" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={120} stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 xl:col-span-5 lg:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Department Mix</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Share of users by department.</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={departmentStats.slice(0, 8)} dataKey="count" nameKey="_id" outerRadius={110} innerRadius={62} paddingAngle={3} label>
                    {departmentStats.slice(0, 8).map((entry, index) => (
                      <Cell key={entry._id} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 xl:col-span-7 lg:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Recent Users</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Latest accounts created in the system.</p>
              </div>
              <Button variant="secondary" size="sm" className="min-h-10" onClick={() => navigate('/admin/users')}>
                Manage
              </Button>
            </div>
            <div className="space-y-3">
              {recentUsers.length > 0 ? recentUsers.map((item) => {
                const initials = `${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}`.toUpperCase() || '?';
                return (
                  <div key={item._id || item.email} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary dark:bg-primary/20">{initials}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.firstName} {item.lastName}</p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{item.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold capitalize text-neutral-700 dark:text-neutral-200">{roleLabels[item.role] || item.role}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                );
              }) : (
                <p className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">No recent users available.</p>
              )}
            </div>
          </article>

          <aside className="space-y-4 xl:col-span-5">
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Security Posture</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-xs font-bold uppercase text-green-700 dark:text-green-300">Auth</p>
                  <p className="mt-1 text-sm font-semibold text-green-900 dark:text-green-100">Protected Routes</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300">RBAC</p>
                  <p className="mt-1 text-sm font-semibold text-blue-900 dark:text-blue-100">Permissions Active</p>
                </div>
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                  <p className="text-xs font-bold uppercase text-orange-700 dark:text-orange-300">Review</p>
                  <p className="mt-1 text-sm font-semibold text-orange-900 dark:text-orange-100">{metrics.inactiveUsers} inactive users</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
                  <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Sessions</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">JWT Enabled</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Quick Actions</h2>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ['person_add', 'Add User', '/admin/users'],
                  ['download', 'Export Users', '/admin/users'],
                  ['security', 'Security', '/admin/security'],
                  ['bar_chart', 'Reports', '/admin/reports'],
                ].map(([icon, label, route]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigate(route)}
                    className="flex min-h-11 items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-primary/10"
                  >
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {filteredModules.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => navigate(item.route)}
              className="group min-h-[140px] rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-800 dark:bg-neutral-900 lg:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${toneClasses[item.tone]}`}>
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{item.status}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{item.description}</p>
              <div className="mt-4 flex items-center text-sm font-bold text-primary">
                Open module
                <span className="material-symbols-outlined ml-1 text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
};

export default AdminDashboard;
