'use strict';
/**
 * Bulk operations on CRM clients.
 *
 * Three rules, because a bulk write is the easiest way to quietly wreck a CRM:
 *
 * 1. Only an explicit id list is accepted. There is deliberately no "apply to
 *    everything matching this filter" mode — a stale filter on the client plus a
 *    filter-based bulk write is how an operator reassigns four thousand records
 *    they could not see.
 *
 * 2. Every operation is bounded and validated before anything is written. An
 *    unknown stage or a non-existent user fails the whole call rather than
 *    being written to some rows and rejected on others.
 *
 * 3. A stage change writes history. Bulk is not an excuse to skip the audit
 *    trail that a single-record update produces, so each moved client gets its
 *    statusHistory entry and its timeline note exactly as it would one at a time.
 */
const mongoose = require('mongoose');

const CRMClient = require('../models/crm/CRMClient');
const CRMStatus = require('../models/crm/CRMStatus');
const CRMCommunication = require('../models/crm/CRMCommunication');

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

// One call's blast radius. Large enough for a real day's work, small enough that
// a mistake stays recoverable.
const MAX_BULK_IDS = Number(process.env.CRM_BULK_MAX_IDS || 500);

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const DEPARTMENTS = ['media', 'marketing', 'both'];

/** Validates the id list once, for every operation. */
function parseIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    fail(422, 'Select at least one client.');
  }
  if (ids.length > MAX_BULK_IDS) {
    fail(422, `Too many clients selected (${ids.length}). The limit is ${MAX_BULK_IDS} per action.`);
  }
  const valid = [...new Set(ids.filter((id) => mongoose.isValidObjectId(id)))];
  if (valid.length === 0) fail(422, 'No valid client ids were supplied.');
  return valid;
}

/**
 * Move many clients to one pipeline stage.
 *
 * Done per-document rather than with a single updateMany: each client needs its
 * own statusHistory entry recording what it moved *from*, which one bulk update
 * expression cannot express.
 */
async function bulkStatus({ ids, status, reason, actorId }) {
  const objectIds = parseIds(ids);
  if (!status || typeof status !== 'string') fail(422, 'Choose a stage to move these clients to.');

  // The stage must exist. Writing a free-text status in bulk would strand every
  // one of these clients outside the pipeline board at once.
  const known = await CRMStatus.exists({ name: status, isActive: true });
  if (!known) fail(422, `"${status}" is not a configured pipeline stage.`);

  const clients = await CRMClient.find({ _id: { $in: objectIds }, isActive: true })
    .select('_id name status department')
    .lean();
  if (!clients.length) fail(404, 'None of those clients could be found.');

  // Clients already on the target stage are left alone: rewriting them would add
  // a meaningless "Won → Won" history entry to every one.
  const toMove = clients.filter((c) => c.status !== status);

  const ops = toMove.map((c) => ({
    updateOne: {
      filter: { _id: c._id },
      update: {
        $set: { status },
        $push: {
          statusHistory: {
            fromStatus: c.status,
            toStatus: status,
            changedBy: actorId || null,
            reason: reason || 'Bulk stage change',
            changedAt: new Date(),
          },
        },
      },
    },
  }));

  if (ops.length) await CRMClient.bulkWrite(ops);

  // Mirror onto each timeline, matching what a single-record update does.
  // Failures here are non-fatal: the stage move itself is already committed and
  // losing a timeline note must not report the whole action as failed.
  if (toMove.length) {
    await CRMCommunication.insertMany(
      toMove.map((c) => ({
        client: c._id,
        department: c.department === 'both' ? 'media' : c.department,
        type: 'status_change',
        direction: 'internal',
        isInternal: true,
        subject: `Status: ${c.status || '—'} → ${status}`,
        body: reason || 'Bulk stage change',
        createdBy: actorId || null,
      })),
      { ordered: false },
    ).catch(() => {});
  }

  return {
    matched: clients.length,
    modified: toMove.length,
    unchanged: clients.length - toMove.length,
    status,
  };
}

/** Assign (or clear) the relationship owner on many clients. */
async function bulkOwner({ ids, owner }) {
  const objectIds = parseIds(ids);

  // An empty owner is "unassign", which is a legitimate action — distinguish it
  // from a malformed id rather than treating both as the same input.
  let ownerId = null;
  if (owner) {
    if (!mongoose.isValidObjectId(owner)) fail(422, 'That owner is not a valid user.');
    const User = mongoose.model('User');
    const exists = await User.exists({ _id: owner });
    if (!exists) fail(404, 'That user no longer exists.');
    ownerId = owner;
  }

  const res = await CRMClient.updateMany(
    { _id: { $in: objectIds }, isActive: true },
    { $set: { owner: ownerId } },
  );

  return { matched: res.matchedCount ?? 0, modified: res.modifiedCount ?? 0, owner: ownerId };
}

/** Set priority on many clients. */
async function bulkPriority({ ids, priority }) {
  const objectIds = parseIds(ids);
  if (!PRIORITIES.includes(priority)) fail(422, 'Unknown priority.');

  const res = await CRMClient.updateMany(
    { _id: { $in: objectIds }, isActive: true },
    { $set: { priority } },
  );
  return { matched: res.matchedCount ?? 0, modified: res.modifiedCount ?? 0, priority };
}

/** Move many clients into a project (or detach them with a null project). */
async function bulkProject({ ids, projectId }) {
  const objectIds = parseIds(ids);

  let project = null;
  if (projectId) {
    if (!mongoose.isValidObjectId(projectId)) fail(422, 'That project is not valid.');
    const Project = mongoose.model('Project');
    const exists = await Project.exists({ _id: projectId });
    if (!exists) fail(404, 'That project no longer exists.');
    project = projectId;
  }

  const res = await CRMClient.updateMany(
    { _id: { $in: objectIds }, isActive: true },
    { $set: { project } },
  );
  return { matched: res.matchedCount ?? 0, modified: res.modifiedCount ?? 0, projectId: project };
}

/** Set department on many clients. */
async function bulkDepartment({ ids, department }) {
  const objectIds = parseIds(ids);
  if (!DEPARTMENTS.includes(department)) fail(422, 'Unknown department.');

  const res = await CRMClient.updateMany(
    { _id: { $in: objectIds }, isActive: true },
    { $set: { department } },
  );
  return { matched: res.matchedCount ?? 0, modified: res.modifiedCount ?? 0, department };
}

/**
 * Deactivate many clients.
 *
 * A soft delete, exactly as the single-record route does: the records are
 * archived and recoverable, never erased. Nothing in the CRM hard-deletes a
 * client except an import revert, which only removes rows that import created.
 */
async function bulkDeactivate({ ids }) {
  const objectIds = parseIds(ids);
  const res = await CRMClient.updateMany(
    { _id: { $in: objectIds }, isActive: true },
    { $set: { isActive: false } },
  );
  return { matched: res.matchedCount ?? 0, modified: res.modifiedCount ?? 0 };
}

module.exports = {
  bulkStatus,
  bulkOwner,
  bulkPriority,
  bulkProject,
  bulkDepartment,
  bulkDeactivate,
  // exported for tests
  parseIds,
  MAX_BULK_IDS,
};
