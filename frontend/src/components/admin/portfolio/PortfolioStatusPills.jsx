import { ASSET_STATUS_LABELS, ASSET_PRIORITY_LABELS, STATUS_TONE, PRIORITY_TONE } from './portfolioStatus';

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
