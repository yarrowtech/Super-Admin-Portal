'use strict';
// Disputes, refunds and non-compliance — the "money is contested" side of the portal.
//
// The central idea is the freeze: while a document is disputed, money must not move on it.
// That is enforced in two places and both matter. Here, a dispute writes `disputeId` onto
// its subject inside the creating transaction; and in operations.service.js, the payment
// allocation loop refuses any invoice carrying a `disputeId`. The check lives inside that
// transaction on purpose — a middleware-level check would race the write it guards.
const mongoose = require('mongoose');
const Dispute = require('../../models/finance/Dispute');
const Refund = require('../../models/finance/Refund');
const NonCompliance = require('../../models/finance/NonCompliance');
const Invoice = require('../../models/finance/Invoice');
const Payment = require('../../models/finance/Payment');
const Expense = require('../../models/finance/Expense');
const Note = require('../../models/finance/InvoiceNote');
const S = require('./operations.service');
const settings = require('./settings.service');
const money = require('./money');

const { fail, transaction, audit, openPeriod, journal, head, actor, text, id, date, positive } = S;

const SUBJECT_MODEL = { invoice: Invoice, payment: Payment, expense: Expense, vendor_bill: Invoice };

// Which document a dispute of this kind freezes, and the field on it that holds the lock.
const loadSubject = async (subjectType, subjectId, session) => {
  const Model = SUBJECT_MODEL[subjectType];
  if (!Model) fail(422, 'Unknown dispute subject type');
  const doc = await Model.findById(id(subjectId)).session(session);
  if (!doc) fail(404, 'Disputed record not found');
  return doc;
};

const docs = (input, max = 20) => {
  const rows = Array.isArray(input) ? input : [];
  if (rows.length > max) fail(422, `At most ${max} attachments`);
  return rows.map(d => {
    const url = text(d?.url, 500);
    if (!url) fail(422, 'Each attachment needs a url');
    return { label: text(d?.label, 200), url, sha256: text(d?.sha256, 64) };
  });
};

const entry = (req, from, to, action, comment, documents = []) => ({
  from, to, action, comment,
  actor: actor(req),
  actorRole: req.user?.role || '',
  documents,
  at: new Date(),
});

// ── Disputes ────────────────────────────────────────────────────────────────

// Raising a dispute freezes the subject. Requires a written reason and at least one
// supporting document (§F) — a freeze with no stated basis is not auditable.
async function createDispute(req) {
  return transaction(async session => {
    const b = req.body || {};
    const reason = text(b.reason, 2000);
    if (!reason) fail(422, 'A written justification is required to raise a dispute');
    const documents = docs(b.documents);
    if (!documents.length) fail(422, 'At least one supporting document is required');
    if (!['client', 'vendor', 'internal'].includes(b.raisedAgainst)) fail(422, 'raisedAgainst must be client, vendor or internal');
    if (!b.departmentId) fail(422, 'A department is required so the dispute appears in departmental reporting');

    const subject = await loadSubject(b.subjectType, b.subjectId, session);
    if (subject.disputeId) fail(409, 'This record is already under dispute');
    await openPeriod(subject.financialPeriodId, session);

    const amountDisputed = positive(b.amountDisputed);
    const disputeNumber = await settings.nextNumber('dispute', session);

    let created;
    try {
      [created] = await Dispute.create([{
        disputeNumber,
        subjectType: b.subjectType,
        subjectId: subject._id,
        raisedAgainst: b.raisedAgainst,
        client: b.client ? id(b.client) : subject.client || null,
        vendor: b.vendor ? id(b.vendor) : subject.vendor || null,
        status: 'open',
        amountDisputed: money.decimal(amountDisputed),
        reason,
        documents,
        departmentId: id(b.departmentId),
        projectId: b.projectId ? id(b.projectId) : subject.projectId || null,
        costCenterId: b.costCenterId ? id(b.costCenterId) : subject.costCenterId || null,
        timeline: [entry(req, '', 'open', 'raised', reason, documents)],
        raisedBy: actor(req),
      }], { session });
    } catch (e) {
      // The partial unique index is the real guard against two concurrent raisers.
      if (e.code === 11000) fail(409, 'This record is already under dispute');
      throw e;
    }

    // The freeze itself.
    subject.disputeId = created._id;
    await subject.save({ session });
    await audit(req, 'dispute_raised', created, null, created.toObject(), session);
    return created;
  });
}

