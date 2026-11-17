/**
 * Management API for MCP access keys.
 * Mounted at /api/v1/mcp-keys — super admin only.
 */
const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middlewares/auth.middleware');
const mcpKeyService = require('../services/mcp/mcpKey.service');
const { DATASETS } = require('../services/mcp/mcpDatasets');
const logger = require('../utils/logger');

const requireSuperAdmin = authorize('super_admin', 'superadmin', 'admin');

router.use(authenticate, requireSuperAdmin);

/** Domains a key can be scoped to. */
router.get('/scopes', (req, res) => {
  const domains = Array.from(new Set(DATASETS.map((d) => d.domain))).sort();
  res.json({ success: true, data: { domains } });
});

/** List issued keys. Hashes are never selected, so nothing secret is returned. */
router.get('/', async (req, res, next) => {
  try {
    const keys = await mcpKeyService.listKeys();
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
});

/**
 * Issue a new key. The plaintext is present in this response and nowhere else,
 * so the UI must tell the operator to copy it immediately.
 */
router.post('/', async (req, res, next) => {
  try {
    const { label, scopes, expiresAt } = req.body || {};
    if (!label || typeof label !== 'string' || !label.trim()) {
      return res.status(400).json({ success: false, error: 'A label is required.' });
    }

    const validDomains = new Set(DATASETS.map((d) => d.domain));
    const requested = Array.isArray(scopes) ? scopes.filter(Boolean) : [];
    const invalid = requested.filter((s) => !validDomains.has(s));
    if (invalid.length) {
      return res.status(400).json({ success: false, error: `Unknown scope(s): ${invalid.join(', ')}` });
    }

    const { record, plaintext } = await mcpKeyService.issueKey({
      label: label.trim(),
      scopes: requested,
      expiresAt: expiresAt || null,
      createdBy: req.user?._id || req.user?.id || null,
    });

    delete record.keyHash;

    logger.info({ mcpKeyId: record.keyId, by: String(req.user?._id || '') }, 'MCP access key issued');

    res.status(201).json({
      success: true,
      data: {
        key: record,
        // Shown once. Not recoverable.
        plaintext,
      },
      message: 'Copy this key now — it cannot be shown again.',
    });
  } catch (err) {
    next(err);
  }
});

/** Revoke a key. Takes effect on the next request; nothing is cached. */
router.patch('/:id/revoke', async (req, res, next) => {
  try {
    const updated = await mcpKeyService.revokeKey(req.params.id);
    if (!updated) return res.status(404).json({ success: false, error: 'Key not found.' });
    logger.info({ mcpKeyId: updated.keyId, by: String(req.user?._id || '') }, 'MCP access key revoked');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
