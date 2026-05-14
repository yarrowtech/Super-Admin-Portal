import { cn } from '../../lib/cn';

const Input = ({ label, error, helperText, className, id, ...props }) => {
  const inputId = id || props.name;

  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</span>}
      <input
        id={inputId}
        className={cn(
          'min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
          className
        )}
        {...props}
      />
      {(error || helperText) && <span className={cn('mt-1 block text-xs', error ? 'text-red-600' : 'text-neutral-500 dark:text-neutral-400')}>{error || helperText}</span>}
    </label>
  );
};

export default Input;
