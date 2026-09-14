const logger = require("../../utils/logger");
const lawService = require("./law.service");

exports.getOverview = async (req, res) => {
  try {
    const data = await lawService.getOverview(req.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getOverview error");
    res.status(500).json({ success: false, error: "Failed to fetch law overview", details: err.message });
  }
};

exports.getContracts = async (req, res) => {
  try {
    const data = await lawService.listContracts(req.query || {}, req.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getContracts error");
    res.status(500).json({ success: false, error: "Failed to fetch contracts", details: err.message });
  }
};

exports.createContract = async (req, res) => {
  try {
    const data = await lawService.createContract(req.body || {}, req.user?.id || req.user?._id, req.projectId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module createContract error");
    res.status(500).json({ success: false, error: "Failed to create contract", details: err.message });
  }
};

exports.getContractById = async (req, res) => {
  try {
    const data = await lawService.getContractById(req.params.id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: "Contract not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getContractById error");
    res.status(500).json({ success: false, error: "Failed to fetch contract", details: err.message });
  }
};

exports.updateContract = async (req, res) => {
  try {
    const data = await lawService.updateContract(req.params.id, req.body || {}, req.user?.id || req.user?._id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: "Contract not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module updateContract error");
    res.status(500).json({ success: false, error: "Failed to update contract", details: err.message });
  }
};

exports.deleteContract = async (req, res) => {
  try {
    const data = await lawService.deleteContract(req.params.id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: "Contract not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module deleteContract error");
    res.status(500).json({ success: false, error: "Failed to delete contract", details: err.message });
  }
};

exports.getComplianceSnapshot = async (req, res) => {
  try {
    const data = await lawService.complianceSnapshot(req.projectId);
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
      projectId: req.projectId,
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
      projectId: req.projectId,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module raiseDispute error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to raise dispute", details: err.message });
  }
};

exports.getSecurityComplianceLogs = async (req, res) => {
  try {
    const data = await lawService.getSecurityComplianceLogs(req.query || {}, req.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getSecurityComplianceLogs error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to fetch security compliance logs", details: err.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const data = await lawService.listProjects(req.query || {}, req.user || {});
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

// Generic Law-record CRUD backing the Compliance (Privacy & Policy, IP &
// Copyright), Risk (Disputes & Fraud), and non-outsourcing Contracts
// (Agreements, Work on Hire, Third Party) pages.
exports.getRecords = async (req, res) => {
  try {
    const data = await lawService.listRecords(req.query || {}, req.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getRecords error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to fetch law records", details: err.message });
  }
};

exports.createRecord = async (req, res) => {
  try {
    const data = await lawService.createRecord(req.body || {}, req.user?.id || req.user?._id, req.projectId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module createRecord error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to create record", details: err.message });
  }
};

exports.getRecordById = async (req, res) => {
  try {
    const data = await lawService.getRecordById(req.params.id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: "Record not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module getRecordById error");
    res.status(500).json({ success: false, error: "Failed to fetch record", details: err.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const data = await lawService.updateRecord(req.params.id, req.body || {}, req.user?.id || req.user?._id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: "Record not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module updateRecord error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to update record", details: err.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const data = await lawService.deleteRecord(req.params.id, req.user?.id || req.user?._id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: "Record not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Law module deleteRecord error");
    res.status(500).json({ success: false, error: "Failed to delete record", details: err.message });
  }
};
