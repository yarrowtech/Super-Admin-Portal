import {
  ASSET_STATUS_LABELS, ASSET_PRIORITY_LABELS, STATUS_TONE, PRIORITY_TONE,
  TASK_STATUS_LABELS, TASK_STATUS_TONE, HEALTH_LABELS, HEALTH_TONE, HEALTH_DOT,
} from './portfolioStatus';

export const StatusPill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_TONE[value] || STATUS_TONE.backlog}`}>
    {ASSET_STATUS_LABELS[value] || value || 'Unknown'}
  </span>
);

export const PriorityPill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PRIORITY_TONE[value] || PRIORITY_TONE.medium}`}>
    {ASSET_PRIORITY_LABELS[value] || value || 'Medium'}
  </span>
);

export const TaskStatusPill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TASK_STATUS_TONE[value] || TASK_STATUS_TONE.todo}`}>
    {TASK_STATUS_LABELS[value] || value}
  </span>
);

export const HealthPill = ({ value }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${HEALTH_TONE[value] || HEALTH_TONE.healthy}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_DOT[value] || HEALTH_DOT.healthy}`} />
    {HEALTH_LABELS[value] || 'Healthy'}
  </span>
);
