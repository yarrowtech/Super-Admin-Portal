/**
 * CEO Agent SSO launch — the "Open in CEO Agent" button.
 * Mounted at /api/ceo-agent in app.js
 *
 * Per the integration spec the token is minted server-side and the browser is
 * redirected; no token logic ever reaches frontend JS.
 */
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const ssoService = require('../services/ceoAgent/ceoAgentSso.service');
const orgService = require('../services/ceoAgent/ceoAgentOrg.service');
const Token = require('../models/auth/Token');
const logger = require('../utils/logger');

const buildClaims = (user) => {
  const { erpOrgId, orgName } = orgService.resolveOrgIdentity();
  const first = user.firstName || '';
  const last = user.lastName || '';
  const display = `${first} ${last}`.trim() || user.name || user.email || 'User';

  return {
    erpOrgId,
    orgName,
    // The portal user's immutable _id — stable across email/name changes.
    erpUserId: String(user._id || user.id),
    email: user.email || '',
    name: display,
  };
};

/**
 * Records the minted token so it can be treated as single-use and audited,
 * matching how the existing EEC SSO flow tracks its handoffs. Best-effort:
 * a logging failure must not break the user's launch.
 */
const recordToken = async (user, token, expiresAt) => {
  try {
    await Token.create({
      user: user._id || user.id,
      token,
      type: 'sso',
      portal: 'ceo-agent',
      projectCode: 'CEO_AGENT',
      expiresAt,
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'CEO Agent SSO token not recorded');
  }
};

/**
 * GET /api/ceo-agent/launch
 * Mints a token and 302-redirects the browser to CEO Agent's consent screen.
 */
router.get('/launch', authenticate, async (req, res, next) => {
  try {
    const claims = buildClaims(req.user);
    const { token, expiresAt } = ssoService.mintSsoToken(claims);
    await recordToken(req.user, token, expiresAt);

    logger.info(
      { erpOrgId: claims.erpOrgId, erpUserId: claims.erpUserId, portal: 'ceo-agent' },
      'CEO Agent SSO launch'
    );

    return res.redirect(302, ssoService.buildLaunchUrl(token));
  } catch (err) {
    if (err.statusCode === 503) {
      return res.status(503).json({ success: false, error: err.message });
    }
    return next(err);
  }
});

/**
 * POST /api/ceo-agent/launch-url
 * Same handoff, but returns the URL as JSON instead of redirecting — for a
 * frontend button that wants to open CEO Agent in a new tab. The token is
 * still minted entirely server-side.
 */
router.post('/launch-url', authenticate, async (req, res, next) => {
  try {
    const claims = buildClaims(req.user);
    const { token, expiresAt } = ssoService.mintSsoToken(claims);
    await recordToken(req.user, token, expiresAt);

    logger.info(
      { erpOrgId: claims.erpOrgId, erpUserId: claims.erpUserId, portal: 'ceo-agent' },
      'CEO Agent SSO launch URL issued'
    );

    return res.json({
      success: true,
      data: { url: ssoService.buildLaunchUrl(token), expiresAt },
    });
  } catch (err) {
    if (err.statusCode === 503) {
      return res.status(503).json({ success: false, error: err.message });
    }
    return next(err);
  }
});

/** Unauthenticated config probe, so an operator can see what is still missing. */
router.get('/status', (req, res) => {
  let orgConfigured = true;
  try {
    orgService.resolveOrgIdentity();
  } catch {
    orgConfigured = false;
  }

  res.json({
    success: true,
    data: {
      ssoSecretConfigured: Boolean(process.env.ERP_SSO_SECRET),
      ceoAgentUrlConfigured: Boolean(process.env.CEO_AGENT_URL),
      orgIdConfigured: orgConfigured,
      dataApiKeysConfigured: Boolean(process.env.ERP_DATA_API_KEY),
    },
  });
});

module.exports = router;
