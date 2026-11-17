const mcpKeyService = require('../services/mcp/mcpKey.service');
const logger = require('../utils/logger');

/**
 * Authenticates an MCP request using a portal-issued access key.
 *
 * Accepts either:
 *   Authorization: Bearer <key>
 *   X-MCP-Key: <key>
 *
 * The second form exists because some MCP clients let the operator name a
 * custom auth header instead of using Bearer.
 */
const mcpAuth = async (req, res, next) => {
  const header = req.get('authorization') || '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const raw = bearer || req.get('x-mcp-key') || '';

  if (!raw) {
    res.set('WWW-Authenticate', 'Bearer realm="super-admin-mcp"');
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Missing access key. Send it as "Authorization: Bearer <key>".' },
      id: null,
    });
  }

  try {
    const record = await mcpKeyService.verifyKey(raw);
    if (!record) {
      logger.warn({ ip: req.ip, path: req.originalUrl }, 'MCP auth rejected');
      return res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32002, message: 'Invalid, expired or revoked access key.' },
        id: null,
      });
    }

    req.mcpKey = {
      id: String(record._id),
      keyId: record.keyId,
      label: record.label,
      scopes: Array.isArray(record.scopes) ? record.scopes : [],
    };

    // Usage stats are best-effort and must never block the request.
    mcpKeyService.touchKey(record._id, req.ip);
    return next();
  } catch (err) {
    logger.error({ err }, 'MCP auth error');
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Authentication failed.' },
      id: null,
    });
  }
};

module.exports = mcpAuth;
