import Skeleton from './Skeleton';

const CardSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-8 w-28" />
        <Skeleton className="mt-3 h-3 w-32" />
      </div>
    ))}
  </div>
);

export default CardSkeleton;
