const { body, param, query } = require("express-validator");

const listValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 200 }).withMessage("limit must be between 1 and 200"),
];

const createExpenseValidation = [
  body("title").trim().notEmpty().withMessage("title is required"),
  body("amount").isFloat({ min: 0.01 }).withMessage("amount must be > 0"),
  body("department").optional().trim().isLength({ max: 100 }).withMessage("department too long"),
];

const decisionValidation = [
  param("workflowId").isMongoId().withMessage("Invalid workflowId"),
  body("decision").trim().isIn(["approve", "reject"]).withMessage("decision must be approve or reject"),
  body("remarks").optional().trim().isLength({ max: 1000 }).withMessage("remarks too long"),
];

const payrollTriggerValidation = [
  body("employee").optional().isMongoId().withMessage("employee must be valid id"),
  body("periodStart").optional().isISO8601().withMessage("periodStart must be date"),
  body("periodEnd").optional().isISO8601().withMessage("periodEnd must be date"),
  body("grossPay").optional().isFloat({ min: 0 }).withMessage("grossPay must be >= 0"),
];

const linkContractValidation = [
  param("invoiceId").isMongoId().withMessage("Invalid invoiceId"),
  body("title").optional().trim().isLength({ max: 150 }).withMessage("title too long"),
  body("expiryDate").optional().isISO8601().withMessage("expiryDate must be valid date"),
];

module.exports = {
  listValidation,
  createExpenseValidation,
  decisionValidation,
  payrollTriggerValidation,
  linkContractValidation,
};
