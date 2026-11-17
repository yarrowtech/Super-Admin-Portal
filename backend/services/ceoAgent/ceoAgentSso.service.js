const crypto = require('crypto');

/**
 * Mints the SSO handoff token for CEO Agent.
 *
 * Format (fixed by the CEO Agent spec — do not change unilaterally):
 *   token = base64url(JSON payload) + "." + base64url(HMAC_SHA256(secret, payload))
 *
 * Note this is deliberately NOT a JWT: CEO Agent verifies a raw
 * payload.signature pair with its own HMAC, so the portal's usual
 * jwt.sign() helpers do not apply here.
 */

const TOKEN_TTL_MS = 5 * 60 * 1000;

const base64url = (input) => Buffer.from(input).toString('base64url');

const getSecret = () => {
  const secret = process.env.ERP_SSO_SECRET || '';
  if (!secret) {
    const err = new Error('ERP_SSO_SECRET is not configured on this server.');
    err.statusCode = 503;
    throw err;
  }
  return secret;
};

const sign = (payloadB64, secret) =>
  base64url(crypto.createHmac('sha256', secret).update(payloadB64).digest());

/**
 * @param {object} claims
 * @param {string} claims.erpOrgId   Stable, permanent company/tenant id. Never a user id.
 * @param {string} claims.erpUserId  Id of the logged-in portal user.
 * @param {string} claims.email
 * @param {string} claims.name       User display name.
 * @param {string} claims.orgName    Company display name (used on first sight of erpOrgId).
 */
const mintSsoToken = ({ erpOrgId, erpUserId, email, name, orgName }) => {
  if (!erpOrgId) throw new Error('erpOrgId is required and must be stable across logins.');
  if (!erpUserId) throw new Error('erpUserId is required.');

  const expiresAt = Date.now() + TOKEN_TTL_MS;

  // Key order follows the spec's example payload for easy diffing against
  // CEO Agent's verifier during integration debugging.
  const payload = {
    erpOrgId: String(erpOrgId),
    erpUserId: String(erpUserId),
    email: email || '',
    name: name || '',
    orgName: orgName || '',
    // Epoch MILLISECONDS, per spec — not the seconds a JWT `exp` would use.
    exp: expiresAt,
  };

  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64, getSecret());

  return { token: `${payloadB64}.${signature}`, payload, expiresAt: new Date(expiresAt) };
};

/**
 * Verifies a token we minted. Not used in the outbound flow (CEO Agent does
 * the verifying) but kept beside the minter so the test suite can prove the
 * signature scheme is correct, and so an inbound flow could reuse it.
 */
const verifySsoToken = (token) => {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const separator = token.lastIndexOf('.');
  const payloadB64 = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = sign(payloadB64, getSecret());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload?.exp || Date.now() > Number(payload.exp)) return null;
  return payload;
};

const buildLaunchUrl = (token) => {
  const host = (process.env.CEO_AGENT_URL || '').replace(/\/+$/, '');
  if (!host) {
    const err = new Error('CEO_AGENT_URL is not configured on this server.');
    err.statusCode = 503;
    throw err;
  }
  return `${host}/sso/erp?token=${encodeURIComponent(token)}`;
};

module.exports = { mintSsoToken, verifySsoToken, buildLaunchUrl, TOKEN_TTL_MS };
