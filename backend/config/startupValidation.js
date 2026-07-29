const env = require('./env');
const logger = require('../utils/logger');

const requiredConfig = [
  {
    key: 'MONGO_URI',
    label: 'MongoDB connection string',
    description: 'Database connection URI',
    productionOnly: true,
  },
  {
    key: 'JWT_SECRET',
    label: 'JWT access token secret',
    description: 'Secret used to sign access tokens',
    productionOnly: true,
    sensitive: true,
  },
  {
    key: 'JWT_REFRESH_SECRET',
    label: 'JWT refresh token secret',
    description: 'Secret used to sign refresh tokens',
    productionOnly: true,
    sensitive: true,
  },
  {
    key: 'EFNBMMS_ADMIN_MANAGEMENT_API_URL',
    aliases: ['EFMBMMS_ADMIN_MANAGEMENT_API_URL'],
    label: 'EFNBMMS admin-management URL',
    description: 'Upstream admin-management endpoint for EFNBMMS proxying',
  },
  {
    key: 'EFNBMMS_API_TOKEN',
    aliases: ['EFMBMMS_API_TOKEN'],
    label: 'EFNBMMS API token',
    description: 'Shared token for server-to-server admin-management API calls',
  },
];

const getResolvedValue = (key, aliases = []) => {
  const keys = [key, ...aliases];
  for (const candidate of keys) {
    const value = String(env[candidate] || '').trim();
    if (value) return value;
  }
  return '';
};

const isWeakSecret = (key, value) => {
  if (!value) return true;
  if (key === 'JWT_SECRET' && value === 'dev-jwt-secret-change-me') return true;
  return String(value).length < 32;
};

const validateStartupConfig = ({ strict = env.IS_PRODUCTION } = {}) => {
  const missing = requiredConfig
    .filter(({ productionOnly }) => !productionOnly || strict)
    .filter(({ key, aliases = [] }) => !getResolvedValue(key, aliases))
    .map(({ key, label, description }) => ({ key, label, description }));

  const weakSecrets = requiredConfig
    .filter(({ productionOnly, sensitive }) => sensitive && (!productionOnly || strict))
    .filter(({ key, aliases = [] }) => isWeakSecret(key, getResolvedValue(key, aliases)))
    .map(({ key, label, description }) => ({ key, label, description }));

  if (missing.length === 0 && weakSecrets.length === 0) return { ok: true, missing: [], weakSecrets: [] };

  const messages = [];
  if (missing.length > 0) messages.push(`missing config: ${missing.map((item) => item.key).join(', ')}`);
  if (weakSecrets.length > 0) messages.push(`weak secrets: ${weakSecrets.map((item) => item.key).join(', ')}`);
  const message = `Startup configuration invalid: ${messages.join('; ')}`;
  const details = { missing, weakSecrets };

  if (strict) {
    const error = new Error(message);
    error.code = 'STARTUP_CONFIG_INVALID';
    error.status = 500;
    error.details = details;
    throw error;
  }

  logger.warn(details, message);
  return { ok: false, missing, weakSecrets };
};

module.exports = {
  validateStartupConfig,
};
