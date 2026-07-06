const Task = require('../../models/common/Task');
const Campaign = require('../../models/department/Campaign');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const { notifyTaskAssigned, notifyTaskCompleted } = require('../../services/notificationTrigger.service');

// Standard task set generated once a campaign enters content production.
const TASK_TEMPLATE = [
  { title: 'Design Banner', description: 'Produce campaign banner artwork for the selected platforms.' },
  { title: 'Write Caption', description: 'Draft captions/copy aligned to the campaign objective.' },
  { title: 'Create Reel', description: 'Produce short-form video content for the campaign.' },
  { title: 'Review', description: 'Internal review of drafted campaign content before approval.' },
  { title: 'Approval', description: 'Route campaign content through the approval pipeline.' },
  { title: 'Publish', description: 'Publish approved campaign content on the selected platforms.' },
];

const defaultDueDate = (campaign) => campaign.endDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

const generateTasksForCampaign = async (campaign, actorId) => {
  const existing = await Task.countDocuments({ campaignId: campaign._id });
  if (existing > 0) return []; // idempotent: only auto-generate once per campaign

  const assignee = campaign.teamMembers?.[0]?.userId || campaign.createdBy || actorId;
  const dueDate = defaultDueDate(campaign);

  const tasks = await Task.insertMany(
    TASK_TEMPLATE.map((item) => ({
      title: `${campaign.name}: ${item.title}`,
      description: item.description,
      assignedTo: assignee,
      assignedBy: actorId,
      project: campaign.projectId,
      campaignId: campaign._id,
      status: 'pending',
      dueDate,
    }))
  );

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'campaign_tasks_generated',
    targetType: 'Campaign',
    targetId: campaign._id,
    metadata: { projectId: campaign.projectId, taskCount: tasks.length },
  });

  await Promise.all(tasks.map((task) => notifyTaskAssigned(task)));

  return tasks;
};

const listTasksForCampaign = async (campaignId, projectId) => {
  const campaign = await Campaign.findOne({ _id: campaignId, ...(projectId ? { projectId } : {}) }).lean();
  if (!campaign) return null;
  return Task.find({ campaignId }).sort({ createdAt: 1 }).lean();
};

const listTasksForProject = async (projectId) => {
  const scope = { campaignId: { $ne: null }, ...(projectId ? { project: projectId } : {}) };
  const tasks = await Task.find(scope).sort({ createdAt: 1 }).lean();
  const campaignIds = [...new Set(tasks.map((task) => String(task.campaignId)))];
  const campaigns = await Campaign.find({ _id: { $in: campaignIds } }).select('name').lean();
  const nameById = new Map(campaigns.map((campaign) => [String(campaign._id), campaign.name]));

  return tasks.map((task) => ({ ...task, campaignName: nameById.get(String(task.campaignId)) || 'Campaign' }));
};

const TASK_STATUSES = ['pending', 'in-progress', 'review', 'completed', 'cancelled'];

const updateTaskStatus = async (campaignId, taskId, status, projectId) => {
  if (!TASK_STATUSES.includes(status)) {
    const err = new Error('Invalid task status');
    err.statusCode = 400;
    throw err;
  }

  const campaign = await Campaign.findOne({ _id: campaignId, ...(projectId ? { projectId } : {}) }).lean();
  if (!campaign) return null;

  const task = await Task.findOne({ _id: taskId, campaignId });
  if (!task) return null;

  task.status = status;
  if (status === 'completed') task.completedDate = new Date();
  await task.save();

  if (status === 'completed') {
    await notifyTaskCompleted(task);
  }

  return task;
};

module.exports = {
  generateTasksForCampaign,
  listTasksForCampaign,
  listTasksForProject,
  updateTaskStatus,
  TASK_STATUSES,
};
