const PortalSupportTicket = require('../models/PortalSupportTicket');
const { User } = require('../models/auth');
const { ROLES } = require('../config/roles');
const { setCache } = require('../services/cache.service');
const { notifyUser } = require('../services/notificationTrigger.service');
const mongoose = require('mongoose');

const ROLE_TO_PORTAL = {
  [ROLES.HR]: 'hr',
  [ROLES.IT_MANAGER]: 'manager',
  [ROLES.IT_ADMIN]: 'it',
  [ROLES.IT_EMPLOYEE]: 'employee',
  [ROLES.IT_HR]: 'hr',
  [ROLES.CEO]: 'ceo',
  [ROLES.LAW_HEAD]: 'law',
  [ROLES.LAW_EMPLOYEE]: 'law',
  [ROLES.FINANCE_MANAGER]: 'finance',
  [ROLES.FINANCE_EMPLOYEE]: 'finance',
  [ROLES.MEDIA_HEAD]: 'media',
  [ROLES.MEDIA_SALES]: 'media',
  [ROLES.MEDIA_MARKETING]: 'media',
  [ROLES.FREELANCER]: 'outsourcing',
  [ROLES.ADMIN]: 'admin',
  [ROLES.SUPER_ADMIN]: 'admin',
  superadmin: 'admin',
};

const resolvePortal = (role) => ROLE_TO_PORTAL[role] || 'other';

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, 'superadmin', ROLES.IT_MANAGER, ROLES.IT_ADMIN];
const VALID_PORTALS = PortalSupportTicket.schema.path('portal').enumValues;
const VALID_CATEGORIES = PortalSupportTicket.schema.path('category').enumValues;
const VALID_PRIORITIES = PortalSupportTicket.schema.path('priority').enumValues;
const VALID_STATUSES = PortalSupportTicket.schema.path('status').enumValues;

const uidOf = (req) => String(req.user.id || req.user._id);
const isStaff = (req) => ADMIN_ROLES.includes(req.user.role);
const idOf = (ref) => String(ref?._id || ref);
const cleanText = (v) => (typeof v === 'string' ? v.trim() : '');
const shortRef = (ticket) => `#${String(ticket._id).slice(-8).toUpperCase()}`;

