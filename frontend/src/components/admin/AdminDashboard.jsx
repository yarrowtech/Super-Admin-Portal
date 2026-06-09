import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/admin';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';

const moduleCards = [
  {
    title: 'User Management',
    description: 'Accounts, roles, permissions, status controls, and exports.',
    icon: 'group',
    route: '/admin/users',
    tone: 'blue',
    status: 'Live',
  },
  {
    title: 'Departments',
    description: 'Portal access, department routing, and module operations.',
    icon: 'corporate_fare',
    route: '/admin/departments',
    tone: 'green',
    status: 'Live',
  },
  {
    title: 'Security',
    description: 'Security policy, account risk, login controls, and sessions.',
    icon: 'security',
    route: '/admin/security',
    tone: 'red',
    status: 'Review',
  },
  {
    title: 'Reports',
    description: 'Operational analytics, exports, and business intelligence.',
    icon: 'bar_chart',
    route: '/admin/reports',
    tone: 'purple',
    status: 'Live',
  },
  {
    title: 'Workflows',
    description: 'Dashboard workflow rules and process automation.',
    icon: 'account_tree',
    route: '/admin/workflows',
    tone: 'indigo',
    status: 'Configured',
  },
];

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300',
  green: 'bg-green-50 text-green-700 dark:bg-green-900/25 dark:text-green-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/25 dark:text-red-300',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/25 dark:text-purple-300',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-300',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/25 dark:text-orange-300',
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
};

const formatDate = (value) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

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
        if (alive) setDashboardData(response.data);
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

  if (loading) {
    return (
      <main className="min-h-screen flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
          <div className="mb-4 h-36 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            ))}
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
      <main className="min-h-screen flex-1 overflow-y-auto bg-neutral-50 p-4 dark:bg-neutral-900">
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
    <main className="min-h-screen flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
        <PortalHeader
          title="Admin Dashboard"
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
          <KPICard title="Needs Review" value={metrics.inactiveUsers} icon="warning" colorScheme="orange" subtitle="INACTIVE" compact className="min-h-[150px]" />
          <KPICard title="Departments" value={metrics.totalDepartments} icon="corporate_fare" colorScheme="purple" subtitle="MODULES" compact className="min-h-[150px]" />
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Employees</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">{metrics.employeeCount}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Managers</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">{metrics.managerCount}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Outsourcing Open Jobs</p>
            <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">{metrics.outsourcingOpenJobs}</p>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2 lg:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Platform Command Center</p>
                <h2 className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-100 sm:text-2xl">Operational overview</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  Monitor people, access, departments, security, and reporting from one admin workspace.
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

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">New Users</p>
                <p className="mt-2 text-3xl font-black text-neutral-900 dark:text-neutral-100">{metrics.newUsersLast7Days}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Last 7 days</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Role Coverage</p>
                <p className="mt-2 text-3xl font-black text-neutral-900 dark:text-neutral-100">{metrics.roleCoverage}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Active role groups</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">System Health</p>
                <p className={`mt-2 text-3xl font-black capitalize ${metrics.systemHealth === 'critical' ? 'text-red-600' : metrics.systemHealth === 'warning' ? 'text-orange-600' : 'text-green-600'}`}>
                  {metrics.systemHealth}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Based on active usage</p>
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Executive Snapshot</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">Largest Role</span>
                <span className="text-sm font-bold capitalize text-neutral-900 dark:text-neutral-100">{roleLabels[largestRole?._id] || largestRole?._id || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">Top Department</span>
                <span className="max-w-36 truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{topDepartment?._id || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">Generated</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{formatDate(dashboardData?.summary?.generatedAt)}</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100">Admin Modules</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Fast access to every administrative workspace.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => navigate(item.route)}
                className="group min-h-[160px] rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-800 dark:bg-neutral-900 lg:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClasses[item.tone]}`}>
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
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5 xl:col-span-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Role Distribution</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Current user allocation by RBAC role.</p>
              </div>
              <Button variant="secondary" size="sm" className="min-h-10" onClick={() => navigate('/admin/users')}>
                Manage
              </Button>
            </div>
            <div className="space-y-3">
              {usersByRole.length > 0 ? usersByRole.map((roleData) => {
                const width = `${Math.max((roleData.count / maxRoleCount) * 100, 8)}%`;
                return (
                  <div key={roleData._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-bold capitalize text-neutral-900 dark:text-neutral-100">{roleLabels[roleData._id] || roleData._id}</span>
                      <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{roleData.count} users</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-full rounded-full bg-primary" style={{ width }} />
                    </div>
                  </div>
                );
              }) : (
                <p className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">No role data available.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5 xl:col-span-5">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Recent Users</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Latest accounts created in the system.</p>
            <div className="mt-4 space-y-3">
              {recentUsers.length > 0 ? recentUsers.map((item) => {
                const initials = `${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}`.toUpperCase() || '?';
                return (
                  <div key={item._id || item.email} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5 xl:col-span-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Department Load</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">User concentration across departments.</p>
              </div>
              <Button variant="secondary" size="sm" className="min-h-10" onClick={() => navigate('/admin/departments')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {departmentStats.slice(0, 8).map((dept) => {
                const width = `${Math.max((dept.count / maxDeptCount) * 100, 8)}%`;
                return (
                  <div key={dept._id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{dept._id}</span>
                      <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{dept.count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-full rounded-full bg-green-600" style={{ width }} />
                    </div>
                  </div>
                );
              })}
              {departmentStats.length === 0 ? (
                <p className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">No department data available.</p>
              ) : null}
            </div>
          </section>

          <aside className="space-y-4 xl:col-span-5">
            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Security Posture</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-xs font-bold uppercase text-green-700 dark:text-green-300">Auth</p>
                  <p className="mt-1 text-sm font-semibold text-green-900 dark:text-green-100">Protected Routes</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300">RBAC</p>
                  <p className="mt-1 text-sm font-semibold text-blue-900 dark:text-blue-100">Permissions Active</p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                  <p className="text-xs font-bold uppercase text-orange-700 dark:text-orange-300">Review</p>
                  <p className="mt-1 text-sm font-semibold text-orange-900 dark:text-orange-100">{metrics.inactiveUsers} inactive users</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
                  <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Sessions</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">JWT Enabled</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
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
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;
