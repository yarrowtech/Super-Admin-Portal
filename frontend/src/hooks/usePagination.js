import { useMemo, useState } from 'react';

export const usePagination = ({ initialPage = 1, initialLimit = 10, total = 0 } = {}) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const controls = useMemo(
    () => ({
      page,
      limit,
      total,
      totalPages,
      canPrevious: page > 1,
      canNext: page < totalPages,
      nextPage: () => setPage((value) => Math.min(value + 1, totalPages)),
      previousPage: () => setPage((value) => Math.max(value - 1, 1)),
      goToPage: (value) => setPage(Math.min(Math.max(Number(value) || 1, 1), totalPages)),
      setLimit: (value) => {
        setLimit(Number(value) || initialLimit);
        setPage(1);
      },
    }),
    [page, limit, total, totalPages, initialLimit]
  );

  return controls;
};
