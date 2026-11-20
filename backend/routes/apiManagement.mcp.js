const express = require('express');
const rateLimit = require('express-rate-limit');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { Portal, Connection, ProjectApi, Endpoint, Event } = require('../models/ApiManagement');
const { hash } = require('../services/apiManagement.security');
const { digest, validateGrants, executeGateway } = require('./apiManagement.routes');
const router = express.Router();
router.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
router.post('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  let server; let transport;
  try {
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
    const portal = token && await Portal.findOne({ tokenHash: hash(token), enabled: true, mcpEnabled: true });
    if (!portal) return res.status(401).json({ error: 'An enabled MCP portal credential is required' });
    server = new McpServer({ name: 'managed-project-apis', version: '1.0.0' });
    const connections = await Connection.find({ portalId: portal._id, status: 'Connected' });
    for (const connection of connections) {
      const api = await ProjectApi.findById(connection.apiId);
      if (!api?.enabled) continue;
      let endpoints;
      try { endpoints = await validateGrants(api._id, connection.grants); } catch { continue; }
      if (digest(api, connection, endpoints) !== connection.testedDigest) continue;
      for (const grant of connection.grants) {
        const endpoint = endpoints.find(e => e.id === String(grant.endpointId));
        if (!endpoint || endpoint.method !== 'GET') continue;
        server.registerTool(`fetch_${endpoint.id}`, {
          title: endpoint.name, description: `${api.name}: ${endpoint.module} / ${endpoint.dataset}. Approved fields: ${grant.fields.join(', ')}`,
          inputSchema: {}, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
        }, async () => {
          try {
            // Reauthenticate and reauthorize every invocation, including revocation.
            const current = await Portal.findOne({ _id: portal._id, tokenHash: hash(token), enabled: true, mcpEnabled: true });
            if (!current) throw new Error('MCP access revoked');
            await Event.create({ kind: 'request', portalId: portal._id, endpointId: endpoint._id, action: 'mcp.call', status: 102 });
            const result = await executeGateway({ path: `/${api.namespace}/${endpoint.id}`, method: 'GET', query: {}, headers: { authorization: `Bearer ${token}` } });
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
          } catch {
            return { isError: true, content: [{ type: 'text', text: 'Approved project data is unavailable or access was revoked.' }] };
          }
        });
      }
    }
    transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { Promise.resolve(transport?.close()).catch(() => {}); Promise.resolve(server?.close()).catch(() => {}); });
    await server.connect(transport); await transport.handleRequest(req, res, req.body);
  } catch {
    await transport?.close().catch(() => {}); await server?.close().catch(() => {});
    if (!res.headersSent) res.status(500).json({ error: 'Managed MCP request failed' });
  }
});
router.all('/', (req, res) => res.status(405).json({ error: 'Use stateless MCP POST requests' }));
module.exports = router;
