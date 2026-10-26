import { cn } from '../../lib/cn';

/**
 * `prefix` / `suffix` accept a Material Symbol name string (e.g. "search")
 * or any ReactNode (e.g. a currency span). They render inside the input border
 * at the left / right edge and shift the input's padding to avoid overlap.
 */
const Input = ({ label, error, helperText, className, id, prefix, suffix, ...props }) => {
  const inputId = id || props.name;
  const hasPrefix = Boolean(prefix);
  const hasSuffix = Boolean(suffix);

  const inputEl = (
    <input
      id={inputId}
      className={cn(
        'min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100',
        error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
        hasPrefix && 'pl-9',
        hasSuffix && 'pr-9',
        className,
      )}
      {...props}
    />
  );

  const iconClass = 'pointer-events-none absolute top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500';

  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</span>}
      {(hasPrefix || hasSuffix) ? (
        <div className="relative">
          {hasPrefix && (
            <span className={cn(iconClass, 'left-2.5')}>
              {typeof prefix === 'string'
                ? <span className="material-symbols-outlined text-[18px] leading-none">{prefix}</span>
                : prefix}
            </span>
          )}
          {inputEl}
          {hasSuffix && (
            <span className={cn(iconClass, 'right-2.5')}>
              {typeof suffix === 'string'
                ? <span className="material-symbols-outlined text-[18px] leading-none">{suffix}</span>
                : suffix}
            </span>
          )}
        </div>
      ) : inputEl}
      {(error || helperText) && (
        <span className={cn('mt-1 block text-xs', error ? 'text-red-600' : 'text-neutral-500 dark:text-neutral-400')}>
          {error || helperText}
        </span>
      )}
    </label>
  );
};

export default Input;
