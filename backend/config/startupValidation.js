const env = require('./env');
const logger = require('../utils/logger');

const requiredConfig = [
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

const validateStartupConfig = ({ strict = env.IS_PRODUCTION } = {}) => {
  const missing = requiredConfig
    .filter(({ key, aliases = [] }) => !getResolvedValue(key, aliases))
    .map(({ key, label, description }) => ({ key, label, description }));

  if (missing.length === 0) return { ok: true, missing: [] };

  const message = `Missing required EFNBMMS integration config: ${missing.map((item) => item.key).join(', ')}`;
  const details = { missing };

  if (strict) {
    const error = new Error(message);
    error.code = 'STARTUP_CONFIG_INVALID';
    error.status = 500;
    error.details = details;
    throw error;
  }

  logger.warn(details, message);
  return { ok: false, missing };
};

module.exports = {
  validateStartupConfig,
};
