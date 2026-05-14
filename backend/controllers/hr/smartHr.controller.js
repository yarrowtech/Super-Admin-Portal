const User = require('../../models/auth/User');
const Leave = require('../../models/hr/Leave');
const Attendance = require('../../models/hr/Attendance');

const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const getAnalyticsOverview = async (req, res) => {
  try {
    const monthStart = startOfMonth();
    const [totalEmployees, activeEmployees, pendingLeaves, openPositions, recentLeaves, attendanceRows] = await Promise.all([
      User.countDocuments({ role: 'employee' }),
      User.countDocuments({ role: 'employee', isActive: true }),
      Leave.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'employee', accountStatus: 'pending_verification' }),
      Leave.find({ createdAt: { $gte: monthStart } }).select('employee').lean(),
      Attendance.find({ date: { $gte: monthStart } }).select('employee workHours status').lean(),
    ]);

    const inactiveEmployees = Math.max(totalEmployees - activeEmployees, 0);
    const attritionRate = totalEmployees ? Number(((inactiveEmployees / totalEmployees) * 100).toFixed(1)) : 0;
    const leaveByEmployee = recentLeaves.reduce((acc, row) => {
      const key = String(row.employee || '');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const highLeaveEmployees = Object.values(leaveByEmployee).filter((count) => count >= 2).length;
    const overworkedEmployees = new Set(
      attendanceRows.filter((r) => Number(r.workHours || 0) >= 9 || r.status === 'late').map((r) => String(r.employee || ''))
    ).size;

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        attritionRate,
        pendingLeaves,
        openPositions,
        highLeaveEmployees,
        overworkedEmployees,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load analytics overview', details: error.message });
  }
};

const getPredictiveAlerts = async (req, res) => {
  try {
    const monthStart = startOfMonth();
    const [lateRecords, pendingLeaves, inactiveEmployees, totalEmployees] = await Promise.all([
      Attendance.countDocuments({ date: { $gte: monthStart }, status: 'late' }),
      Leave.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'employee', isActive: false }),
      User.countDocuments({ role: 'employee' }),
    ]);

    const attritionRate = totalEmployees ? Number(((inactiveEmployees / totalEmployees) * 100).toFixed(1)) : 0;
    const alerts = [];

    if (pendingLeaves >= 10) {
      alerts.push({ id: 'leave-spike', level: 'medium', title: 'Leave Trend Alert', detail: 'Pending leave requests crossed threshold.' });
    }
    if (lateRecords >= 20) {
      alerts.push({ id: 'attendance-anomaly', level: 'high', title: 'Attendance Anomaly', detail: 'High late-mark count detected this month.' });
    }
    if (attritionRate >= 15) {
      alerts.push({ id: 'attrition-risk', level: 'high', title: 'Attrition Risk', detail: `Attrition risk at ${attritionRate}% requires intervention.` });
    }

    return res.status(200).json({ success: true, data: { alerts } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load predictive alerts', details: error.message });
  }
};

const getAutomationOverview = async (req, res) => {
  try {
    const monthStart = startOfMonth();
    const [pendingProfiles, pendingLeaves, expiringDocsCount] = await Promise.all([
      User.countDocuments({ role: 'employee', accountStatus: 'pending_verification' }),
      Leave.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'employee', 'metadata.documentExpiry': { $exists: true, $lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) } }),
    ]);

    const workflows = [
      { key: 'onboarding', label: 'Onboarding Workflow', status: pendingProfiles > 0 ? 'attention' : 'healthy', pending: pendingProfiles },
      { key: 'leave-approval', label: 'Leave Approval Queue', status: pendingLeaves > 5 ? 'attention' : 'healthy', pending: pendingLeaves },
      { key: 'document-reminder', label: 'Document Expiry Reminder', status: expiringDocsCount > 0 ? 'attention' : 'healthy', pending: expiringDocsCount },
    ];

    return res.status(200).json({ success: true, data: { workflows } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load automation overview', details: error.message });
  }
};

const getHrReports = async (req, res) => {
  try {
    const monthStart = startOfMonth();
    const [totalEmployees, leavesThisMonth, attendanceThisMonth] = await Promise.all([
      User.countDocuments({ role: 'employee' }),
      Leave.countDocuments({ createdAt: { $gte: monthStart } }),
      Attendance.countDocuments({ date: { $gte: monthStart } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        reports: [
          { type: 'employee', value: totalEmployees, label: 'Total employees' },
          { type: 'leave', value: leavesThisMonth, label: 'Leave requests this month' },
          { type: 'attendance', value: attendanceThisMonth, label: 'Attendance records this month' },
        ],
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load HR reports', details: error.message });
  }
};

module.exports = {
  getAnalyticsOverview,
  getPredictiveAlerts,
  getAutomationOverview,
  getHrReports,
};
