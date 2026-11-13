/**
 * Central CRM routes — Media & Marketing departments only.
 * Mounted at /api/v1/crm in app.js
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const CRMClient = require('../models/crm/CRMClient');
const CRMContact = require('../models/crm/CRMContact');
const CRMStatus = require('../models/crm/CRMStatus');
const CRMFollowUp = require('../models/crm/CRMFollowUp');
const CRMCommunication = require('../models/crm/CRMCommunication');
const CRMEmailTemplate = require('../models/crm/CRMEmailTemplate');
const CRMVendor = require('../models/crm/CRMVendor');
const { uploadSpreadsheet } = require('../middlewares/upload.middleware');
const crmImport = require('../services/crmImport.service');
const crmExport = require('../services/crmExport.service');
const crmBulk = require('../services/crmBulk.service');

const CRM_ROLES = ['admin', 'super_admin', 'superadmin', 'media_head', 'media_marketing', 'media_sales'];

const requireCRM = authorize(...CRM_ROLES);
const requireAdmin = authorize('admin', 'super_admin', 'superadmin');

/**
 * Department filter for records whose `department` enum includes a shared value.
 * A record marked 'both' (or 'shared') belongs to Media *and* Marketing, so it
 * must surface under either single-department filter — not only under 'all'.
 */
const deptFilterFor = (department, sharedValue = 'both') =>
  department && department !== 'all'
    ? { department: { $in: [department, sharedValue] } }
    : {};

/**
 * Recompute a client's nextFollowUpAt from its earliest pending follow-up.
 * Derived rather than hand-maintained, so completing or deleting a task can
 * never leave a stale (and wrongly "overdue") date on the client row.
 */
const syncNextFollowUp = async (clientId) => {
  try {
    const next = await CRMFollowUp.findOne({ client: clientId, status: 'pending' })
      .sort({ dueDate: 1 })
      .select('dueDate')
      .lean();
    await CRMClient.findByIdAndUpdate(clientId, { nextFollowUpAt: next?.dueDate || null });
  } catch {
    /* non-fatal: the follow-up itself already saved */
  }
};

router.use(authenticate);

