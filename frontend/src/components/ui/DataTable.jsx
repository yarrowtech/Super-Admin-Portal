import { useEffect, useState } from 'react';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';
import DropdownMenu from './DropdownMenu';

/**
 * Generic table. New optional props (all default off, so existing callers are unaffected):
 * - selectable: adds a checkbox column + "select all" header; onSelectionChange(keys[]) fires on change.
 * - rowActions(row): if provided, returns DropdownMenu `items` rendered as a trailing kebab-menu cell.
 */
const DataTable = ({
  columns = [],
  rows = [],
  rowKey = 'id',
  loading = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
  selectable = false,
  onSelectionChange,
  rowActions,
}) => {
  const [selected, setSelected] = useState([]);

  // Selection resets whenever the underlying row set changes (new filters/section)
  // so stale ids from a previous list never leak into a bulk action. Adjusted during
  // render (React's recommended pattern) rather than in an effect, to avoid an extra
  // render pass.
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    if (selected.length) setSelected([]);
  }

  useEffect(() => {
    onSelectionChange?.(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

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
    return <EmptyState title={emptyTitle || 'No records found'} description={emptyDescription} actionLabel={emptyAction?.label} onAction={emptyAction?.onClick} />;
  }

  const getRowKey = (row) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey]);
  const allSelected = selectable && rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allSelected ? [] : rows.map(getRowKey));
  const toggleRow = (key) => setSelected((prev) => (prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]));

  return (
    <div className="app-table-wrap">
      <table className="app-table">
        <thead>
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                  className="h-4 w-4 rounded border-neutral-300 accent-(--portal-accent,var(--color-primary))"
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3">
                {column.header ?? column.label}
              </th>
            ))}
            {rowActions && <th className="w-10 px-4 py-3" aria-label="Actions" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row) => {
            const key = getRowKey(row);
            const isSelected = selected.includes(key);
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={`h-14 ${onRowClick ? 'cursor-pointer' : ''} transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${isSelected ? 'bg-(--portal-accent-soft,var(--color-primary-50))' : ''}`}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(key)}
                      aria-label="Select row"
                      className="h-4 w-4 rounded border-neutral-300 accent-(--portal-accent,var(--color-primary))"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu items={rowActions(row)} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
