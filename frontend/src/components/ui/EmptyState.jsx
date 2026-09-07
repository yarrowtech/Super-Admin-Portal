import Button from './Button';

/**
 * `compact`: tighter min-height + smaller icon/type for use inside an
 * already-bordered container (e.g. a DataTable's empty row) so the empty
 * state doesn't stack a second heavy border/shadow on top of its parent's.
 */
const EmptyState = ({ icon = 'inbox', title = 'No data found', description, actionLabel, onAction, compact = false }) => (
  <div
    className={
      compact
        ? 'flex min-h-[180px] flex-col items-center justify-center px-6 py-8 text-center'
        : 'flex min-h-56 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900'
    }
  >
    <div className="mx-auto max-w-[420px]">
      <span className={`mx-auto flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 ${compact ? 'h-9 w-9' : 'h-11 w-11'}`}>
        <span className={`material-symbols-outlined text-neutral-400 dark:text-neutral-500 ${compact ? 'text-[18px]' : 'text-[22px]'}`}>{icon}</span>
      </span>
      <h3 className={`font-semibold text-neutral-900 dark:text-neutral-100 ${compact ? 'mt-2.5 text-sm' : 'mt-3 text-sm'}`}>{title}</h3>
      {description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      {actionLabel && onAction && (
        <Button size={compact ? 'sm' : 'md'} className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  </div>
);

export default EmptyState;
