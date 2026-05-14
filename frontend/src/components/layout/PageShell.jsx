import { cn } from '../../lib/cn';

const PageShell = ({ title, subtitle, actions, children, className }) => (
  <main className={cn('min-h-screen flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800', className)}>
    <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
      {(title || subtitle || actions) && (
        <header className="mb-4 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:flex-row lg:items-center lg:justify-between lg:p-5">
          <div className="min-w-0">
            {title && <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </div>
  </main>
);

export default PageShell;
