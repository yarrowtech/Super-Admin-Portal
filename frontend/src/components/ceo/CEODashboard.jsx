import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ceoApi } from '../../api/ceo';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const CEODashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: '$12.8M',
    revenueChange: '+2.5%',
    newCustomers: '1,450',
    customersChange: '+1.8%',
    projectCompletion: '89%',
    completionChange: '-0.5%',
    systemUptime: '99.98%',
    uptimeChange: '+0.01%',
    departmentStats: [],
    totalEmployees: 0,
    alerts: [
      {
        id: 1,
        type: 'error',
        icon: 'error',
        title: 'Major System Outage',
        description: 'Main auth server unresponsive. IT notified.',
        time: '5m ago',
        severity: 'high'
      },
      {
        id: 2,
        type: 'warning',
        icon: 'warning',
        title: 'Q3 Budget Overrun',
        description: 'Marketing department has exceeded their quarterly budget by 15%.',
        time: '2h ago',
        severity: 'medium'
      },
      {
        id: 3,
        type: 'error',
        icon: 'security',
        title: 'High Severity Security Threat',
        description: 'A new vulnerability has been detected in the primary database.',
        time: '1d ago',
        severity: 'high'
      }
    ],
    campaigns: [
      { name: 'Summer Sale 2024', roi: '320%' },
      { name: 'Product Launch Webinar', roi: '250%' },
      { name: 'Q3 Social Media Push', roi: '180%' }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          return;
        }

        const response = await ceoApi.getDashboard(token);
        
        if (response.success) {
          const data = response.data;
          setDashboardData(prev => ({
            ...prev,
            totalEmployees: data.totalEmployees,
            departmentStats: data.departmentStats || [],
            totalRevenue: data.totalRevenue || prev.totalRevenue,
            revenueChange: data.revenueChange || prev.revenueChange,
            newCustomers: data.newCustomers || prev.newCustomers,
            customersChange: data.customersChange || prev.customersChange,
            projectCompletion: data.projectCompletion || prev.projectCompletion,
            completionChange: data.completionChange || prev.completionChange,
            systemUptime: data.systemUptime || prev.systemUptime,
            uptimeChange: data.uptimeChange || prev.uptimeChange,
            lastUpdated: data.lastUpdated || new Date().toISOString()
          }));
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up real-time updates via socket
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('CEO Dashboard connected to socket');
    });

    socket.on('dashboard-update', (data) => {
      setDashboardData(prev => ({ ...prev, ...data }));
    });

    socket.on('alert-update', (alert) => {
      setDashboardData(prev => ({
        ...prev,
        alerts: [alert, ...prev.alerts].slice(0, 5) // Keep latest 5 alerts
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getAlertIconClass = (type, severity) => {
    const baseClass = "flex items-center justify-center rounded-lg shrink-0 size-12";
    if (type === 'error' || severity === 'high') {
      return `${baseClass} text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20`;
    } else if (type === 'warning' || severity === 'medium') {
      return `${baseClass} text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20`;
    }
    return `${baseClass} text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20`;
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral-600 dark:text-neutral-400">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6">
        {/* Page Heading */}
        <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              CEO Executive Dashboard
            </h1>
            <p className="text-sm font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Consolidated view of all departmental performance.
            </p>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-neutral-50 dark:hover:bg-neutral-700">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              calendar_today
            </span>
            <span className="truncate">Last 30 Days</span>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              expand_more
            </span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Total Revenue</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.totalRevenue}
            </p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.revenueChange.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.revenueChange.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.revenueChange}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">New Customers</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.newCustomers}
            </p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.customersChange.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.customersChange.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.customersChange}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">
              Project Completion
            </p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">{dashboardData.projectCompletion}</p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.completionChange.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.completionChange.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.completionChange}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">System Uptime</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.systemUptime}
            </p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.uptimeChange.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.uptimeChange.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.uptimeChange}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Revenue Chart */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">Revenue Over Time</h3>
              <div className="h-56 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                <div className="text-center">
                  <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-500 text-6xl mb-4 block">
                    trending_up
                  </span>
                  <p className="text-neutral-400 dark:text-neutral-500">Revenue Chart Analytics</p>
                </div>
              </div>
            </div>

            {/* Departmental KPIs */}
            <div>
              <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] mb-4 text-neutral-800 dark:text-neutral-100">
                Departmental KPIs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">A/C & Finance</h4>
                    <button className="text-sm font-bold text-primary hover:underline">View Details</button>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Profit Margin</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">+18.2%</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Burn Rate</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">$1.2M / mo</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Sales & Growth</h4>
                    <button className="text-sm font-bold text-primary hover:underline">View Details</button>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">New Leads (30d)</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">4,281</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Conversion Rate</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">5.7%</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Human Resources</h4>
                    <button className="text-sm font-bold text-primary hover:underline">View Details</button>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Attrition Rate</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">3.1%</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Open High-Priority Roles</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">4</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Legal & Compliance</h4>
                    <button className="text-sm font-bold text-primary hover:underline">View Details</button>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Major Contracts Pending</p>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">2</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Compliance Adherence</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">99.8%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar content area */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            {/* Critical Alerts */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">Critical Alerts</h3>
              <div className="flex flex-col gap-4">
                {dashboardData.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-4">
                    <div className={getAlertIconClass(alert.type, alert.severity)}>
                      <span className="material-symbols-outlined">{alert.icon}</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-base font-medium leading-normal line-clamp-1 text-neutral-800 dark:text-neutral-100">
                        {alert.title}
                      </p>
                      <p className="text-sm font-normal leading-normal line-clamp-2 text-neutral-600 dark:text-neutral-400">
                        {alert.description}
                      </p>
                      <p className="text-xs font-normal leading-normal text-neutral-400 dark:text-neutral-500 mt-1">
                        {alert.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Campaigns Table */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Top Performing Campaigns
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-2 pr-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                        Campaign
                      </th>
                      <th className="py-2 px-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400 text-right">
                        ROI
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.campaigns.map((campaign, index) => (
                      <tr key={index} className={index < dashboardData.campaigns.length - 1 ? "border-b border-neutral-200 dark:border-neutral-700" : ""}>
                        <td className="py-3 pr-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                          {campaign.name}
                        </td>
                        <td className="py-3 px-2 text-sm font-medium text-green-600 dark:text-green-400 text-right">
                          {campaign.roi}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CEODashboard;
