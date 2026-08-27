/**
 * Real status enum from backend/models/common/Task.js — do not add a
 * "blocked" column or any other status the schema doesn't define.
 */
export const TASK_STATUSES = [
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export const TASK_STATUS_KEYS = TASK_STATUSES.map((s) => s.key);

export const statusLabel = (key) => TASK_STATUSES.find((s) => s.key === key)?.label || key;

export const TASK_PRIORITIES = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'critical', label: 'Critical' },
];

export const priorityToTone = (priority) => {
  switch (String(priority || '').toLowerCase()) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'low': return 'neutral';
    default: return 'info';
  }
};

/**
 * The Task schema has no ordering/position field, so within a column cards
 * are sorted by a deterministic real field (soonest due date first, then
 * priority) rather than pretending drag-reorder-within-column is persisted.
 */
const PRIORITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 };

export const sortTasksDeterministically = (tasks = []) =>
  [...tasks].sort((a, b) => {
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    const aPriority = PRIORITY_WEIGHT[a.priority] ?? 4;
    const bPriority = PRIORITY_WEIGHT[b.priority] ?? 4;
    return aPriority - bPriority;
  });
