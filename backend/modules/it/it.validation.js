const { body, param, query } = require("express-validator");

const listValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 200 }).withMessage("limit must be between 1 and 200"),
];

const idValidation = [param("id").isMongoId().withMessage("Invalid id")];

const createAssetValidation = [
  body("assetTag").trim().notEmpty().withMessage("assetTag is required"),
  body("name").trim().notEmpty().withMessage("name is required"),
  body("type").optional().trim().isLength({ min: 2 }).withMessage("type must be valid"),
];

const createTicketValidation = [
  body("title").trim().notEmpty().withMessage("title is required"),
  body("description").optional().trim().isLength({ max: 5000 }).withMessage("description too long"),
  body("priority").optional().isIn(["low", "medium", "high", "critical"]).withMessage("invalid priority"),
];

const ticketStatusValidation = [
  ...idValidation,
  body("status")
    .trim()
    .isIn(["open", "in-progress", "resolved", "closed", "rejected"])
    .withMessage("invalid status"),
];

const accessRequestValidation = [
  body("targetUserId").optional().isMongoId().withMessage("targetUserId must be valid"),
  body("accessScope").optional().trim().isLength({ min: 2, max: 120 }).withMessage("accessScope is invalid"),
];

const accessDecisionValidation = [
  param("workflowId").isMongoId().withMessage("Invalid workflowId"),
  body("decision").trim().isIn(["approve", "reject"]).withMessage("decision must be approve or reject"),
  body("remarks").optional().trim().isLength({ max: 1000 }).withMessage("remarks too long"),
];

module.exports = {
  listValidation,
  idValidation,
  createAssetValidation,
  createTicketValidation,
  ticketStatusValidation,
  accessRequestValidation,
  accessDecisionValidation,
};
