import { cn } from '../../lib/cn';

export const Card = ({ className, children, ...props }) => (
  <section className={cn('rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900', className)} {...props}>
    {children}
  </section>
);

export const CardHeader = ({ className, children, ...props }) => (
  <div className={cn('border-b border-neutral-200 p-4 dark:border-neutral-800 lg:p-5', className)} {...props}>
    {children}
  </div>
);

export const CardBody = ({ className, children, ...props }) => (
  <div className={cn('p-4 lg:p-5', className)} {...props}>
    {children}
  </div>
);
