const ApprovalWorkflow = require("../models/finance/ApprovalWorkflow");

const createApprovalRequest = async ({
  module,
  entityType,
  entityId,
  requestedBy,
  steps = [],
}) => {
  return ApprovalWorkflow.create({
    module,
    entityType,
    entityId: String(entityId),
    requestedBy,
    status: "pending",
    steps: steps.map((step, index) => ({
      level: step.level || index + 1,
      role: step.role,
      status: "pending",
    })),
  });
};

const decideApprovalRequest = async ({ workflowId, role, userId, decision, remarks = "" }) => {
  const workflow = await ApprovalWorkflow.findById(workflowId);
  if (!workflow) {
    const err = new Error("Approval workflow not found");
    err.statusCode = 404;
    throw err;
  }

  const step = workflow.steps.find(
    (row) => row.status === "pending" && String(row.role || "").toLowerCase() === String(role || "").toLowerCase()
  );
  if (!step) {
    const err = new Error("No pending approval step for this role");
    err.statusCode = 403;
    throw err;
  }

  step.status = decision === "reject" ? "rejected" : "approved";
  step.decidedBy = userId;
  step.decidedAt = new Date();
  step.remarks = remarks;

  if (step.status === "rejected") {
    workflow.status = "rejected";
  } else {
    workflow.status = workflow.steps.some((row) => row.status === "pending") ? "pending" : "approved";
  }

  await workflow.save();
  return workflow;
};

module.exports = { createApprovalRequest, decideApprovalRequest };
