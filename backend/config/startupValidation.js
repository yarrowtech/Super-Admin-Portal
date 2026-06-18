const env = require('./env');
const logger = require('../utils/logger');

const requiredConfig = [
  {
    key: 'EFNBMMS_PORTAL_URL',
    aliases: ['EFMBMMS_PORTAL_URL'],
    label: 'EFNBMMS portal URL',
    description: 'Redirect target for one-click EFNBMMS launch',
  },
  {
    key: 'EFNBMMS_CLIENT_ID',
    aliases: ['EFMBMMS_CLIENT_ID'],
    label: 'EFNBMMS client ID',
    description: 'Client credential used by EFNBMMS during code exchange',
  },
  {
    key: 'EFNBMMS_CLIENT_SECRET',
    aliases: ['EFMBMMS_CLIENT_SECRET'],
    label: 'EFNBMMS client secret',
    description: 'Secret credential used by EFNBMMS during code exchange',
  },
  {
    key: 'EFNBMMS_SERVICE_TOKEN',
    aliases: ['EFMBMMS_SERVICE_TOKEN', 'SUPER_ADMIN_PORTAL_SERVICE_TOKEN'],
    label: 'EFNBMMS service token',
    description: 'Shared token for server-to-server identity API calls',
  },
  {
    key: 'EFNBMMS_ADMIN_MANAGEMENT_API_URL',
    aliases: ['EFMBMMS_ADMIN_MANAGEMENT_API_URL'],
    label: 'EFNBMMS admin-management URL',
    description: 'Upstream admin-management endpoint for EFNBMMS proxying',
  },
  {
    key: 'EFNBMMS_MANAGER_API_URL',
    aliases: ['EFMBMMS_MANAGER_API_URL'],
    label: 'EFNBMMS manager API URL',
    description: 'Upstream manager API endpoint for EFNBMMS proxying',
  },
  {
    key: 'EFNBMMS_ADMIN_API_URL',
    aliases: ['EFMBMMS_ADMIN_API_URL'],
    label: 'EFNBMMS admin API URL',
    description: 'Upstream admin API endpoint for EFNBMMS proxying',
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
