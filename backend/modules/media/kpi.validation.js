const { body } = require('express-validator');

const NUMERIC_FIELDS = [
  'websiteTraffic', 'registrations', 'leads', 'bookings', 'revenue', 'retention',
  'awareness', 'interest', 'websiteVisit', 'registration', 'lead', 'customer', 'referral',
];

const snapshotValidation = [
  body('period').optional().trim().isLength({ min: 4, max: 20 }),
  ...NUMERIC_FIELDS.map((field) => body(field).optional().isFloat({ min: 0 }).withMessage(`${field} must be >= 0`)),
];

module.exports = { snapshotValidation };
