const config = require('../config/yarrowtech');
const CONTRACT_BLOCKER = 'YarrowTech API contract is not verified: authentication headers, client identification, signing algorithm, timestamp/nonce rules, resource paths, response schemas and webhook signature rules are required. Rotate previously exposed credentials before production use.';
const inventory = () => ({
  id: 'yarrowtech-srs', projectCode: 'YARROWTECH', name: 'YarrowTech SRS API',
  providerBaseUrl: config.publicConfiguration().baseUrl, resourceEndpoint: null,
  method: null, direction: 'Unverified', resource: 'YarrowTech resources',
  authentication: 'SRS credentials stored server-side; protocol unverified',
  databaseMapping: 'WorkspaceExternalRecord / WorkspaceSyncJob after contract verification',
  capabilities: [], writeFields: [], status: 'blocked', blockedBy: CONTRACT_BLOCKER,
  ...config.publicConfiguration(),
});
const probe = async () => {
  const settings = config.publicConfiguration();
  if (!settings.baseUrl) { const error = new Error('Invalid SRS_API_BASE_URL'); error.statusCode = 409; throw error; }
  // A public host probe never sends credentials or claims authenticated API access.
  try {
    const response = await fetch(settings.baseUrl, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json, text/html' } });
    await response.body?.cancel();
    return { status: 'blocked', reachable: response.ok, httpStatus: response.status, checkedAt: new Date(), blockedBy: CONTRACT_BLOCKER };
  } catch { return { status: 'blocked', reachable: false, checkedAt: new Date(), blockedBy: 'YarrowTech host probe failed. ' + CONTRACT_BLOCKER }; }
};
const rejectUnverifiedOperation = () => { const error = new Error(CONTRACT_BLOCKER); error.statusCode = 409; error.code = 'YARROWTECH_CONTRACT_UNVERIFIED'; throw error; };
module.exports = { inventory, probe, rejectUnverifiedOperation, CONTRACT_BLOCKER };
