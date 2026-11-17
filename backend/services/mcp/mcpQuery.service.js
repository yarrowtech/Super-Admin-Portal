const { getDatasets, stripRedacted } = require('./mcpDatasets');

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const MAX_AGGREGATE_BUCKETS = 500;

class McpQueryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'McpQueryError';
  }
}

const resolveDataset = (logger, key) => {
  const dataset = getDatasets(logger).get(key);
  if (!dataset) {
    const available = Array.from(getDatasets(logger).keys()).join(', ');
    throw new McpQueryError(`Unknown dataset "${key}". Available datasets: ${available}`);
  }
  return dataset;
};

const clampLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
};

/**
 * Mongo operators a caller may use in a filter. Anything that can execute
 * server-side code or traverse outside the collection is excluded.
 */
const ALLOWED_OPERATORS = new Set([
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
  '$exists', '$regex', '$options', '$and', '$or', '$not', '$nor', '$size', '$all', '$type', '$mod',
]);

const BLOCKED_OPERATORS = new Set(['$where', '$function', '$accumulator', '$expr', '$lookup', '$out', '$merge', '$graphLookup']);

/**
 * Recursively validates a caller-supplied filter. Rejects $where/$function
 * style operators outright rather than relying on mongo-sanitize, because this
 * input is a deliberate JSON object rather than a stray query-string key.
 */
const sanitizeFilter = (filter, depth = 0) => {
  if (filter == null) return {};
  if (depth > 6) throw new McpQueryError('Filter nested too deeply (max 6 levels).');
  if (typeof filter !== 'object' || Array.isArray(filter)) {
    throw new McpQueryError('Filter must be a JSON object.');
  }

  const out = {};
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('$')) {
      if (BLOCKED_OPERATORS.has(key)) throw new McpQueryError(`Operator "${key}" is not permitted.`);
      if (!ALLOWED_OPERATORS.has(key)) throw new McpQueryError(`Operator "${key}" is not supported.`);
    }
    if (Array.isArray(value)) {
      out[key] = value.map((item) => (item && typeof item === 'object' && !Array.isArray(item) ? sanitizeFilter(item, depth + 1) : item));
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      out[key] = sanitizeFilter(value, depth + 1);
    } else {
      out[key] = value;
    }
  }
  return out;
};

const parseSort = (sort) => {
  if (!sort) return { createdAt: -1 };
  if (typeof sort === 'object' && !Array.isArray(sort)) return sort;
  if (typeof sort === 'string') {
    const trimmed = sort.trim();
    if (!trimmed) return { createdAt: -1 };
    return trimmed.startsWith('-') ? { [trimmed.slice(1)]: -1 } : { [trimmed]: 1 };
  }
  return { createdAt: -1 };
};

const buildProjection = (fields) => {
  if (!Array.isArray(fields) || !fields.length) return null;
  return fields
    .filter((f) => typeof f === 'string' && f.trim() && !f.startsWith('$'))
    .map((f) => f.trim())
    .join(' ');
};

// ---------------------------------------------------------------------------

const listDatasets = (logger, { domain } = {}) => {
  const all = Array.from(getDatasets(logger).values());
  const filtered = domain ? all.filter((d) => d.domain === domain) : all;
  return filtered.map((d) => ({
    dataset: d.key,
    domain: d.domain,
    description: d.description,
  }));
};

const describeDataset = (logger, { dataset }) => {
  const entry = resolveDataset(logger, dataset);
  const paths = entry.modelRef.schema?.paths || {};
  const fields = Object.entries(paths)
    .filter(([name]) => !entry.redact.includes(name))
    .map(([name, path]) => ({
      field: name,
      type: path.instance || path.constructor?.name || 'Mixed',
      ref: path.options?.ref || undefined,
      required: Boolean(path.options?.required) || undefined,
      enum: path.options?.enum || undefined,
    }));

  return {
    dataset: entry.key,
    domain: entry.domain,
    description: entry.description,
    collection: entry.modelRef.collection?.collectionName,
    redactedFields: entry.redact,
    fields,
  };
};

const queryDataset = async (logger, { dataset, filter, fields, sort, limit, skip }) => {
  const entry = resolveDataset(logger, dataset);
  const safeFilter = sanitizeFilter(filter);
  const cappedLimit = clampLimit(limit);
  const offset = Math.max(0, Number(skip) || 0);

  let q = entry.modelRef
    .find(safeFilter)
    .sort(parseSort(sort))
    .skip(offset)
    .limit(cappedLimit)
    .lean({ virtuals: false });

  const projection = buildProjection(fields);
  if (projection) q = q.select(projection);

  const [rows, total] = await Promise.all([
    q.exec(),
    entry.modelRef.countDocuments(safeFilter),
  ]);

  return {
    dataset: entry.key,
    total,
    returned: rows.length,
    skip: offset,
    limit: cappedLimit,
    hasMore: offset + rows.length < total,
    rows: stripRedacted(rows, entry.redact),
  };
};

const countDataset = async (logger, { dataset, filter }) => {
  const entry = resolveDataset(logger, dataset);
  const safeFilter = sanitizeFilter(filter);
  const total = await entry.modelRef.countDocuments(safeFilter);
  return { dataset: entry.key, total };
};

/**
 * Grouped aggregation with a fixed, safe pipeline shape. The caller controls
 * the match, the group key and the metric, but never the pipeline itself.
 */
const aggregateDataset = async (logger, { dataset, filter, groupBy, metric = 'count', metricField, sort = 'desc', limit }) => {
  const entry = resolveDataset(logger, dataset);
  const safeFilter = sanitizeFilter(filter);

  if (!groupBy || typeof groupBy !== 'string' || groupBy.startsWith('$')) {
    throw new McpQueryError('groupBy must be a plain field name.');
  }
  if (entry.redact.includes(groupBy)) {
    throw new McpQueryError(`Field "${groupBy}" is not available.`);
  }

  const metricOps = { count: null, sum: '$sum', avg: '$avg', min: '$min', max: '$max' };
  if (!(metric in metricOps)) {
    throw new McpQueryError(`metric must be one of: ${Object.keys(metricOps).join(', ')}`);
  }
  if (metric !== 'count') {
    if (!metricField || typeof metricField !== 'string' || metricField.startsWith('$')) {
      throw new McpQueryError(`metric "${metric}" requires a plain metricField name.`);
    }
    if (entry.redact.includes(metricField)) {
      throw new McpQueryError(`Field "${metricField}" is not available.`);
    }
  }

  const valueExpr = metric === 'count'
    ? { $sum: 1 }
    : { [metricOps[metric]]: `$${metricField}` };

  const bucketLimit = Math.min(clampLimit(limit), MAX_AGGREGATE_BUCKETS);

  const pipeline = [
    { $match: safeFilter },
    { $group: { _id: `$${groupBy}`, value: valueExpr, count: { $sum: 1 } } },
    { $sort: { value: sort === 'asc' ? 1 : -1 } },
    { $limit: bucketLimit },
  ];

  const results = await entry.modelRef.aggregate(pipeline).allowDiskUse(false).exec();

  return {
    dataset: entry.key,
    groupBy,
    metric,
    metricField: metric === 'count' ? undefined : metricField,
    buckets: results.map((r) => ({ key: r._id, value: r.value, count: r.count })),
  };
};

module.exports = {
  listDatasets,
  describeDataset,
  queryDataset,
  countDataset,
  aggregateDataset,
  McpQueryError,
  MAX_LIMIT,
};
