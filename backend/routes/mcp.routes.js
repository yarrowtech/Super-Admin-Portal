const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

const mcpAuth = require('../middlewares/mcpAuth.middleware');
const { buildMcpServer } = require('../services/mcp/mcpServer');
const logger = require('../utils/logger');

const router = express.Router();

const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  // Limit per access key. Unauthenticated requests never reach here, but fall
  // back to the IPv6-safe IP helper rather than a raw req.ip, which would let
  // an IPv6 caller rotate addresses within a /64 to bypass the limit.
  keyGenerator: (req, res) => req.mcpKey?.id || ipKeyGenerator(req, res),
  message: {
    jsonrpc: '2.0',
    error: { code: -32029, message: 'Rate limit reached. Retry shortly.' },
    id: null,
  },
});

/**
 * Stateless Streamable HTTP MCP endpoint.
 *
 * A new server + transport pair is built per request and torn down when the
 * response closes. Stateless mode is deliberate: it keeps the endpoint
 * horizontally scalable, since no session state has to be pinned to one
 * instance behind the load balancer.
 */
router.post('/', mcpAuth, mcpLimiter, async (req, res) => {
  let transport;
  let server;

  try {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
      enableJsonResponse: true,
    });

    res.on('close', () => {
      Promise.resolve(transport?.close?.()).catch(() => {});
      Promise.resolve(server?.close?.()).catch(() => {});
    });

    server = buildMcpServer({ logger, keyContext: req.mcpKey });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    logger.error({ err, mcpKeyId: req.mcpKey?.keyId }, 'MCP request failed');
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// Stateless mode has no server-initiated stream and no session to delete.
const methodNotAllowed = (req, res) => res.status(405).json({
  jsonrpc: '2.0',
  error: { code: -32000, message: 'Method not allowed. This endpoint is stateless; use POST.' },
  id: null,
});

router.get('/', methodNotAllowed);
router.delete('/', methodNotAllowed);

/** Unauthenticated liveness probe so operators can confirm the URL is right. */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      transport: 'streamable-http',
      protocol: 'mcp',
      endpoint: `${req.protocol}://${req.get('host')}${req.baseUrl}`,
      authentication: 'Authorization: Bearer <access key>',
      readOnly: true,
    },
  });
});

module.exports = router;
