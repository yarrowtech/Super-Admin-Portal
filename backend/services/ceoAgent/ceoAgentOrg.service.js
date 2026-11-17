const crypto = require('crypto');

/**
 * Resolves the `erpOrgId` sent to CEO Agent.
 *
 * The spec requires an id that is stable and permanent for the life of the
 * integration: CEO Agent uses it as the key to decide "same company as last
 * time". If it ever changes, CEO Agent silently provisions a brand-new org and
 * the existing one is orphaned.
 *
 * This portal is a single-company operations portal, not a per-company
 * multi-tenant ERP, so there is no natural company row to point at. We
 * therefore take the id from configuration rather than deriving it from
 * anything mutable (company name, domain, admin email), all of which the spec
 * explicitly warns against.
 *
 * ERP_ORG_ID should be set once, to a value like `openssl rand -hex 16`, and
 * then never changed.
 */

const resolveOrgIdentity = () => {
  const configured = (process.env.ERP_ORG_ID || '').trim();
  const orgName = (process.env.ERP_ORG_NAME || 'Yarrowtech').trim();

  if (configured) {
    return { erpOrgId: configured, orgName, source: 'configured' };
  }

  // Deliberate hard failure rather than a derived fallback. A fallback based on
  // hostname or company name would look fine in testing and then quietly
  // re-provision a new CEO Agent org the first time that value changed.
  const err = new Error(
    'ERP_ORG_ID is not configured. Set it once to a permanent random value '
    + '(e.g. `openssl rand -hex 16`) and never change it — CEO Agent uses it to '
    + 'recognise this company on every future launch.'
  );
  err.statusCode = 503;
  throw err;
};

/** Convenience for first-time setup: suggests a value for ERP_ORG_ID. */
const suggestOrgId = () => crypto.randomBytes(16).toString('hex');

module.exports = { resolveOrgIdentity, suggestOrgId };
