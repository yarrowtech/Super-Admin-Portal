const Campaign = require('../../models/department/Campaign');
const Task = require('../../models/common/Task');
const Media = require('../../models/department/Media');
const CalendarEvent = require('../../models/department/CalendarEvent');
const Project = require('../../models/common/Project');
const { writeAuditTrail } = require('../../services/auditTrail.service');

// Live aggregation across every dated entity — Section 13 Calendar Logic.
// Started as a live query rather than a materialized CalendarEvent collection (see roadmap Phase 5 decision point);
// revisit only if this becomes a measurable perf problem.
// Custom (user-created) entries are the one exception — those are real
// documents in the CalendarEvent collection, merged in alongside the
// computed events below.
const getAggregatedCalendar = async (projectId, { from, to } = {}) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  const withinRange = (field) => (Object.keys(dateFilter).length ? { [field]: dateFilter } : { [field]: { $ne: null } });

  const projectScope = projectId ? { projectId } : {};
  const taskProjectScope = projectId ? { project: projectId } : {};

  const [campaignStarts, campaignEnds, tasks, contentPublishes, contentApprovals, customEvents] = await Promise.all([
    Campaign.find({ ...projectScope, ...withinRange('startDate') }).select('name startDate projectId').lean(),
    Campaign.find({ ...projectScope, ...withinRange('endDate') }).select('name endDate projectId').lean(),
    Task.find({ ...taskProjectScope, campaignId: { $ne: null }, ...withinRange('dueDate') }).select('title dueDate campaignId status project').lean(),
    Media.find({ ...projectScope, ...withinRange('publishAt') }).select('title publishAt projectId').lean(),
    Media.find({ ...projectScope, ...withinRange('approvedAt') }).select('title approvedAt projectId').lean(),
    CalendarEvent.find({ ...projectScope, ...withinRange('date') }).lean(),
  ]);

  const events = [
    ...campaignStarts.map((c) => ({ date: c.startDate, type: 'campaign', refId: c._id, title: `Campaign starts: ${c.name}`, projectId: c.projectId })),
    ...campaignEnds.map((c) => ({ date: c.endDate, type: 'launch', refId: c._id, title: `Campaign ends: ${c.name}`, projectId: c.projectId })),
    ...tasks.map((t) => ({ date: t.dueDate, type: 'task', refId: t._id, title: `Task due: ${t.title}`, status: t.status, projectId: t.project })),
    ...contentPublishes.map((m) => ({ date: m.publishAt, type: 'content-publish', refId: m._id, title: `Publish: ${m.title}`, projectId: m.projectId })),
    ...contentApprovals.map((m) => ({ date: m.approvedAt, type: 'approval', refId: m._id, title: `Approved: ${m.title}`, projectId: m.projectId })),
    ...customEvents.map((e) => ({
      date: e.date,
      type: e.type || 'custom',
      refId: e._id,
      title: e.title,
      description: e.description,
      editable: true,
      projectId: e.projectId,
    })),
  ];

  const dated = events.filter((event) => event.date).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Only viewing a single project already has scoping settled client-side —
  // the per-event project label is only useful (and worth the extra lookup)
  // when events from multiple projects are mixed together in the "All" view.
  if (!projectId) {
    const distinctProjectIds = [...new Set(dated.map((event) => String(event.projectId || '')).filter(Boolean))];
    if (distinctProjectIds.length) {
      const projectDocs = await Project.find({ _id: { $in: distinctProjectIds } }).select('name projectCode').lean();
      const nameById = new Map(projectDocs.map((p) => [String(p._id), p.name || p.projectCode || 'Project']));
      dated.forEach((event) => {
        event.projectName = nameById.get(String(event.projectId || '')) || null;
      });
    }
  }

  return dated;
};

const createEvent = async (projectId, payload = {}, actorId) => {
  const doc = await CalendarEvent.create({
    projectId,
    title: String(payload.title || '').trim(),
    date: payload.date,
    type: payload.type ? String(payload.type).trim() : 'custom',
    description: String(payload.description || '').trim(),
    createdBy: actorId,
  });

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'calendar_event_created',
    targetType: 'CalendarEvent',
    targetId: doc._id,
    metadata: { projectId, title: doc.title },
  });

  return doc.toObject();
};

const updateEvent = async (eventId, projectId, payload = {}, actorId) => {
  const event = await CalendarEvent.findOne({ _id: eventId, projectId });
  if (!event) return null;

  if (payload.title !== undefined) event.title = String(payload.title).trim();
  if (payload.date !== undefined) event.date = payload.date;
  if (payload.type !== undefined) event.type = String(payload.type).trim();
  if (payload.description !== undefined) event.description = String(payload.description).trim();
  await event.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'calendar_event_updated',
    targetType: 'CalendarEvent',
    targetId: event._id,
    metadata: { projectId },
  });

  return event.toObject();
};

const deleteEvent = async (eventId, projectId, actorId) => {
  const event = await CalendarEvent.findOneAndDelete({ _id: eventId, projectId });
  if (!event) return null;

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'calendar_event_deleted',
    targetType: 'CalendarEvent',
    targetId: event._id,
    metadata: { projectId },
  });

  return { _id: event._id };
};

module.exports = { getAggregatedCalendar, createEvent, updateEvent, deleteEvent };
