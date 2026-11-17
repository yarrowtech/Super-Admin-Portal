const mongoose = require('mongoose');
const CRMClient = require('../../models/crm/CRMClient');
const CRMCommunication = require('../../models/crm/CRMCommunication');

/**
 * Receives campaign results from CEO Agent and records them in the CRM.
 *
 * Two effects per call:
 *   1. One CRMCommunication row per targeted client, so the campaign shows up
 *      on that client's activity timeline.
 *   2. Campaign attribution stamped onto each targeted CRMClient
 *      (campaignId / campaignSource / marketingChannel), which the CRM schema
 *      already carries.
 *
 * This is the only write path in the whole CEO Agent integration.
 */

// Spec channels -> the CRMCommunication.type enum. Anything unmapped (e.g.
// linkedin, instagram) becomes 'message', with the true channel preserved in
// the subject line and on the client record.
const CHANNEL_TO_TYPE = {
  email: 'email',
  call: 'call',
  meeting: 'meeting',
  whatsapp: 'message',
  sms: 'message',
  linkedin: 'message',
  instagram: 'message',
  facebook: 'message',
};

const VALID_DEPARTMENTS = new Set(['media', 'marketing']);

const toObjectId = (value) => {
  if (!value) return null;
  const raw = String(value);
  return mongoose.Types.ObjectId.isValid(raw) ? new mongoose.Types.ObjectId(raw) : null;
};

const buildSummary = ({ channel, metrics }) => {
  const parts = Object.entries(metrics || {})
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => `${k}: ${v}`);
  return `Campaign via ${channel}${parts.length ? ` — ${parts.join(', ')}` : ''}`;
};

const recordMarketingResults = async ({
  campaignId,
  channel,
  sentAt,
  targetCustomerIds,
  metrics,
  campaignName,
  department,
}) => {
  if (!campaignId || typeof campaignId !== 'string') {
    const err = new Error('campaignId is required.');
    err.statusCode = 400;
    throw err;
  }
  if (!channel || typeof channel !== 'string') {
    const err = new Error('channel is required.');
    err.statusCode = 400;
    throw err;
  }

  const ids = Array.isArray(targetCustomerIds) ? targetCustomerIds : [];
  if (!ids.length) {
    const err = new Error('targetCustomerIds must be a non-empty array.');
    err.statusCode = 400;
    throw err;
  }

  const occurredAt = sentAt ? new Date(sentAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    const err = new Error('sentAt must be an ISO8601 date.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedChannel = channel.toLowerCase().trim();
  const type = CHANNEL_TO_TYPE[normalizedChannel] || 'message';

  const objectIds = ids.map(toObjectId).filter(Boolean);
  const invalidIds = ids.filter((id) => !toObjectId(id));

  if (!objectIds.length) {
    const err = new Error('No valid customer ids supplied.');
    err.statusCode = 400;
    throw err;
  }

  // Only write against clients that actually exist, and inherit each client's
  // own department so the required enum is always satisfied correctly.
  const clients = await CRMClient.find({ _id: { $in: objectIds } })
    .select('_id department')
    .lean();

  const known = new Map(clients.map((c) => [String(c._id), c]));
  const unknownIds = objectIds.map(String).filter((id) => !known.has(id));

  const fallbackDepartment = VALID_DEPARTMENTS.has(String(department))
    ? String(department)
    : 'marketing';

  const summary = buildSummary({ channel: normalizedChannel, metrics });

  const communications = clients.map((client) => ({
    client: client._id,
    department: VALID_DEPARTMENTS.has(client.department) ? client.department : fallbackDepartment,
    type,
    direction: 'outbound',
    subject: `${campaignName || 'Campaign'} (${normalizedChannel})`,
    body: summary,
    outcome: JSON.stringify(metrics || {}),
    isInternal: false,
    occurredAt,
  }));

  const [created] = await Promise.all([
    communications.length ? CRMCommunication.insertMany(communications) : [],
    CRMClient.updateMany(
      { _id: { $in: clients.map((c) => c._id) } },
      {
        $set: {
          campaignId,
          campaignSource: campaignName || 'CEO Agent',
          marketingChannel: normalizedChannel,
          lastContactedAt: occurredAt,
        },
      }
    ),
  ]);

  return {
    campaignId,
    channel: normalizedChannel,
    recordedFor: clients.length,
    communicationsCreated: Array.isArray(created) ? created.length : 0,
    // Reported rather than swallowed, so CEO Agent can reconcile its own list.
    skipped: { unknownCustomerIds: unknownIds, invalidCustomerIds: invalidIds },
    occurredAt,
  };
};

module.exports = { recordMarketingResults, CHANNEL_TO_TYPE };
