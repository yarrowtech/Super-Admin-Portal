import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePagination } from './usePagination';

/**
 * Paginated data fetching hook with TanStack Query's keepPreviousData.
 *
 * @param {object} options
 * @param {function} options.queryKeyFn   - ({ page, limit, filters }) => queryKey array
 * @param {function} options.queryFn      - ({ page, limit, filters }) => Promise<{ data, total }>
 * @param {object}  [options.filters={}]  - Active filter values; resets page to 1 on change
 * @param {number}  [options.initialPage=1]
 * @param {number}  [options.initialLimit=10]
 * @param {number}  [options.staleTime]
 *
 * Usage:
 *   const { data, pagination, isFetching, isPlaceholderData } = usePaginatedQuery({
 *     queryKeyFn: ({ page, limit, filters }) => QK.users.list({ page, limit, ...filters }),
 *     queryFn: ({ page, limit, filters }) => api.get(`/users?page=${page}&limit=${limit}`),
 *     filters: { role: selectedRole, search: debouncedSearch },
 *   });
 */
export const usePaginatedQuery = ({
  queryKeyFn,
  queryFn,
  filters = {},
  initialPage = 1,
  initialLimit = 10,
  staleTime,
}) => {
  const [total, setTotal] = useState(0);

  const pagination = usePagination({ initialPage, initialLimit, total });

  // Reset to page 1 when filters change
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    pagination.goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const queryParams = { page: pagination.page, limit: pagination.limit, filters };
  const queryKey = queryKeyFn(queryParams);

  const result = useQuery({
    queryKey,
    queryFn: () => queryFn(queryParams),
    placeholderData: keepPreviousData,
    staleTime,
    gcTime: 10 * 60_000,
  });

  // Sync total from response
  useEffect(() => {
    const serverTotal =
      result.data?.total ??
      result.data?.pagination?.total ??
      result.data?.count ??
      (Array.isArray(result.data) ? result.data.length : undefined);
    if (typeof serverTotal === 'number') {
      setTotal(serverTotal);
    }
  }, [result.data]);

  const rows =
    result.data?.data ??
    result.data?.items ??
    result.data?.results ??
    (Array.isArray(result.data) ? result.data : []);

  return {
    data: rows,
    rawData: result.data,
    pagination: { ...pagination, total },
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    isPlaceholderData: result.isPlaceholderData,
  };
};
