const { body, param, query } = require("express-validator");

const listValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 200 }).withMessage("limit must be between 1 and 200"),
];

const linkContractValidation = [
  param("invoiceId").isMongoId().withMessage("Invalid invoiceId"),
  body("title").optional().trim().isLength({ max: 150 }).withMessage("title too long"),
  body("expiryDate").optional().isISO8601().withMessage("expiryDate must be valid date"),
];

module.exports = {
  listValidation,
  linkContractValidation,
};
