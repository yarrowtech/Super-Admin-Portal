const config = require('../config/yarrowtech');
const CONTRACT_BLOCKER = 'Synchronization needs verified provider resource endpoints, authentication instructions and response formats.';
const inventory = () => ({
  id: 'yarrowtech-srs', projectCode: 'YARROWTECH', name: 'YarrowTech SRS API',
  providerBaseUrl: config.publicConfiguration().baseUrl, resourceEndpoint: null,
  method: null, direction: 'Unverified', resource: 'YarrowTech resources',
  authentication: 'Server-side credentials; authenticated resource access unverified',
  authenticationStatus: 'unverified', syncReady: false,
  databaseMapping: 'WorkspaceExternalRecord / WorkspaceSyncJob after contract verification',
  capabilities: [], writeFields: [], status: 'blocked', blockedBy: CONTRACT_BLOCKER,
  ...config.publicConfiguration(),
});
const withState = (state) => {
  const current = inventory();
  // A previous deployment's health result cannot verify a newly configured host.
  const check = state?.connectionCheck?.baseUrl === current.providerBaseUrl ? state.connectionCheck : null;
  return { ...current, name: state?.displayName || current.name, enabled: state?.enabled !== false,
    status: state?.enabled === false ? 'disabled' : current.status,
    connectionCheck: check, checkedAt: check?.checkedAt || null };
};
const probe = async () => {
  const { baseUrl } = config.publicConfiguration();
  if (!baseUrl) { const error = new Error('Invalid SRS_API_BASE_URL'); error.statusCode = 409; throw error; }
  const checkedAt = new Date();
  const result = (connectionStatus, connectionMessage, details = {}) => ({
    status: 'blocked', syncReady: false, authenticationStatus: 'unverified', blockedBy: CONTRACT_BLOCKER,
    baseUrl, checkedAt, reachable: false, healthy: false, connectionStatus, connectionMessage, ...details,
  });
  // /health was verified against the actual YarrowTech deployment. It is public;
  // no credential or guessed signing protocol is used for this request.
  try {
    const response = await fetch(`${baseUrl}/health`, { method: 'GET', redirect: 'error',
      signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
    const details = { reachable: true, httpStatus: response.status };
    if (!response.ok) {
      await response.body?.cancel();
      return result('http_error', `Provider health endpoint returned HTTP ${response.status}.`, details);
    }
    let health;
    try {
      if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
        await response.body?.cancel();
        return result('unexpected_response', 'Provider responded, but did not return the expected health response.', details);
      }
      health = await response.json();
    } catch (error) {
      if (['TimeoutError', 'AbortError'].includes(error.name)) throw error;
      return result('unexpected_response', 'Provider responded, but its health response was invalid.', details);
    }
    if (health?.ok !== true) return result('unhealthy', 'Provider responded, but did not report healthy status.', details);
    return result('healthy', 'Provider health check passed. Authenticated data access is still unverified.', { ...details, healthy: true });
  } catch (error) {
    const timedOut = ['TimeoutError', 'AbortError'].includes(error.name);
    return result(timedOut ? 'timeout' : 'unreachable', timedOut ? 'Provider health check timed out. Try again shortly.' : 'Could not reach the provider health endpoint. Check the backend network and configured URL.');
  }
};
const rejectUnverifiedOperation = () => { const error = new Error(CONTRACT_BLOCKER); error.statusCode = 409; error.code = 'YARROWTECH_CONTRACT_UNVERIFIED'; throw error; };
module.exports = { inventory, withState, probe, rejectUnverifiedOperation, CONTRACT_BLOCKER };
