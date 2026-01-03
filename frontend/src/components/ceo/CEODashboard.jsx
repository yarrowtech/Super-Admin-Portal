import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ceoApi } from '../../api/ceo';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const CEODashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    departmentStats: [],
    lastUpdated: new Date().toISOString(),
    executiveSnapshot: {
      revenue: { value: '$12.8M', change: '+2.5%' },
      cost: { value: '$8.4M', change: '+1.1%' },
      profit: { value: '$4.4M', change: '+3.2%' },
      activeProjects: { value: '48', note: '+6 this month' },
      completedProjects: { value: '132', note: '89% success rate' },
      employeeStrength: { value: '1,240', note: '+12 net hires' },
      growthTrend: { mom: '6.1%', yoy: '18.4%' },
      criticalApprovals: { value: '9', note: '4 overdue' },
      projectCompletion: { value: '89%', change: '-0.5%' },
      systemUptime: { value: '99.98%', change: '+0.01%' }
    },
    overview: {
      revenue: { value: '$12.8M', change: '+2.5%' },
      cost: { value: '$8.4M', change: '+1.1%' },
      profit: { value: '$4.4M', margin: '34.2%' }
    },
    projectKpis: {
      rows: [
        {
          name: 'Phoenix ERP Modernization',
          revenue: '$2.4M',
          cost: '$1.6M',
          profit: '$0.8M',
          status: 'Active',
          risk: 'Medium'
        },
        {
          name: 'Atlas Cloud Migration',
          revenue: '$3.1M',
          cost: '$2.2M',
          profit: '$0.9M',
          status: 'Active',
          risk: 'High'
        },
        {
          name: 'Orion Media Expansion',
          revenue: '$1.7M',
          cost: '$1.1M',
          profit: '$0.6M',
          status: 'Completed',
          risk: 'Low'
        }
      ],
      summary: {
        active: '48',
        completed: '132',
        successRate: '89%',
        allocatedEmployees: '768',
        availableEmployees: '472'
      }
    },
    growthTrends: {
      revenueMom: '6.1%',
      profitYoy: '18.4%',
      customerGrowth: '12.3%'
    },
    departmentPerformance: {
      cards: [
        {
          name: 'Human Resources',
          status: 'On Track',
          metrics: [
            { label: 'Hiring Velocity', value: '+18 roles' },
            { label: 'Attrition Rate', value: '3.1%', tone: 'negative' }
          ]
        },
        {
          name: 'Finance',
          status: 'Healthy',
          metrics: [
            { label: 'Profit Margin', value: '+18.2%', tone: 'positive' },
            { label: 'Cash Runway', value: '14 months' }
          ]
        },
        {
          name: 'IT',
          status: 'At Risk',
          metrics: [
            { label: 'Incident MTTR', value: '2.4 hrs' },
            { label: 'Critical Tickets', value: '7', tone: 'negative' }
          ]
        },
        {
          name: 'Media',
          status: 'Strong',
          metrics: [
            { label: 'Engagement Rate', value: '6.8%' },
            { label: 'Campaign ROI', value: '+220%', tone: 'positive' }
          ]
        }
      ],
      comparison: [
        { department: 'HR', kpiScore: '92', budgetUse: '76%', status: 'On Track' },
        { department: 'Finance', kpiScore: '88', budgetUse: '68%', status: 'Healthy' },
        { department: 'IT', kpiScore: '74', budgetUse: '83%', status: 'At Risk' },
        { department: 'Media', kpiScore: '95', budgetUse: '71%', status: 'Strong' }
      ]
    },
    approvals: {
      budgetApprovals: { value: '6', note: '2 escalated' },
      highValueExpenses: { value: '3', note: '$1.4M pending' },
      policyApprovals: { value: '4', note: 'Compliance updates' },
      exceptionApprovals: { value: '2', note: 'High priority' }
    },
    financials: {
      revenueSummary: { value: '$12.8M', note: '+2.5% QTD' },
      expenseSummary: { value: '$8.4M', note: '+1.1% QTD' },
      profitLoss: { value: '$4.4M', note: 'Margin 34.2%' },
      cashFlow: { value: '$3.6M', note: 'Net inflow' },
      outstandingInvoices: { value: '$1.2M', note: '28 overdue' },
      deptCostBreakdown: { value: '4 departments', note: 'Finance highest 32%' }
    },
    people: {
      totalEmployees: '1,240',
      attritionRate: '3.1%',
      retentionRate: '96.9%',
      hiringTrends: '+12 net',
      leadershipPerformance: '4.6 / 5',
      departmentHeadReports: { value: '8 due', note: '3 overdue' },
      engagementIndex: '82'
    },
    strategicReports: [
      { title: 'Company Growth Report', subtitle: 'Updated 2 days ago' },
      { title: 'Market Performance Summary', subtitle: 'Q3 benchmarking' },
      { title: 'Research Impact Report', subtitle: 'Pipeline ROI 3.2x' },
      { title: 'AI / ML Insight Summary', subtitle: '12 recommendations' },
      { title: 'Risk & Opportunity Analysis', subtitle: '5 high-impact risks' },
      { title: 'Board-ready Report', subtitle: 'Ready for review' }
    ],
    complianceRisk: {
      legalCompliance: '98.6%',
      pendingLegalIssues: '3',
      auditSummaries: '2 open',
      highRiskAlerts: '4',
      dataSecurityAlerts: '3 warnings',
      policyViolations: '2 open'
    },
    systemHealth: {
      uptime: '99.98%',
      incidents: '1 active',
      backupStatus: 'Last run 2h ago',
      securityAlerts: '3 warnings',
      disasterRecovery: 'Ready'
    },
    alerts: [
      {
        id: 1,
        type: 'error',
        icon: 'gpp_maybe',
        title: 'Data Security Risk Alert',
        description: 'Elevated privilege access detected in finance systems.',
        time: '20m ago',
        severity: 'high'
      },
      {
        id: 2,
        type: 'warning',
        icon: 'policy',
        title: 'Policy Violation Report',
        description: 'Unapproved vendor onboarding in Media department.',
        time: '3h ago',
        severity: 'medium'
      },
      {
        id: 3,
        type: 'error',
        icon: 'warning',
        title: 'Pending Legal Issue',
        description: 'Contract dispute escalated with regional partner.',
        time: '1d ago',
        severity: 'high'
      }
    ],
    pendingApprovals: [
      { title: 'Budget: APAC Expansion', detail: '$480k - 2 days pending', status: 'Overdue' },
      { title: 'High-Value Expense: Data Lake', detail: '$320k - 18h pending', status: 'Review' },
      { title: 'Exception: Vendor SLA', detail: 'Finance - 1 day pending', status: 'Review' }
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
            ...data,
            totalEmployees: data.totalEmployees ?? prev.totalEmployees,
            departmentStats: data.departmentStats || prev.departmentStats,
            executiveSnapshot: {
              ...prev.executiveSnapshot,
              ...data.executiveSnapshot
            },
            overview: {
              ...prev.overview,
              ...data.overview
            },
            projectKpis: {
              ...prev.projectKpis,
              ...data.projectKpis,
              rows: data.projectKpis?.rows || prev.projectKpis.rows,
              summary: {
                ...prev.projectKpis.summary,
                ...data.projectKpis?.summary
              }
            },
            growthTrends: {
              ...prev.growthTrends,
              ...data.growthTrends
            },
            departmentPerformance: {
              ...prev.departmentPerformance,
              ...data.departmentPerformance,
              cards: data.departmentPerformance?.cards || prev.departmentPerformance.cards,
              comparison: data.departmentPerformance?.comparison || prev.departmentPerformance.comparison
            },
            approvals: {
              ...prev.approvals,
              ...data.approvals
            },
            financials: {
              ...prev.financials,
              ...data.financials
            },
            people: {
              ...prev.people,
              ...data.people
            },
            strategicReports: data.strategicReports || prev.strategicReports,
            complianceRisk: {
              ...prev.complianceRisk,
              ...data.complianceRisk
            },
            systemHealth: {
              ...prev.systemHealth,
              ...data.systemHealth
            },
            alerts: data.alerts || prev.alerts,
            pendingApprovals: data.pendingApprovals || prev.pendingApprovals,
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

        {/* Executive Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Revenue (QTD)</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.revenue.value}
            </p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.executiveSnapshot.revenue.change.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.executiveSnapshot.revenue.change.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.executiveSnapshot.revenue.change}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Cost (QTD)</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.cost.value}
            </p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.executiveSnapshot.cost.change.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.executiveSnapshot.cost.change.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.executiveSnapshot.cost.change}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Profit (QTD)</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.profit.value}
            </p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.executiveSnapshot.profit.change.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.executiveSnapshot.profit.change.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.executiveSnapshot.profit.change}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Active Projects</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.activeProjects.value}
            </p>
            <p className="text-sm font-medium leading-normal text-neutral-500 dark:text-neutral-400">
              {dashboardData.executiveSnapshot.activeProjects.note}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Completed Projects</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.completedProjects.value}
            </p>
            <p className="text-sm font-medium leading-normal text-neutral-500 dark:text-neutral-400">
              {dashboardData.executiveSnapshot.completedProjects.note}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Employee Strength</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.employeeStrength.value}
            </p>
            <p className="text-sm font-medium leading-normal text-green-600 dark:text-green-400">
              {dashboardData.executiveSnapshot.employeeStrength.note}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">Growth Trend</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              MoM {dashboardData.executiveSnapshot.growthTrend.mom}
            </p>
            <p className="text-sm font-medium leading-normal text-green-600 dark:text-green-400">
              YoY {dashboardData.executiveSnapshot.growthTrend.yoy}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">
              Critical Pending Approvals
            </p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.criticalApprovals.value}
            </p>
            <p className="text-sm font-medium leading-normal text-red-600 dark:text-red-400">
              {dashboardData.executiveSnapshot.criticalApprovals.note}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">
              Project Completion
            </p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.projectCompletion.value}
            </p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.executiveSnapshot.projectCompletion.change.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.executiveSnapshot.projectCompletion.change.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.executiveSnapshot.projectCompletion.change}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium leading-normal text-neutral-600 dark:text-neutral-400">System Uptime</p>
            <p className="tracking-tight text-2xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {dashboardData.executiveSnapshot.systemUptime.value}
            </p>
            <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${
              dashboardData.executiveSnapshot.systemUptime.change.startsWith('+') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {dashboardData.executiveSnapshot.systemUptime.change.startsWith('+') ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span>{dashboardData.executiveSnapshot.systemUptime.change}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Revenue / Cost / Profit Overview */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    Revenue, Cost & Profit Overview
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Quarterly performance with margin tracking.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">View Full P&L</button>
              </div>
              <div className="h-56 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                <div className="text-center">
                  <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-500 text-6xl mb-4 block">
                    query_stats
                  </span>
                  <p className="text-neutral-400 dark:text-neutral-500">Revenue / Cost / Profit Trend</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Revenue</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.overview.revenue.value}
                  </p>
                  <p className={`text-xs ${
                    dashboardData.overview.revenue.change.startsWith('+')
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {dashboardData.overview.revenue.change} QTD
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Cost</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.overview.cost.value}
                  </p>
                  <p className={`text-xs ${
                    dashboardData.overview.cost.change.startsWith('+')
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {dashboardData.overview.cost.change} QTD
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Profit</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.overview.profit.value}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Margin {dashboardData.overview.profit.margin}
                  </p>
                </div>
              </div>
            </div>

            {/* Project-wise KPI */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Project-wise KPI</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Revenue, cost, profit and status by project.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">View All Projects</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Project
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Revenue
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Cost
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Profit
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Status
                      </th>
                      <th className="py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.projectKpis.rows.map((project, index) => {
                      const riskClass = project.risk === 'High'
                        ? 'text-red-600 dark:text-red-400'
                        : project.risk === 'Medium'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400';
                      return (
                        <tr
                          key={`${project.name}-${index}`}
                          className={index < dashboardData.projectKpis.rows.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-700' : ''}
                        >
                          <td className="py-3 pr-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                            {project.name}
                          </td>
                          <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">{project.revenue}</td>
                          <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">{project.cost}</td>
                          <td className="py-3 pr-3 text-sm font-semibold text-green-600 dark:text-green-400">
                            {project.profit}
                          </td>
                          <td className="py-3 pr-3 text-sm text-neutral-700 dark:text-neutral-300">{project.status}</td>
                          <td className={`py-3 text-sm ${riskClass}`}>{project.risk}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Active vs Completed
                  </p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.projectKpis.summary.active} Active / {dashboardData.projectKpis.summary.completed} Completed
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.projectKpis.summary.successRate} completion success
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Employee Strength on Projects
                  </p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.projectKpis.summary.allocatedEmployees} Allocated
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.projectKpis.summary.availableEmployees} available
                  </p>
                </div>
              </div>
            </div>

            {/* Growth Trends */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Growth Trends</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">MoM and YoY trend analysis.</p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Open Trend Report</button>
              </div>
              <div className="h-52 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                <div className="text-center">
                  <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-500 text-6xl mb-4 block">
                    monitoring
                  </span>
                  <p className="text-neutral-400 dark:text-neutral-500">MoM / YoY Growth Chart</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Revenue MoM</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.growthTrends.revenueMom}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Profit YoY</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.growthTrends.profitYoy}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Customer Growth</p>
                  <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.growthTrends.customerGrowth}
                  </p>
                </div>
              </div>
            </div>

            {/* Department Performance */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-neutral-800 dark:text-neutral-100">
                    Department Performance
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    HR, Finance, IT, and Media performance metrics.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Comparison View</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {dashboardData.departmentPerformance.cards.map((card, index) => {
                  const statusClass = card.status === 'At Risk'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400';
                  return (
                    <div
                      key={`${card.name}-${index}`}
                      className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-neutral-800 dark:text-neutral-100">{card.name}</h4>
                        <span className={`text-xs font-semibold ${statusClass}`}>{card.status}</span>
                      </div>
                      {card.metrics.map((metric, metricIndex) => {
                        const toneClass = metric.tone === 'negative'
                          ? 'text-red-600 dark:text-red-400'
                          : metric.tone === 'positive'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-neutral-800 dark:text-neutral-100';
                        return (
                          <div key={`${metric.label}-${metricIndex}`}>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{metric.label}</p>
                            <p className={`text-2xl font-bold ${toneClass}`}>{metric.value}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 overflow-x-auto bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Department
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        KPI Score
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Budget Use
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.departmentPerformance.comparison.map((row, index) => {
                      const statusClass = row.status === 'At Risk'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400';
                      return (
                        <tr
                          key={`${row.department}-${index}`}
                          className={index < dashboardData.departmentPerformance.comparison.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-700' : ''}
                        >
                          <td className="py-3 px-4 text-sm text-neutral-800 dark:text-neutral-100">{row.department}</td>
                          <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">{row.kpiScore}</td>
                          <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">{row.budgetUse}</td>
                          <td className={`py-3 px-4 text-sm ${statusClass}`}>{row.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approval and Authorization */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    Approval and Authorization
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Budget, policy, exception and high-value approvals.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Open Approval Queue</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Budget Approvals</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.approvals.budgetApprovals.value}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.approvals.budgetApprovals.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">High-Value Expenses</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.approvals.highValueExpenses.value}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.approvals.highValueExpenses.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Policy & Rules</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.approvals.policyApprovals.value}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.approvals.policyApprovals.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Exception Requests</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {dashboardData.approvals.exceptionApprovals.value}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.approvals.exceptionApprovals.note}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Intelligence and Control */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Financial Intelligence and Control
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Revenue Summary</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.financials.revenueSummary.value}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {dashboardData.financials.revenueSummary.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Expense Summary</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.financials.expenseSummary.value}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {dashboardData.financials.expenseSummary.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Profit & Loss</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.financials.profitLoss.value}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.financials.profitLoss.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Cash Flow Snapshot</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.financials.cashFlow.value}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.financials.cashFlow.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Outstanding Invoices</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.financials.outstandingInvoices.value}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    {dashboardData.financials.outstandingInvoices.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Dept Cost Breakdown</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.financials.deptCostBreakdown.value}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dashboardData.financials.deptCostBreakdown.note}
                  </p>
                </div>
              </div>
            </div>

            {/* People and Organization Insight */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                People and Organization Insight
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Employees</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.people.totalEmployees}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Global workforce</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Attrition / Retention</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.people.attritionRate} / {dashboardData.people.retentionRate}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">+0.4% YoY</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Hiring Trends</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.people.hiringTrends}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">30 days</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Leadership Performance</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.people.leadershipPerformance}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Top quartile</p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Department Head Reports</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.people.departmentHeadReports.value}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    {dashboardData.people.departmentHeadReports.note}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Engagement Index</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.people.engagementIndex}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Stable QoQ</p>
                </div>
              </div>
            </div>

            {/* Strategic Reports and Analytics */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    Strategic Reports and Analytics
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Board-ready insights and market intelligence.
                  </p>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Export Board Pack</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardData.strategicReports.map((report, index) => (
                  <div
                    key={`${report.title}-${index}`}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4"
                  >
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{report.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{report.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar content area */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            {/* Risk and Compliance Alerts */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Risk and Compliance Alerts
              </h3>
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

            {/* Critical Pending Approvals */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Critical Pending Approvals
              </h3>
              <div className="flex flex-col gap-3">
                {dashboardData.pendingApprovals.map((approval, index) => {
                  const statusClass = approval.status === 'Overdue'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400';
                  return (
                    <div
                      key={`${approval.title}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{approval.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{approval.detail}</p>
                      </div>
                      <span className={`text-xs font-semibold ${statusClass}`}>{approval.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compliance and Risk Oversight */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">
                Compliance and Risk Oversight
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Legal Compliance Status</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {dashboardData.complianceRisk.legalCompliance}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Pending Legal Issues</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {dashboardData.complianceRisk.pendingLegalIssues}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Audit Summaries</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.complianceRisk.auditSummaries}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Policy Violations</p>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {dashboardData.complianceRisk.policyViolations}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Data Security Alerts</p>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {dashboardData.complianceRisk.dataSecurityAlerts}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">High-risk Action Alerts</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {dashboardData.complianceRisk.highRiskAlerts}
                  </p>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">System Health</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">System Uptime</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {dashboardData.systemHealth.uptime}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Major Incidents</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {dashboardData.systemHealth.incidents}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Backup Status</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {dashboardData.systemHealth.backupStatus}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Security Alerts</p>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {dashboardData.systemHealth.securityAlerts}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Disaster Recovery</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {dashboardData.systemHealth.disasterRecovery}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CEODashboard;
