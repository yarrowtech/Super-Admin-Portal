import { cn } from '../../lib/cn';

const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800/60', className)} />;

export default Skeleton;
