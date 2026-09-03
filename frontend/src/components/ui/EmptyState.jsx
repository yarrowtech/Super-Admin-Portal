import Button from './Button';

const EmptyState = ({ icon = 'inbox', title = 'No data found', description, actionLabel, onAction }) => (
  <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
      <span className="material-symbols-outlined text-[22px] text-neutral-400 dark:text-neutral-500">{icon}</span>
    </span>
    <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
    {description && <p className="mt-1 max-w-md text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
    {actionLabel && onAction && (
      <Button className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
