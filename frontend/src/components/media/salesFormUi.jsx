import React from 'react';

export const INP = 'block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--portal-accent)]/40 dark:border-neutral-800 dark:bg-neutral-950';
export const INP_ERROR = 'border-rose-400 focus:ring-2 focus:ring-rose-300/50 dark:border-rose-500';

export const FieldError = ({ message }) => (!message ? null : (
  <p className="text-[11px] font-semibold text-rose-500">{message}</p>
));

export const Field = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{label}</label>
    <div className="relative">
      {icon && (
        <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">
          {icon}
        </span>
      )}
      {React.cloneElement(children, { className: `${children.props.className || ''} ${icon ? 'pl-9' : ''}` })}
    </div>
  </div>
);

export const OptionPill = ({ active, color, onClick, children, wide }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${wide ? 'flex-1 text-center' : ''} ${
      active
        ? 'border-transparent text-white shadow-sm'
        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300'
    }`}
    style={active ? { backgroundColor: color } : {}}
  >
    {children}
  </button>
);

export const SectionCard = ({ section, children, right }) => (
  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <div className="h-[3px] w-full" style={{ backgroundColor: section.color }} />
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${section.color}1a`, color: section.color }}
          >
            <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
          </span>
          <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100">{section.label}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  </div>
);

export const DraftBadge = ({ visible, savedAt, relativeSavedLabel, onDiscard }) => {
  if (!visible || !savedAt) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
      <span className="material-symbols-outlined text-[14px]">cloud_done</span>
      {relativeSavedLabel(savedAt)}
      <button type="button" onClick={onDiscard} className="font-bold text-rose-500 hover:underline">
        Discard draft
      </button>
    </div>
  );
};

export const SubmitBar = ({ children, hint }) => (
  <div className="sticky bottom-3 z-10 mt-6 flex flex-col items-stretch gap-2 rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/90 sm:flex-row sm:items-center sm:justify-between">
    {hint && <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{hint}</p>}
    <div className="flex justify-end">{children}</div>
  </div>
);
