const mongoose = require('mongoose');
const logger = require('../utils/logger');
const service = require('../services/workspaceSync.service');
const env = require('../config/env');
const { State } = require('../models/WorkspaceSync');
let timer;
let busy = false;
let nextSchedule = 0;
const schedule = async () => {
  if (!env.WORKSPACE_SYNC_AUTOMATIC || Date.now() < nextSchedule) return;
  nextSchedule = Date.now() + 30000;
  const actor = await require('../models/auth/User').findOne({ role: { $in: ['admin', 'super_admin', 'superadmin'] }, isActive: true, accountStatus: { $nin: ['blocked', 'suspended', 'inactive'] } }).lean();
  if (!actor) return;
  for (const [integrationId, adapter] of Object.entries(service.adapters)) {
    if (!adapter.provider.getBaseUrl() || !adapter.provider.getServiceToken()) continue;
    const filter = service.getAdapter(actor, integrationId).filter;
    const state = await State.findOne(filter).lean();
    if (state?.enabled === false) continue;
    if (state?.nextPollAt && state.nextPollAt > new Date()) continue;
    try {
      await service.enqueue(actor, integrationId, {});
      await State.findOneAndUpdate(filter, { $set: { nextPollAt: new Date(Date.now() + env.WORKSPACE_SYNC_POLL_SECONDS * 1000) }, $setOnInsert: { ...filter, status: 'unverified' } }, { upsert: true });
    } catch {
      await State.findOneAndUpdate(filter, { $set: { nextPollAt: new Date(Date.now() + env.WORKSPACE_SYNC_POLL_SECONDS * 1000) }, $setOnInsert: { ...filter, status: 'blocked' } }, { upsert: true });
    }
  }
};
const tick = async () => {
  if (busy || mongoose.connection.readyState !== 1) return;
  busy = true;
  try { await schedule(); await service.processOne(); }
  catch (error) { logger.error({ code: error.code, event: 'WORKSPACE_SYNC_WORKER_ERROR' }, 'Workspace sync worker failed'); }
  finally { busy = false; }
};
exports.start = () => { if (!timer) { timer = setInterval(tick, 5000); timer.unref(); } };
exports.stop = () => { if (timer) clearInterval(timer); timer = null; };
