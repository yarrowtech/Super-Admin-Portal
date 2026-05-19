const logger = require("../../utils/logger");
const lawService = require("./law.service");

exports.getOverview = async (req, res) => {
  try {
    const data = await lawService.getOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getOverview error");
    res.status(500).json({ success: false, error: "Failed to fetch law overview", details: err.message });
  }
};

exports.getContracts = async (req, res) => {
  try {
    const data = await lawService.listContracts(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getContracts error");
    res.status(500).json({ success: false, error: "Failed to fetch contracts", details: err.message });
  }
};

exports.createContract = async (req, res) => {
  try {
    const data = await lawService.createContract(req.body || {}, req.user?.id || req.user?._id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module createContract error");
    res.status(500).json({ success: false, error: "Failed to create contract", details: err.message });
  }
};

exports.getContractById = async (req, res) => {
  try {
    const data = await lawService.getContractById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: "Contract not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getContractById error");
    res.status(500).json({ success: false, error: "Failed to fetch contract", details: err.message });
  }
};

exports.updateContract = async (req, res) => {
  try {
    const data = await lawService.updateContract(req.params.id, req.body || {}, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: "Contract not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module updateContract error");
    res.status(500).json({ success: false, error: "Failed to update contract", details: err.message });
  }
};

exports.deleteContract = async (req, res) => {
  try {
    const data = await lawService.deleteContract(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: "Contract not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module deleteContract error");
    res.status(500).json({ success: false, error: "Failed to delete contract", details: err.message });
  }
};

exports.getComplianceSnapshot = async (req, res) => {
  try {
    const data = await lawService.complianceSnapshot();
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getComplianceSnapshot error");
    res.status(500).json({ success: false, error: "Failed to fetch compliance snapshot", details: err.message });
  }
};

exports.createContractApproval = async (req, res) => {
  try {
    const data = await lawService.createContractApproval({
      contractId: req.params.id,
      requestedBy: req.user?.id || req.user?._id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module createContractApproval error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to create approval request", details: err.message });
  }
};

exports.decideContractApproval = async (req, res) => {
  try {
    const data = await lawService.decideContractApproval({
      workflowId: req.params.workflowId,
      actorId: req.user?.id || req.user?._id,
      actorRole: req.user?.role,
      decision: req.body?.decision,
      remarks: req.body?.remarks || "",
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module decideContractApproval error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to decide approval request", details: err.message });
  }
};

exports.raiseDispute = async (req, res) => {
  try {
    const data = await lawService.raiseDispute({
      payload: req.body || {},
      actor: {
        id: req.user?.id || req.user?._id,
        role: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module raiseDispute error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to raise dispute", details: err.message });
  }
};

exports.getSecurityComplianceLogs = async (req, res) => {
  try {
    const data = await lawService.getSecurityComplianceLogs(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getSecurityComplianceLogs error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to fetch security compliance logs", details: err.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const data = await lawService.listProjects(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getProjects error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to fetch law projects", details: err.message });
  }
};

exports.getModuleDataByProject = async (req, res) => {
  try {
    const data = await lawService.getModuleDataByProject({
      moduleKey: req.params.moduleKey,
      projectId: req.params.projectId,
      query: req.query || {},
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getModuleDataByProject error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to fetch project-wise law data", details: err.message });
  }
};