async function reviewDispute(req) {
  return transaction(async session => {
    if (!head(req.user)) fail(403, 'Finance Head permission required');
    const d = await Dispute.findById(id(req.params.id)).session(session);
    if (!d) fail(404, 'Dispute not found');
    if (d.status !== 'open') fail(409, `A dispute can only be taken under review from open (currently ${d.status})`);
    const comment = text(req.body?.comment, 2000);
    if (!comment) fail(422, 'A comment is required when taking a dispute under review');
    const before = { status: d.status };
    d.status = 'under_review';
    d.reviewedBy = actor(req);
    d.timeline.push(entry(req, 'open', 'under_review', 'review', comment, docs(req.body?.documents)));
    await d.save({ session });
    await audit(req, 'dispute_review', d, before, { status: d.status }, session);
    return d;
  });
}

// Resolution is where a dispute has its financial effect. Three outcomes (§F):
//   released                 — nothing owed changes; the freeze simply lifts
//   written_off              — the receivable is given up, posted to bad debt
//   converted_to_debit_note  — the contested amount becomes a debit note
async function resolveDispute(req) {
  return transaction(async session => {
    if (!head(req.user)) fail(403, 'Finance Head permission required');
    const d = await Dispute.findById(id(req.params.id)).session(session);
    if (!d) fail(404, 'Dispute not found');
    if (!['open', 'under_review'].includes(d.status)) fail(409, `A ${d.status} dispute cannot be resolved again`);
    const resolution = req.body?.resolution;
    if (!['released', 'written_off', 'converted_to_debit_note'].includes(resolution)) {
      fail(422, 'resolution must be released, written_off or converted_to_debit_note');
    }
    const comment = text(req.body?.comment, 2000);
    if (!comment) fail(422, 'A written resolution note is required');
    const documents = docs(req.body?.documents);

    const subject = await loadSubject(d.subjectType, d.subjectId, session);
    await openPeriod(subject.financialPeriodId, session);
    const before = { status: d.status, resolution: d.resolution };
    const amount = money.minor(d.amountDisputed);
    const dimensions = {
      departmentId: d.departmentId,
      projectId: d.projectId,
      client: d.client,
      vendor: d.vendor,
      costCenterId: d.costCenterId,
    };

    if (resolution === 'written_off') {
      // Give up the receivable: the cost lands in bad debt, the asset is removed.
      const je = await journal(req, `dispute-writeoff-${d._id}`, [
        ['5800', amount, 0],
        ['1100', 0, amount],
      ], session, new Date(), `Dispute ${d.disputeNumber} written off`, dimensions);
      d.writeOffJournalId = je._id;
      if (d.subjectType === 'invoice') {
        subject.balanceDue = money.decimal(BigInt(money.minor(subject.balanceDue)) - BigInt(amount));
        subject.status = 'void';
      }
    } else if (resolution === 'converted_to_debit_note') {
      if (d.subjectType !== 'invoice') fail(422, 'Only an invoice dispute can become a debit note');
      const reference = `DISPUTE-${d._id}`;
      const [noteDoc] = await Note.create([{
        invoice: subject._id,
        type: 'debit',
        amount: money.decimal(amount),
        reason: `Dispute ${d.disputeNumber}: ${comment}`.slice(0, 1000),
        reference,
        createdBy: actor(req),
      }], { session });
      d.debitNoteId = noteDoc._id;
      // A debit note increases what is owed; mirror it on the ledger.
      await journal(req, `dispute-debitnote-${d._id}`, [
        ['1100', amount, 0],
        ['4000', 0, amount],
      ], session, new Date(), `Debit note for dispute ${d.disputeNumber}`, dimensions);
      subject.total = money.decimal(BigInt(money.minor(subject.total)) + BigInt(amount));
      subject.balanceDue = money.decimal(BigInt(money.minor(subject.balanceDue)) + BigInt(amount));
    }

    d.status = 'resolved';
    d.resolution = resolution;
    d.resolvedBy = actor(req);
    d.resolvedAt = new Date();
    d.timeline.push(entry(req, before.status, 'resolved', resolution, comment, documents));
    await d.save({ session });

    // Lift the freeze in every case — the dispute is over.
    subject.disputeId = null;
    await subject.save({ session });
    await audit(req, 'dispute_resolved', d, before, { status: d.status, resolution }, session);
    return d;
  });
}

