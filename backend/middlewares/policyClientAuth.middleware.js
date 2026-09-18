const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const policy = require('../services/policy.service');

const authenticatePolicyClient = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Bearer access token required' });
    }
    req.policyClient = await policy.verifyConsumerToken(token);
    return next();
  } catch (error) {
    const status = error.status || 401;
    return res.status(status).json({ success: false, code: error.code || 'UNAUTHORIZED', error: error.message || 'Unauthorized' });
  }
};

const policyClientRateLimiter = rateLimit({
  windowMs: Number(process.env.POLICY_CLIENT_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.POLICY_CLIENT_RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.policyClient?.clientId || ipKeyGenerator(req.ip),
  message: { success: false, code: 'RATE_LIMITED', error: 'Too many policy API requests' },
});

module.exports = { authenticatePolicyClient, policyClientRateLimiter };
