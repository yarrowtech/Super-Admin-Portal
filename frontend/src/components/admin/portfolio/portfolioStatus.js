// Shared status/priority metadata for the Digital Portfolio hierarchy
// (Category Workspace + Asset Detail pages). Pure data/logic only — the
// StatusPill/PriorityPill display components live in ./PortfolioStatusPills
// so this file can stay component-free (keeps Vite fast-refresh happy and
// lets non-component code be imported without pulling in JSX).
//
// ASSET_STATUS_TRANSITIONS below is the UI's default-workflow hint only — the
// backend (backend/modules/portfolio/portfolioWorkflow.js) is the source of
// truth and re-validates every transition against the asset's category
// workflow regardless of what this map says (spec §20).

export const ASSET_STATUS_LABELS = {
  backlog: 'Backlog',
  draft: 'Draft',
  in_progress: 'In Progress',
  in_review: 'In Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  measuring: 'Measuring',
  blocked: 'Blocked',
  archived: 'Archived',
};

export const ASSET_STATUS_OPTIONS = Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export const ASSET_STATUS_TRANSITIONS = {
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

// The status a semantic action button ("Request Review" / "Approve" /
// "Publish") targets, and the label that button should show.
export const SEMANTIC_ACTIONS = [
  { targetStatus: 'in_review', label: 'Request Review', icon: 'rate_review' },
  { targetStatus: 'approved', label: 'Approve', icon: 'check_circle' },
  { targetStatus: 'published', label: 'Publish', icon: 'publish' },
];

export const ASSET_PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ASSET_PRIORITY_OPTIONS = Object.entries(ASSET_PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

// Status colors kept consistent with the rest of the app's convention (spec
// §23): neutral=draft/backlog, blue=in-progress, amber=review, green=approved/
// published, red=blocked, gray=archived.
export const STATUS_TONE = {
  backlog: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  draft: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  in_review: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  changes_requested: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  measuring: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-700',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  archived: 'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:ring-neutral-700',
};

export const PRIORITY_TONE = {
  low: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  medium: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  high: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
};

export const isOverdue = (asset) =>
  Boolean(asset?.dueDate) && new Date(asset.dueDate) < new Date() && !['published', 'measuring', 'archived'].includes(asset?.status);

// ---- Tasks (spec §9) ----
export const TASK_STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Done',
};
export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }));
export const TASK_BOARD_COLUMNS = ['todo', 'in_progress', 'blocked', 'review', 'done'];
export const TASK_STATUS_TONE = {
  todo: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  review: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
};

// ---- Health (spec §23) ----
export const HEALTH_LABELS = {
  healthy: 'Healthy',
  needs_attention: 'Needs Attention',
  at_risk: 'At Risk',
};
export const HEALTH_TONE = {
  healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  needs_attention: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  at_risk: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
};
export const HEALTH_DOT = {
  healthy: 'bg-emerald-500',
  needs_attention: 'bg-amber-500',
  at_risk: 'bg-rose-500',
};

// ---- Relations (spec §7 "Relations" tab) ----
export const RELATION_TYPE_LABELS = {
  related: 'Related',
  blocks: 'Blocks',
  blocked_by: 'Blocked by',
  derived_from: 'Derived from',
  part_of: 'Part of',
};
export const RELATION_TYPE_OPTIONS = Object.entries(RELATION_TYPE_LABELS).map(([value, label]) => ({ value, label }));

// ---- Workflow presets (mirrors backend/modules/portfolio/portfolioWorkflow.js) ----
export const WORKFLOW_PRESETS = [
  { key: 'content_publishing', label: 'Content Publishing', stages: ['backlog', 'draft', 'in_progress', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'measuring', 'blocked', 'archived'] },
  { key: 'internal_playbook', label: 'Internal Playbook', stages: ['backlog', 'draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived'] },
  { key: 'poc', label: 'Proof of Concept', stages: ['backlog', 'in_progress', 'in_review', 'changes_requested', 'approved', 'blocked', 'archived'] },
  { key: 'pr', label: 'PR / Press', stages: ['backlog', 'draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'measuring', 'archived'] },
  { key: 'custom', label: 'Custom (no gating)', stages: Object.keys(ASSET_STATUS_LABELS) },
];
export const WORKFLOW_PRESET_OPTIONS = WORKFLOW_PRESETS.map((w) => ({ value: w.key, label: w.label }));

// ---- Metrics (spec §13) ----
export const formatMetric = (value, unit) => {
  const n = Number(value) || 0;
  if (unit === 'percent') return `${n.toFixed(1)}%`;
  if (unit === 'currency') return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  if (unit === 'rating') return n.toFixed(1);
  if (unit === 'rank') return `#${Math.round(n)}`;
  return n.toLocaleString('en-IN', { maximumFractionDigits: n % 1 === 0 ? 0 : 1 });
};

// ---- Relative time (used across Overview / Activity / cards) ----
export const timeAgo = (value) => {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
};
