/**
 * ERP Data Sync API for CEO Agent.
 * Mounted at /api in app.js, behind ERP_DATA_API_KEY.
 *
 * Implements sections 2a-2d of the CEO Agent integration spec.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const router = express.Router();

const erpDataAuth = require('../middlewares/erpDataAuth.middleware');
const erpData = require('../services/ceoAgent/erpData.service');
const marketingResults = require('../services/ceoAgent/marketingResults.service');
const logger = require('../utils/logger');

const erpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.erpOrg?.erpOrgId || ipKeyGenerator(req, res),
  message: { success: false, error: 'Rate limit reached. Retry shortly.' },
});

router.use(erpDataAuth, erpLimiter);

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return next(err);
  }
};

// --- 2a. Customers ---------------------------------------------------------
router.get('/customers', handle(async (req, res) => {
  const result = await erpData.listCustomers({
    // Both spellings accepted: the spec uses snake_case in the URL example.
    updatedSince: req.query.updated_since || req.query.updatedSince,
    page: req.query.page,
    pageSize: req.query.page_size || req.query.pageSize,
  });
  res.json({ success: true, ...result });
}));

// --- 2b. Orders ------------------------------------------------------------
router.get('/orders', handle(async (req, res) => {
  const result = await erpData.listOrders({
    since: req.query.since || req.query.updated_since,
    page: req.query.page,
    pageSize: req.query.page_size || req.query.pageSize,
  });
  res.json({ success: true, ...result });
}));

// --- 2c. Products ----------------------------------------------------------
/**
 * This portal has no product or inventory model — it is a business-operations
 * system, not a commerce ERP. The endpoint exists so CEO Agent's connector
 * gets a clean, documented answer instead of a 404 it has to guess about, and
 * returns an explicit "not available" rather than an empty list, which would
 * otherwise be indistinguishable from a company holding zero stock.
 */
router.get('/products', handle(async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'This system does not track products or inventory.',
    code: 'CAPABILITY_NOT_AVAILABLE',
    data: [],
    pagination: { page: 1, pageSize: 0, total: 0, totalPages: 1, hasMore: false },
  });
}));

// --- 2d. Marketing results write-back --------------------------------------
router.post('/marketing-results', handle(async (req, res) => {
  const result = await marketingResults.recordMarketingResults(req.body || {});
  logger.info(
    { campaignId: result.campaignId, channel: result.channel, recordedFor: result.recordedFor },
    'CEO Agent marketing results recorded'
  );
  res.status(201).json({ success: true, data: result });
}));

/** Capability descriptor, so CEO Agent can discover what this ERP supports. */
router.get('/capabilities', (req, res) => {
  res.json({
    success: true,
    data: {
      customers: { available: true, source: 'CRM clients', incremental: 'updated_since' },
      orders: { available: true, source: 'Finance invoices', incremental: 'since' },
      products: { available: false, reason: 'No product or inventory model in this system.' },
      marketingResults: { available: true, writesTo: 'CRM communications and campaign attribution' },
      pagination: { style: 'page-number', maxPageSize: erpData.MAX_PAGE_SIZE },
      rateLimit: { requestsPerMinute: 120 },
    },
  });
});

module.exports = router;
