const logger = require('../utils/logger');

const getProxyPath = (req) => {
  const raw = String(req.originalUrl || '');
  const base = String(req.baseUrl || '');
  const suffix = raw.startsWith(base) ? raw.slice(base.length) : '';
  return suffix || '';
};

const createProxyController = (service, label) => async (req, res) => {
  try {
    const path = getProxyPath(req);
    const upstream = await service.request(req.method, path, {
      body: req.body,
      requestId: req.headers['x-request-id'] || undefined,
    });

    if (upstream.data === null || upstream.data === undefined) {
      return res.status(upstream.status).end();
    }

    return res.status(upstream.status).json(upstream.data);
  } catch (error) {
    const status = Number(error.status) || 502;
    logger.error({ err: error, method: req.method, path: req.originalUrl }, `${label} proxy failed`);
    return res.status(status).json({
      success: false,
      error: error.message || `Failed to proxy ${label} request`,
      code: status === 404 ? 'EFNBMMS_INTEGRATION_NOT_CONFIGURED' : 'EFNBMMS_PROXY_FAILED',
    });
  }
};

module.exports = {
  createProxyController,
};

