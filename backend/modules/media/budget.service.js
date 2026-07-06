const mongoose = require('mongoose');
const BudgetAllocation = require('../../models/department/BudgetAllocation');
const MediaExpense = require('../../models/department/MediaExpense');
const KpiSnapshot = require('../../models/department/KpiSnapshot');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const { computeRemaining, computeROI, computeROAS, computeCPL } = require('./budgetCalc.service');

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const getAllocation = (projectId) => BudgetAllocation.findOne({ projectId }).lean();

const upsertAllocation = async (projectId, payload = {}, actorId) => {
  const platformAllocations = Array.isArray(payload.platformAllocations)
    ? payload.platformAllocations.map((row) => ({ platform: String(row.platform || '').trim(), amount: Number(row.amount) || 0 }))
    : [];
  const campaignAllocations = Array.isArray(payload.campaignAllocations)
    ? payload.campaignAllocations.map((row) => ({ campaignId: row.campaignId, amount: Number(row.amount) || 0 }))
    : [];

  const doc = await BudgetAllocation.findOneAndUpdate(
    { projectId },
    {
      $set: {
        totalBudget: Number(payload.totalBudget) || 0,
        platformAllocations,
        campaignAllocations,
        updatedBy: actorId,
      },
    },
    { upsert: true, new: true }
  );

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'budget_allocation_updated',
    targetType: 'BudgetAllocation',
    targetId: doc._id,
    metadata: { projectId, totalBudget: doc.totalBudget },
  });

  return doc;
};

const addExpense = async (projectId, payload = {}, actorId) => {
  const doc = await MediaExpense.create({
    projectId,
    campaignId: payload.campaignId || undefined,
    platform: String(payload.platform || '').trim(),
    category: String(payload.category || 'general').trim(),
    amount: Number(payload.amount) || 0,
    note: String(payload.note || '').trim(),
    recordedBy: actorId,
  });

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'media_expense_recorded',
    targetType: 'MediaExpense',
    targetId: doc._id,
    metadata: { projectId, amount: doc.amount, campaignId: doc.campaignId },
  });

  return doc;
};

const listExpenses = (projectId, query = {}) => {
  const filter = { projectId };
  if (query.campaignId) filter.campaignId = query.campaignId;
  return MediaExpense.find(filter).sort({ createdAt: -1 }).limit(200).lean();
};

const getBudgetSummary = async (projectId) => {
  const [allocation, expenseAgg, latestKpi] = await Promise.all([
    BudgetAllocation.findOne({ projectId }).lean(),
    MediaExpense.aggregate([
      { $match: { projectId: toObjectId(projectId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    KpiSnapshot.findOne({ projectId }).sort({ period: -1 }).lean(),
  ]);

  const totalBudget = allocation?.totalBudget || 0;
  const used = expenseAgg[0]?.total || 0;
  const revenue = latestKpi?.revenue || 0;
  const leads = latestKpi?.leads || 0;

  return {
    totalBudget,
    used,
    remaining: computeRemaining(totalBudget, used),
    roi: computeROI(revenue, used),
    roas: computeROAS(revenue, used),
    cpl: computeCPL(used, leads),
    platformAllocations: allocation?.platformAllocations || [],
    campaignAllocations: allocation?.campaignAllocations || [],
    latestPeriod: latestKpi?.period || null,
  };
};

module.exports = {
  getAllocation,
  upsertAllocation,
  addExpense,
  listExpenses,
  getBudgetSummary,
};
