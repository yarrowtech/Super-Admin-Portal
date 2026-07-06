import React from 'react';

const toneFor = (status) => {
  if (status === 'approved') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (status === 'rejected') return 'border-rose-300 bg-rose-50 text-rose-700';
  return 'border-amber-300 bg-amber-50 text-amber-700';
};

const roleLabel = (role = '') =>
  String(role)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const ApprovalHistoryTimeline = ({ steps = [] }) => {
  if (!steps.length) {
    return <p className="text-xs text-neutral-500">No approval history yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {steps.map((step, index) => (
        <li key={`${step.role}-${index}`} className="flex items-start gap-2.5">
          <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${toneFor(step.status)}`}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-900">
              {roleLabel(step.role)}
              {step.optional ? <span className="ml-1.5 text-[10px] font-normal uppercase text-neutral-400">optional</span> : null}
            </p>
            <p className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${toneFor(step.status)}`}>
              {step.status}
            </p>
            {step.remarks ? <p className="mt-1 text-xs text-neutral-500">{step.remarks}</p> : null}
            {step.decidedAt ? (
              <p className="mt-0.5 text-[10.5px] text-neutral-400">{new Date(step.decidedAt).toLocaleString()}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default ApprovalHistoryTimeline;
