const PortalSupportTicket = require('../models/PortalSupportTicket');
const { User } = require('../models/auth');
const { ROLES } = require('../config/roles');

const ROLE_TO_PORTAL = {
  [ROLES.HR]: 'hr',
  [ROLES.IT_MANAGER]: 'it',
  [ROLES.IT_ADMIN]: 'it',
  [ROLES.IT_EMPLOYEE]: 'it',
  [ROLES.IT_HR]: 'it',
  [ROLES.CEO]: 'ceo',
  [ROLES.LAW_HEAD]: 'law',
  [ROLES.LAW_EMPLOYEE]: 'law',
  [ROLES.FINANCE_MANAGER]: 'finance',
  [ROLES.FINANCE_EMPLOYEE]: 'finance',
  [ROLES.MEDIA_HEAD]: 'media',
  [ROLES.MEDIA_SALES]: 'media',
  [ROLES.MEDIA_MARKETING]: 'media',
  [ROLES.FREELANCER]: 'outsourcing',
  [ROLES.ADMIN]: 'other',
  [ROLES.SUPER_ADMIN]: 'other',
  superadmin: 'other',
};

const resolvePortal = (role) => ROLE_TO_PORTAL[role] || 'other';

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, 'superadmin', ROLES.IT_MANAGER];

// POST /api/portal-support/tickets
exports.createTicket = async (req, res) => {
  try {
    const { subject, category, priority, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ success: false, error: 'Subject and description are required.' });
    }
    const portal = resolvePortal(req.user.role);
    const ticket = await PortalSupportTicket.create({
      user: req.user.id,
      portal,
      subject,
      category: category || 'general',
      priority: priority || 'normal',
      description,
    });

    const io = req.app.get('io');
    if (io) {
      io.to('support:admins').emit('support:new_ticket', {
        _id: ticket._id,
        portal,
        priority: ticket.priority,
        subject: ticket.subject,
      });
    }

    return res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portal-support/tickets/my
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await PortalSupportTicket.find({ user: req.user.id })
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: tickets });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portal-support/tickets/all  (admin / IT)
exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, category, portal, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (portal) filter.portal = portal;

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      PortalSupportTicket.find(filter)
        .populate('user', 'firstName lastName email role')
        .populate('assignedTo', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PortalSupportTicket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: tickets,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portal-support/tickets/:id
exports.getTicket = async (req, res) => {
  try {
    const ticket = await PortalSupportTicket.findById(req.params.id)
      .populate('user', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName email')
      .populate('replies.author', 'firstName lastName');

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const isOwner = String(ticket.user._id || ticket.user) === String(req.user.id);
    const isAdmin = ADMIN_ROLES.includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    return res.json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/portal-support/tickets/:id  (admin / IT)
exports.updateTicket = async (req, res) => {
  try {
    const { status, reply, assignedTo } = req.body;
    const ticket = await PortalSupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    if (status) {
      ticket.status = status;
      if (status === 'resolved') ticket.resolvedAt = new Date();
      if (status === 'closed') ticket.closedAt = new Date();
    }

    if (assignedTo) ticket.assignedTo = assignedTo;

    if (reply) {
      if (ticket.status === 'open') ticket.status = 'in_progress';
      const author = await User.findById(req.user.id).select('firstName lastName');
      ticket.replies.push({
        author: req.user.id,
        authorName: `${author?.firstName || ''} ${author?.lastName || ''}`.trim() || 'Admin',
        message: reply,
        isAdminReply: true,
      });
    }

    await ticket.save();
    await ticket.populate('user', 'firstName lastName email role');
    await ticket.populate('assignedTo', 'firstName lastName email');

    const io = req.app.get('io');
    if (io) {
      io.to(`support:user:${ticket.user._id}`).emit('support:ticket_updated', {
        _id: ticket._id,
        status: ticket.status,
      });
    }

    return res.json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/portal-support/preferences  — save notif/privacy prefs in user metadata
exports.updatePreferences = async (req, res) => {
  try {
    const { notifPrefs, privacyPrefs } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    user.metadata = user.metadata || {};
    if (notifPrefs) user.metadata.notifPrefs = { ...(user.metadata.notifPrefs || {}), ...notifPrefs };
    if (privacyPrefs) user.metadata.privacyPrefs = { ...(user.metadata.privacyPrefs || {}), ...privacyPrefs };
    user.markModified('metadata');
    await user.save();

    return res.json({ success: true, data: { notifPrefs: user.metadata.notifPrefs, privacyPrefs: user.metadata.privacyPrefs } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
