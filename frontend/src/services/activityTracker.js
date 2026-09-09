import { apiClient } from './client';
import { readAuthSession } from '../lib/authSession';
import { createLogger } from '../utils/logger';

const logger = createLogger({ module: 'activity' });

const NAV_EVENTS = new Set(['PAGE_VIEW', 'PORTAL_ENTER', 'TAB_VIEW']);
const ACTION_EVENTS = new Set([
  'SEARCH',
  'FILTER',
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'DOWNLOAD',
  'UPLOAD',
  'EXPORT',
]);

const normalizeEvent = (event) => String(event || '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toUpperCase();

const postActivity = async (payload = {}) => {
  const event = normalizeEvent(payload.event || payload.action);
  if (!event) return;
  if (!NAV_EVENTS.has(event) && !ACTION_EVENTS.has(event) && !event.includes('_')) return;
  const token = readAuthSession().token;
  if (!token) return;

  try {
    await apiClient.activity('/api/activity', { ...payload, event }, token);
  } catch (error) {
    logger.debug({ err: error, action: event }, 'Activity tracking failed');
  }
};

const activityTracker = {
  pageView(payload = {}) {
    return postActivity({ ...payload, event: 'PAGE_VIEW' });
  },
  portalEnter(payload = {}) {
    return postActivity({ ...payload, event: 'PORTAL_ENTER' });
  },
  tabView(payload = {}) {
    return postActivity({ ...payload, event: 'TAB_VIEW' });
  },
  action(payload = {}) {
    return postActivity(payload);
  },
  search(payload = {}) {
    return postActivity({ ...payload, event: 'SEARCH' });
  },
  filter(payload = {}) {
    return postActivity({ ...payload, event: 'FILTER' });
  },
};

export { activityTracker };
export default activityTracker;
