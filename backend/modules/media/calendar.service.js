const Campaign = require('../../models/department/Campaign');
const Task = require('../../models/common/Task');
const Media = require('../../models/department/Media');

// Live aggregation across every dated entity — Section 13 Calendar Logic.
// Started as a live query rather than a materialized CalendarEvent collection (see roadmap Phase 5 decision point);
// revisit only if this becomes a measurable perf problem.
const getAggregatedCalendar = async (projectId, { from, to } = {}) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  const withinRange = (field) => (Object.keys(dateFilter).length ? { [field]: dateFilter } : { [field]: { $ne: null } });

  const projectScope = projectId ? { projectId } : {};
  const taskProjectScope = projectId ? { project: projectId } : {};

  const [campaignStarts, campaignEnds, tasks, contentPublishes, contentApprovals] = await Promise.all([
    Campaign.find({ ...projectScope, ...withinRange('startDate') }).select('name startDate').lean(),
    Campaign.find({ ...projectScope, ...withinRange('endDate') }).select('name endDate').lean(),
    Task.find({ ...taskProjectScope, campaignId: { $ne: null }, ...withinRange('dueDate') }).select('title dueDate campaignId status').lean(),
    Media.find({ ...projectScope, ...withinRange('publishAt') }).select('title publishAt').lean(),
    Media.find({ ...projectScope, ...withinRange('approvedAt') }).select('title approvedAt').lean(),
  ]);

  const events = [
    ...campaignStarts.map((c) => ({ date: c.startDate, type: 'campaign', refId: c._id, title: `Campaign starts: ${c.name}` })),
    ...campaignEnds.map((c) => ({ date: c.endDate, type: 'launch', refId: c._id, title: `Campaign ends: ${c.name}` })),
    ...tasks.map((t) => ({ date: t.dueDate, type: 'task', refId: t._id, title: `Task due: ${t.title}`, status: t.status })),
    ...contentPublishes.map((m) => ({ date: m.publishAt, type: 'content-publish', refId: m._id, title: `Publish: ${m.title}` })),
    ...contentApprovals.map((m) => ({ date: m.approvedAt, type: 'approval', refId: m._id, title: `Approved: ${m.title}` })),
  ];

  return events
    .filter((event) => event.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

module.exports = { getAggregatedCalendar };
