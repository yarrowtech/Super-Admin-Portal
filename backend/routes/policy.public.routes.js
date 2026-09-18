const express = require('express');
const { authenticatePolicyClient, policyClientRateLimiter } = require('../middlewares/policyClientAuth.middleware');
const controller = require('../controllers/policy.controller');
const router = express.Router();

// POST /api/v1/auth/token — OAuth2 client-credentials token issuance
router.post('/auth/token', controller.token);

// All routes below require a valid client access token + per-client rate limiting
router.use(policyClientRateLimiter, authenticatePolicyClient);

router.get('/policies', controller.consumerList);
router.get('/policies/code/:policyCode', controller.consumerGetByCode);
router.get('/policies/:policyId/versions', controller.consumerVersions);
router.get('/policies/:policyId', controller.consumerGet);

module.exports = router;
