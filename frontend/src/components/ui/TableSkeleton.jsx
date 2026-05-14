import Skeleton from './Skeleton';

const TableSkeleton = ({ columns = 5, rows = 5 }) => (
  <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/60">
    <table className="w-full min-w-[720px]">
      <thead className="border-b border-neutral-200 dark:border-neutral-800">
        <tr>
          {Array.from({ length: columns }).map((_, index) => (
            <th key={index} className="px-4 py-3">
              <Skeleton className="h-3 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-b border-neutral-100 last:border-b-0 dark:border-neutral-800">
            {Array.from({ length: columns }).map((__, colIndex) => (
              <td key={colIndex} className="px-4 py-4">
                <Skeleton className={`h-4 ${colIndex === 0 ? 'w-36' : 'w-24'}`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TableSkeleton;
