import { cn } from '../../lib/cn';

const Skeleton = ({ className }) => <div className={cn('skeleton-shimmer rounded-lg', className)} />;

export default Skeleton;
