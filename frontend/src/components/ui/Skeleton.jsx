import { cn } from '../../lib/cn';

const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800', className)} />;

export default Skeleton;
