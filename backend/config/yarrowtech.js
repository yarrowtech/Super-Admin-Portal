require('dotenv').config();

const requiredNames = ['SRS_API_KEY', 'SRS_CLIENT_ID', 'SRS_SIGNING_SECRET', 'SRS_WEBHOOK_SECRET'];
const getConfiguration = () => {
  const baseUrl = process.env.SRS_API_BASE_URL || 'https://api.yarrowtech.in';
  let url;
  try { url = new URL(baseUrl); } catch { url = null; }
  const validUrl = Boolean(url && url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash);
  return {
    baseUrl: validUrl ? url.href.replace(/\/$/, '') : null,
    apiKey: process.env.SRS_API_KEY || '',
    clientId: process.env.SRS_CLIENT_ID || '',
    signingSecret: process.env.SRS_SIGNING_SECRET || '',
    webhookSecret: process.env.SRS_WEBHOOK_SECRET || '',
    missingConfiguration: [...(validUrl ? [] : ['SRS_API_BASE_URL (valid HTTPS URL required)']), ...requiredNames.filter((name) => !process.env[name])],
  };
};
const publicConfiguration = () => {
  const config = getConfiguration();
  return { baseUrl: config.baseUrl, credentialsConfigured: config.missingConfiguration.length === 0, missingConfiguration: config.missingConfiguration };
};
module.exports = { getConfiguration, publicConfiguration };