// Withdrawing a dispute raised in error: unfreezes, posts nothing.
async function cancelDispute(req) {
  return transaction(async session => {
    if (!head(req.user)) fail(403, 'Finance Head permission required');
    const d = await Dispute.findById(id(req.params.id)).session(session);
    if (!d) fail(404, 'Dispute not found');
    if (!['open', 'under_review'].includes(d.status)) fail(409, `A ${d.status} dispute cannot be cancelled`);
    const comment = text(req.body?.comment, 2000);
    if (!comment) fail(422, 'A reason is required to cancel a dispute');
    const before = { status: d.status };
    d.status = 'cancelled';
    d.timeline.push(entry(req, before.status, 'cancelled', 'cancel', comment));
    await d.save({ session });
    const subject = await loadSubject(d.subjectType, d.subjectId, session);
    subject.disputeId = null;
    await subject.save({ session });
    await audit(req, 'dispute_cancelled', d, before, { status: d.status }, session);
    return d;
  });
}

// ── Refunds ─────────────────────────────────────────────────────────────────

// A refund traces to the receipt it reverses, not just to the invoice, so the amount can
// never exceed what was actually received and not yet returned.
async function createRefund(req) {
  return transaction(async session => {
    const b = req.body || {};
    const reason = text(b.reason, 2000);
    if (!reason) fail(422, 'A reason is required for a refund');
    const reference = text(b.reference || b.idempotencyKey, 120);
    if (!reference) fail(422, 'A unique refund reference is required');
    if (!['bank', 'cash', 'online', 'adjustment'].includes(b.method || 'bank')) fail(422, 'Invalid refund method');

    const payment = await Payment.findById(id(b.payment)).session(session);
    if (!payment) fail(404, 'Payment not found');
    if (payment.direction === 'out') fail(422, 'Only incoming receipts can be refunded');
    const invoice = await Invoice.findById(id(b.invoice)).session(session);
    if (!invoice) fail(404, 'Invoice not found');
    if (invoice.disputeId) fail(409, 'Invoice is under dispute; resolve the dispute before refunding');
    if (payment.disputeId) fail(409, 'Payment is under dispute; resolve the dispute before refunding');
    await openPeriod(invoice.financialPeriodId, session);
    await openPeriod(payment.financialPeriodId, session);

    const amount = positive(b.amount);
    const headroom = BigInt(money.minor(payment.amount)) - BigInt(money.minor(payment.refundedTotal || 0));
    if (BigInt(amount) > headroom) fail(409, 'Refund exceeds the unrefunded balance of this payment');

    const refundNumber = await settings.nextNumber('refund', session);
    let created;
    try {
      [created] = await Refund.create([{
        refundNumber,
        invoice: invoice._id,
        payment: payment._id,
        amount: money.decimal(amount),
        reason,
        method: b.method || 'bank',
        reference,
        status: 'draft',
        documents: docs(b.documents),
        departmentId: b.departmentId ? id(b.departmentId) : invoice.departmentId || null,
        projectId: b.projectId ? id(b.projectId) : invoice.projectId || null,
        costCenterId: b.costCenterId ? id(b.costCenterId) : invoice.costCenterId || null,
        requestedBy: actor(req),
      }], { session });
    } catch (e) {
      if (e.code === 11000) fail(409, 'A refund with this reference already exists for the payment');
      throw e;
    }
    await audit(req, 'refund_created', created, null, created.toObject(), session);
    return created;
  });
}