// ── Assignable users ─────────────────────────────────────────────────────────
// Powers the "Owner" / "Assigned to" pickers. Without this every follow-up and
// client was unowned, because the UI had no way to resolve a User id.
router.get('/users', requireCRM, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const users = await User.find({ isActive: { $ne: false } })
      .select('firstName lastName email role')
      .sort({ firstName: 1 })
      .limit(500)
      .lean();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', requireCRM, async (req, res) => {
  try {
    const deptFilter = deptFilterFor(req.query.department);

    const [
      totalMedia,
      totalMarketing,
      totalBoth,
      activeClients,
      pendingFollowUps,
      overdueFollowUps,
      recentCommunications,
    ] = await Promise.all([
      CRMClient.countDocuments({ department: { $in: ['media', 'both'] }, isActive: true }),
      CRMClient.countDocuments({ department: { $in: ['marketing', 'both'] }, isActive: true }),
      CRMClient.countDocuments({ department: 'both', isActive: true }),
      CRMClient.countDocuments({ ...deptFilter, isActive: true }),
      CRMFollowUp.countDocuments({ ...deptFilter, status: 'pending' }),
      // Overdue is derived, not stored: nothing writes status 'overdue', so counting
      // that literal always returned 0. Match how /followups?overdue=true computes it.
      CRMFollowUp.countDocuments({ ...deptFilter, status: 'pending', dueDate: { $lt: new Date() } }),
      // Count by when the interaction HAPPENED, not when the row was typed. A call
      // logged today for last Tuesday belongs to last Tuesday; filtering on createdAt
      // made backdated entries invisible here while still listing them in the timeline
      // below, so the KPI and the list disagreed about the same records.
      CRMCommunication.countDocuments({
        ...deptFilter,
        $expr: {
          $gte: [{ $ifNull: ['$occurredAt', '$createdAt'] }, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)],
        },
      }),
    ]);

    const statusBreakdown = await CRMClient.aggregate([
      { $match: { ...deptFilter, isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        totalMedia,
        totalMarketing,
        totalBoth,
        activeClients,
        pendingFollowUps,
        overdueFollowUps,
        recentCommunications,
        statusBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Clients ───────────────────────────────────────────────────────────────────
router.get('/clients', requireCRM, async (req, res) => {
  try {
    const { department, status, priority, search, projectId, importBatch, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true, ...deptFilterFor(department) };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    // 'unassigned' selects the pre-project records, which a bare id cannot express.
    if (projectId === 'unassigned') filter.project = null;
    else if (projectId && mongoose.isValidObjectId(projectId)) filter.project = projectId;
    if (importBatch) filter.importBatch = importBatch;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { clientId: { $regex: search, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [clients, total] = await Promise.all([
      CRMClient.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).populate('owner', 'firstName lastName email').lean(),
      CRMClient.countDocuments(filter),
    ]);

    res.json({ success: true, data: clients, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Lightweight list for client pickers (follow-up / communication / contact forms).
 * Unpaginated and field-trimmed on purpose: a <select> needs every option, and the
 * paginated /clients list silently truncated the choices to the first page.
 */
router.get('/clients/options', requireCRM, async (req, res) => {
  try {
    const clients = await CRMClient.find({ isActive: true, ...deptFilterFor(req.query.department) })
      .select('name clientId department status')
      .sort({ name: 1 })
      .limit(2000)
      .lean();
    res.json({ success: true, data: clients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Client 360: the record plus every related entity in one round trip, so the
 * detail drawer renders a complete relationship history without N calls.
 */
router.get('/clients/:id/overview', requireCRM, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid client id' });
    }

    const client = await CRMClient.findById(id)
      .populate('owner', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .lean();
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const [contacts, followups, communications] = await Promise.all([
      CRMContact.find({ client: id, isActive: true }).sort({ isPrimary: -1, firstName: 1 }).lean(),
      CRMFollowUp.find({ client: id }).populate('assignedTo', 'firstName lastName').sort({ dueDate: 1 }).lean(),
      CRMCommunication.find({ client: id }).populate('createdBy', 'firstName lastName').sort({ occurredAt: -1 }).limit(100).lean(),
    ]);

    res.json({ success: true, data: { client, contacts, followups, communications } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/clients/:id', requireCRM, async (req, res) => {
  try {
    const client = await CRMClient.findById(req.params.id).populate('owner', 'firstName lastName email').populate('createdBy', 'firstName lastName').lean();
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/clients', requireCRM, async (req, res) => {
  try {
    const client = await CRMClient.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/clients/:id', requireCRM, async (req, res) => {
  try {
    const { status, ...rest } = req.body;
    const client = await CRMClient.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const previousStatus = client.status;
    const statusChanged = Boolean(status && status !== previousStatus);

    if (statusChanged) {
      client.statusHistory.push({ fromStatus: previousStatus, toStatus: status, changedBy: req.user._id, reason: req.body.statusReason });
      client.status = status;
    }
    delete rest.statusReason;
    delete rest.statusHistory;
    Object.assign(client, rest);
    await client.save();

    // A stage move is a relationship event: mirror it into the communication
    // timeline so the client 360 reads as one continuous history rather than
    // hiding pipeline movement in a separate tab.
    if (statusChanged) {
      await CRMCommunication.create({
        client: client._id,
        department: client.department === 'both' ? 'media' : client.department,
        type: 'status_change',
        direction: 'internal',
        isInternal: true,
        subject: `Status: ${previousStatus || '—'} → ${status}`,
        body: req.body.statusReason || '',
        createdBy: req.user._id,
      }).catch(() => {});
    }

    res.json({ success: true, data: client });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/clients/:id', requireAdmin, async (req, res) => {
  try {
    await CRMClient.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Client deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Contacts ──────────────────────────────────────────────────────────────────
router.get('/contacts', requireCRM, async (req, res) => {
  try {
    const { department, clientId, search } = req.query;
    const filter = { isActive: true, ...deptFilterFor(department) };
    if (clientId) filter.client = clientId;
    if (search) filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
    ];
    const contacts = await CRMContact.find(filter).populate('client', 'name clientId').sort({ isPrimary: -1, createdAt: -1 }).lean();
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/contacts', requireCRM, async (req, res) => {
  try {
    const contact = await CRMContact.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/contacts/:id', requireCRM, async (req, res) => {
  try {
    const contact = await CRMContact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/contacts/:id', requireAdmin, async (req, res) => {
  try {
    await CRMContact.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Statuses ──────────────────────────────────────────────────────────────────
router.get('/statuses', requireCRM, async (req, res) => {
  try {
    const filter = { isActive: true, ...deptFilterFor(req.query.department, 'shared') };
    const statuses = await CRMStatus.find(filter).sort({ department: 1, order: 1 }).lean();
    res.json({ success: true, data: statuses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/statuses', requireAdmin, async (req, res) => {
  try {
    const status = await CRMStatus.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: status });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/statuses/:id', requireAdmin, async (req, res) => {
  try {
    const status = await CRMStatus.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!status) return res.status(404).json({ success: false, error: 'Status not found' });
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/statuses/:id', requireAdmin, async (req, res) => {
  try {
    await CRMStatus.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Follow-ups ────────────────────────────────────────────────────────────────
router.get('/followups', requireCRM, async (req, res) => {
  try {
    const { department, status, assignedTo, overdue, clientId } = req.query;
    const filter = {};
    if (department && department !== 'all') filter.department = department;
    if (clientId) filter.client = clientId;
    if (assignedTo) filter.assignedTo = assignedTo;
    // 'overdue' is derived (pending + past due), not a stored status, so it must
    // override any status filter rather than sit alongside it.
    if (overdue === 'true') {
      filter.status = 'pending';
      filter.dueDate = { $lt: new Date() };
    } else if (status && status !== 'overdue') {
      filter.status = status;
    } else if (status === 'overdue') {
      filter.status = 'pending';
      filter.dueDate = { $lt: new Date() };
    }

    const followups = await CRMFollowUp.find(filter)
      .populate('client', 'name clientId')
      .populate('assignedTo', 'firstName lastName')
      .sort({ dueDate: 1 })
      .lean();
    res.json({ success: true, data: followups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/followups', requireCRM, async (req, res) => {
  try {
    const followup = await CRMFollowUp.create({ ...req.body, createdBy: req.user._id });

    // Keep the client's "next follow-up" in step with the earliest pending task,
    // so the Clients table's overdue highlighting reflects reality.
    if (followup.client) await syncNextFollowUp(followup.client);

    const populated = await CRMFollowUp.findById(followup._id)
      .populate('client', 'name clientId')
      .populate('assignedTo', 'firstName lastName')
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/followups/:id', requireCRM, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status === 'completed' && !update.completedAt) update.completedAt = new Date();
    const followup = await CRMFollowUp.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('client', 'name clientId')
      .populate('assignedTo', 'firstName lastName');
    if (!followup) return res.status(404).json({ success: false, error: 'Follow-up not found' });

    if (followup.client) await syncNextFollowUp(followup.client._id || followup.client);

    // Completing a follow-up is a contact event worth recording on the timeline.
    if (update.status === 'completed' && followup.client) {
      await CRMCommunication.create({
        client: followup.client._id || followup.client,
        department: followup.department,
        type: followup.type === 'other' ? 'note' : followup.type,
        direction: 'outbound',
        subject: `Follow-up completed: ${followup.type}`,
        body: update.outcome || followup.notes || '',
        createdBy: req.user._id,
      }).catch(() => {});
      await CRMClient.findByIdAndUpdate(followup.client._id || followup.client, { lastContactedAt: new Date() }).catch(() => {});
    }

    res.json({ success: true, data: followup });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/followups/:id', requireAdmin, async (req, res) => {
  try {
    const removed = await CRMFollowUp.findByIdAndDelete(req.params.id);
    if (removed?.client) await syncNextFollowUp(removed.client);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Communications ────────────────────────────────────────────────────────────
router.get('/communications', requireCRM, async (req, res) => {
  try {
    const { department, clientId, type, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (department && department !== 'all') filter.department = department;
    if (clientId) filter.client = clientId;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [comms, total] = await Promise.all([
      CRMCommunication.find(filter).populate('client', 'name clientId').populate('createdBy', 'firstName lastName').sort({ occurredAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      CRMCommunication.countDocuments(filter),
    ]);
    res.json({ success: true, data: comms, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/communications', requireCRM, async (req, res) => {
  try {
    const comm = await CRMCommunication.create({ ...req.body, createdBy: req.user._id });
    // Update client lastContactedAt — but only for real outward contact: an
    // internal note or a system status entry is not "we spoke to the client".
    if (req.body.client && !comm.isInternal && comm.type !== 'status_change') {
      await CRMClient.findByIdAndUpdate(req.body.client, { lastContactedAt: comm.occurredAt || new Date() });
    }
    const populated = await CRMCommunication.findById(comm._id)
      .populate('client', 'name clientId')
      .populate('createdBy', 'firstName lastName')
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/communications/:id', requireAdmin, async (req, res) => {
  try {
    await CRMCommunication.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Pipeline (kanban) ─────────────────────────────────────────────────────────
/**
 * Clients grouped into their configured status columns. Returns the stage
 * definitions alongside the records so the board can render empty stages too —
 * an empty column is meaningful information in a pipeline.
 */
router.get('/pipeline', requireCRM, async (req, res) => {
  try {
    const { department } = req.query;
    const [stages, clients] = await Promise.all([
      CRMStatus.find({ isActive: true, ...deptFilterFor(department, 'shared') }).sort({ order: 1 }).lean(),
      CRMClient.find({ isActive: true, ...deptFilterFor(department) })
        .select('name clientId status priority department owner nextFollowUpAt lastContactedAt')
        .populate('owner', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .limit(1000)
        .lean(),
    ]);

    // De-duplicate stage names: Media and Marketing both define "Contacted" and
    // "Proposal Sent", which would otherwise render as two identical columns.
    const seen = new Set();
    const columns = [];
    for (const s of stages) {
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      columns.push({ name: s.name, color: s.color, isTerminal: s.isTerminal, clients: [] });
    }

    const byName = new Map(columns.map(c => [c.name, c]));
    const unassigned = [];
    for (const c of clients) {
      const col = byName.get(c.status);
      if (col) col.clients.push(c);
      else unassigned.push(c);
    }
    // Clients whose status matches no configured stage must still be reachable.
    if (unassigned.length) columns.push({ name: 'Unassigned', color: '#94a3b8', clients: unassigned });

    res.json({ success: true, data: columns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Email Templates ───────────────────────────────────────────────────────────
router.get('/email-templates', requireCRM, async (req, res) => {
  try {
    const filter = { isActive: true, ...deptFilterFor(req.query.department, 'shared') };
    const templates = await CRMEmailTemplate.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/email-templates', requireAdmin, async (req, res) => {
  try {
    const template = await CRMEmailTemplate.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    const template = await CRMEmailTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    await CRMEmailTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Vendors & Third Parties ───────────────────────────────────────────────────
router.get('/vendors', requireCRM, async (req, res) => {
  try {
    const { department, entityType } = req.query;
    const filter = { isActive: true, ...deptFilterFor(department) };
    if (entityType) filter.entityType = entityType;
    const vendors = await CRMVendor.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data: vendors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/vendors', requireAdmin, async (req, res) => {
  try {
    const vendor = await CRMVendor.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/vendors/:id', requireAdmin, async (req, res) => {
  try {
    const vendor = await CRMVendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
    res.json({ success: true, data: vendor });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/vendors/:id', requireAdmin, async (req, res) => {
  try {
    await CRMVendor.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics', requireCRM, async (req, res) => {
  try {
    const { department, dateFrom, dateTo } = req.query;
    const deptFilter = deptFilterFor(department);
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);
    const createdFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const [clientsByDept, clientsByStatus, followupsByStatus, commsByType] = await Promise.all([
      CRMClient.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
      CRMClient.aggregate([
        { $match: { ...deptFilter, isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      CRMFollowUp.aggregate([
        { $match: deptFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      CRMCommunication.aggregate([
        { $match: { ...deptFilter, ...createdFilter } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({ success: true, data: { clientsByDept, clientsByStatus, followupsByStatus, commsByType } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Spreadsheet import (project-wise) ─────────────────────────────────────────
// Two phases: /import/analyze reads and reports without writing; /import/commit
// persists. The operator always sees counts and row-level issues before any
// record is created.

const sendImportError = (res, err) => res
  .status(Number(err.statusCode) || 500)
  .json({ success: false, error: err.message || 'Import failed' });

/** Projects available to scope an import to. */
router.get('/import/projects', requireCRM, async (req, res) => {
  try {
    const Project = mongoose.model('Project');
    const projects = await Project.find({ isActive: { $ne: false } })
      .select('name projectCode status themeColor')
      .sort({ name: 1 })
      .limit(500)
      .lean();
    res.json({ success: true, data: projects });
  } catch (err) {
    sendImportError(res, err);
  }
});

/** A blank .xlsx with exactly the headers detection expects. */
router.get('/import/template', requireCRM, (req, res) => {
  try {
    const buffer = crmImport.buildTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="crm-import-template.xlsx"');
    res.send(buffer);
  } catch (err) {
    sendImportError(res, err);
  }
});

/** Phase 1 — parse, detect columns, validate. Writes nothing. */
router.post('/import/analyze', requireCRM, uploadSpreadsheet('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, error: 'Attach a CSV, XLSX or XLS file.' });
    }
    // The mapping arrives as a JSON string in multipart form data.
    let mapping;
    if (req.body.mapping) {
      try { mapping = JSON.parse(req.body.mapping); }
      catch { return res.status(422).json({ success: false, error: 'Column mapping is not valid JSON.' }); }
    }
    const data = await crmImport.analyzeFile({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mapping,
      sheet: req.body.sheet || undefined,
      department: req.body.department || 'media',
    });
    res.json({ success: true, data });
  } catch (err) {
    sendImportError(res, err);
  }
});

/** Phase 2 — persist into the chosen project. */
router.post('/import/commit', requireCRM, uploadSpreadsheet('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, error: 'Attach a CSV, XLSX or XLS file.' });
    }
    let mapping;
    if (req.body.mapping) {
      try { mapping = JSON.parse(req.body.mapping); }
      catch { return res.status(422).json({ success: false, error: 'Column mapping is not valid JSON.' }); }
    }
    const data = await crmImport.commitImport({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mapping,
      sheet: req.body.sheet || undefined,
      projectId: req.body.projectId,
      department: req.body.department || 'media',
      mode: req.body.mode || 'skip',
      actorId: req.user._id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    sendImportError(res, err);
  }
});

/** Import history. */
router.get('/import/batches', requireCRM, async (req, res) => {
  try {
    const data = await crmImport.listBatches({ projectId: req.query.projectId, limit: req.query.limit });
    res.json({ success: true, data });
  } catch (err) {
    sendImportError(res, err);
  }
});

/** Undo an import. Admin-only: it deletes records. */
router.delete('/import/batches/:batchId', requireAdmin, async (req, res) => {
  try {
    const data = await crmImport.revertBatch({ batchId: req.params.batchId, actorId: req.user._id });
    res.json({ success: true, data });
  } catch (err) {
    sendImportError(res, err);
  }
});

/** The project-wise CRM rollup. */
router.get('/projects/breakdown', requireCRM, async (req, res) => {
  try {
    const data = await crmImport.getProjectBreakdown({ department: req.query.department });
    res.json({ success: true, data });
  } catch (err) {
    sendImportError(res, err);
  }
});

// ── Export ────────────────────────────────────────────────────────────────────
// Server-side so an export covers the whole filtered set, not just the page the
// browser happens to be holding, and so refs (owner, project) resolve to names.

const sendFile = (res, { buffer, filename, contentType }) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

router.get('/export/clients', requireCRM, async (req, res) => {
  try {
    sendFile(res, await crmExport.exportClients(req.query));
  } catch (err) {
    sendImportError(res, err);
  }
});

router.get('/export/followups', requireCRM, async (req, res) => {
  try {
    sendFile(res, await crmExport.exportFollowUps(req.query));
  } catch (err) {
    sendImportError(res, err);
  }
});

// ── Bulk actions ──────────────────────────────────────────────────────────────
// Each takes an explicit `ids` array. There is no filter-based bulk write by
// design — see services/crmBulk.service.js.

/** Wraps a bulk handler so every one reports errors the same way. */
const bulkRoute = (handler) => async (req, res) => {
  try {
    const data = await handler({ ...req.body, actorId: req.user._id });
    res.json({ success: true, data });
  } catch (err) {
    res.status(Number(err.statusCode) || 500).json({ success: false, error: err.message });
  }
};

router.post('/clients/bulk/status',     requireCRM,   bulkRoute(crmBulk.bulkStatus));
router.post('/clients/bulk/owner',      requireCRM,   bulkRoute(crmBulk.bulkOwner));
router.post('/clients/bulk/priority',   requireCRM,   bulkRoute(crmBulk.bulkPriority));
router.post('/clients/bulk/project',    requireCRM,   bulkRoute(crmBulk.bulkProject));
router.post('/clients/bulk/department', requireCRM,   bulkRoute(crmBulk.bulkDepartment));
// Deactivation is admin-only, matching DELETE /clients/:id.
router.post('/clients/bulk/deactivate', requireAdmin, bulkRoute(crmBulk.bulkDeactivate));

// ── Activity feed ─────────────────────────────────────────────────────────────
/**
 * Cross-client activity, newest first.
 *
 * The client 360 already shows one client's timeline. This is the other view an
 * operator needs: what has happened across the whole desk today, so handovers
 * and stand-ups do not require opening records one at a time.
 */
router.get('/activity', requireCRM, async (req, res) => {
  try {
    const { department, type, clientId, userId, days, page = 1, limit = 30 } = req.query;

    const filter = {};
    if (department && department !== 'all') filter.department = department;
    if (type) filter.type = type;
    if (clientId && mongoose.isValidObjectId(clientId)) filter.client = clientId;
    if (userId && mongoose.isValidObjectId(userId)) filter.createdBy = userId;
    if (days) {
      const n = Math.min(Number(days) || 7, 365);
      filter.occurredAt = { $gte: new Date(Date.now() - n * 24 * 60 * 60 * 1000) };
    }

    const capped = Math.min(Number(limit) || 30, 100);
    const skip = (Math.max(Number(page), 1) - 1) * capped;

    const [items, total] = await Promise.all([
      CRMCommunication.find(filter)
        .populate('client', 'name clientId status department')
        .populate('createdBy', 'firstName lastName email')
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(capped)
        .lean(),
      CRMCommunication.countDocuments(filter),
    ]);

    res.json({ success: true, data: items, total, page: Number(page), pages: Math.ceil(total / capped) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Reminders ─────────────────────────────────────────────────────────────────
/**
 * The follow-up workload, bucketed by urgency.
 *
 * Buckets are computed server-side from one query rather than letting the UI
 * fetch everything and slice it: "overdue" and "today" depend on the current
 * time, and a browser with a skewed clock or a stale tab would put tasks in the
 * wrong bucket — the one thing a reminder list must never do.
 */
router.get('/reminders', requireCRM, async (req, res) => {
  try {
    const { department, assignedTo } = req.query;

    const filter = { status: 'pending' };
    if (department && department !== 'all') filter.department = department;
    if (assignedTo && mongoose.isValidObjectId(assignedTo)) filter.assignedTo = assignedTo;

    const now = new Date();
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(endOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    const items = await CRMFollowUp.find(filter)
      .populate('client', 'name clientId status department priority')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ dueDate: 1 })
      .limit(500)
      .lean();

    const buckets = { overdue: [], today: [], thisWeek: [], later: [] };
    for (const f of items) {
      const due = f.dueDate ? new Date(f.dueDate) : null;
      if (!due) { buckets.later.push(f); continue; }
      if (due < now) buckets.overdue.push(f);
      else if (due <= endOfToday) buckets.today.push(f);
      else if (due <= endOfWeek) buckets.thisWeek.push(f);
      else buckets.later.push(f);
    }

    res.json({
      success: true,
      data: buckets,
      counts: {
        overdue: buckets.overdue.length,
        today: buckets.today.length,
        thisWeek: buckets.thisWeek.length,
        later: buckets.later.length,
        total: items.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Snooze a follow-up by pushing its due date out. */
router.put('/followups/:id/snooze', requireCRM, async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.body.days) || 1, 1), 90);
    const followup = await CRMFollowUp.findById(req.params.id);
    if (!followup) return res.status(404).json({ success: false, error: 'Follow-up not found' });
    if (followup.status !== 'pending') {
      return res.status(409).json({ success: false, error: 'Only a pending follow-up can be snoozed.' });
    }

    // Snooze from today, not from the original due date: a task three weeks
    // overdue snoozed "by 1 day" must land tomorrow, not three weeks ago.
    const base = new Date();
    base.setDate(base.getDate() + days);
    followup.dueDate = base;
    await followup.save();

    if (followup.client) await syncNextFollowUp(followup.client);

    const populated = await CRMFollowUp.findById(followup._id)
      .populate('client', 'name clientId')
      .populate('assignedTo', 'firstName lastName')
      .lean();
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
