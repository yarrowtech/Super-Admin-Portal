import Button from './Button';

const ErrorState = ({ title = 'Something went wrong', description, onRetry }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined">error</span>
      <div className="min-w-0">
        <h3 className="font-black">{title}</h3>
        {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
        {onRetry && (
          <Button variant="danger" size="sm" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  </div>
);

export default ErrorState;
