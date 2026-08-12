const mongoose = require("mongoose");
const SystemLog = require("../models/system/SystemLog");

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const listLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      level,
      event,
      module,
      action,
      userId,
      role,
      department,
      requestId,
      statusCode,
      startDate,
      endDate,
      search,
    } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const query = {};

    if (level) query.level = String(level).trim().toLowerCase();
    if (event) query.event = String(event).trim().toUpperCase();
    if (module) query.module = { $regex: escapeRegex(module), $options: "i" };
    if (action) query.action = { $regex: escapeRegex(action), $options: "i" };
    if (role) query.role = String(role).trim();
    if (department) query.department = { $regex: escapeRegex(department), $options: "i" };
    if (requestId) query.requestId = String(requestId).trim();
    if (statusCode && Number.isFinite(Number(statusCode))) query.statusCode = Number(statusCode);
    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      query.userId = new mongoose.Types.ObjectId(String(userId));
    }

    const from = parseDate(startDate);
    const to = parseDate(endDate);
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = from;
      if (to) query.createdAt.$lte = to;
    }

    if (search) {
      const pattern = escapeRegex(search);
      query.$or = [
        { event: { $regex: pattern, $options: "i" } },
        { message: { $regex: pattern, $options: "i" } },
        { userName: { $regex: pattern, $options: "i" } },
        { userEmail: { $regex: pattern, $options: "i" } },
        { module: { $regex: pattern, $options: "i" } },
        { action: { $regex: pattern, $options: "i" } },
        { route: { $regex: pattern, $options: "i" } },
        { requestId: { $regex: pattern, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      SystemLog.find(query)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      SystemLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getLogById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid log ID" });
    }

    const log = await SystemLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, error: "Log not found" });
    }

    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listLogs,
  getLogById,
};
