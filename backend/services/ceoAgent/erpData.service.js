const CRMClient = require('../../models/crm/CRMClient');
const Invoice = require('../../models/finance/Invoice');

/**
 * Maps this portal's models onto the field names CEO Agent's spec asks for.
 *
 * The portal is a business-operations system, not a commerce ERP, so the
 * mapping is:
 *   customers -> CRM clients
 *   orders    -> finance invoices
 *   products  -> no equivalent exists (see erpProducts.js)
 */

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

const parsePaging = ({ page, pageSize }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const requested = Number(pageSize) || DEFAULT_PAGE_SIZE;
  const safeSize = Math.min(Math.max(1, requested), MAX_PAGE_SIZE);
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize };
};

/** Rejects an unparseable date rather than silently returning the full table. */
const parseSince = (value, label) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const err = new Error(`Invalid ${label} value: expected an ISO8601 date.`);
    err.statusCode = 400;
    throw err;
  }
  return parsed;
};

const envelope = ({ rows, total, page, pageSize }) => ({
  data: rows,
  pagination: {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasMore: page * pageSize < total,
  },
});

// --- 2a. Customers ---------------------------------------------------------

const mapCustomer = (doc) => ({
  id: String(doc._id),
  name: doc.name || '',
  company: doc.name || '',
  email: doc.email || '',
  phone: doc.phone || '',
  // Extra context CEO Agent can use for targeting.
  contactPerson: doc.contactPerson || '',
  website: doc.website || '',
  status: doc.status || '',
  segment: doc.department || '',
  tags: [doc.source, doc.priority, doc.marketingChannel].filter(Boolean),
  owner: doc.owner ? String(doc.owner) : null,
  lastContactedAt: doc.lastContactedAt || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const listCustomers = async ({ updatedSince, page, pageSize } = {}) => {
  const paging = parsePaging({ page, pageSize });
  const since = parseSince(updatedSince, 'updated_since');

  const filter = {};
  if (since) filter.updatedAt = { $gte: since };

  const [rows, total] = await Promise.all([
    CRMClient.find(filter)
      .sort({ updatedAt: 1, _id: 1 })
      .skip(paging.skip)
      .limit(paging.pageSize)
      .lean(),
    CRMClient.countDocuments(filter),
  ]);

  return envelope({ rows: rows.map(mapCustomer), total, ...paging });
};

// --- 2b. Orders ------------------------------------------------------------

/** Invoice status -> the placed/paid/cancelled/refunded vocabulary in the spec. */
const ORDER_STATUS = {
  draft: 'placed',
  sent: 'placed',
  paid: 'paid',
  overdue: 'placed',
  void: 'cancelled',
};

const mapOrder = (doc) => ({
  id: String(doc._id),
  reference: doc.invoiceNumber || '',
  customerId: doc.client ? String(doc.client) : null,
  // Denormalised on the invoice, so CEO Agent can label an order without a
  // second lookup — and still has a name when `client` was never linked.
  customerName: doc.clientName || '',
  amount: typeof doc.total === 'number' ? doc.total : 0,
  currency: doc.currency || 'INR',
  status: ORDER_STATUS[doc.status] || doc.status || 'placed',
  // Preserved so CEO Agent can distinguish overdue from merely unpaid, which
  // the four-value spec vocabulary cannot express.
  sourceStatus: doc.status || '',
  createdAt: doc.issueDate || doc.createdAt,
  dueDate: doc.dueDate || null,
  // Invoice lines are free-text descriptions with a rate — there is no product
  // catalogue behind them, so `productId` is always null here by design.
  items: Array.isArray(doc.items)
    ? doc.items.map((item) => ({
      productId: null,
      name: item.description || '',
      qty: Number(item.quantity ?? 0),
      price: Number(item.rate ?? 0),
      amount: Number(item.amount ?? 0),
    }))
    : [],
  updatedAt: doc.updatedAt,
});

const listOrders = async ({ since, page, pageSize } = {}) => {
  const paging = parsePaging({ page, pageSize });
  const from = parseSince(since, 'since');

  const filter = {};
  if (from) filter.updatedAt = { $gte: from };

  const [rows, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ updatedAt: 1, _id: 1 })
      .skip(paging.skip)
      .limit(paging.pageSize)
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return envelope({ rows: rows.map(mapOrder), total, ...paging });
};

module.exports = {
  listCustomers,
  listOrders,
  mapCustomer,
  mapOrder,
  parsePaging,
  parseSince,
  MAX_PAGE_SIZE,
};
