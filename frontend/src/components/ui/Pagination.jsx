import Button from './Button';

const Pagination = ({ page = 1, totalPages = 1, total = 0, onPageChange }) => (
  <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-neutral-500 dark:text-neutral-400">
      Page <span className="font-bold text-neutral-900 dark:text-neutral-100">{page}</span> of{' '}
      <span className="font-bold text-neutral-900 dark:text-neutral-100">{totalPages}</span>
      {total ? ` - ${total} records` : ''}
    </p>
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
        Previous
      </Button>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
        Next
      </Button>
    </div>
  </div>
);

export default Pagination;
