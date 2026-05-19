const { body, param, query } = require("express-validator");

const listValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 200 }).withMessage("limit must be between 1 and 200"),
];

const contractIdValidation = [param("id").isMongoId().withMessage("Invalid contract id")];

const createContractValidation = [
  body("title").trim().notEmpty().withMessage("title is required"),
  body("expiryDate").isISO8601().withMessage("expiryDate is required and must be date"),
];

const contractDecisionValidation = [
  param("workflowId").isMongoId().withMessage("Invalid workflowId"),
  body("decision").trim().isIn(["approve", "reject"]).withMessage("decision must be approve or reject"),
  body("remarks").optional().trim().isLength({ max: 1000 }).withMessage("remarks too long"),
];

const disputeValidation = [
  body("title").trim().notEmpty().withMessage("title is required"),
  body("description").optional().trim().isLength({ max: 5000 }).withMessage("description too long"),
  body("priority").optional().isIn(["Low", "Medium", "High", "Critical"]).withMessage("invalid priority"),
];

const moduleProjectValidation = [
  param("moduleKey")
    .trim()
    .isIn(["agreements", "policy", "privacy-policy", "disputes", "ip", "ip-copyright", "third-party"])
    .withMessage("invalid module key"),
  param("projectId").isMongoId().withMessage("Invalid projectId"),
];

module.exports = {
  listValidation,
  contractIdValidation,
  createContractValidation,
  contractDecisionValidation,
  disputeValidation,
  moduleProjectValidation,
};
