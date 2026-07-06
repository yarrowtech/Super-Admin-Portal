const MarketingReport = require('../../models/department/MarketingReport');
const dashboardAggregateService = require('./dashboardAggregate.service');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const { notifyReportReady } = require('../../services/notificationTrigger.service');

// Media-scoped report generator (distinct from the generic backend/services/report.service.js,
// which serves HR-style document reports). Section 16 Report Logic:
// Tasks + Campaign + Budget + Analytics + KPI + Content = Report, for any period window.
const computePeriodRange = (periodType, now = new Date()) => {
  if (periodType === 'weekly') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  if (periodType === 'monthly') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  if (periodType === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3);
    return { start: new Date(now.getFullYear(), quarter * 3, 1), end: new Date(now.getFullYear(), quarter * 3 + 3, 1) };
  }
  // annual
  return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
};

const generateReport = async (projectId, periodType, actorId) => {
  const { start, end } = computePeriodRange(periodType);
  const snapshot = await dashboardAggregateService.getProjectDashboard(projectId);

  const report = await MarketingReport.create({
    projectId,
    periodType,
    periodStart: start,
    periodEnd: end,
    snapshot,
    generatedAt: new Date(),
    generatedBy: actorId,
  });

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'marketing_report_generated',
    targetType: 'MarketingReport',
    targetId: report._id,
    metadata: { projectId, periodType },
  });

  if (actorId) {
    await notifyReportReady(actorId, report);
  }

  return report;
};

const listReports = (projectId, query = {}) => {
  const filter = { projectId };
  if (query.periodType) filter.periodType = query.periodType;
  return MarketingReport.find(filter).sort({ createdAt: -1 }).limit(50).lean();
};

module.exports = { generateReport, listReports, computePeriodRange };
