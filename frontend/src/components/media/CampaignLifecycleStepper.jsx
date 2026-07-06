import React from 'react';

const STAGES = [
  'draft',
  'objective-defined',
  'platform-selected',
  'budget-allocated',
  'team-assigned',
  'content-in-progress',
  'in-approval',
  'scheduled',
  'live',
  'tracking',
  'closed',
];

const label = (stage) =>
  stage
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const CampaignLifecycleStepper = ({ status, onAdvance, busy }) => {
  const currentIndex = STAGES.indexOf(status);
  const nextStage = currentIndex >= 0 && currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1] : null;
  const isClosed = status === 'closed';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((stage, index) => {
          const done = index < currentIndex || (index === currentIndex && isClosed);
          const active = index === currentIndex && !isClosed;
          return (
            <React.Fragment key={stage}>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : done
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500'
                }`}
              >
                {label(stage)}
              </span>
              {index < STAGES.length - 1 ? <span className="text-neutral-300 dark:text-neutral-600">→</span> : null}
            </React.Fragment>
          );
        })}
      </div>
      {!isClosed ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {nextStage ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdvance?.(nextStage)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Advance to {label(nextStage)}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance?.('closed')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
          >
            Close Campaign
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default CampaignLifecycleStepper;
