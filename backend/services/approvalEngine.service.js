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
      optional: Boolean(step.optional),
    })),
  });
};

const decideApprovalRequest = async ({ workflowId, role, userId, decision, remarks = "", overrideRoles = [] }) => {
  const workflow = await ApprovalWorkflow.findById(workflowId);
  if (!workflow) {
    const err = new Error("Approval workflow not found");
    err.statusCode = 404;
    throw err;
  }

  const normalizedRole = String(role || "").toLowerCase();
  const canOverride = overrideRoles.map((item) => String(item || "").toLowerCase()).includes(normalizedRole);
  const step = workflow.steps.find(
    (row) => row.status === "pending" && String(row.role || "").toLowerCase() === String(role || "").toLowerCase()
  ) || (canOverride ? workflow.steps.find((row) => row.status === "pending" && !row.optional) : null);

  if (!step) {
    const err = new Error("No pending approval step for this role");
    err.statusCode = 403;
    throw err;
  }

  // An override role decides the workflow as a whole, rather than merely
  // impersonating the first specialist in the chain.
  const stepsToDecide = canOverride
    ? workflow.steps.filter((row) => row.status === "pending")
    : [step];
  const decidedAt = new Date();
  stepsToDecide.forEach((row) => {
    row.status = decision === "reject" ? "rejected" : "approved";
    row.decidedBy = userId;
    row.decidedAt = decidedAt;
    row.remarks = remarks;
  });

  if (decision === "reject") {
    workflow.status = "rejected";
  } else {
    const hasBlockingPendingStep = workflow.steps.some((row) => row.status === "pending" && !row.optional);
    workflow.status = hasBlockingPendingStep ? "pending" : "approved";
  }

  await workflow.save();
  return workflow;
};

module.exports = { createApprovalRequest, decideApprovalRequest };
