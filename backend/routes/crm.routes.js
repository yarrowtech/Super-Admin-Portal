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

const CRM_ROLES = ['admin', 'super_admin', 'superadmin', 'media_head', 'media_marketing', 'media_sales'];

const requireCRM = authorize(...CRM_ROLES);
const requireAdmin = authorize('admin', 'super_admin', 'superadmin');

router.use(authenticate);

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', requireCRM, async (req, res) => {
  try {
    const dept = req.query.department;
    const deptFilter = dept && dept !== 'all' ? { department: { $in: [dept, 'both'] } } : {};

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
      CRMFollowUp.countDocuments({ ...deptFilter, status: 'overdue' }),
      CRMCommunication.countDocuments({ ...deptFilter, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
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
    const { department, status, priority, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (department && department !== 'all') filter.department = { $in: [department, 'both'] };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
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

    if (status && status !== client.status) {
      client.statusHistory.push({ fromStatus: client.status, toStatus: status, changedBy: req.user._id, reason: req.body.statusReason });
      client.status = status;
    }
    Object.assign(client, rest);
    await client.save();
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
    const { department, clientId } = req.query;
    const filter = { isActive: true };
    if (department && department !== 'all') filter.department = department;
    if (clientId) filter.client = clientId;
    const contacts = await CRMContact.find(filter).populate('client', 'name clientId').sort({ createdAt: -1 }).lean();
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
    const { department } = req.query;
    const filter = { isActive: true };
    if (department && department !== 'all') filter.department = { $in: [department, 'shared'] };
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
    const { department, status, assignedTo, overdue } = req.query;
    const filter = {};
    if (department && department !== 'all') filter.department = department;
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (overdue === 'true') { filter.status = 'pending'; filter.dueDate = { $lt: new Date() }; }

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
    res.status(201).json({ success: true, data: followup });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/followups/:id', requireCRM, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status === 'completed' && !update.completedAt) update.completedAt = new Date();
    const followup = await CRMFollowUp.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!followup) return res.status(404).json({ success: false, error: 'Follow-up not found' });
    res.json({ success: true, data: followup });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/followups/:id', requireAdmin, async (req, res) => {
  try {
    await CRMFollowUp.findByIdAndDelete(req.params.id);
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
    // Update client lastContactedAt
    if (req.body.client) {
      await CRMClient.findByIdAndUpdate(req.body.client, { lastContactedAt: new Date() });
    }
    res.status(201).json({ success: true, data: comm });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Email Templates ───────────────────────────────────────────────────────────
router.get('/email-templates', requireCRM, async (req, res) => {
  try {
    const { department } = req.query;
    const filter = { isActive: true };
    if (department && department !== 'all') filter.department = { $in: [department, 'shared'] };
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
    const filter = { isActive: true };
    if (department && department !== 'all') filter.department = { $in: [department, 'both'] };
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
    const deptFilter = department && department !== 'all' ? { department: { $in: [department, 'both'] } } : {};
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

module.exports = router;
