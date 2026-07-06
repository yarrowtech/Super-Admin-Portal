const Task = require('../../models/common/Task');
const Campaign = require('../../models/department/Campaign');
const mediaService = require('./media.service');
const budgetService = require('./budget.service');
const kpiService = require('./kpi.service');

// Dashboard Logic (Section 18): a pure aggregation layer — fans out to every module's own
// service rather than recomputing anything itself, then layers the extra totals on top of
// the existing overview payload so MediaDashboard.jsx's existing chart/table consumption
// keeps working unchanged.
const getProjectDashboard = async (projectId) => {
  const taskScope = { campaignId: { $ne: null }, ...(projectId ? { project: projectId } : {}) };

  const [overview, budgetSummary, funnel, completedTasks, pendingTasks, totalCampaigns, runningCampaigns] = await Promise.all([
    mediaService.getOverview(projectId),
    projectId ? budgetService.getBudgetSummary(projectId) : null,
    projectId ? kpiService.getFunnel(projectId) : null,
    Task.countDocuments({ ...taskScope, status: 'completed' }),
    Task.countDocuments({ ...taskScope, status: { $nin: ['completed', 'cancelled'] } }),
    Campaign.countDocuments(projectId ? { projectId } : {}),
    Campaign.countDocuments({ ...(projectId ? { projectId } : {}), status: { $in: Campaign.RUNNING_CAMPAIGN_STATUSES } }),
  ]);

  const customerStage = funnel?.stages?.find((stage) => stage.stage === 'customer');
  const leadStage = funnel?.stages?.find((stage) => stage.stage === 'lead');

  return {
    ...overview,
    kpis: {
      ...overview.kpis,
      totalCampaigns,
      runningCampaigns,
      completedTasks,
      pendingTasks,
      totalBudget: budgetSummary?.totalBudget || 0,
      budgetUsed: budgetSummary?.used || 0,
      budgetRemaining: budgetSummary?.remaining || 0,
      roi: budgetSummary?.roi ?? overview.kpis.marketingRoi,
      roas: budgetSummary?.roas || 0,
      cpl: budgetSummary?.cpl || 0,
      leadCount: leadStage?.count || 0,
      leadToCustomerConversion: customerStage?.conversionFromPrevious || 0,
    },
  };
};

module.exports = { getProjectDashboard };
