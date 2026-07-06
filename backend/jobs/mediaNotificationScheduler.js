const cron = require('node-cron');
const mongoose = require('mongoose');
const Campaign = require('../models/department/Campaign');
const Task = require('../models/common/Task');
const BudgetAllocation = require('../models/department/BudgetAllocation');
const MediaExpense = require('../models/department/MediaExpense');
const Notification = require('../models/common/Notification');
const logger = require('../utils/logger');
const {
  notifyCampaignEnding,
  notifyBudgetExceeded,
  notifyDeadlineTomorrow,
} = require('../services/notificationTrigger.service');

const DAY_MS = 1000 * 60 * 60 * 24;

// Avoid re-notifying on every daily run for the same underlying event.
const alreadyNotifiedRecently = async (type, metadataKey, metadataValue) => {
  const since = new Date(Date.now() - DAY_MS * 0.9);
  const existing = await Notification.findOne({
    type,
    [`metadata.${metadataKey}`]: metadataValue,
    createdAt: { $gte: since },
  }).lean();
  return Boolean(existing);
};

const sweepCampaignEnding = async () => {
  const now = new Date();
  const in48h = new Date(Date.now() + DAY_MS * 2);
  const campaigns = await Campaign.find({
    status: { $in: Campaign.RUNNING_CAMPAIGN_STATUSES },
    endDate: { $gte: now, $lte: in48h },
  }).lean();

  for (const campaign of campaigns) {
    if (await alreadyNotifiedRecently('campaign_ending', 'campaignId', String(campaign._id))) continue;
    const recipients = [campaign.createdBy, ...(campaign.teamMembers || []).map((m) => m.userId)].filter(Boolean);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all([...new Set(recipients.map(String))].map((userId) => notifyCampaignEnding(campaign, userId)));
  }
};

const sweepBudgetExceeded = async () => {
  const allocations = await BudgetAllocation.find({ totalBudget: { $gt: 0 } }).lean();

  for (const allocation of allocations) {
    // eslint-disable-next-line no-await-in-loop
    const agg = await MediaExpense.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(allocation.projectId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const used = agg[0]?.total || 0;
    if (used <= allocation.totalBudget) continue;
    if (await alreadyNotifiedRecently('budget_exceeded', 'projectId', String(allocation.projectId))) continue;
    if (allocation.updatedBy) {
      // eslint-disable-next-line no-await-in-loop
      await notifyBudgetExceeded(allocation.projectId, allocation.updatedBy, { totalBudget: allocation.totalBudget, used });
    }
  }
};

const sweepDeadlineTomorrow = async () => {
  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(24, 0, 0, 0);
  const endOfTomorrow = new Date(startOfTomorrow.getTime() + DAY_MS);

  const tasks = await Task.find({
    campaignId: { $ne: null },
    status: { $nin: ['completed', 'cancelled'] },
    dueDate: { $gte: startOfTomorrow, $lte: endOfTomorrow },
  }).lean();

  for (const task of tasks) {
    if (await alreadyNotifiedRecently('deadline_tomorrow', 'taskId', String(task._id))) continue;
    // eslint-disable-next-line no-await-in-loop
    await notifyDeadlineTomorrow(task);
  }
};

const runDailySweeps = async () => {
  try {
    await Promise.all([sweepCampaignEnding(), sweepBudgetExceeded(), sweepDeadlineTomorrow()]);
    logger.info('Media notification sweeps completed');
  } catch (err) {
    logger.error({ err }, 'Media notification sweeps failed');
  }
};

const startMediaNotificationScheduler = () => {
  // Once daily at 08:00 server time.
  cron.schedule('0 8 * * *', runDailySweeps);
};

module.exports = { startMediaNotificationScheduler, runDailySweeps };
