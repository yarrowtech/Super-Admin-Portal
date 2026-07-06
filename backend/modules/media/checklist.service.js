const ProjectChecklist = require('../../models/department/ProjectChecklist');
const { writeAuditTrail } = require('../../services/auditTrail.service');

const { CHECKLIST_TYPES } = ProjectChecklist;

// Ensures all 9 predefined checklist types exist for a project so the UI always has a full board.
const listChecklists = async (projectId) => {
  const existing = await ProjectChecklist.find({ projectId }).lean();
  const existingTypes = new Set(existing.map((row) => row.checklistType));
  const missing = CHECKLIST_TYPES.filter((type) => !existingTypes.has(type));

  if (missing.length) {
    await ProjectChecklist.insertMany(missing.map((checklistType) => ({ projectId, checklistType, items: [] })));
  }

  return missing.length ? ProjectChecklist.find({ projectId }).lean() : existing;
};

const addItem = async (projectId, checklistType, label, actorId) => {
  const doc = await ProjectChecklist.findOneAndUpdate(
    { projectId, checklistType },
    { $push: { items: { label, done: false } }, $setOnInsert: { projectId, checklistType } },
    { upsert: true, new: true }
  );
  doc.completionPercent = doc.items.length ? Math.round((doc.items.filter((i) => i.done).length / doc.items.length) * 100) : 0;
  await doc.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'checklist_item_added',
    targetType: 'ProjectChecklist',
    targetId: doc._id,
    metadata: { projectId, checklistType, label },
  });

  return doc.toObject();
};

const toggleItem = async (projectId, checklistType, itemId, actorId) => {
  const doc = await ProjectChecklist.findOne({ projectId, checklistType });
  if (!doc) return null;

  const item = doc.items.id(itemId);
  if (!item) return null;

  item.done = !item.done;
  item.completedBy = item.done ? actorId : undefined;
  item.completedAt = item.done ? new Date() : undefined;
  await doc.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'checklist_item_toggled',
    targetType: 'ProjectChecklist',
    targetId: doc._id,
    metadata: { projectId, checklistType, itemId, done: item.done },
  });

  return doc.toObject();
};

module.exports = { listChecklists, addItem, toggleItem, CHECKLIST_TYPES };
