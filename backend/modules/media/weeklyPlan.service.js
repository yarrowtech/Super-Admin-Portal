const WeeklyPlan = require('../../models/department/WeeklyPlan');
const { writeAuditTrail } = require('../../services/auditTrail.service');

const withProgress = (plan) => {
  const objectives = plan.objectives || [];
  const done = objectives.filter((o) => o.status === 'done').length;
  return { ...plan, progress: objectives.length ? Math.round((done / objectives.length) * 100) : 0 };
};

const listPlans = async (projectId) => {
  const plans = await WeeklyPlan.find({ projectId }).sort({ weekStart: -1 }).lean();
  return plans.map(withProgress);
};

const createPlan = async (projectId, payload = {}, actorId) => {
  const objectives = Array.isArray(payload.objectives)
    ? payload.objectives.map((o) => ({
        text: String(o.text || '').trim(),
        ownerId: o.ownerId || undefined,
        linkedTaskIds: Array.isArray(o.linkedTaskIds) ? o.linkedTaskIds : [],
        status: 'pending',
      }))
    : [];

  const doc = await WeeklyPlan.create({
    projectId,
    weekStart: payload.weekStart || new Date(),
    weekEnd: payload.weekEnd || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    objectives,
    createdBy: actorId,
  });

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'weekly_plan_created',
    targetType: 'WeeklyPlan',
    targetId: doc._id,
    metadata: { projectId, objectiveCount: objectives.length },
  });

  return withProgress(doc.toObject());
};

const updateObjectiveStatus = async (planId, objectiveId, status, projectId, actorId) => {
  const plan = await WeeklyPlan.findOne({ _id: planId, projectId });
  if (!plan) return null;

  const objective = plan.objectives.id(objectiveId);
  if (!objective) return null;

  objective.status = status;
  await plan.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'weekly_plan_objective_updated',
    targetType: 'WeeklyPlan',
    targetId: plan._id,
    metadata: { projectId, objectiveId, status },
  });

  return withProgress(plan.toObject());
};

const updateObjectiveText = async (planId, objectiveId, text, projectId, actorId) => {
  const plan = await WeeklyPlan.findOne({ _id: planId, projectId });
  if (!plan) return null;

  const objective = plan.objectives.id(objectiveId);
  if (!objective) return null;

  objective.text = text;
  await plan.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'weekly_plan_objective_updated',
    targetType: 'WeeklyPlan',
    targetId: plan._id,
    metadata: { projectId, objectiveId, text },
  });

  return withProgress(plan.toObject());
};

const addObjective = async (planId, projectId, text, actorId) => {
  const plan = await WeeklyPlan.findOne({ _id: planId, projectId });
  if (!plan) return null;

  plan.objectives.push({ text, status: 'pending' });
  await plan.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'weekly_plan_objective_added',
    targetType: 'WeeklyPlan',
    targetId: plan._id,
    metadata: { projectId, text },
  });

  return withProgress(plan.toObject());
};

const deleteObjective = async (planId, objectiveId, projectId, actorId) => {
  const plan = await WeeklyPlan.findOne({ _id: planId, projectId });
  if (!plan) return null;

  const objective = plan.objectives.id(objectiveId);
  if (!objective) return null;

  objective.deleteOne();
  await plan.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'weekly_plan_objective_deleted',
    targetType: 'WeeklyPlan',
    targetId: plan._id,
    metadata: { projectId, objectiveId },
  });

  return withProgress(plan.toObject());
};

const deletePlan = async (planId, projectId, actorId) => {
  const plan = await WeeklyPlan.findOneAndDelete({ _id: planId, projectId });
  if (!plan) return null;

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'weekly_plan_deleted',
    targetType: 'WeeklyPlan',
    targetId: plan._id,
    metadata: { projectId },
  });

  return { _id: plan._id };
};

module.exports = {
  listPlans,
  createPlan,
  updateObjectiveStatus,
  updateObjectiveText,
  addObjective,
  deleteObjective,
  deletePlan,
};