// Processing is the only step that moves money, and only the head may do it.
async function processRefund(req) {
  return transaction(async session => {
    if (!head(req.user)) fail(403, 'Finance Head permission required');
    const r = await Refund.findById(id(req.params.id)).session(session);
    if (!r) fail(404, 'Refund not found');
    if (r.status === 'processed') fail(409, 'Refund is already processed');
    if (r.status !== 'approved') fail(409, 'Refund must be approved before it is processed');

    const payment = await Payment.findById(r.payment).session(session);
    const invoice = await Invoice.findById(r.invoice).session(session);
    if (!payment || !invoice) fail(404, 'Refund is missing its payment or invoice');
    await openPeriod(invoice.financialPeriodId, session);

    const amount = money.minor(r.amount);
    // Re-check headroom at processing time: another refund may have been processed since.
    const headroom = BigInt(money.minor(payment.amount)) - BigInt(money.minor(payment.refundedTotal || 0));
    if (BigInt(amount) > headroom) fail(409, 'Refund exceeds the unrefunded balance of this payment');

    const before = { status: r.status };
    // Mirror of the receipt: cash leaves, the revenue recognised on it is reversed.
    const je = await journal(req, `refund-${r._id}`, [
      ['4000', amount, 0],
      ['1000', 0, amount],
    ], session, new Date(), `Refund ${r.refundNumber}`, {
      departmentId: r.departmentId, projectId: r.projectId, client: invoice.client, costCenterId: r.costCenterId,
    });

    payment.refundedTotal = money.decimal(BigInt(money.minor(payment.refundedTotal || 0)) + BigInt(amount));
    invoice.refundedTotal = money.decimal(BigInt(money.minor(invoice.refundedTotal || 0)) + BigInt(amount));
    await payment.save({ session });
    await invoice.save({ session });

    r.status = 'processed';
    r.journalEntryId = je._id;
    r.processedBy = actor(req);
    await r.save({ session });
    await audit(req, 'refund_processed', r, before, { status: r.status, journalEntryId: String(je._id) }, session);
    return r;
  });
}

// ── Non-compliance ──────────────────────────────────────────────────────────

async function createNonCompliance(req) {
  return transaction(async session => {
    const b = req.body || {};
    const description = text(b.description, 2000);
    if (!description) fail(422, 'A description is required');
    if (!['missed_deadline', 'budget_overrun', 'quality_deviation', 'scope_deviation', 'other'].includes(b.kind)) {
      fail(422, 'Invalid non-compliance kind');
    }
    if (!['low', 'medium', 'high', 'critical'].includes(b.severity || 'medium')) fail(422, 'Invalid severity');
    if (!['vendor', 'client', 'internal'].includes(b.party)) fail(422, 'party must be vendor, client or internal');
    if (!b.departmentId) fail(422, 'A department is required');

    const ticketNumber = await settings.nextNumber('nonCompliance', session);
    const [created] = await NonCompliance.create([{
      ticketNumber,
      kind: b.kind,
      severity: b.severity || 'medium',
      status: 'open',
      party: b.party,
      vendor: b.vendor ? id(b.vendor) : null,
      client: b.client ? id(b.client) : null,
      contractRef: text(b.contractRef, 200),
      subjectType: b.subjectType || 'project',
      subjectId: b.subjectId ? id(b.subjectId) : null,
      description,
      financialImpact: b.financialImpact ? money.decimal(money.minor(b.financialImpact)) : 0,
      documents: docs(b.documents),
      departmentId: id(b.departmentId),
      projectId: b.projectId ? id(b.projectId) : null,
      dueBy: b.dueBy ? date(b.dueBy) : null,
      timeline: [entry(req, '', 'open', 'raised', description)],
      raisedBy: actor(req),
    }], { session });
    await audit(req, 'non_compliance_raised', created, null, created.toObject(), session);
    return created;
  });
}

