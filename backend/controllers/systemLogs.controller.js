const mongoose = require("mongoose");
const logger = require("../utils/logger").child({ module: "system.logs" });
const SystemLog = require("../models/system/SystemLog");

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Shared by listLogs and logStats so the table and the charts above it can
// never disagree about which records they are describing.
const buildLogQuery = (params = {}) => {
  const {
    level,
    event,
    module,
    action,
    userId,
    role,
    department,
    requestId,
    sessionId,
    statusCode,
    startDate,
    endDate,
    search,
  } = params;

  const query = {};

  if (level) query.level = String(level).trim().toLowerCase();
  if (event) query.event = String(event).trim().toUpperCase();
  if (module) query.module = { $regex: escapeRegex(module), $options: "i" };
  if (action) query.action = { $regex: escapeRegex(action), $options: "i" };
  if (role) query.role = String(role).trim();
  if (department) query.department = { $regex: escapeRegex(department), $options: "i" };
  if (requestId) query.requestId = String(requestId).trim();
  if (sessionId) query.sessionId = String(sessionId).trim();
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

  return query;
};

const listLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const query = buildLogQuery(req.query);

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

// Bucket width is chosen from the span so the timeline always renders a
// readable number of points instead of one bar per millisecond.
const resolveBucket = (from, to) => {
  const spanMs = Math.max((to?.getTime() || Date.now()) - (from?.getTime() || Date.now() - 86400000), 60000);
  if (spanMs <= 2 * 60 * 60 * 1000) return { unit: "minute", binSize: 1, label: "1m" };
  if (spanMs <= 12 * 60 * 60 * 1000) return { unit: "minute", binSize: 15, label: "15m" };
  if (spanMs <= 3 * 24 * 60 * 60 * 1000) return { unit: "hour", binSize: 1, label: "1h" };
  return { unit: "hour", binSize: 6, label: "6h" };
};

const logStats = async (req, res, next) => {
  try {
    const query = buildLogQuery(req.query);
    const from = parseDate(req.query.startDate);
    const to = parseDate(req.query.endDate);
    const bucket = resolveBucket(from, to);

    const [result] = await SystemLog.aggregate([
      { $match: query },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                errors: { $sum: { $cond: [{ $in: ["$level", ["error", "fatal"]] }, 1, 0] } },
                warnings: { $sum: { $cond: [{ $eq: ["$level", "warn"] }, 1, 0] } },
                failedRequests: { $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] } },
                timedRequests: { $sum: { $cond: [{ $gt: ["$durationMs", 0] }, 1, 0] } },
                slowRequests: { $sum: { $cond: [{ $gte: ["$durationMs", 1000] }, 1, 0] } },
                avgDuration: { $avg: "$durationMs" },
                maxDuration: { $max: "$durationMs" },
                uniqueUsers: { $addToSet: "$userId" },
                uniqueSessions: { $addToSet: "$sessionId" },
              },
            },
            {
              $project: {
                _id: 0,
                total: 1,
                errors: 1,
                warnings: 1,
                failedRequests: 1,
                timedRequests: 1,
                slowRequests: 1,
                avgDuration: 1,
                maxDuration: 1,
                uniqueUsers: { $size: { $filter: { input: "$uniqueUsers", cond: { $ne: ["$$this", null] } } } },
                uniqueSessions: { $size: { $filter: { input: "$uniqueSessions", cond: { $ne: ["$$this", null] } } } },
              },
            },
          ],
          timeline: [
            {
              $group: {
                _id: { $dateTrunc: { date: "$createdAt", unit: bucket.unit, binSize: bucket.binSize } },
                total: { $sum: 1 },
                errors: { $sum: { $cond: [{ $in: ["$level", ["error", "fatal"]] }, 1, 0] } },
                warnings: { $sum: { $cond: [{ $eq: ["$level", "warn"] }, 1, 0] } },
                avgDuration: { $avg: "$durationMs" },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, bucket: "$_id", total: 1, errors: 1, warnings: 1, avgDuration: 1 } },
          ],
          byLevel: [
            { $group: { _id: "$level", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, level: "$_id", count: 1 } },
          ],
          topEvents: [
            { $group: { _id: "$event", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            { $project: { _id: 0, event: "$_id", count: 1 } },
          ],
          topModules: [
            { $match: { module: { $nin: [null, ""] } } },
            { $group: { _id: "$module", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            { $project: { _id: 0, module: "$_id", count: 1 } },
          ],
          statusMix: [
            { $match: { statusCode: { $gt: 0 } } },
            {
              $group: {
                _id: {
                  $concat: [{ $toString: { $floor: { $divide: ["$statusCode", 100] } } }, "xx"],
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, band: "$_id", count: 1 } },
          ],
          slowest: [
            { $match: { durationMs: { $gt: 0 }, route: { $nin: [null, ""] } } },
            {
              $group: {
                _id: { route: "$route", method: "$method" },
                avgDuration: { $avg: "$durationMs" },
                maxDuration: { $max: "$durationMs" },
                count: { $sum: 1 },
              },
            },
            { $sort: { avgDuration: -1 } },
            { $limit: 6 },
            {
              $project: {
                _id: 0,
                route: "$_id.route",
                method: "$_id.method",
                avgDuration: 1,
                maxDuration: 1,
                count: 1,
              },
            },
          ],
          topActors: [
            { $match: { userName: { $nin: [null, ""] } } },
            {
              $group: {
                _id: { name: "$userName", role: "$role" },
                count: { $sum: 1 },
                errors: { $sum: { $cond: [{ $in: ["$level", ["error", "fatal"]] }, 1, 0] } },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 6 },
            { $project: { _id: 0, name: "$_id.name", role: "$_id.role", count: 1, errors: 1 } },
          ],
        },
      },
    ]).allowDiskUse(true);

    // $facet returns an empty totals array when nothing matched.
    const totals = result?.totals?.[0] || {
      total: 0,
      errors: 0,
      warnings: 0,
      failedRequests: 0,
      timedRequests: 0,
      slowRequests: 0,
      avgDuration: null,
      maxDuration: null,
      uniqueUsers: 0,
      uniqueSessions: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        bucket: bucket.label,
        totals,
        timeline: result?.timeline || [],
        byLevel: result?.byLevel || [],
        topEvents: result?.topEvents || [],
        topModules: result?.topModules || [],
        statusMix: result?.statusMix || [],
        slowest: result?.slowest || [],
        topActors: result?.topActors || [],
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to aggregate system log stats");
    return next(error);
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
  logStats,
  getLogById,
};
