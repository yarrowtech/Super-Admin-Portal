'use strict';
// Disputes, refunds, non-compliance and the justification feedback loop.
//
// Thin by design: every write delegates to services/finance/dispute.service.js, which owns
// the transactions and the state machines. Reads are scoped the same way the rest of the
// portal scopes them — a finance employee sees their own department, the head sees all.
const S = require('../../services/finance/operations.service');
const D = require('../../services/finance/dispute.service');
const Dispute = require('../../models/finance/Dispute');
const Refund = require('../../models/finance/Refund');
const NonCompliance = require('../../models/finance/NonCompliance');
const Justification = require('../../models/finance/Justification');
const Invoice = require('../../models/finance/Invoice');
const Payment = require('../../models/finance/Payment');
const Expense = require('../../models/finance/Expense');
const { scopeFor } = require('../../services/finance/departmentAccess');

const { handler, fail, id, head, actor, text, date, transaction, audit, money } = S;

const paging = q => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 25));
  return { page, limit };
};

// A finance employee's list is limited to their own department; the head sees everything.
// Mirrors the scoping already used by the review queue.
const scope = req => (head(req.user) ? {} : (req.user?.departmentId ? { departmentId: req.user.departmentId } : {}));

const listing = (Model, dateField, filters = []) => handler(async req => {
  const q = req.query || {};
  const { page, limit } = paging(q);
  const filter = { ...scope(req) };
  for (const key of ['status', ...filters]) if (q[key]) filter[key] = String(q[key]);
  for (const key of ['departmentId', 'projectId', 'vendor', 'client']) if (q[key]) filter[key] = id(q[key]);
  if (q.from || q.to) {
    filter[dateField] = {};
    if (q.from) filter[dateField].$gte = date(q.from);
    if (q.to) { const end = date(q.to); end.setUTCHours(23, 59, 59, 999); filter[dateField].$lte = end; }
  }
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ [dateField]: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);
  // Status counts drive the tab badges in the UI, and must use the same filter as the list
  // so the badge and the list can never disagree.
  const counts = Object.fromEntries((await Model.aggregate([
    { $match: filter }, { $group: { _id: '$status', n: { $sum: 1 } } },
  ])).map(r => [r._id, r.n]));
  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, counts };
});

// ── Disputes ────────────────────────────────────────────────────────────────

const SUBJECT_MODEL = { invoice: Invoice, payment: Payment, expense: Expense, vendor_bill: Invoice };

const getDisputes = listing(Dispute, 'createdAt', ['subjectType', 'raisedAgainst', 'resolution']);

const getDispute = handler(async req => {
  const dispute = await Dispute.findById(id(req.params.id)).lean();
  if (!dispute) fail(404, 'Dispute not found');
  const Model = SUBJECT_MODEL[dispute.subjectType];
  const subject = Model ? await Model.findById(dispute.subjectId).lean() : null;
  const justifications = await Justification.find({ subjectType: 'dispute', subjectId: dispute._id }).sort({ createdAt: -1 }).lean();
  return { dispute, subject, justifications };
});

// ── Refunds ─────────────────────────────────────────────────────────────────

const getRefunds = listing(Refund, 'createdAt', ['method']);

const getRefund = handler(async req => {
  const refund = await Refund.findById(id(req.params.id)).lean();
  if (!refund) fail(404, 'Refund not found');
  const [invoice, payment] = await Promise.all([
    Invoice.findById(refund.invoice).lean(),
    Payment.findById(refund.payment).lean(),
  ]);
  return { refund, invoice, payment };
});

// Maker-checker on refunds, reusing the portal's reviewSchema shape so the behaviour
// matches invoices and journals: the submitter cannot be the approver.
const submitRefund = handler(async req => transaction(async session => {
  const r = await Refund.findById(id(req.params.id)).session(session);
  if (!r) fail(404, 'Refund not found');
  if (r.status !== 'draft') fail(409, 'Only a draft refund can be submitted');
  const before = { status: r.status };
  r.status = 'submitted';
  r.review = {
    status: 'submitted',
    submittedBy: actor(req),
    submittedByName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
    submittedAt: new Date(),
  };
  await r.save({ session });
  await audit(req, 'refund_submitted', r, before, { status: r.status }, session);
  return r;
}));

const decideRefund = handler(async req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required');
  const r = await Refund.findById(id(req.params.id)).session(session);
  if (!r) fail(404, 'Refund not found');
  if (r.status !== 'submitted') fail(409, 'Refund is not awaiting a decision');
  if (String(r.review?.submittedBy) === String(actor(req))) fail(403, 'A refund cannot be approved by the person who submitted it');
  const decision = req.body?.decision;
  const note = text(req.body?.note, 1000);
  if (!['approve', 'return'].includes(decision)) fail(422, 'decision must be approve or return');
  if (decision === 'return' && !note) fail(422, 'A reason is required when returning a refund');
  const before = { status: r.status };
  r.status = decision === 'approve' ? 'approved' : 'rejected';
  if (decision === 'approve') r.approvedBy = actor(req);
  Object.assign(r.review, {
    status: decision === 'approve' ? 'approved' : 'returned',
    decidedBy: actor(req),
    decidedByName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
    decidedAt: new Date(),
    decisionNote: note,
  });
  await r.save({ session });
  await audit(req, 'refund_decision', r, before, { status: r.status, decision }, session);
  return r;
}));

// ── Non-compliance ──────────────────────────────────────────────────────────

const getNonCompliances = listing(NonCompliance, 'createdAt', ['kind', 'severity', 'party']);

