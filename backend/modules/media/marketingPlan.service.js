const MarketingPlan = require('../../models/department/MarketingPlan');
const { writeAuditTrail } = require('../../services/auditTrail.service');

const arrField = (value) =>
  Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];

const normalizeFramework = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      phase: String(row?.phase || '').trim(),
      whenUsed: String(row?.whenUsed || '').trim(),
      mainFocus: arrField(row?.mainFocus),
      keyOutput: String(row?.keyOutput || '').trim(),
    }))
    .filter((row) => row.phase);

const normalizeChannelPlan = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      category: String(row?.category || '').trim(),
      channels: arrField(row?.channels),
    }))
    .filter((row) => row.category);

const normalizeBudgetPlan = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      phase: String(row?.phase || '').trim(),
      items: arrField(row?.items),
    }))
    .filter((row) => row.phase);

const normalizeChecklist = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      task: String(row?.task || '').trim(),
      owner: String(row?.owner || '').trim(),
      done: Boolean(row?.done),
    }))
    .filter((row) => row.task);

const normalizeWeeklyUpdates = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      week: String(row?.week || '').trim(),
      focusArea: String(row?.focusArea || '').trim(),
      progress: String(row?.progress || '').trim(),
    }))
    .filter((row) => row.week);

const normalizeAcquisitionBudget = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      channel: String(row?.channel || '').trim(),
      monthlyInvestment: String(row?.monthlyInvestment || '').trim(),
      leadsEstimate: String(row?.leadsEstimate || '').trim(),
      cpl: String(row?.cpl || '').trim(),
      status: String(row?.status || '').trim(),
    }))
    .filter((row) => row.channel);

const normalizeFunnelPerformance = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      stage: String(row?.stage || '').trim(),
      target: String(row?.target || '').trim(),
      actual: String(row?.actual || '').trim(),
      conversionPct: String(row?.conversionPct || '').trim(),
    }))
    .filter((row) => row.stage);

const normalizeContentTracker = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      contentType: String(row?.contentType || '').trim(),
      target: String(row?.target || '').trim(),
      completed: String(row?.completed || '').trim(),
    }))
    .filter((row) => row.contentType);

const normalizeDeliverables = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      label: String(row?.label || '').trim(),
      done: Boolean(row?.done),
    }))
    .filter((row) => row.label);

const normalizePayload = (payload = {}) => ({
  overview: {
    industry: String(payload?.overview?.industry || '').trim(),
    platform: String(payload?.overview?.platform || '').trim(),
    targetAudience: String(payload?.overview?.targetAudience || '').trim(),
    usp: String(payload?.overview?.usp || '').trim(),
    currentPhase: String(payload?.overview?.currentPhase || '').trim(),
    overallStatus: String(payload?.overview?.overallStatus || '').trim() || 'On Track',
  },
  goals: {
    brand: arrField(payload?.goals?.brand),
    marketing: arrField(payload?.goals?.marketing),
    business: arrField(payload?.goals?.business),
  },
  framework: normalizeFramework(payload?.framework),
  planning: {
    targetCustomers: arrField(payload?.planning?.targetCustomers),
    painPoints: arrField(payload?.planning?.painPoints),
    buyingTriggers: arrField(payload?.planning?.buyingTriggers),
    positioning: String(payload?.planning?.positioning || '').trim(),
    valueProposition: String(payload?.planning?.valueProposition || '').trim(),
    channelPlan: normalizeChannelPlan(payload?.planning?.channelPlan),
  },
  funnelStages: arrField(payload?.funnelStages),
  kpiPlan: arrField(payload?.kpiPlan),
  budgetPlan: normalizeBudgetPlan(payload?.budgetPlan),

  weeklyChecklist: normalizeChecklist(payload?.weeklyChecklist),
  weeklyUpdates: normalizeWeeklyUpdates(payload?.weeklyUpdates),
  acquisitionBudget: normalizeAcquisitionBudget(payload?.acquisitionBudget),
  funnelPerformance: normalizeFunnelPerformance(payload?.funnelPerformance),
  contentTracker: normalizeContentTracker(payload?.contentTracker),
  priorityMatrix: {
    high: arrField(payload?.priorityMatrix?.high),
    medium: arrField(payload?.priorityMatrix?.medium),
    low: arrField(payload?.priorityMatrix?.low),
  },
  deliverables: normalizeDeliverables(payload?.deliverables),
  performanceSnapshot: {
    websiteVisits: String(payload?.performanceSnapshot?.websiteVisits || '').trim(),
    registrations: String(payload?.performanceSnapshot?.registrations || '').trim(),
    vendorSignups: String(payload?.performanceSnapshot?.vendorSignups || '').trim(),
    bookings: String(payload?.performanceSnapshot?.bookings || '').trim(),
    revenue: String(payload?.performanceSnapshot?.revenue || '').trim(),
    roas: String(payload?.performanceSnapshot?.roas || '').trim(),
  },
  notes: {
    keyObservations: String(payload?.notes?.keyObservations || '').trim(),
    challenges: String(payload?.notes?.challenges || '').trim(),
    nextWeekFocus: String(payload?.notes?.nextWeekFocus || '').trim(),
    actionItems: String(payload?.notes?.actionItems || '').trim(),
  },
});

const getPlanByProject = (projectId) => MarketingPlan.findOne({ projectId }).lean();

const upsertPlanByProject = async (projectId, payload, actorId) => {
  const normalized = normalizePayload(payload);
  const doc = await MarketingPlan.findOneAndUpdate(
    { projectId },
    { $set: { ...normalized, projectId, updatedBy: actorId }, $setOnInsert: { createdBy: actorId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'marketing_plan_saved',
    targetType: 'MarketingPlan',
    targetId: doc._id,
    metadata: { projectId },
  });

  return doc;
};

module.exports = { getPlanByProject, upsertPlanByProject };
