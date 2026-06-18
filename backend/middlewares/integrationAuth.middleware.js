const env = require('../config/env');

const readHeader = (req, name) => {
  const value = req.headers[String(name || '').toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const normalize = (value) => String(value || '').trim();

const authenticateIntegrationClient = (req, res, next) => {
  const expectedToken = normalize(
    env.EFNBMMS_SERVICE_TOKEN ||
      env.EFMBMMS_SERVICE_TOKEN ||
      env.SUPER_ADMIN_PORTAL_SERVICE_TOKEN ||
      ''
  );
  const expectedClientId = normalize(env.EFNBMMS_CLIENT_ID || env.EFMBMMS_INTEGRATION_CLIENT_ID || '');
  const expectedClientSecret = normalize(env.EFNBMMS_CLIENT_SECRET || env.EFMBMMS_INTEGRATION_CLIENT_SECRET || '');

  const bearerToken = normalize(String(readHeader(req, 'authorization') || '').replace(/^Bearer\s+/i, ''));
  const apiKey = normalize(readHeader(req, 'x-api-key'));
  const clientId = normalize(readHeader(req, 'x-client-id'));
  const clientSecret = normalize(readHeader(req, 'x-client-secret'));

  const tokenAccepted = Boolean(expectedToken) && [bearerToken, apiKey].some((candidate) => candidate && candidate === expectedToken);
  const clientAccepted =
    Boolean(expectedClientId && expectedClientSecret) &&
    clientId === expectedClientId &&
    clientSecret === expectedClientSecret;

  if (tokenAccepted || clientAccepted) {
    req.integrationClient = {
      id: clientId || 'efnbmms',
      source: 'efnbmms',
      authenticatedAt: new Date().toISOString(),
      authType: tokenAccepted ? (bearerToken ? 'bearer-token' : 'api-key') : 'client-secret',
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: bearerToken || apiKey ? 'invalid_service_token' : 'invalid_service_token',
    code: 'invalid_service_token',
  });
};

module.exports = {
  authenticateIntegrationClient,
};
