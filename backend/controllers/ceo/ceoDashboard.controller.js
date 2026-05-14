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
const { getCache, setCache } = require('../../services/cache.service');
const CEO_ANALYTICS_TTL_SECONDS = 300;

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

const PRODUCT_KEYS = ['EEC', 'EHC', 'YCT', 'OTHER'];

const detectProduct = (...parts) => {
  const source = parts
    .filter(Boolean)
    .map((item) => String(item).toUpperCase())
    .join(' ');
  if (source.includes('EEC')) return 'EEC';
  if (source.includes('EHC')) return 'EHC';
  if (source.includes('YCT') || source.includes('YARROWTECH')) return 'YCT';
  return 'OTHER';
};
const DASHBOARD_CACHE_TTL_SECONDS = 60;

const monthBucketExpr = (field) => ({
  $dateToString: { format: '%Y-%m', date: field },
});

const dayBucketExpr = (field) => ({
  $dateToString: { format: '%Y-%m-%d', date: field },
});

/**
 * @route   GET /api/dept/ceo/dashboard
 * @desc    Get CEO dashboard with company overview
 * @access  Private (CEO only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const startedAt = Date.now();
    const cacheKey = `ceo-dashboard:${req.user?._id || 'anon'}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.debug({ cacheKey, ms: Date.now() - startedAt }, 'CEO dashboard cache hit');
      return res.status(200).json({
        success: true,
        data: cached
      });
    }
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);
    const prev30DaysStart = new Date(last30Days);
    prev30DaysStart.setDate(prev30DaysStart.getDate() - 30);
    const last365Days = new Date(now);
    last365Days.setDate(last365Days.getDate() - 365);

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
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      User.aggregate([
        { $match: { isActive: true } },
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
      User.countDocuments({ isActive: true, createdAt: { $gte: last30Days } }),
      User.countDocuments({ role: 'manager' })
    ]);

    const [
      monthlyRevenueRows,
      monthlyExpenseRows,
      monthlyNewUserRows,
      dailyNewUserRows,
      totalExpenseAllTimeAgg,
      paidInvoiceCountAgg,
      totalInvoiceCountAgg,
      productInvoiceRows,
      salesKpiAgg,
      hrKpiAgg,
      itKpiAgg,
      financeKpiAgg
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { issueDate: { $gte: last365Days, $lte: now } } },
        { $group: { _id: monthBucketExpr('$issueDate'), total: { $sum: '$total' } } },
        { $sort: { _id: 1 } }
      ]),
      Expense.aggregate([
        { $match: { incurredDate: { $gte: last365Days, $lte: now } } },
        { $group: { _id: monthBucketExpr('$incurredDate'), total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: last365Days, $lte: now } } },
        { $group: { _id: monthBucketExpr('$createdAt'), count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: last30Days, $lte: now } } },
        { $group: { _id: dayBucketExpr('$createdAt'), count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $count: 'count' }]),
      Invoice.aggregate([{ $count: 'count' }]),
      Invoice.find({ issueDate: { $gte: last365Days, $lte: now } })
        .select('clientName notes items total issueDate createdBy status')
        .lean(),
      Invoice.aggregate([
        { $match: { issueDate: { $gte: last30Days, $lte: now } } },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creator'
          }
        },
        { $addFields: { dept: { $ifNull: [{ $arrayElemAt: ['$creator.department', 0] }, 'Unassigned'] } } },
        {
          $group: {
            _id: '$dept',
            invoices: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      User.aggregate([
        { $match: { department: { $regex: /^hr$/i } } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }
      ]),
      SupportTicket.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, open: { $sum: { $cond: [{ $in: ['$status', ['open', 'in-progress', 'waiting']] }, 1, 0] } } } }
      ]),
      Expense.aggregate([
        { $match: { incurredDate: { $gte: last30Days, $lte: now } } },
        { $group: { _id: null, total: { $sum: '$amount' }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }, count: { $sum: 1 } } }
      ])
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

    const monthlyRevenueMap = Object.fromEntries((monthlyRevenueRows || []).map((r) => [r._id, Number(r.total || 0)]));
    const monthlyExpenseMap = Object.fromEntries((monthlyExpenseRows || []).map((r) => [r._id, Number(r.total || 0)]));
    const monthlyNewUsersMap = Object.fromEntries((monthlyNewUserRows || []).map((r) => [r._id, Number(r.count || 0)]));
    const monthKeys = Array.from(new Set([
      ...Object.keys(monthlyRevenueMap),
      ...Object.keys(monthlyExpenseMap),
      ...Object.keys(monthlyNewUsersMap),
    ])).sort();
    const revenueTrend = monthKeys.map((key) => {
      const revenueVal = monthlyRevenueMap[key] || 0;
      const expenseVal = monthlyExpenseMap[key] || 0;
      return {
        month: key,
        revenue: revenueVal,
        expense: expenseVal,
        profit: revenueVal - expenseVal,
      };
    });
    const latestMonth = revenueTrend[revenueTrend.length - 1] || { revenue: 0 };
    const previousMonth = revenueTrend[revenueTrend.length - 2] || { revenue: 0 };
    const mrr = latestMonth.revenue;
    const arr = mrr * 12;
    const momGrowth = formatPercentChange(latestMonth.revenue, previousMonth.revenue);
    const yoyGrowth = revenueTrend.length > 12
      ? formatPercentChange(latestMonth.revenue, revenueTrend[revenueTrend.length - 13]?.revenue || 0)
      : momGrowth;

    const annualRevenue = revenueTrend.reduce((sum, row) => sum + row.revenue, 0);
    const annualExpense = revenueTrend.reduce((sum, row) => sum + row.expense, 0);
    const netProfit = annualRevenue - annualExpense;
    const burnRate = Math.max((annualExpense - annualRevenue) / 12, 0);
    const estimatedReserve = Math.max((invoiceCurrentAgg?.[0]?.paid || 0) - (expenseCurrentAgg?.[0]?.total || 0), 0) + 1;
    const runwayMonths = burnRate > 0 ? Math.max(Math.floor(estimatedReserve / burnRate), 0) : 24;

    const totalInvoices = totalInvoiceCountAgg?.[0]?.count || 0;
    const paidInvoices = paidInvoiceCountAgg?.[0]?.count || 0;
    const conversionRate = totalInvoices ? ((paidInvoices / totalInvoices) * 100) : 0;
    const productPerfMap = PRODUCT_KEYS.reduce((acc, key) => {
      acc[key] = { revenue: 0, users: new Set(), total: 0, paid: 0 };
      return acc;
    }, {});
    productInvoiceRows.forEach((inv) => {
      const itemText = (inv.items || []).map((x) => x?.description || '').join(' ');
      const key = detectProduct(inv.clientName, inv.notes, itemText);
      if (!productPerfMap[key]) productPerfMap[key] = { revenue: 0, users: new Set(), total: 0, paid: 0 };
      productPerfMap[key].revenue += Number(inv.total || 0);
      productPerfMap[key].total += 1;
      if (inv.status === 'paid') productPerfMap[key].paid += 1;
      if (inv.createdBy) productPerfMap[key].users.add(String(inv.createdBy));
    });
    const productPerformance = Object.entries(productPerfMap).map(([product, v]) => {
      const churn = v.total ? Math.max(100 - ((v.paid / v.total) * 100), 0) : 0;
      return {
        product,
        revenue: v.revenue,
        revenueLabel: formatCurrency(v.revenue),
        activeUsers: v.users.size,
        conversionRate: Number((v.total ? (v.paid / v.total) * 100 : 0).toFixed(1)),
        churnRate: Number(churn.toFixed(1))
      };
    });

    const dailyUserGrowth = (dailyNewUserRows || []).map((row) => ({ date: row._id, users: Number(row.count || 0) }));
    const monthlyUserGrowth = monthKeys.map((m) => ({ month: m, users: monthlyNewUsersMap[m] || 0 }));
    const inactiveUsers = Math.max(totalUsers - activeUsers, 0);
    const retentionRateNum = Number(retentionRate.toFixed(1));

    const salesRevenue = (salesKpiAgg || []).reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const hrTotal = hrKpiAgg?.[0]?.total || 0;
    const hrActive = hrKpiAgg?.[0]?.active || 0;
    const itTotal = itKpiAgg?.[0]?.total || 0;
    const itOpen = itKpiAgg?.[0]?.open || 0;
    const financeApproved = financeKpiAgg?.[0]?.approved || 0;
    const financeCount = financeKpiAgg?.[0]?.count || 0;

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
        revenue: { value: formatCurrency(revenueCurrent), change: revenueChange, numeric: revenueCurrent },
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
        revenue: { value: formatCurrency(revenueCurrent), change: revenueChange, numeric: revenueCurrent },
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
        totalEmployeesNumeric: activeUsers,
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
          ],
      analytics: {
        revenue: {
          mrr,
          arr,
          momGrowth,
          yoyGrowth,
          trend: revenueTrend
        },
        profitability: {
          revenue: annualRevenue,
          expenses: annualExpense,
          netProfit,
          burnRate,
          runwayMonths
        },
        productPerformance,
        userAnalytics: {
          dailyNewUsers: dailyUserGrowth,
          monthlyNewUsers: monthlyUserGrowth,
          retentionRate: retentionRateNum,
          activeUsers,
          inactiveUsers,
          conversionRate: Number(conversionRate.toFixed(1))
        },
        departmentKpis: {
          sales: { revenue: salesRevenue, performanceScore: Number((conversionRate || 0).toFixed(1)) },
          hr: { efficiency: hrTotal ? Number(((hrActive / hrTotal) * 100).toFixed(1)) : 0 },
          it: { uptime: itTotal ? Number((((itTotal - itOpen) / itTotal) * 100).toFixed(1)) : 100 },
          finance: { accuracy: financeCount ? Number(((financeApproved / financeCount) * 100).toFixed(1)) : 100 }
        }
      }
    };

    await setCache(cacheKey, dashboardData, DASHBOARD_CACHE_TTL_SECONDS);
    logger.info({ ms: Date.now() - startedAt }, 'CEO dashboard computed');
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
    const io = req.app?.get('io');
    if (io) {
      io.emit('alert-update', alert);
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
    const now = new Date();
    const period = req.query.period || '30d';
    const search = (req.query.search || '').trim();
    const category = (req.query.category || '').trim();
    const status = (req.query.status || '').trim();
    const product = (req.query.product || '').trim().toUpperCase();
    const department = (req.query.department || '').trim();
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const periodStart = new Date(now);
    if (period === '7d') periodStart.setDate(periodStart.getDate() - 7);
    else if (period === '90d') periodStart.setDate(periodStart.getDate() - 90);
    else if (period === 'ytd') periodStart.setMonth(0, 1);
    else periodStart.setDate(periodStart.getDate() - 30);

    const rangeStart = from && !Number.isNaN(from.getTime()) ? from : periodStart;
    const rangeEnd = to && !Number.isNaN(to.getTime()) ? to : now;
    const dateMatch = { $gte: rangeStart, $lte: rangeEnd };

    const [
      totalUsers,
      activeUsers,
      invoiceAgg,
      expenseAgg,
      projectTotal,
      completedProjects,
      workReportsCount,
      openComplianceCount,
      invoicesForProduct,
      revenueByDepartmentRows
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Invoice.aggregate([
        { $match: { issueDate: dateMatch } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Expense.aggregate([
        { $match: { incurredDate: dateMatch } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Project.countDocuments({ createdAt: dateMatch }),
      Project.countDocuments({ status: 'completed', updatedAt: dateMatch }),
      WorkReport.countDocuments({ createdAt: dateMatch }),
      ComplianceRecord.countDocuments({ status: { $in: ['pending', 'overdue'] } }),
      Invoice.find({ issueDate: dateMatch })
        .select('clientName notes items total issueDate createdBy')
        .lean(),
      Invoice.aggregate([
        { $match: { issueDate: dateMatch } },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creator'
          }
        },
        {
          $addFields: {
            creatorDepartment: {
              $ifNull: [{ $arrayElemAt: ['$creator.department', 0] }, 'Unassigned']
            }
          }
        },
        { $group: { _id: '$creatorDepartment', revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } }
      ]),
    ]);

    const revenue = invoiceAgg[0]?.total || 0;
    const expense = expenseAgg[0]?.total || 0;
    const profit = revenue - expense;
    const completionRate = projectTotal ? (completedProjects / projectTotal) * 100 : 0;

    const productRevenueMap = invoicesForProduct.reduce((acc, invoice) => {
      const itemText = (invoice.items || []).map((x) => x?.description || '').join(' ');
      const key = detectProduct(invoice.clientName, invoice.notes, itemText);
      acc[key] = (acc[key] || 0) + Number(invoice.total || 0);
      return acc;
    }, {});
    PRODUCT_KEYS.forEach((key) => {
      if (!productRevenueMap[key]) productRevenueMap[key] = 0;
    });

    const departmentRows = revenueByDepartmentRows.map((row) => ({
      department: normalizeDepartmentLabel(row._id),
      revenue: Number(row.revenue || 0),
      revenueLabel: formatCurrency(Number(row.revenue || 0)),
    }));

    let reports = [
      {
        id: 'finance-overview',
        title: 'Financial Overview',
        category: 'Finance',
        period,
        status: 'ready',
        owner: 'Finance Office',
        generatedAt: now,
        metrics: {
          revenue,
          expense,
          profit,
          byProduct: PRODUCT_KEYS.map((key) => ({
            product: key,
            revenue: Number(productRevenueMap[key] || 0),
            revenueLabel: formatCurrency(Number(productRevenueMap[key] || 0)),
          })),
          byDepartment: departmentRows,
        },
      },
      {
        id: 'workforce-overview',
        title: 'Workforce Overview',
        category: 'HR',
        period,
        status: 'ready',
        owner: 'HR Office',
        generatedAt: now,
        metrics: {
          totalUsers,
          activeUsers,
          activeRatio: totalUsers ? Number(((activeUsers / totalUsers) * 100).toFixed(1)) : 0,
        },
      },
      {
        id: 'delivery-overview',
        title: 'Delivery & Execution Overview',
        category: 'Operations',
        period,
        status: 'ready',
        owner: 'PMO',
        generatedAt: now,
        metrics: {
          projectTotal,
          completedProjects,
          completionRate: Number(completionRate.toFixed(1)),
          workReportsCount,
        },
      },
      {
        id: 'risk-overview',
        title: 'Compliance & Risk Overview',
        category: 'Risk',
        period,
        status: openComplianceCount > 0 ? 'review' : 'ready',
        owner: 'Compliance Team',
        generatedAt: now,
        metrics: {
          openComplianceCount,
        },
      },
    ];

    if (search) {
      const q = search.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q)
      );
    }
    if (category) {
      reports = reports.filter((r) => r.category.toLowerCase() === category.toLowerCase());
    }
    if (status) {
      reports = reports.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    }
    if (product) {
      reports = reports.filter(
        (r) =>
          r.id !== 'finance-overview' ||
          (r.metrics?.byProduct || []).some((row) => row.product === product)
      );
    }
    if (department) {
      reports = reports.filter(
        (r) =>
          r.id !== 'finance-overview' ||
          (r.metrics?.byDepartment || []).some(
            (row) => row.department.toLowerCase() === department.toLowerCase()
          )
      );
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Company reports',
        reports,
        filters: {
          period,
          from: rangeStart.toISOString(),
          to: rangeEnd.toISOString(),
          product,
          department,
        },
        meta: {
          products: PRODUCT_KEYS,
          departments: departmentRows.map((row) => row.department),
        }
      },
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
    const search = (req.query.search || '').trim();
    const department = (req.query.department || '').trim();
    const role = (req.query.role || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10), 1), 500);
    const skip = (page - 1) * limit;

    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const query = includeInactive ? {} : { isActive: true };
    if (department) query.department = department;
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      User.find(query, {
        password: 0, // Exclude password field
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: employees,
      members: employees,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + employees.length < total,
      },
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

exports.getOverviewAnalytics = async (req, res) => {
  return exports.getDashboard(req, res);
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const cacheKey = `ceo-analytics:revenue:${req.user?._id || 'anon'}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 12);
    const [trend, byDept, invoices] = await Promise.all([
      Invoice.aggregate([
        { $match: { issueDate: { $gte: from, $lte: now } } },
        { $group: { _id: monthBucketExpr('$issueDate'), revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } }
      ]),
      Invoice.aggregate([
        { $match: { issueDate: { $gte: from, $lte: now } } },
        { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creator' } },
        { $addFields: { dept: { $ifNull: [{ $arrayElemAt: ['$creator.department', 0] }, 'Unassigned'] } } },
        { $group: { _id: '$dept', revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } }
      ]),
      Invoice.find({ issueDate: { $gte: from, $lte: now } }).select('clientName notes items total').lean()
    ]);

    const byProductMap = {};
    invoices.forEach((inv) => {
      const itemText = (inv.items || []).map((x) => x?.description || '').join(' ');
      const key = detectProduct(inv.clientName, inv.notes, itemText);
      byProductMap[key] = (byProductMap[key] || 0) + Number(inv.total || 0);
    });
    const byProduct = Object.keys(byProductMap).map((k) => ({ product: k, revenue: byProductMap[k] }));

    const payload = { trend: trend.map((x) => ({ month: x._id, revenue: x.revenue })), byProduct, byDepartment: byDept.map((x) => ({ department: x._id, revenue: x.revenue })) };
    await setCache(cacheKey, payload, CEO_ANALYTICS_TTL_SECONDS);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'CEO revenue analytics error');
    res.status(500).json({ success: false, error: 'Failed to fetch revenue analytics', details: error.message });
  }
};

exports.getProductAnalytics = async (req, res) => {
  try {
    const cacheKey = `ceo-analytics:products:${req.user?._id || 'anon'}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 12);
    const invoices = await Invoice.find({ issueDate: { $gte: from, $lte: now } }).select('clientName notes items total issueDate createdBy').lean();
    const map = {};
    invoices.forEach((inv) => {
      const itemText = (inv.items || []).map((x) => x?.description || '').join(' ');
      const product = detectProduct(inv.clientName, inv.notes, itemText);
      if (!map[product]) map[product] = { product, revenue: 0, users: new Set(), monthly: {} };
      map[product].revenue += Number(inv.total || 0);
      if (inv.createdBy) map[product].users.add(String(inv.createdBy));
      const month = new Date(inv.issueDate).toISOString().slice(0, 7);
      map[product].monthly[month] = (map[product].monthly[month] || 0) + Number(inv.total || 0);
    });
    const products = Object.values(map).map((p) => ({
      product: p.product,
      revenue: p.revenue,
      activeUsers: p.users.size,
      growthRate: (() => {
        const months = Object.keys(p.monthly).sort();
        const last = p.monthly[months[months.length - 1]] || 0;
        const prev = p.monthly[months[months.length - 2]] || 0;
        return computePercentChange(last, prev);
      })()
    }));
    const payload = { products };
    await setCache(cacheKey, payload, CEO_ANALYTICS_TTL_SECONDS);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'CEO product analytics error');
    res.status(500).json({ success: false, error: 'Failed to fetch product analytics', details: error.message });
  }
};

exports.getEmployeeAnalytics = async (req, res) => {
  try {
    const cacheKey = `ceo-analytics:employees:${req.user?._id || 'anon'}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const byDepartment = await User.aggregate([
      { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const active = await User.countDocuments({ isActive: true });
    const total = await User.countDocuments();
    const perf = await WorkReport.aggregate([
      { $match: { productivityScore: { $exists: true } } },
      { $bucket: { groupBy: '$productivityScore', boundaries: [0, 40, 60, 80, 101], default: 'other', output: { count: { $sum: 1 } } } }
    ]);
    const payload = {
        byDepartment: byDepartment.map((x) => ({ department: x._id, value: x.count })),
        activeInactive: [{ label: 'Active', value: active }, { label: 'Inactive', value: Math.max(total - active, 0) }],
        performance: perf.map((x) => ({ bucket: String(x._id), count: x.count }))
      };
    await setCache(cacheKey, payload, CEO_ANALYTICS_TTL_SECONDS);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'CEO employee analytics error');
    res.status(500).json({ success: false, error: 'Failed to fetch employee analytics', details: error.message });
  }
};

exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const cacheKey = `ceo-analytics:departments:${req.user?._id || 'anon'}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const rows = await Task.aggregate([
      { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: 'u' } },
      { $unwind: '$u' },
      { $group: { _id: { $ifNull: ['$u.department', 'Unassigned'] }, output: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { output: -1 } }
    ]);
    const data = rows.map((r) => ({ department: r._id, output: r.output, target: Math.max(r.output, 1), kpi: Number(((r.completed / Math.max(r.output, 1)) * 100).toFixed(1)) }));
    const payload = { departments: data };
    await setCache(cacheKey, payload, CEO_ANALYTICS_TTL_SECONDS);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'CEO department analytics error');
    res.status(500).json({ success: false, error: 'Failed to fetch department analytics', details: error.message });
  }
};

exports.getProjectAnalytics = async (req, res) => {
  try {
    const cacheKey = `ceo-analytics:projects:${req.user?._id || 'anon'}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const trend = await Task.aggregate([
      { $match: { updatedAt: { $gte: from, $lte: now } } },
      { $group: { _id: dayBucketExpr('$updatedAt'), completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]);
    const summary = await Task.aggregate([
      { $group: { _id: null, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] } } } }
    ]);
    const payload = { trend: trend.map((x) => ({ date: x._id, completed: x.completed, pending: x.pending })), split: [{ name: 'Completed', value: summary?.[0]?.completed || 0 }, { name: 'Pending', value: summary?.[0]?.pending || 0 }] };
    await setCache(cacheKey, payload, CEO_ANALYTICS_TTL_SECONDS);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'CEO project analytics error');
    res.status(500).json({ success: false, error: 'Failed to fetch project analytics', details: error.message });
  }
};

exports.getNotificationAnalytics = async (req, res) => {
  try {
    const cacheKey = `ceo-analytics:notifications:${req.user?._id || 'anon'}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const notifications = await notificationService.getNotificationsForManager(req.user, { page: 1, limit: 200 });
    const rows = Array.isArray(notifications.notifications) ? notifications.notifications : [];
    const byTypeMap = rows.reduce((acc, n) => {
      const key = (n.type || n.category || 'general').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const byType = Object.entries(byTypeMap).map(([k, v]) => ({ type: k, value: v }));
    const bar = [{ label: 'Unread', value: notifications.unread || 0 }, { label: 'Total', value: notifications.total || 0 }];
    const payload = { summary: bar, distribution: byType };
    await setCache(cacheKey, payload, CEO_ANALYTICS_TTL_SECONDS);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'CEO notification analytics error');
    res.status(500).json({ success: false, error: 'Failed to fetch notification analytics', details: error.message });
  }
};
