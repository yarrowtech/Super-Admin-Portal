// backend/controllers/dept/ceo.controller.js
const User = require('../../shared/models/User');

/**
 * @route   GET /api/dept/ceo/dashboard
 * @desc    Get CEO dashboard with company overview
 * @access  Private (CEO only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const departmentStats = await User.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    // Generate some dynamic data for demo purposes
    const currentTime = new Date();
    const revenue = 12.8 + (Math.random() - 0.5) * 0.6;
    const cost = 8.4 + (Math.random() - 0.5) * 0.4;
    const profit = Math.max(revenue - cost, 0.5);
    const margin = ((profit / revenue) * 100).toFixed(1);
    const revenueChange = 2.5 + (Math.random() - 0.5) * 1.2;
    const costChange = 1.1 + (Math.random() - 0.5) * 0.6;
    const profitChange = 3.2 + (Math.random() - 0.5) * 1.5;
    const uptime = (99.95 + Math.random() * 0.05).toFixed(2);

    const formatMoney = (value) => `$${value.toFixed(1)}M`;
    const formatChange = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

    const dashboardData = {
      totalEmployees: totalUsers,
      departmentStats,
      lastUpdated: currentTime.toISOString(),
      permissions: ['view_all_departments', 'approve_budgets', 'strategic_decisions'],
      executiveSnapshot: {
        revenue: { value: formatMoney(revenue), change: formatChange(revenueChange) },
        cost: { value: formatMoney(cost), change: formatChange(costChange) },
        profit: { value: formatMoney(profit), change: formatChange(profitChange) },
        activeProjects: { value: '48', note: '+6 this month' },
        completedProjects: { value: '132', note: '89% success rate' },
        employeeStrength: { value: totalUsers.toLocaleString(), note: '+12 net hires' },
        growthTrend: { mom: '6.1%', yoy: '18.4%' },
        criticalApprovals: { value: '9', note: '4 overdue' },
        projectCompletion: { value: '89%', change: '-0.5%' },
        systemUptime: { value: `${uptime}%`, change: '+0.01%' }
      },
      overview: {
        revenue: { value: formatMoney(revenue), change: formatChange(revenueChange) },
        cost: { value: formatMoney(cost), change: formatChange(costChange) },
        profit: { value: formatMoney(profit), margin: `${margin}%` }
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
        revenueSummary: { value: formatMoney(revenue), note: formatChange(revenueChange) + ' QTD' },
        expenseSummary: { value: formatMoney(cost), note: formatChange(costChange) + ' QTD' },
        profitLoss: { value: formatMoney(profit), note: `Margin ${margin}%` },
        cashFlow: { value: '$3.6M', note: 'Net inflow' },
        outstandingInvoices: { value: '$1.2M', note: '28 overdue' },
        deptCostBreakdown: { value: '4 departments', note: 'Finance highest 32%' }
      },
      people: {
        totalEmployees: totalUsers.toLocaleString(),
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
        uptime: `${uptime}%`,
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
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('CEO dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CEO dashboard',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/ceo/alert
 * @desc    Create a new system alert
 * @access  Private (CEO only)
 */
exports.createAlert = async (req, res) => {
  try {
    const { title, description, type = 'info', severity = 'medium' } = req.body;
    
    const alert = {
      id: Date.now(),
      type,
      icon: type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info',
      title,
      description,
      time: 'now',
      severity,
      timestamp: new Date().toISOString()
    };

    // In a real application, you'd save this to database
    // For now, we'll just emit it via socket
    if (req.io) {
      req.io.emit('alert-update', alert);
    }

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/ceo/reports
 * @desc    Get company-wide reports
 * @access  Private (CEO only)
 */
exports.getReports = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Company reports',
        reports: []
      }
    });
  } catch (error) {
    console.error('CEO reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/ceo/employees
 * @desc    Get all employees for CEO
 * @access  Private (CEO only)
 */
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({}, {
      password: 0 // Exclude password field
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('CEO employees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      details: error.message
    });
  }
};
