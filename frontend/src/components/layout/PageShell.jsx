import { cn } from '../../lib/cn';
import ThemeToggleButton from '../common/ThemeToggleButton';

const PageShell = ({ title, subtitle, actions, children, className }) => (
  <main className={cn('portal-page', className)}>
    <div className="portal-page-inner">
      {(title || subtitle) && (
        <header className="mb-4 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:flex-row lg:items-center lg:justify-between lg:p-5">
          <div className="min-w-0">
            {title && <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <ThemeToggleButton />
          </div>
        </header>
      )}
      {children}
    </div>
  </main>
);

export default PageShell;
