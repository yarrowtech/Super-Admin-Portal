import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { hrApi } from '../../api/hr';
import Button from '../common/Button';

const HRDashboard = () => {
  const { token, user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else if (savedDarkMode === 'false') {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDarkMode(false);
      localStorage.setItem('darkMode', 'false');
    } else {
      html.classList.add('dark');
      setIsDarkMode(true);
      localStorage.setItem('darkMode', 'true');
    }
  };

  const fetchPendingLeaves = async () => {
    const response = await apiClient.get('/api/dept/hr/leave?status=pending&limit=3&page=1', token);
    setPendingLeaves(response?.data?.leaves || []);
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await hrApi.getDashboard(token);
        setDashboardData(response.data);
        await fetchPendingLeaves();
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

  const handleApprove = async (leaveId) => {
    try {
      setActionLoadingId(leaveId);
      await apiClient.put(`/api/dept/hr/leave/${leaveId}/approve`, {}, token);
      await fetchPendingLeaves();
    } catch (err) {
      setError(err.message || 'Failed to approve leave');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (leaveId) => {
    try {
      setActionLoadingId(leaveId);
      await apiClient.put(`/api/dept/hr/leave/${leaveId}/reject`, {}, token);
      await fetchPendingLeaves();
    } catch (err) {
      setError(err.message || 'Failed to reject leave');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalEmployees = dashboardData?.totalEmployees || 0;
  const activeEmployees = dashboardData?.activeEmployees || 0;
  const pendingApplicants = dashboardData?.pendingApplicants || 0;
  const openComplaints = dashboardData?.openComplaints || 0;

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="dot-spinner">
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
            </div>
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
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
          <div className="flex min-w-72 flex-col gap-1">
            <p className="text-gray-800 dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">
              Welcome back, {user?.firstName || 'HR'}!
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">
              Here's your HR overview for this week.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined text-base">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              <div className="ml-2 flex items-center">
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>
            </button>
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="material-symbols-outlined text-base">tune</span>
              <span className="truncate">Customize Dashboard</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Total Employees</p>
            <p className="text-gray-800 dark:text-white tracking-light text-2xl font-bold leading-tight">{totalEmployees}</p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>Active {activeEmployees}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Active Employees</p>
            <p className="text-gray-800 dark:text-white tracking-light text-2xl font-bold leading-tight">{activeEmployees}</p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>In workforce
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Pending Applicants</p>
            <p className="text-gray-800 dark:text-white tracking-light text-2xl font-bold leading-tight">{pendingApplicants}</p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>Pipeline
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">Open Complaints</p>
            <p className="text-gray-800 dark:text-white tracking-light text-2xl font-bold leading-tight">{openComplaints}</p>
            <p className="text-green-500 text-sm font-medium leading-normal flex items-center">
              <span className="material-symbols-outlined text-lg">arrow_upward</span>Needs review
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
              <h2 className="text-gray-800 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-5 pb-3 pt-4">
                Pending Leave Approvals
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="p-3 px-5 text-xs font-semibold text-gray-600 dark:text-gray-400">Request</th>
                      <th className="p-3 px-5 text-xs font-semibold text-gray-600 dark:text-gray-400">Employee</th>
                      <th className="p-3 px-5 text-xs font-semibold text-gray-600 dark:text-gray-400">Date</th>
                      <th className="p-3 px-5 text-xs font-semibold text-gray-600 dark:text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeaves.length ? (
                      pendingLeaves.map((leave) => (
                        <tr key={leave._id} className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                          <td className="p-3 px-5 text-gray-800 dark:text-white text-sm capitalize">
                            {leave.leaveType} Leave
                          </td>
                          <td className="p-3 px-5 text-gray-600 dark:text-gray-400 text-sm">
                            {leave.employee?.firstName} {leave.employee?.lastName}
                          </td>
                          <td className="p-3 px-5 text-gray-600 dark:text-gray-400 text-sm">
                            {new Date(leave.startDate).toLocaleDateString()}
                          </td>
                          <td className="p-3 px-5 flex justify-end gap-2">
                            <button
                              onClick={() => handleReject(leave._id)}
                              disabled={actionLoadingId === leave._id}
                              className="px-3 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            >
                              Deny
                            </button>
                            <button
                              onClick={() => handleApprove(leave._id)}
                              disabled={actionLoadingId === leave._id}
                              className="px-3 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20"
                            >
                              Approve
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 px-5 text-sm text-gray-600 dark:text-gray-400">
                          No pending leave requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex min-w-72 max-w-[336px] flex-1 flex-col gap-0.5 mx-auto">
                <div className="flex items-center p-1 justify-between">
                  <button className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <span className="material-symbols-outlined text-gray-800 dark:text-white flex size-10 items-center justify-center">
                      chevron_left
                    </span>
                  </button>
                  <p className="text-gray-800 dark:text-white text-base font-bold leading-tight flex-1 text-center">October 2023</p>
                  <button className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <span className="material-symbols-outlined text-gray-800 dark:text-white flex size-10 items-center justify-center">
                      chevron_right
                    </span>
                  </button>
                </div>
                <div className="grid grid-cols-7">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                    <p key={day} className="text-gray-800 dark:text-white text-[13px] font-bold leading-normal tracking-[0.015em] flex h-12 w-full items-center justify-center pb-0.5">
                      {day}
                    </p>
                  ))}
                  {[1, 2, 3, 4, 5, 6, 7].map((date) => (
                    <button key={date} className="h-12 w-full text-gray-800 dark:text-white text-sm font-medium leading-normal">
                      <div className={`flex size-full items-center justify-center rounded-full ${date === 5 ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        {date}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default HRDashboard;
