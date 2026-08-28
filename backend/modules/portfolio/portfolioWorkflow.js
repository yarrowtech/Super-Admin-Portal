// Named workflow presets for the Digital Portfolio hierarchy.
//
// The Foundation phase hardcoded a single transition map inside
// portfolioHierarchy.service.js. This module generalises that: a category picks
// a preset by `workflowKey`, and the API derives the allowed next-statuses for
// an asset from its category's preset. There is intentionally NO workflow-builder
// UI — presets are code, edited here, which is enough for "the backend validates
// transitions and the API returns the allowed set".
//
// Every preset is a plain adjacency map { status: [allowedNextStatuses] }. A
// status that is a key with `[]` is a valid terminal state. A status missing
// from a preset entirely is simply unreachable in that workflow.

const ALL_STATUSES = [
  'backlog',
  'draft',
  'in_progress',
  'in_review',
  'changes_requested',
  'approved',
  'scheduled',
  'published',
  'measuring',
  'blocked',
  'archived',
];

// The full editorial pipeline — the default for content categories (Blogs, PR…).
const CONTENT_PUBLISHING = {
  backlog: ['draft', 'archived'],
  draft: ['backlog', 'in_progress', 'archived'],
  in_progress: ['draft', 'in_review', 'blocked', 'archived'],
  in_review: ['in_progress', 'changes_requested', 'approved', 'blocked', 'archived'],
  changes_requested: ['in_progress', 'archived'],
  approved: ['in_review', 'scheduled', 'published', 'archived'],
  scheduled: ['approved', 'published', 'archived'],
  published: ['measuring', 'archived'],
  measuring: ['published', 'archived'],
  blocked: ['in_progress', 'in_review', 'archived'],
  archived: ['draft'],
};

// Lightweight internal docs / playbooks — no scheduling or measurement stage.
const INTERNAL_PLAYBOOK = {
  backlog: ['draft', 'archived'],
  draft: ['in_review', 'archived'],
  in_review: ['draft', 'changes_requested', 'approved', 'archived'],
  changes_requested: ['draft', 'archived'],
  approved: ['published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft'],
};

// Proof-of-concept / experiments — reach a decision, then park or promote.
const POC = {
  backlog: ['in_progress', 'archived'],
  in_progress: ['in_review', 'blocked', 'archived'],
  in_review: ['in_progress', 'approved', 'changes_requested', 'archived'],
  changes_requested: ['in_progress', 'archived'],
  approved: ['archived'],
  blocked: ['in_progress', 'archived'],
  archived: ['in_progress'],
};

// PR / press — approvals then a scheduled release and coverage measurement.
const PR = {
  backlog: ['draft', 'archived'],
  draft: ['in_review', 'archived'],
  in_review: ['draft', 'changes_requested', 'approved', 'archived'],
  changes_requested: ['draft', 'archived'],
  approved: ['scheduled', 'published', 'archived'],
  scheduled: ['approved', 'published', 'archived'],
  published: ['measuring', 'archived'],
  measuring: ['archived'],
  archived: ['draft'],
};

// Permissive — any status to any other (except that leaving `archived` only goes
// back to `draft`, to keep restore behaviour predictable). For teams that want
// the labels without enforced gating.
const CUSTOM = ALL_STATUSES.reduce((map, status) => {
  map[status] = status === 'archived' ? ['draft'] : ALL_STATUSES.filter((s) => s !== status);
  return map;
}, {});

const WORKFLOWS = {
  content_publishing: { key: 'content_publishing', label: 'Content Publishing', transitions: CONTENT_PUBLISHING },
  internal_playbook: { key: 'internal_playbook', label: 'Internal Playbook', transitions: INTERNAL_PLAYBOOK },
  poc: { key: 'poc', label: 'Proof of Concept', transitions: POC },
  pr: { key: 'pr', label: 'PR / Press', transitions: PR },
  custom: { key: 'custom', label: 'Custom (no gating)', transitions: CUSTOM },
};

const DEFAULT_WORKFLOW_KEY = 'content_publishing';

const WORKFLOW_KEYS = Object.keys(WORKFLOWS);

const getWorkflow = (workflowKey) => WORKFLOWS[workflowKey] || WORKFLOWS[DEFAULT_WORKFLOW_KEY];

// Ordered stage list for a preset (used by the Settings tab to show the pipeline).
const workflowStages = (workflowKey) => {
  const { transitions } = getWorkflow(workflowKey);
  const ordered = ALL_STATUSES.filter((s) => s in transitions);
  return ordered;
};

const allowedTransitions = (workflowKey, currentStatus) => {
  const { transitions } = getWorkflow(workflowKey);
  return transitions[currentStatus] || [];
};

const canTransition = (workflowKey, currentStatus, nextStatus) =>
  allowedTransitions(workflowKey, currentStatus).includes(nextStatus);

// Maps a transition target to the extra semantic audit action it represents,
// on top of the generic STATUS_CHANGED event.
const SEMANTIC_STATUS_ACTION = {
  in_review: 'APPROVAL_REQUESTED',
  changes_requested: 'CHANGES_REQUESTED',
  approved: 'APPROVED',
  published: 'PUBLISHED',
  measuring: 'MEASURING_STARTED',
};

module.exports = {
  ALL_STATUSES,
  WORKFLOWS,
  WORKFLOW_KEYS,
  DEFAULT_WORKFLOW_KEY,
  getWorkflow,
  workflowStages,
  allowedTransitions,
  canTransition,
  SEMANTIC_STATUS_ACTION,
};
