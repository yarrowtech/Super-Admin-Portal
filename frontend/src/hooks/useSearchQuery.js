import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

/**
 * Debounced search hook with TanStack Query caching.
 *
 * @param {object} options
 * @param {function} options.searchFn       - (term) => Promise<results> — called only when term.length >= minLength
 * @param {string|any[]} options.queryKey   - Base query key prefix; final key = [...baseKey, debouncedTerm]
 * @param {number} [options.debounce=300]   - Debounce delay in ms
 * @param {number} [options.minLength=2]    - Min characters before searching
 * @param {number} [options.staleTime=30000] - Cache stale time for search results (default 30s)
 * @param {any}    [options.initialData]    - Data to show before first search
 *
 * Usage:
 *   const { query, setQuery, results, isSearching } = useSearchQuery({
 *     searchFn: (term) => api.get(`/users/search?q=${term}`, token),
 *     queryKey: QK.users.root(),
 *   });
 */
export const useSearchQuery = ({
  searchFn,
  queryKey,
  debounce: debounceMs = 300,
  minLength = 2,
  staleTime = 30_000,
  initialData,
}) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);

  const baseKey = Array.isArray(queryKey) ? queryKey : [queryKey];
  const isEnabled = debouncedQuery.trim().length >= minLength;

  const result = useQuery({
    queryKey: [...baseKey, 'search', debouncedQuery.trim()],
    queryFn: () => searchFn(debouncedQuery.trim()),
    enabled: isEnabled,
    staleTime,
    gcTime: 2 * 60_000,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  return {
    query,
    setQuery,
    results: isEnabled ? (result.data ?? initialData ?? []) : (initialData ?? []),
    isSearching: result.isFetching,
    isLoading: result.isLoading && isEnabled,
    error: result.error,
    debouncedQuery,
    isEmpty: isEnabled && !result.isFetching && !result.data?.length,
  };
};