const displayName = async (userId, fallback) => {
  const u = await User.findById(userId).select('firstName lastName').lean();
  return `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || fallback;
};

const notifyBestEffort = async (userId, payload) => {
  try { await notifyUser(userId, payload); } catch { /* notifications are best-effort */ }
};

const populateTicket = (query) =>
  query
    .populate('user', 'firstName lastName email role')
    .populate('assignedTo', 'firstName lastName email')
    .populate('replies.author', 'firstName lastName');

const emitTicketUpdate = (req, ticket, extra = {}) => {
  const io = req.app.get('io');
  if (!io) return;
  const payload = { _id: ticket._id, status: ticket.status, portal: ticket.portal, ...extra };
  io.to(`support:user:${idOf(ticket.user)}`).emit('support:ticket_updated', payload);
  io.to('support:admins').emit('support:ticket_updated', payload);
};

// POST /api/portal-support/tickets  — any authenticated user
exports.createTicket = async (req, res) => {
  try {
    const subject = cleanText(req.body.subject);
    const description = cleanText(req.body.description);
    if (!subject || !description) {
      return res.status(400).json({ success: false, error: 'Subject and description are required.' });
    }
    if (subject.length > 200) return res.status(400).json({ success: false, error: 'Subject must be 200 characters or fewer.' });
    if (description.length > 5000) return res.status(400).json({ success: false, error: 'Description must be 5000 characters or fewer.' });

    const category = req.body.category || 'general';
    const priority = req.body.priority || 'normal';
    if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ success: false, error: 'Invalid category.' });
    if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ success: false, error: 'Invalid priority.' });

    // Portal the requester is raising the ticket from (roles like finance_employee /
    // law_employee can sit in more than one portal); fall back to their role's home portal.
    const requestedPortal = cleanText(req.body.portal).toLowerCase();
    const portal = VALID_PORTALS.includes(requestedPortal) ? requestedPortal : resolvePortal(req.user.role);

    const ticket = await PortalSupportTicket.create({
      user: uidOf(req),
      portal,
      requesterRole: req.user.role,
      subject,
      category,
      priority,
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

// GET /api/portal-support/tickets/my  — only the caller's own tickets (?status= optional)
exports.getMyTickets = async (req, res) => {
  try {
    const filter = { user: uidOf(req) };
    if (req.query.status) {
      if (!VALID_STATUSES.includes(req.query.status)) return res.status(400).json({ success: false, error: 'Invalid status.' });
      filter.status = req.query.status;
    }
    const tickets = await PortalSupportTicket.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json({ success: true, data: tickets });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portal-support/tickets/unread-count — tickets with staff activity the requester has not seen
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await PortalSupportTicket.countDocuments({ user: uidOf(req), requesterUnread: true });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portal-support/tickets/all  (admin / IT)
exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, category, portal } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (portal) filter.portal = portal;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 200);
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      PortalSupportTicket.find(filter)
        .populate('user', 'firstName lastName email role')
        .populate('assignedTo', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PortalSupportTicket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: tickets,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portal-support/tickets/:id  (owner or support staff)
exports.getTicket = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid ticket id.' });
    const ticket = await populateTicket(PortalSupportTicket.findById(req.params.id));
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const isOwner = idOf(ticket.user) === uidOf(req);
    if (!isOwner && !isStaff(req)) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (isOwner && ticket.requesterUnread) {
      await PortalSupportTicket.updateOne({ _id: ticket._id }, { $set: { requesterUnread: false } });
      ticket.requesterUnread = false;
    }

    return res.json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/portal-support/tickets/:id  (admin / IT) — status, assignee, reply
exports.updateTicket = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid ticket id.' });
    const { status, assignedTo } = req.body;
    const reply = cleanText(req.body.reply);
    const ticket = await PortalSupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    if (reply.length > 5000) return res.status(400).json({ success: false, error: 'Reply must be 5000 characters or fewer.' });
    if (assignedTo && !mongoose.isValidObjectId(assignedTo)) {
      return res.status(400).json({ success: false, error: 'Invalid assignee.' });
    }

    const prevStatus = ticket.status;
    let changed = false;

    if (status && status !== ticket.status) {
      ticket.status = status;
      changed = true;
      if (status === 'resolved') ticket.resolvedAt = new Date();
      if (status === 'closed') ticket.closedAt = new Date();
      if (status === 'open' || status === 'in_progress') { ticket.resolvedAt = undefined; ticket.closedAt = undefined; }
    }

    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === '') ticket.assignedTo = undefined;
      else if (String(ticket.assignedTo || '') !== String(assignedTo)) ticket.assignedTo = assignedTo;
    }

    if (reply) {
      if (ticket.status === 'open') ticket.status = 'in_progress';
      ticket.replies.push({
        author: uidOf(req),
        authorName: await displayName(uidOf(req), 'Support Team'),
        message: reply,
        isAdminReply: true,
      });
      changed = true;
    }

    // Staff acting on someone else's ticket -> requester has something new to read.
    const requesterIsActor = idOf(ticket.user) === uidOf(req);
    if (changed && !requesterIsActor) ticket.requesterUnread = true;

    await ticket.save();
    await populateTicket(ticket);

    if (changed && !requesterIsActor) {
      await notifyBestEffort(idOf(ticket.user), {
        title: reply ? 'New reply on your support ticket' : 'Support ticket updated',
        message: reply
          ? `Support replied to ${shortRef(ticket)} "${ticket.subject}"`
          : `${shortRef(ticket)} "${ticket.subject}" is now ${String(ticket.status).replace(/_/g, ' ')}`,
        type: 'support_update',
        metadata: { ticketId: ticket._id, status: ticket.status, previousStatus: prevStatus },
      });
    }

    emitTicketUpdate(req, ticket, { hasReply: Boolean(reply) });

    return res.json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/portal-support/tickets/:id/comments  (owner or staff) — add a message to the thread
exports.addComment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid ticket id.' });
    const message = cleanText(req.body.message);
    if (!message) return res.status(400).json({ success: false, error: 'Message is required.' });
    if (message.length > 5000) return res.status(400).json({ success: false, error: 'Message must be 5000 characters or fewer.' });

    const ticket = await PortalSupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const isOwner = idOf(ticket.user) === uidOf(req);
    if (!isOwner && !isStaff(req)) return res.status(403).json({ success: false, error: 'Access denied.' });
    if (ticket.status === 'closed') {
      return res.status(409).json({ success: false, error: 'This ticket is closed. Reopen it to add a message.' });
    }

    const staffReply = !isOwner;
    ticket.replies.push({
      author: uidOf(req),
      authorName: await displayName(uidOf(req), staffReply ? 'Support Team' : 'Requester'),
      message,
      isAdminReply: staffReply,
    });

    if (staffReply) {
      if (ticket.status === 'open') ticket.status = 'in_progress';
      ticket.requesterUnread = true;
    } else if (ticket.status === 'resolved') {
      // Requester says it is not fixed -> back to the queue.
      ticket.status = 'open';
      ticket.resolvedAt = undefined;
    }

    await ticket.save();
    await populateTicket(ticket);

    if (staffReply) {
      await notifyBestEffort(idOf(ticket.user), {
        title: 'New reply on your support ticket',
        message: `Support replied to ${shortRef(ticket)} "${ticket.subject}"`,
        type: 'support_update',
        metadata: { ticketId: ticket._id, status: ticket.status },
      });
    } else if (ticket.assignedTo) {
      await notifyBestEffort(idOf(ticket.assignedTo), {
        title: 'Requester replied on support ticket',
        message: `New message on ${shortRef(ticket)} "${ticket.subject}"`,
        type: 'support_update',
        metadata: { ticketId: ticket._id, status: ticket.status },
      });
    }

    emitTicketUpdate(req, ticket, { hasReply: true });
    return res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/portal-support/tickets/:id/status  (owner only) — body { action: 'close' | 'reopen' }
exports.changeOwnTicketStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid ticket id.' });
    const { action } = req.body;
    if (!['close', 'reopen'].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'close' or 'reopen'." });
    }
    const ticket = await PortalSupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
    if (idOf(ticket.user) !== uidOf(req)) return res.status(403).json({ success: false, error: 'Access denied.' });

    if (action === 'close') {
      if (ticket.status === 'closed') return res.status(409).json({ success: false, error: 'Ticket is already closed.' });
      ticket.status = 'closed';
      ticket.closedAt = new Date();
    } else {
      if (!['resolved', 'closed'].includes(ticket.status)) {
        return res.status(409).json({ success: false, error: 'Only resolved or closed tickets can be reopened.' });
      }
      ticket.status = 'open';
      ticket.resolvedAt = undefined;
      ticket.closedAt = undefined;
    }
    await ticket.save();
    await populateTicket(ticket);

    if (ticket.assignedTo) {
      await notifyBestEffort(idOf(ticket.assignedTo), {
        title: action === 'close' ? 'Support ticket closed by requester' : 'Support ticket reopened',
        message: `${shortRef(ticket)} "${ticket.subject}" was ${action === 'close' ? 'closed' : 'reopened'} by the requester`,
        type: 'support_update',
        metadata: { ticketId: ticket._id, status: ticket.status },
      });
    }
    emitTicketUpdate(req, ticket, { action });
    return res.json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/portal-support/preferences  — save notif/privacy prefs in user metadata
exports.updatePreferences = async (req, res) => {
  try {
    const { notifPrefs, privacyPrefs, timezone, language } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    user.metadata = user.metadata || {};
    if (notifPrefs) user.metadata.notifPrefs = { ...(user.metadata.notifPrefs || {}), ...notifPrefs };
    if (privacyPrefs) user.metadata.privacyPrefs = { ...(user.metadata.privacyPrefs || {}), ...privacyPrefs };
    if (typeof timezone === 'string' && timezone.trim()) user.metadata.timezone = timezone.trim().slice(0, 64);
    if (typeof language === 'string' && language.trim()) user.metadata.language = language.trim().slice(0, 32);
    user.markModified('metadata');
    await user.save();
    // Invalidate the cached /profile/me payload so settings reload with fresh values.
    try { await setCache(`profile:me:${String(req.user.id)}`, null, 1); } catch { /* cache is best-effort */ }

    return res.json({ success: true, data: { timezone: user.metadata.timezone, language: user.metadata.language, notifPrefs: user.metadata.notifPrefs, privacyPrefs: user.metadata.privacyPrefs } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
