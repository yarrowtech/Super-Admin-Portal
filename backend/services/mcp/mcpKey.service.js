const crypto = require('crypto');
const McpAccessKey = require('../../models/mcp/McpAccessKey');

const KEY_PREFIX = 'sap_mcp';

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

/**
 * Key format: sap_mcp_<keyId>_<secret>
 * keyId is public and indexed; secret is the part we hash.
 */
const generateKey = () => {
  const keyId = crypto.randomBytes(8).toString('hex');
  const secret = crypto.randomBytes(32).toString('base64url');
  return { keyId, secret, plaintext: `${KEY_PREFIX}_${keyId}_${secret}` };
};

const parseKey = (raw) => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith(`${KEY_PREFIX}_`)) return null;
  const rest = trimmed.slice(KEY_PREFIX.length + 1);
  const separator = rest.indexOf('_');
  if (separator <= 0) return null;
  const keyId = rest.slice(0, separator);
  const secret = rest.slice(separator + 1);
  if (!keyId || !secret) return null;
  return { keyId, secret };
};

const issueKey = async ({ label, scopes = [], expiresAt = null, createdBy = null }) => {
  const { keyId, secret, plaintext } = generateKey();
  const doc = await McpAccessKey.create({
    label,
    keyId,
    keyHash: sha256(secret),
    keyPreview: plaintext.slice(-4),
    scopes: Array.isArray(scopes) ? scopes : [],
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdBy,
  });
  // plaintext is returned exactly once and never persisted.
  return { record: doc.toObject(), plaintext };
};

/**
 * Verifies a presented key. Returns the key document or null.
 * Uses a timing-safe comparison on the hash.
 */
const verifyKey = async (raw) => {
  const parsed = parseKey(raw);
  if (!parsed) return null;

  const record = await McpAccessKey.findOne({ keyId: parsed.keyId }).select('+keyHash');
  if (!record || !record.isUsable()) return null;

  const presented = Buffer.from(sha256(parsed.secret), 'utf8');
  const stored = Buffer.from(record.keyHash, 'utf8');
  if (presented.length !== stored.length) return null;
  if (!crypto.timingSafeEqual(presented, stored)) return null;

  return record;
};

const touchKey = async (keyDocId, ip) => {
  await McpAccessKey.updateOne(
    { _id: keyDocId },
    { $set: { lastUsedAt: new Date(), lastUsedIp: ip || '' }, $inc: { useCount: 1 } }
  ).catch(() => {});
};

const revokeKey = async (id) => McpAccessKey.findByIdAndUpdate(
  id,
  { $set: { status: 'REVOKED', revokedAt: new Date() } },
  { new: true }
);

const listKeys = async () => McpAccessKey.find({}).sort({ createdAt: -1 }).lean();

module.exports = { issueKey, verifyKey, touchKey, revokeKey, listKeys, parseKey, KEY_PREFIX };
