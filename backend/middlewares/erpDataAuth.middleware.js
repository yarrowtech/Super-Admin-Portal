const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Authenticates CEO Agent's calls to the ERP data API.
 *
 * Uses ERP_DATA_API_KEY — deliberately separate from ERP_SSO_SECRET, which
 * signs login handoffs only. Compromise of one must not grant the other.
 *
 * Comparison is constant-time to avoid leaking the key a byte at a time.
 */
const timingSafeEquals = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const erpDataAuth = (req, res, next) => {
  const configured = process.env.ERP_DATA_API_KEY || '';
  if (!configured) {
    return res.status(503).json({
      success: false,
      error: 'ERP_DATA_API_KEY is not configured on this server.',
    });
  }

  const header = req.get('authorization') || '';
  const presented = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : (req.get('x-api-key') || '').trim();

  if (!presented) {
    res.set('WWW-Authenticate', 'Bearer realm="erp-data-api"');
    return res.status(401).json({ success: false, error: 'Missing API key.' });
  }

  if (!timingSafeEquals(presented, configured)) {
    logger.warn({ ip: req.ip, path: req.originalUrl }, 'ERP data API auth rejected');
    return res.status(403).json({ success: false, error: 'Invalid API key.' });
  }

  // Scope marker. Single-company portal today, but every handler filters by
  // this rather than reading globally, so moving to a key-per-company model
  // later is a change in this middleware alone.
  req.erpOrg = { erpOrgId: (process.env.ERP_ORG_ID || '').trim() };
  return next();
};

module.exports = erpDataAuth;
