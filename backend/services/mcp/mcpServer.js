const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const queryService = require('./mcpQuery.service');
const { listDatasets } = queryService;

const SERVER_NAME = 'super-admin-portal';
const SERVER_VERSION = '1.0.0';

const ok = (payload) => ({
  content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
});

const fail = (err) => ({
  isError: true,
  content: [{ type: 'text', text: `Error: ${err?.message || 'Unknown error'}` }],
});

/**
 * Wraps a handler so a thrown error becomes an MCP error result rather than a
 * transport-level failure, and so every call is logged against the key.
 */
const wrap = (logger, keyContext, toolName, handler) => async (args) => {
  const startedAt = Date.now();
  try {
    const result = await handler(args || {});
    logger?.info?.({
      mcpTool: toolName,
      mcpKeyId: keyContext?.keyId,
      mcpKeyLabel: keyContext?.label,
      durationMs: Date.now() - startedAt,
      ok: true,
    }, 'MCP tool call');
    return ok(result);
  } catch (err) {
    logger?.warn?.({
      mcpTool: toolName,
      mcpKeyId: keyContext?.keyId,
      durationMs: Date.now() - startedAt,
      err: err.message,
    }, 'MCP tool call failed');
    return fail(err);
  }
};

// Every tool is annotated read-only so a connecting client can filter on it.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/**
 * Builds a fresh McpServer for one request. The SDK's Streamable HTTP
 * transport in stateless mode expects a per-request server instance.
 */
const buildMcpServer = ({ logger, keyContext }) => {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions: [
        'Read-only analytics access to the Yarrowtech Super Admin Portal.',
        'Start with list_datasets to discover what exists, then describe_dataset',
        'to learn a dataset\'s fields before calling query_dataset or aggregate_dataset.',
        'Prefer aggregate_dataset for totals and breakdowns instead of pulling raw rows.',
        'Results are capped; use skip/limit to page.',
      ].join(' '),
    }
  );

  const scopes = keyContext?.scopes || [];
  const inScope = (domain) => !scopes.length || scopes.includes(domain);

  const visibleDatasets = () => listDatasets(logger).filter((d) => inScope(d.domain));

  const assertScope = (datasetKey) => {
    const match = listDatasets(logger).find((d) => d.dataset === datasetKey);
    if (match && !inScope(match.domain)) {
      throw new queryService.McpQueryError(`Dataset "${datasetKey}" is outside this key's scope.`);
    }
  };

  server.registerTool(
    'list_datasets',
    {
      title: 'List datasets',
      description: 'List every readable dataset with its domain and description. Call this first to discover what data is available.',
      inputSchema: { domain: z.string().optional().describe('Optional domain filter: crm, delivery, people, finance, outsourcing, portfolio, operations.') },
      annotations: READ_ONLY,
    },
    wrap(logger, keyContext, 'list_datasets', async ({ domain }) => {
      const rows = visibleDatasets().filter((d) => !domain || d.domain === domain);
      return { count: rows.length, datasets: rows };
    })
  );

  server.registerTool(
    'describe_dataset',
    {
      title: 'Describe dataset',
      description: 'Return the field names, types and references for one dataset. Use this before building a filter so field names are correct.',
      inputSchema: { dataset: z.string().describe('Dataset key from list_datasets, e.g. "crm_clients".') },
      annotations: READ_ONLY,
    },
    wrap(logger, keyContext, 'describe_dataset', async ({ dataset }) => {
      assertScope(dataset);
      return queryService.describeDataset(logger, { dataset });
    })
  );

  server.registerTool(
    'query_dataset',
    {
      title: 'Query dataset',
      description: 'Fetch documents from a dataset with an optional MongoDB-style filter. Returns at most 200 rows per call; page with skip.',
      inputSchema: {
        dataset: z.string().describe('Dataset key from list_datasets.'),
        filter: z.record(z.any()).optional().describe('MongoDB-style filter object, e.g. {"status":"ACTIVE"}. Supports $gt,$gte,$lt,$lte,$in,$nin,$ne,$regex,$exists,$and,$or.'),
        fields: z.array(z.string()).optional().describe('Field names to return. Omit for all non-redacted fields.'),
        sort: z.string().optional().describe('Field to sort by; prefix with "-" for descending. Default "-createdAt".'),
        // Not bounded in the schema: an over-large request is silently clamped
        // to MAX_LIMIT rather than rejected, so an agent asking for "everything"
        // still gets its first page instead of a validation error.
        limit: z.number().int().positive().optional().describe('Rows to return. Values above 200 are capped at 200. Default 50.'),
        skip: z.number().int().min(0).optional().describe('Rows to skip, for paging.'),
      },
      annotations: READ_ONLY,
    },
    wrap(logger, keyContext, 'query_dataset', async (args) => {
      assertScope(args.dataset);
      return queryService.queryDataset(logger, args);
    })
  );

  server.registerTool(
    'count_dataset',
    {
      title: 'Count dataset',
      description: 'Return only the number of documents matching a filter. Much cheaper than query_dataset when you just need a total.',
      inputSchema: {
        dataset: z.string().describe('Dataset key from list_datasets.'),
        filter: z.record(z.any()).optional().describe('MongoDB-style filter object.'),
      },
      annotations: READ_ONLY,
    },
    wrap(logger, keyContext, 'count_dataset', async (args) => {
      assertScope(args.dataset);
      return queryService.countDataset(logger, args);
    })
  );

  server.registerTool(
    'aggregate_dataset',
    {
      title: 'Aggregate dataset',
      description: 'Group a dataset by one field and compute count/sum/avg/min/max. Use this for breakdowns and totals rather than fetching raw rows.',
      inputSchema: {
        dataset: z.string().describe('Dataset key from list_datasets.'),
        filter: z.record(z.any()).optional().describe('MongoDB-style filter applied before grouping.'),
        groupBy: z.string().describe('Field name to group by, e.g. "status".'),
        metric: z.enum(['count', 'sum', 'avg', 'min', 'max']).optional().describe('Aggregation to compute. Default "count".'),
        metricField: z.string().optional().describe('Numeric field to aggregate. Required for sum/avg/min/max.'),
        sort: z.enum(['asc', 'desc']).optional().describe('Sort direction on the computed value. Default "desc".'),
        limit: z.number().int().positive().optional().describe('Maximum buckets to return.'),
      },
      annotations: READ_ONLY,
    },
    wrap(logger, keyContext, 'aggregate_dataset', async (args) => {
      assertScope(args.dataset);
      return queryService.aggregateDataset(logger, args);
    })
  );

  return server;
};

module.exports = { buildMcpServer, SERVER_NAME, SERVER_VERSION };
