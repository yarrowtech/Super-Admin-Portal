// backend/middleware/validate.js
const { body, validationResult } = require('express-validator');

const emailNormalizeOptions = {
  gmail_remove_dots: false,
  gmail_remove_subaddress: false,
  gmail_convert_googlemaildotcom: false,
  outlookdotcom_remove_subaddress: false,
  yahoo_remove_subaddress: false,
  icloud_remove_subaddress: false,
};

/**
 * Validation middleware to check for validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    // Surface the actual field + reason in the top-level `error` string (not just
    // the generic "Validation failed" literal) so every consumer — including raw
    // fetch() call sites that only read response.error — shows what actually broke.
    const summary = errorList
      .map(item => (item.field ? `${item.field}: ${item.message}` : item.message))
      .filter(Boolean)
      .join('; ');
    return res.status(400).json({
      success: false,
      error: summary || 'Validation failed',
      errors: errorList
    });
  }
  next();
};

/**
 * Registration validation rules
 */
const registerValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(emailNormalizeOptions),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'super_admin', 'ceo', 'it', 'it_admin', 'system_operator', 'security_analyst', 'devops_engineer', 'law', 'legal_head', 'hr', 'media', 'finance', 'finance_manager', 'accountant', 'auditor', 'manager', 'sales', 'research_operator', 'employee', 'freelancer'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name must be less than 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid phone number')
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(emailNormalizeOptions),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Update profile validation rules
 */
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must be at most 1000 characters'),
  body('resumeUrl')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resume URL is too long'),
  body('skills')
    .optional()
    .isArray({ max: 100 })
    .withMessage('Skills must be an array'),
  body('experience')
    .optional()
    .isArray({ max: 100 })
    .withMessage('Experience must be an array'),
  body('projects')
    .optional()
    .isArray({ max: 100 })
    .withMessage('Projects must be an array'),
  body('education')
    .optional()
    .isArray({ max: 100 })
    .withMessage('Education must be an array'),
  body('certifications')
    .optional()
    .isArray({ max: 100 })
    .withMessage('Certifications must be an array'),
  body('achievements')
    .optional()
    .isArray({ max: 100 })
    .withMessage('Achievements must be an array'),
  body('yearsOfExperience')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('yearsOfExperience must be >= 0')
];

/**
 * Change password validation rules
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

const outsourcingCreateUserValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(emailNormalizeOptions),
  body('password').trim().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('outsourcingType').trim().toLowerCase().isIn(['freelancer', 'third_party_worker']).withMessage('Invalid outsourcing type'),
  body('role').optional().trim().isIn(['freelancer']).withMessage('Role must be freelancer'),
  body('department').optional().trim().isLength({ max: 100 }).withMessage('Department too long')
];

const outsourcingCreateJobValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 120 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 5000 }),
  body('assignedFreelancerId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('assignedFreelancerId must be a valid ID'),
  body('priority').optional().trim().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('budgetAmount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('budgetAmount must be >= 0')
];

const outsourcingCreateContractValidation = [
  body('jobId').trim().isMongoId().withMessage('jobId must be a valid ID'),
  body('freelancerId').trim().isMongoId().withMessage('freelancerId must be a valid ID'),
  body('paymentType').trim().isIn(['hourly', 'daily', 'weekly', 'fixed']).withMessage('Invalid paymentType'),
  body('rate').isFloat({ min: 0 }).withMessage('rate must be >= 0'),
  body('escrowAmount').optional().isFloat({ min: 0 }).withMessage('escrowAmount must be >= 0'),
  body('startDate').optional().isISO8601().withMessage('startDate must be ISO8601 date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be ISO8601 date')
];

const outsourcingTimeLogValidation = [
  body('contractId').trim().isMongoId().withMessage('contractId must be a valid ID'),
  body('logDate').isISO8601().withMessage('logDate must be ISO8601 date'),
  body('hours').isFloat({ min: 0.1, max: 24 }).withMessage('hours must be between 0.1 and 24'),
  body('workStatus').optional().trim().isIn(['in_progress', 'completed']).withMessage('Invalid workStatus')
];

const outsourcingCreateMilestoneValidation = [
  body('jobId').trim().isMongoId().withMessage('jobId must be a valid ID'),
  body('contractId').trim().isMongoId().withMessage('contractId must be a valid ID'),
  body('freelancerId').trim().isMongoId().withMessage('freelancerId must be a valid ID'),
  body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 120 }),
  body('amount').isFloat({ min: 0 }).withMessage('amount must be >= 0'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be ISO8601 date')
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  outsourcingCreateUserValidation,
  outsourcingCreateJobValidation,
  outsourcingCreateContractValidation,
  outsourcingTimeLogValidation,
  outsourcingCreateMilestoneValidation
};
