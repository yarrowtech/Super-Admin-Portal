export const LAW_DOCUMENT_TYPES = [
  { value: 'Contract', label: 'Contract', code: 'CONTRACT' },
  { value: 'Agreement', label: 'Agreement', code: 'AGREEMENT' },
  { value: 'Policy', label: 'Policy', code: 'POLICY' },
  { value: 'NDA', label: 'NDA', code: 'NDA' },
  { value: 'Compliance', label: 'Compliance', code: 'COMPLIANCE' },
  { value: 'IP', label: 'IP', code: 'IP' },
  { value: 'Dispute', label: 'Dispute', code: 'DISPUTE' },
  { value: 'Other', label: 'Other', code: 'OTHER' },
];

export const LAW_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const LAW_STATUS = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending',
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  VALIDATED: 'validated',
  REJECTED: 'Rejected',
  OVERDUE: 'Overdue',
  EXPIRING: 'Expiring',
};

export const CONTRACT_LAW_STATUS_META = {
  pending: { label: 'Pending Review', tone: 'warning' },
  validated: { label: 'Validated', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const DOCUMENT_STATUS_META = {
  Draft: { label: 'Draft', tone: 'neutral', icon: 'edit_document' },
  Pending: { label: 'Pending Approval', tone: 'warning', icon: 'hourglass_top' },
  Approved: { label: 'Approved', tone: 'success', icon: 'verified' },
  Rejected: { label: 'Rejected', tone: 'danger', icon: 'cancel' },
};

export const getContractLawStatusLabel = (status) =>
  CONTRACT_LAW_STATUS_META[String(status || '').toLowerCase()]?.label || status || 'Pending Review';

export const getDocumentTypeLabel = (value) =>
  LAW_DOCUMENT_TYPES.find((item) => item.value === value || item.code === value)?.label || 'Other';
