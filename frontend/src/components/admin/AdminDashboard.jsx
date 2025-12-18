import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getDashboard(token);
        setDashboardData(response.data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboard();
    }
  }, [token]);

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="flex h-full items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="flex h-full items-center justify-center">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
            Dashboard
          </h1>
          <div className="flex flex-grow items-center justify-end gap-4 md:flex-grow-0">
            <div className="w-full max-w-sm">
              <label className="flex h-12 min-w-40 w-full flex-col">
                <div className="flex h-full w-full flex-1 items-stretch rounded-xl">
                  <div className="flex items-center justify-center rounded-l-xl border border-r-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-4 text-neutral-500 dark:text-neutral-400">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl border border-l-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 text-base font-normal leading-normal text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:border-primary focus:outline-0 focus:ring-0"
                    placeholder="Search users, content..."
                    defaultValue=""
                  />
                </div>
              </label>
            </div>
            <button className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary"></span>
            </button>
            <div
              className="h-12 w-12 rounded-xl bg-cover bg-center"
              data-alt="Super admin user avatar"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_HFSbNHCmNgTeKZAiFk2MqdSEqd36bsfGVXM1jMm4u-rmgBnoBDcVJpkRH2VlN__XL8gTeUCSNaWwJKRI1aQWTzEJFlZwOsBOty_vqThHZd_iMdGC6uv-at2zgu8HswCT2SKDxAFdEANBncCJPPnVF1JdJE9LC2WD9x9fHsLvY8x4J6_F_lwFafZnDp-dxW2kdcZUMybmvUNwjVpPxdbp4V3asAgzpdG_97qVGZe72iXV5Qth5NM66WFVrkCjZS88_sYOYcCBphv1")',
              }}
            ></div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">Total Users</p>
            <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData?.totalUsers || 0}
            </p>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Registered users</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">Active Users</p>
            <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData?.activeUsers || 0}
            </p>
            <p className="text-sm font-medium text-green-600 dark:text-green-500">Currently active</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">Inactive Users</p>
            <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData?.inactiveUsers || 0}
            </p>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-500">Need attention</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">System Health</p>
            <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">99.9%</p>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">All systems operational</p>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-medium text-neutral-800 dark:text-neutral-300">User Overview</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-[32px] font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
                      {dashboardData?.totalUsers || 0}
                    </p>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Registered</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold text-neutral-800 dark:text-neutral-100">User Distribution by Role</h2>
              <div className="space-y-4">
                {dashboardData?.usersByRole && dashboardData.usersByRole.length > 0 ? (
                  dashboardData.usersByRole.map((roleData) => (
                    <div key={roleData._id} className="flex items-start gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                        <span className="material-symbols-outlined">group</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize text-neutral-800 dark:text-neutral-200">
                          {roleData._id}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{roleData.count} users</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-600 dark:text-neutral-400">No user data available</p>
                )}
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6 lg:col-span-1">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Quick Links</h2>
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                  <span className="material-symbols-outlined text-3xl">manage_accounts</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">User Management</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Add, remove, or edit user permissions and roles.
                </p>
                <a href="/admin/users" className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
                  Go to Users
                </a>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                  <span className="material-symbols-outlined text-3xl">security</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Security Monitoring</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Monitor system security and access logs.
                </p>
                <a href="/admin/security" className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  View Security
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;
