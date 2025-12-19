import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const totalUsers = dashboardData?.totalUsers || 0;
  const activeUsers = dashboardData?.activeUsers || 0;
  const inactiveUsers = dashboardData?.inactiveUsers || 0;

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-10 w-10 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-neutral-600 dark:text-neutral-400">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-red-600">error</span>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200">Error Loading Dashboard</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="mx-auto max-w-6xl p-5 md:p-6">
        <PortalHeader
          title="Admin Dashboard"
          user={user}
          icon="dashboard"
          showSearch={true}
          showNotifications={true}
          showThemeToggle={true}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          searchPlaceholder="Search roles, departments, or users..."
        />

        {/* KPI Cards */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KPICard
            title="Registered Users"
            value={totalUsers}
            icon="group"
            colorScheme="blue"
            subtitle="TOTAL"
          />
          <KPICard
            title="Currently Active"
            value={activeUsers}
            icon="check_circle"
            colorScheme="green"
            subtitle="ACTIVE"
          />
          <KPICard
            title="Needs Review"
            value={inactiveUsers}
            icon="warning"
            colorScheme="orange"
            subtitle="INACTIVE"
          />
          <KPICard
            title="Active Departments"
            value={dashboardData?.totalDepartments || 0}
            icon="corporate_fare"
            colorScheme="purple"
            subtitle="DEPTS"
          />
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="flex flex-col gap-5 xl:col-span-2">
            <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-300">User Overview</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
                      {dashboardData?.totalUsers || 0}
                    </p>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Registered</p>
                  </div>
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Active: <span className="font-semibold text-green-600 dark:text-green-500">{dashboardData?.activeUsers || 0}</span> ·
                  Inactive: <span className="font-semibold text-orange-600">{dashboardData?.inactiveUsers || 0}</span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <h2 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">User Distribution by Role</h2>
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

            <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <h2 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">Departments</h2>
              <div className="space-y-3">
                {dashboardData?.departmentStats && dashboardData.departmentStats.length > 0 ? (
                  dashboardData.departmentStats.map((dept) => (
                    <div key={dept._id} className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 px-4 py-3">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{dept._id}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Department</p>
                      </div>
                      <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{dept.count} users</span>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-600 dark:text-neutral-400">No department data available</p>
                )}
              </div>
            </section>
          </div>

          
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;