const getNonCompliance = handler(async req => {
  const record = await NonCompliance.findById(id(req.params.id)).lean();
  if (!record) fail(404, 'Non-compliance record not found');
  const dispute = record.disputeId ? await Dispute.findById(record.disputeId).lean() : null;
  const justifications = await Justification.find({ subjectType: 'non_compliance', subjectId: record._id }).sort({ createdAt: -1 }).lean();
  return { record, dispute, justifications };
});

// ── Justifications ──────────────────────────────────────────────────────────

const SUBJECTS = ['expense', 'invoice', 'budget', 'dispute', 'non_compliance'];

const getJustifications = handler(async req => {
  const q = req.query || {};
  const filter = {};
  if (q.subjectType) {
    if (!SUBJECTS.includes(q.subjectType)) fail(422, 'Invalid subject type');
    filter.subjectType = q.subjectType;
  }
  if (q.subjectId) filter.subjectId = id(q.subjectId);
  if (q.outcome) filter.outcome = String(q.outcome);
  return Justification.find(filter).sort({ createdAt: -1 }).limit(200).lean();
});

// Finance asks "why was this cost incurred?" against a specific record.
const askJustification = handler(async req => transaction(async session => {
  const b = req.body || {};
  if (!SUBJECTS.includes(b.subjectType)) fail(422, 'Invalid subject type');
  const question = text(b.question, 1000);
  if (!question) fail(422, 'A question is required');
  const [created] = await Justification.create([{
    subjectType: b.subjectType,
    subjectId: id(b.subjectId),
    question,
    askedBy: actor(req),
    outcome: 'pending',
    departmentId: b.departmentId ? id(b.departmentId) : null,
    projectId: b.projectId ? id(b.projectId) : null,
  }], { session });
  await audit(req, 'justification_asked', created, null, created.toObject(), session);
  return created;
}), 201);

const LINK_KINDS = ['task', 'time_log', 'change_request', 'quote', 'contract'];

// The one route open to non-finance roles: a Project Manager or Department Head answers,
// with evidence. Access is checked against the record's own department/project so a
// stakeholder cannot answer for a department they have nothing to do with.
const respondJustification = handler(async req => transaction(async session => {
  const j = await Justification.findById(id(req.params.id)).session(session);
  if (!j) fail(404, 'Justification not found');
  if (j.outcome !== 'pending') fail(409, 'This justification has already been decided');
  const body = text(req.body?.body, 4000);
  if (!body) fail(422, 'A response is required');
  // scopeFor returns null for cross-department roles, a department id for a scoped role,
  // and undefined when the role owns no department at all — which must deny, not allow.
  const deptScope = await scopeFor(req.user, session);
  const allowed = deptScope === null
    || (deptScope !== undefined && j.departmentId && String(deptScope) === String(j.departmentId));
  if (!allowed) fail(403, 'You can only respond for your own department or project');
  const links = (Array.isArray(req.body?.links) ? req.body.links : []).slice(0, 50).map(l => {
    if (!LINK_KINDS.includes(l?.kind)) fail(422, `Evidence kind must be one of ${LINK_KINDS.join(', ')}`);
    return { kind: l.kind, refId: l.refId ? id(l.refId) : null, label: text(l.label, 200) };
  });
  j.responses.push({
    body,
    documents: (Array.isArray(req.body?.documents) ? req.body.documents : []).slice(0, 20).map(d => ({
      label: text(d?.label, 200), url: text(d?.url, 500), sha256: text(d?.sha256, 64),
    })).filter(d => d.url),
    links,
    respondedBy: actor(req),
    respondedByRole: req.user?.role || '',
    at: new Date(),
  });
  await j.save({ session });
  await audit(req, 'justification_answered', j, null, { responses: j.responses.length }, session);
  return j;
}));

const decideJustification = handler(async req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required');
  const j = await Justification.findById(id(req.params.id)).session(session);
  if (!j) fail(404, 'Justification not found');
  if (j.outcome !== 'pending') fail(409, 'This justification has already been decided');
  if (!j.responses.length) fail(409, 'Nothing to decide: no response has been given yet');
  const outcome = req.body?.outcome;
  if (!['accepted', 'rejected', 'escalated'].includes(outcome)) fail(422, 'outcome must be accepted, rejected or escalated');
  const note = text(req.body?.outcomeNote, 1000);
  if (outcome !== 'accepted' && !note) fail(422, 'A note is required when rejecting or escalating');
  const before = { outcome: j.outcome };
  j.outcome = outcome;
  j.outcomeNote = note;
  j.decidedBy = actor(req);
  j.decidedAt = new Date();
  await j.save({ session });
  await audit(req, 'justification_decided', j, before, { outcome, note }, session);
  return j;
}));

module.exports = {
  // disputes
  getDisputes, getDispute,
  createDispute: handler(D.createDispute, 201),
  reviewDispute: handler(D.reviewDispute),
  resolveDispute: handler(D.resolveDispute),
  cancelDispute: handler(D.cancelDispute),
  // refunds
  getRefunds, getRefund,
  createRefund: handler(D.createRefund, 201),
  submitRefund, decideRefund,
  processRefund: handler(D.processRefund),
  // non-compliance
  getNonCompliances, getNonCompliance,
  createNonCompliance: handler(D.createNonCompliance, 201),
  acknowledgeNonCompliance: handler(D.acknowledgeNonCompliance),
  closeNonCompliance: handler(D.closeNonCompliance),
  escalateNonCompliance: handler(D.escalateNonCompliance, 201),
  // justifications
  getJustifications, askJustification, respondJustification, decideJustification,
};