async function acknowledgeNonCompliance(req) {
  return transaction(async session => {
    const n = await NonCompliance.findById(id(req.params.id)).session(session);
    if (!n) fail(404, 'Non-compliance record not found');
    if (n.status !== 'open') fail(409, `Only an open record can be acknowledged (currently ${n.status})`);
    const comment = text(req.body?.comment, 2000);
    if (!comment) fail(422, 'A comment is required');
    const before = { status: n.status };
    n.status = 'acknowledged';
    n.acknowledgedBy = actor(req);
    n.timeline.push(entry(req, before.status, 'acknowledged', 'acknowledge', comment, docs(req.body?.documents)));
    await n.save({ session });
    await audit(req, 'non_compliance_acknowledged', n, before, { status: n.status }, session);
    return n;
  });
}

async function closeNonCompliance(req) {
  return transaction(async session => {
    if (!head(req.user)) fail(403, 'Finance Head permission required');
    const n = await NonCompliance.findById(id(req.params.id)).session(session);
    if (!n) fail(404, 'Non-compliance record not found');
    if (['remediated', 'waived'].includes(n.status)) fail(409, 'Record is already closed');
    const status = req.body?.status;
    if (!['remediated', 'waived'].includes(status)) fail(422, 'status must be remediated or waived');
    const comment = text(req.body?.comment, 2000);
    if (!comment) fail(422, 'A closing note is required');
    const before = { status: n.status };
    n.status = status;
    n.closedBy = actor(req);
    n.closedAt = new Date();
    n.timeline.push(entry(req, before.status, status, 'close', comment, docs(req.body?.documents)));
    await n.save({ session });
    await audit(req, 'non_compliance_closed', n, before, { status }, session);
    return n;
  });
}

// Escalating turns a breach into a money-freezing dispute on the related document.
async function escalateNonCompliance(req) {
  const n = await NonCompliance.findById(id(req.params.id)).lean();
  if (!n) fail(404, 'Non-compliance record not found');
  if (n.disputeId) fail(409, 'Already escalated to a dispute');
  if (!n.subjectId || !['invoice', 'expense'].includes(n.subjectType)) {
    fail(422, 'Only a record attached to an invoice or expense can be escalated to a dispute');
  }
  const dispute = await createDispute({
    ...req,
    body: {
      subjectType: n.subjectType,
      subjectId: n.subjectId,
      raisedAgainst: n.party,
      vendor: n.vendor,
      client: n.client,
      amountDisputed: n.financialImpact || req.body?.amountDisputed,
      reason: `Escalated from ${n.ticketNumber}: ${n.description}`.slice(0, 2000),
      documents: n.documents?.length ? n.documents : [{ url: `internal://non-compliance/${n._id}`, label: n.ticketNumber }],
      departmentId: n.departmentId,
      projectId: n.projectId,
    },
  });
  await NonCompliance.findByIdAndUpdate(n._id, {
    disputeId: dispute._id,
    $push: { timeline: entry(req, n.status, n.status, 'escalated', `Raised dispute ${dispute.disputeNumber}`) },
  });
  return dispute;
}

module.exports = {
  createDispute, reviewDispute, resolveDispute, cancelDispute,
  createRefund, processRefund,
  createNonCompliance, acknowledgeNonCompliance, closeNonCompliance, escalateNonCompliance,
};
