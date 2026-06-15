const logger = require('../../utils/logger');
const AuditLog = require('../../models/admin/AuditLog');
const User = require('../../models/auth/User');

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, actor, user, action, resource, from, to } = req.query;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const query = {};
    if (actor) query.actor = actor;
    if (user) {
      const userText = String(user).trim();
      if (userText.includes('@')) {
        const userDoc = await User.findOne({ email: userText.toLowerCase() }).select('_id');
        if (userDoc?._id) {
          query.actor = userDoc._id;
        } else {
          query.actor = null;
        }
      } else {
        query.actor = userText;
      }
    }
    if (action) query.action = { $regex: action, $options: 'i' };
    if (resource) query.resource = { $regex: resource, $options: 'i' };
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) query.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) query.createdAt.$lte = toDate;
      }
      if (!Object.keys(query.createdAt).length) {
        delete query.createdAt;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      AuditLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch audit logs');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      details: error.message,
    });
  }
};
