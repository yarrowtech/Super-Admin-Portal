const logger = require('../utils/logger');

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
let timer = null;

const parseEnabled = (value) => String(value || '').toLowerCase() === 'true';

const parseInterval = (value) => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_INTERVAL_MS;
  return Math.max(1, minutes) * 60 * 1000;
};

const normalizeHealthUrl = (url) => {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/health') ? trimmed : `${trimmed}/health`;
};

const ping = async (url) => {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-client-source': 'render-keep-alive',
      },
    });
    logger.info(
      { status: res.status, durationMs: Date.now() - startedAt },
      'Render keep-alive ping completed'
    );
  } catch (err) {
    logger.warn({ err, url }, 'Render keep-alive ping failed');
  }
};

const startRenderKeepAlive = () => {
  if (!parseEnabled(process.env.RENDER_KEEP_ALIVE_ENABLED)) return;
  if (timer) return;

  const url = normalizeHealthUrl(process.env.RENDER_KEEP_ALIVE_URL);
  if (!url) {
    logger.warn('Render keep-alive enabled but RENDER_KEEP_ALIVE_URL is not set');
    return;
  }

  const intervalMs = parseInterval(process.env.RENDER_KEEP_ALIVE_INTERVAL_MINUTES);
  timer = setInterval(() => ping(url), intervalMs);
  timer.unref?.();
  setTimeout(() => ping(url), 30 * 1000).unref?.();

  logger.info({ url, intervalMinutes: Math.round(intervalMs / 60_000) }, 'Render keep-alive started');
};

module.exports = {
  startRenderKeepAlive,
};
