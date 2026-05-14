const logger = require('../../utils/logger');
// backend/controllers/dept/ceo.controller.js
const User = require('../../models/auth/User');
const Project = require('../../models/common/Project');
const Task = require('../../models/common/Task');
const WorkReport = require('../../models/hr/StaffWorkReport');
const SupportTicket = require('../../models/common/Notification');
const Leave = require('../../models/hr/Leave');
const Invoice = require('../../models/finance/Invoice');
const Expense = require('../../models/finance/Expense');
const ComplianceRecord = require('../../models/finance/Compliance');
const notificationService = require('../../services/notification.service');

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 1,
  notation: 'compact'
});

const percentageFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1
});

const formatCurrency = (value = 0) => currencyFormatter.format(value || 0);

const formatRatioPercent = (numerator, denominator) => {
  if (!denominator) return '0%';
  const percent = (numerator / denominator) * 100;
  return `${percentageFormatter.format(percent)}%`;
};

const computePercentChange = (current = 0, previous = 0) => {
  if (!previous && !current) return 0;
  if (!previous) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

const formatPercentChange = (current = 0, previous = 0) => {
  const change = computePercentChange(current, previous);
  const formatted = percentageFormatter.format(Math.abs(change));
  return `${change >= 0 ? '+' : '-'}${formatted}%`;
};

const toCountMap = (rows = []) =>
  rows.reduce((acc, row) => {
    const key = row?._id || 'Unassigned';
    acc[key] = row?.count || 0;
    return acc;
  }, {});

const normalizeDepartmentLabel = (value) => {
  if (!value || value === 'null') return 'Unassigned';
  return value;
};

const determineDepartmentStatus = (open = 0, completed = 0) => {
  if (open > completed * 1.5) return 'At Risk';
  if (completed > open * 1.5) return 'Strong';
  return 'On Track';
};

const toTitleCase = (value) => {
  if (!value) return 'General';
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
};

const relativeTimeFromNow = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * @route   GET /api/dept/ceo/dashboard
 * @desc    Get CEO dashboard with company overview
 * @access  Private (CEO only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);
    const prev30DaysStart = new Date(last30Days);
    prev30DaysStart.setDate(prev30DaysStart.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      departmentStatsRaw,
      projectStatusRows,
      projectList,
      teamMembersAgg,
      taskStatusRows,
      tasksByDepartment,
      overdueProjectsCount,
      overdueTasksCount,
      projectsCompletedCurrent,
      projectsCompletedPrevious,
      workReportsCurrent,
      workReportsPrevious,
      invoiceCurrentAgg,
      invoicePreviousAgg,
      expenseCurrentAgg,
      expensePreviousAgg,
      pendingExpensesAgg,
      highValueExpensesAgg,
      complianceRows,
      pendingLeavesTotal,
      pendingLeavesList,
      supportOpenCount,
      supportResolvedCount,
      supportTotalCount,
      ticketAlerts,
      outstandingInvoicesAgg,
      newHireCount,
      managerCount
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([
        { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Project.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Project.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name status progress budget teamMembers updatedAt')
        .lean(),
      Project.aggregate([
        { $unwind: { path: '$teamMembers', preserveNullAndEmptyArrays: false } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'assignee'
          }
        },
        { $unwind: '$assignee' },
        {
          $group: {
            _id: { $ifNull: ['$assignee.department', 'Unassigned'] },
            total: { $sum: 1 },
            open: {
              $sum: {
                $cond: [{ $in: ['$status', ['pending', 'in-progress', 'review']] }, 1, 0]
              }
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            }
          }
        },
        { $sort: { total: -1 } }
      ]),
      Project.countDocuments({
        status: { $in: ['planning', 'in-progress', 'on-hold'] },
        deadline: { $lt: now }
      }),
      Task.countDocuments({
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $lt: now }
      }),
      Project.countDocuments({ status: 'completed', updatedAt: { $gte: last30Days } }),
      Project.countDocuments({
        status: 'completed',
        updatedAt: { $gte: prev30DaysStart, $lt: last30Days }
      }),
      WorkReport.countDocuments({ reportDate: { $gte: last30Days } }),
      WorkReport.countDocuments({
        reportDate: { $gte: prev30DaysStart, $lt: last30Days }
      }),
      Invoice.aggregate([
        { $match: { issueDate: { $gte: last30Days } } },
        { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$amountPaid' } } }
      ]),
      Invoice.aggregate([
        { $match: { issueDate: { $gte: prev30DaysStart, $lt: last30Days } } },
        { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$amountPaid' } } }
      ]),
      Expense.aggregate([
        { $match: { incurredDate: { $gte: last30Days } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { incurredDate: { $gte: prev30DaysStart, $lt: last30Days } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { status: { $in: ['submitted', 'verified'] } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        {
          $match: {
            status: { $in: ['submitted', 'verified'] },
            amount: { $gte: 250000 }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      ComplianceRecord.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Leave.countDocuments({ status: 'pending' }),
      Leave.find({ status: 'pending' })
        .sort({ startDate: 1 })
        .limit(5)
        .populate('employee', 'firstName lastName department')
        .lean(),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in-progress', 'waiting'] } }),
      SupportTicket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      SupportTicket.countDocuments(),
      SupportTicket.find({ status: { $in: ['open', 'in-progress', 'waiting'] } })
        .sort({ priority: -1, createdAt: -1 })
        .limit(5)
        .select('title priority status department createdAt')
        .lean(),
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            balance: { $sum: '$balanceDue' },
            overdue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0]
              }
            }
          }
        }
      ]),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      User.countDocuments({ role: 'manager' })
    ]);

    const departmentStats = departmentStatsRaw.map((row) => ({
      _id: normalizeDepartmentLabel(row._id),
      count: row.count
    }));

    const projectStatusMap = toCountMap(projectStatusRows);
    const complianceStatusMap = toCountMap(complianceRows);
    const totalProjects = Object.values(projectStatusMap).reduce((sum, value) => sum + value, 0);
    const activeProjects =
      (projectStatusMap.planning || 0) +
      (projectStatusMap['in-progress'] || 0) +
      (projectStatusMap['on-hold'] || 0);
    const completedProjects = projectStatusMap.completed || 0;
    const allocatedEmployees = teamMembersAgg?.[0]?.count || 0;
    const availableEmployees = Math.max(activeUsers - allocatedEmployees, 0);
    const projectCompletionRate = totalProjects
      ? (completedProjects / totalProjects) * 100
      : 0;
    const projectCompletionChange = formatPercentChange(
      projectsCompletedCurrent,
      projectsCompletedPrevious
    );

    const revenueCurrent = invoiceCurrentAgg?.[0]?.total || 0;
    const revenuePrevious = invoicePreviousAgg?.[0]?.total || 0;
    const revenueChange = formatPercentChange(revenueCurrent, revenuePrevious);
    const costCurrent = expenseCurrentAgg?.[0]?.total || 0;
    const costPrevious = expensePreviousAgg?.[0]?.total || 0;
    const costChange = formatPercentChange(costCurrent, costPrevious);
    const profitCurrent = revenueCurrent - costCurrent;
    const profitPrevious = revenuePrevious - costPrevious;
    const profitChange = formatPercentChange(profitCurrent, profitPrevious);
    const profitMargin = revenueCurrent
      ? ((profitCurrent / revenueCurrent) * 100).toFixed(1)
      : '0.0';

    const pendingExpenseTotal = pendingExpensesAgg?.[0]?.total || 0;
    const pendingExpenseCount = pendingExpensesAgg?.[0]?.count || 0;
    const highValueExpenseTotal = highValueExpensesAgg?.[0]?.total || 0;
    const highValueExpenseCount = highValueExpensesAgg?.[0]?.count || 0;
    const outstandingBalance = outstandingInvoicesAgg?.[0]?.balance || 0;
    const overdueInvoices = outstandingInvoicesAgg?.[0]?.overdue || 0;
    const engagementIndex = Math.min(
      100,
      Math.round((workReportsCurrent / Math.max(activeUsers, 1)) * 100)
    );
    const attritionCount = totalUsers - activeUsers;
    const attritionRate = totalUsers ? (attritionCount / totalUsers) * 100 : 0;
    const retentionRate = 100 - attritionRate;
    const complianceFiled = complianceStatusMap.filed || 0;
    const compliancePending = complianceStatusMap.pending || 0;
    const complianceOverdue = complianceStatusMap.overdue || 0;
    const complianceTotal = complianceFiled + compliancePending + complianceOverdue;
    const compliancePercent = complianceTotal
      ? (complianceFiled / complianceTotal) * 100
      : 100;
    const uptimePercent = supportTotalCount
      ? ((supportTotalCount - supportOpenCount) / supportTotalCount) * 100
      : 100;

    const tasksByDepartmentMap = tasksByDepartment.reduce((acc, row) => {
      acc[normalizeDepartmentLabel(row._id)] = row;
      return acc;
    }, {});

    const departmentCards = departmentStats.slice(0, 4).map((dept) => {
      const taskInfo = tasksByDepartmentMap[dept._id] || {};
      const openTasks = taskInfo.open || 0;
      const completedTasks = taskInfo.completed || 0;
      return {
        name: dept._id,
        status: determineDepartmentStatus(openTasks, completedTasks),
        metrics: [
          { label: 'Active Employees', value: dept.count.toLocaleString() },
          { label: 'Open Tasks', value: openTasks.toLocaleString() }
        ]
      };
    });

    const departmentComparison = tasksByDepartment.slice(0, 5).map((row) => {
      const total = row.total || 0;
      const completion = total ? Math.round((row.completed / total) * 100) : 0;
      const budgetUse = total ? Math.round((row.open / total) * 100) : 0;
      return {
        department: normalizeDepartmentLabel(row._id),
        kpiScore: completion.toString(),
        budgetUse: `${budgetUse}%`,
        status: determineDepartmentStatus(row.open, row.completed)
      };
    });

    const projectRows = projectList.slice(0, 3).map((project) => {
      const estimated = project.budget?.estimated || project.budget?.actual || 0;
      const actual = project.budget?.actual || 0;
      const profitValue = Math.max(estimated - actual, 0);
      const statusLabel = toTitleCase(project.status || 'active');
      const risk =
        project.status === 'on-hold' || project.status === 'cancelled'
          ? 'High'
          : project.progress < 40
            ? 'Medium'
            : 'Low';
      return {
        name: project.name,
        revenue: formatCurrency(estimated),
        cost: formatCurrency(actual),
        profit: formatCurrency(profitValue),
        status: statusLabel,
        risk
      };
    });

    const strategicReports = projectList.length
      ? projectList.slice(0, 5).map((project) => ({
          title: project.name,
          subtitle: `${toTitleCase(project.status || 'active')} · ${project.progress || 0}%`
        }))
      : [
          { title: 'Operations Overview', subtitle: `${activeUsers} active employees` },
          { title: 'Project Portfolio', subtitle: `${totalProjects} total projects` }
        ];

    const alerts = ticketAlerts.map((ticket, index) => {
      const priority = (ticket.priority || '').toLowerCase();
      const type = priority === 'critical' ? 'error' : priority === 'high' ? 'warning' : 'info';
      const icon =
        type === 'error' ? 'warning' : type === 'warning' ? 'priority_high' : 'info';
      return {
        id: ticket._id?.toString?.() || index,
        type,
        icon,
        title: ticket.title,
        description: `${ticket.department || 'General'} · ${toTitleCase(priority || 'normal')} priority`,
        time: relativeTimeFromNow(ticket.createdAt),
        severity: priority || 'medium'
      };
    });

    const pendingApprovals = pendingLeavesList.map((leave) => ({
      title: `${toTitleCase(leave.leaveType || 'Leave')} · ${
        leave.employee
          ? `${leave.employee.firstName || ''} ${leave.employee.lastName || ''}`.trim()
          : 'Employee'
      }`,
      detail: `${leave.totalDays || 1} day(s) · ${leave.employee?.department || 'General'} · ${
        leave.startDate ? new Date(leave.startDate).toLocaleDateString() : 'Upcoming'
      }`,
      status: 'Pending'
    }));

    const dashboardData = {
      totalEmployees: activeUsers,
      departmentStats,
      lastUpdated: now.toISOString(),
      permissions: ['view_all_departments', 'approve_budgets', 'strategic_decisions'],
      executiveSnapshot: {
        revenue: { value: formatCurrency(revenueCurrent), change: revenueChange },
        cost: { value: formatCurrency(costCurrent), change: costChange },
        profit: { value: formatCurrency(profitCurrent), change: profitChange },
        activeProjects: { value: activeProjects.toString(), note: `${overdueProjectsCount} overdue` },
        completedProjects: { value: completedProjects.toString(), note: projectCompletionChange },
        employeeStrength: {
          value: activeUsers.toLocaleString(),
          note: `${newHireCount >= 0 ? '+' : ''}${newHireCount} hires last 30d`
        },
        growthTrend: {
          mom: formatPercentChange(workReportsCurrent, workReportsPrevious),
          yoy: formatPercentChange(activeUsers, totalUsers || activeUsers)
        },
        criticalApprovals: {
          value: (pendingLeavesTotal + pendingExpenseCount).toString(),
          note: `${pendingLeavesTotal} leaves · ${pendingExpenseCount} expenses`
        },
        projectCompletion: {
          value: `${projectCompletionRate.toFixed(0)}%`,
          change: projectCompletionChange
        },
        systemUptime: {
          value: `${uptimePercent.toFixed(2)}%`,
          change: formatPercentChange(supportResolvedCount, supportOpenCount)
        }
      },
      overview: {
        revenue: { value: formatCurrency(revenueCurrent), change: revenueChange },
        cost: { value: formatCurrency(costCurrent), change: costChange },
        profit: { value: formatCurrency(profitCurrent), margin: `${profitMargin}%` }
      },
      projectKpis: {
        rows: projectRows,
        summary: {
          active: activeProjects.toString(),
          completed: completedProjects.toString(),
          successRate: `${projectCompletionRate.toFixed(0)}%`,
          allocatedEmployees: allocatedEmployees.toString(),
          availableEmployees: availableEmployees.toString()
        }
      },
      growthTrends: {
        revenueMom: revenueChange,
        profitYoy: formatPercentChange(profitCurrent, profitPrevious),
        customerGrowth: formatRatioPercent(newHireCount, Math.max(activeUsers - newHireCount, 1))
      },
      departmentPerformance: {
        cards: departmentCards,
        comparison: departmentComparison
      },
      approvals: {
        budgetApprovals: {
          value: pendingExpenseCount.toString(),
          note: `${formatCurrency(pendingExpenseTotal)} pending`
        },
        highValueExpenses: {
          value: highValueExpenseCount.toString(),
          note: `${formatCurrency(highValueExpenseTotal)} flagged`
        },
        policyApprovals: {
          value: compliancePending.toString(),
          note: 'Compliance filings awaiting review'
        },
        exceptionApprovals: {
          value: pendingLeavesTotal.toString(),
          note: 'Pending leave decisions'
        }
      },
      financials: {
        revenueSummary: {
          value: formatCurrency(revenueCurrent),
          note: `${revenueChange} vs last 30d`
        },
        expenseSummary: {
          value: formatCurrency(costCurrent),
          note: `${costChange} vs last 30d`
        },
        profitLoss: {
          value: formatCurrency(profitCurrent),
          note: `Margin ${profitMargin}%`
        },
        cashFlow: {
          value: formatCurrency(invoiceCurrentAgg?.[0]?.paid || 0),
          note: 'Collections in last 30d'
        },
        outstandingInvoices: {
          value: formatCurrency(outstandingBalance),
          note: `${overdueInvoices} overdue`
        },
        deptCostBreakdown: {
          value: `${pendingExpenseCount} departments`,
          note: 'Expense requests in queue'
        }
      },
      people: {
        totalEmployees: activeUsers.toLocaleString(),
        attritionRate: `${attritionRate.toFixed(1)}%`,
        retentionRate: `${retentionRate.toFixed(1)}%`,
        hiringTrends: `${newHireCount >= 0 ? '+' : ''}${newHireCount} hires last 30d`,
        leadershipPerformance: `${managerCount} managers`,
        departmentHeadReports: {
          value: `${pendingLeavesTotal} pending`,
          note: 'Leave approvals awaiting review'
        },
        engagementIndex: engagementIndex.toString()
      },
      strategicReports,
      complianceRisk: {
        legalCompliance: `${compliancePercent.toFixed(1)}%`,
        pendingLegalIssues: complianceOverdue.toString(),
        auditSummaries: `${complianceTotal || 0} filings`,
        highRiskAlerts: complianceOverdue.toString(),
        dataSecurityAlerts: `${alerts.filter((alert) => alert.type === 'error').length}`,
        policyViolations: compliancePending.toString()
      },
      systemHealth: {
        uptime: `${uptimePercent.toFixed(2)}%`,
        incidents: `${supportOpenCount} open tickets`,
        backupStatus: `${supportResolvedCount} resolved tickets`,
        securityAlerts: `${alerts.filter((alert) => alert.type !== 'info').length} warnings`,
        disasterRecovery: supportOpenCount > 5 ? 'Monitoring' : 'Ready'
      },
      alerts,
      pendingApprovals: pendingApprovals.length
        ? pendingApprovals
        : [
            {
              title: 'No pending approvals',
              detail: 'All leave and expense requests are up to date.',
              status: 'Clear'
            }
          ]
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error({ err: error }, 'CEO dashboard error');
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
    logger.error({ err: error }, 'Create alert error');
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/ceo/notifications
 * @desc    Get CEO notifications
 * @access  Private (CEO only)
 */
exports.getNotifications = async (req, res) => {
  try {
    const result = await notificationService.getNotificationsForManager(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result.notifications,
      meta: {
        total: result.total,
        unread: result.unread,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'CEO notifications error');
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message,
    });
  }
};

/**
 * @route   PUT /api/dept/ceo/notifications/:id/read
 * @desc    Mark a CEO notification as read
 * @access  Private (CEO only)
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markNotificationRead(req.user, id);
    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error({ err: error }, 'CEO mark notification read error');
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to mark notification as read',
      details: error.message,
    });
  }
};

/**
 * @route   PUT /api/dept/ceo/notifications/mark-all-read
 * @desc    Mark all CEO notifications as read
 * @access  Private (CEO only)
 */
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const summary = await notificationService.markAllNotificationsRead(req.user);
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: summary,
    });
  } catch (error) {
    logger.error({ err: error }, 'CEO mark all notifications read error');
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to mark notifications as read',
      details: error.message,
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
    logger.error({ err: error }, 'CEO reports error');
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
    logger.error({ err: error }, 'CEO employees error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      details: error.message
    });
  }
};
