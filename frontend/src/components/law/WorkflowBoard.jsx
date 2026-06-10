import React, { useMemo, useState } from 'react';

const WORKFLOWS = {
  agreements: [
    { key: 'agreement-created', label: 'Agreement Created', statuses: ['Draft'] },
    { key: 'admin-approval', label: 'Admin Approval', statuses: ['Pending', 'In Review'] },
    { key: 'active', label: 'Active', statuses: ['Active', 'Ready'] },
    { key: 'renewal-expiry', label: 'Renewal/Expiry', statuses: ['Attention', 'Archived'] },
  ],
  'privacy-policy': [
    { key: 'policy-created', label: 'Policy Created', statuses: ['Draft'] },
    { key: 'review', label: 'Review', statuses: ['Pending', 'In Review'] },
    { key: 'approval', label: 'Approval', statuses: ['Active', 'Ready'] },
    { key: 'notification', label: 'User Notification', statuses: ['Attention', 'Archived'] },
  ],
  'disputes-fraud': [
    { key: 'fraud-detected', label: 'Fraud Detected', statuses: ['Draft', 'Attention'] },
    { key: 'alert-raised', label: 'Alert Raised', statuses: ['Pending'] },
    { key: 'investigation', label: 'Investigation', statuses: ['In Review', 'Active'] },
    { key: 'resolution', label: 'Resolution', statuses: ['Ready', 'Archived'] },
  ],
  'ip-copyright': [
    { key: 'ip-filed', label: 'IP Filed', statuses: ['Draft'] },
    { key: 'verification', label: 'Verification', statuses: ['Pending', 'In Review'] },
    { key: 'approval', label: 'Approval', statuses: ['Active', 'Ready'] },
    { key: 'registered', label: 'Registered', statuses: ['Archived', 'Attention'] },
  ],
  'work-hire': [
    { key: 'contract-created', label: 'Contract Created', statuses: ['Draft', 'Pending'] },
    { key: 'payment', label: 'Payment', statuses: ['In Review'] },
    { key: 'work-start', label: 'Work Start', statuses: ['Active'] },
    { key: 'completion', label: 'Completion', statuses: ['Ready', 'Archived'] },
  ],
  'third-party': [
    { key: 'vendor-onboarded', label: 'Vendor Onboarded', statuses: ['Draft'] },
    { key: 'legal-review', label: 'Legal Review', statuses: ['Pending', 'In Review'] },
    { key: 'compliance-check', label: 'Compliance Check', statuses: ['Active', 'Attention'] },
    { key: 'approved', label: 'Approved', statuses: ['Ready', 'Archived'] },
  ],
};

const roleActions = (role, currentStep, steps) => {
  const lowerRole = String(role || '').toLowerCase();
  const isAdmin = lowerRole === 'admin' || lowerRole === 'super_admin';
  const isLegalHead = lowerRole === 'legal_head';
  const isLawyer = lowerRole === 'lawyer' || lowerRole === 'law';

  if (isAdmin) {
    return {
      nextStatus: steps[Math.min(currentStep + 1, steps.length - 1)].statuses[0],
      prevStatus: steps[Math.max(currentStep - 1, 0)].statuses[0],
      canNext: currentStep < steps.length - 1,
      canPrev: currentStep > 0,
      canReject: currentStep > 0,
    };
  }

  if (isLegalHead) {
    return {
      nextStatus: steps[Math.min(currentStep + 1, steps.length - 1)].statuses[0],
      prevStatus: steps[Math.max(currentStep - 1, 0)].statuses[0],
      canNext: currentStep < steps.length - 1,
      canPrev: currentStep > 0,
      canReject: true,
    };
  }

  if (isLawyer) {
    return {
      nextStatus: steps[Math.min(currentStep + 1, steps.length - 1)].statuses[0],
      prevStatus: null,
      canNext: currentStep < 1,
      canPrev: false,
      canReject: false,
    };
  }

  return { canNext: false, canPrev: false, canReject: false };
};

const WorkflowBoard = ({ moduleType, records = [], userRole, onUpdateStatus }) => {
  const steps = WORKFLOWS[moduleType] || [];
  const [activeRecordId, setActiveRecordId] = useState('');

  const activeRecord = useMemo(() => {
    if (!records.length) return null;
    if (activeRecordId) return records.find((row) => row._id === activeRecordId) || records[0];
    return records[0];
  }, [activeRecordId, records]);

  const currentIndex = useMemo(() => {
    if (!activeRecord || !steps.length) return -1;
    const status = String(activeRecord.status || '').trim().toLowerCase();
    const idx = steps.findIndex((step) => step.statuses.some((s) => s.toLowerCase() === status));
    return idx >= 0 ? idx : 0;
  }, [activeRecord, steps]);

  if (!steps.length) return null;

  const action = roleActions(userRole, currentIndex, steps);
  const progress = currentIndex >= 0 ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0;

  return (
    <section className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Workflow Visualization Board</h2>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
          Progress {progress}%
        </span>
      </div>

      {records.length > 0 && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Record</label>
          <select
            value={activeRecord?._id || ''}
            onChange={(event) => setActiveRecordId(event.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {records.map((row) => (
              <option key={row._id} value={row._id}>
                {row.title || row.referenceNumber || row._id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-[720px] items-center gap-2">
          {steps.map((step, idx) => {
            const isDone = currentIndex > idx;
            const isCurrent = currentIndex === idx;
            const nodeClass = isCurrent
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
              : isDone
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                : 'border-neutral-300 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';

            return (
              <React.Fragment key={step.key}>
                <div
                  title={`${step.label}${isCurrent ? ' (Current)' : isDone ? ' (Completed)' : ' (Pending)'}`}
                  className={`min-w-[160px] rounded-lg border px-3 py-3 text-center text-xs font-semibold transition-all duration-500 ${nodeClass}`}
                  style={{ transform: `translateY(${isCurrent ? '-2px' : '0px'})` }}
                >
                  {step.label}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-1 w-8 rounded ${currentIndex > idx ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {activeRecord && onUpdateStatus && (
        <div className="mt-4 flex flex-wrap gap-2">
          {action.canPrev && (
            <button
              type="button"
              onClick={() => onUpdateStatus(activeRecord._id, action.prevStatus)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Move Back
            </button>
          )}
          {action.canNext && (
            <button
              type="button"
              onClick={() => onUpdateStatus(activeRecord._id, action.nextStatus)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Move Next
            </button>
          )}
          {action.canReject && (
            <button
              type="button"
              onClick={() => onUpdateStatus(activeRecord._id, 'Archived')}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300"
            >
              Reject / Archive
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default WorkflowBoard;
