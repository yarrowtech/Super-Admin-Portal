import EmptyState from './EmptyState';
import Skeleton from './Skeleton';

const DataTable = ({ columns = [], rows = [], rowKey = 'id', loading = false, emptyTitle, onRowClick }) => {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle || 'No records found'} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-black">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60' : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
