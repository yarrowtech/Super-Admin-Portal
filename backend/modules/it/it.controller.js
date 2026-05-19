const logger = require("../../utils/logger");
const itService = require("./it.service");

const fail = (res, err, message) =>
  res.status(err.statusCode || 500).json({ success: false, error: message, details: err.message });

exports.getOverview = async (req, res) => {
  try {
    const data = await itService.getOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module getOverview error");
    fail(res, err, "Failed to fetch IT overview");
  }
};

exports.getAssets = async (req, res) => {
  try {
    const data = await itService.listAssets(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module getAssets error");
    fail(res, err, "Failed to fetch IT assets");
  }
};

exports.createAsset = async (req, res) => {
  try {
    const data = await itService.createAsset(req.body || {}, req.user?.id || req.user?._id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module createAsset error");
    fail(res, err, "Failed to create IT asset");
  }
};

exports.getAssetById = async (req, res) => {
  try {
    const data = await itService.getAssetById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: "Asset not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module getAssetById error");
    fail(res, err, "Failed to fetch IT asset");
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const data = await itService.updateAsset(req.params.id, req.body || {}, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: "Asset not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module updateAsset error");
    fail(res, err, "Failed to update IT asset");
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const data = await itService.deleteAsset(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: "Asset not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module deleteAsset error");
    fail(res, err, "Failed to delete IT asset");
  }
};

exports.getTickets = async (req, res) => {
  try {
    const data = await itService.listTickets(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module getTickets error");
    fail(res, err, "Failed to fetch IT tickets");
  }
};

exports.createTicket = async (req, res) => {
  try {
    const data = await itService.createTicket(req.body || {}, req.user?.id || req.user?._id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module createTicket error");
    fail(res, err, "Failed to create IT ticket");
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const data = await itService.getTicketById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: "Ticket not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module getTicketById error");
    fail(res, err, "Failed to fetch IT ticket");
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const data = await itService.updateTicket(req.params.id, req.body || {});
    if (!data) return res.status(404).json({ success: false, error: "Ticket not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module updateTicket error");
    fail(res, err, "Failed to update IT ticket");
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const data = await itService.deleteTicket(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: "Ticket not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module deleteTicket error");
    fail(res, err, "Failed to delete IT ticket");
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const data = await itService.updateTicketStatus({
      id: req.params.id,
      status: req.body?.status,
      actor: {
        id: req.user?.id || req.user?._id,
        role: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });
    if (!data) return res.status(404).json({ success: false, error: "Ticket not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module updateTicketStatus error");
    fail(res, err, "Failed to update IT ticket status");
  }
};

exports.requestSystemAccess = async (req, res) => {
  try {
    const data = await itService.requestSystemAccess({
      requesterId: req.user?.id || req.user?._id,
      targetUserId: req.body?.targetUserId || req.user?.id || req.user?._id,
      accessScope: req.body?.accessScope || "default",
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module requestSystemAccess error");
    fail(res, err, "Failed to create IT access request");
  }
};

exports.decideSystemAccess = async (req, res) => {
  try {
    const data = await itService.decideSystemAccess({
      workflowId: req.params.workflowId,
      actorRole: req.user?.role,
      actorId: req.user?.id || req.user?._id,
      decision: req.body?.decision,
      remarks: req.body?.remarks || "",
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "IT module decideSystemAccess error");
    fail(res, err, "Failed to decide IT access request");
  }
};
