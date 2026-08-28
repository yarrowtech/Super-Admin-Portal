// Shared status/priority metadata for the Digital Portfolio hierarchy
// (Category Workspace + Asset Detail pages). Pure data/logic only — the
// StatusPill/PriorityPill display components live in ./PortfolioStatusPills
// so this file can stay component-free (keeps Vite fast-refresh happy and
// lets non-component code be imported without pulling in JSX).
//
// ASSET_STATUS_TRANSITIONS mirrors backend/modules/portfolio/
// portfolioHierarchy.service.js's ASSET_STATUS_TRANSITIONS (the backend
// re-validates regardless — this only narrows the UI's offered choices).

export const ASSET_STATUS_LABELS = {
  backlog: 'Backlog',
  draft: 'Draft',
  in_progress: 'In Progress',
  in_review: 'In Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

export const ASSET_STATUS_OPTIONS = Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export const ASSET_STATUS_TRANSITIONS = {
  backlog: ['draft', 'archived'],
  draft: ['backlog', 'in_progress', 'archived'],
  in_progress: ['draft', 'in_review', 'archived'],
  in_review: ['in_progress', 'changes_requested', 'approved', 'archived'],
  changes_requested: ['in_progress', 'archived'],
  approved: ['in_review', 'scheduled', 'published', 'archived'],
  scheduled: ['approved', 'published', 'archived'],
  published: ['archived'],
  archived: ['draft'],
};

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
  archived: 'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:ring-neutral-700',
};

export const PRIORITY_TONE = {
  low: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  medium: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  high: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
};

export const isOverdue = (asset) =>
  Boolean(asset?.dueDate) && new Date(asset.dueDate) < new Date() && !['published', 'archived'].includes(asset?.status);
