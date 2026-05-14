import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { outsourcingApi } from '../../../services/outsourcing';
import { outsourcingKeys } from '../config/queryKeys';
import { useDebouncedValue } from './useDebouncedValue';
import { useInfiniteScroll } from './useInfiniteScroll';

const PAGE_SIZE = 10;

export const useOutsourcingJobsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query);

  const jobsQuery = useQuery({
    queryKey: outsourcingKeys.jobs(),
    queryFn: () => outsourcingApi.getJobs(token),
    enabled: Boolean(token),
  });

  const contractsQuery = useQuery({
    queryKey: outsourcingKeys.contracts(),
    queryFn: () => outsourcingApi.getContracts(token),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const invalidateJobs = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: outsourcingKeys.jobs() }),
      queryClient.invalidateQueries({ queryKey: outsourcingKeys.contracts() }),
      queryClient.invalidateQueries({ queryKey: outsourcingKeys.timeLogs() }),
      queryClient.invalidateQueries({ queryKey: outsourcingKeys.dashboard('admin') }),
    ]);
  };

  const acceptMutation = useMutation({
    mutationFn: (jobId) => outsourcingApi.acceptJob(token, jobId),
    onSuccess: invalidateJobs,
  });

  const statusMutation = useMutation({
    mutationFn: ({ jobId, status }) => outsourcingApi.updateJobStatus(token, jobId, status),
    onSuccess: invalidateJobs,
  });

  const rows = jobsQuery.data?.data || [];
  const contracts = contractsQuery.data?.data || [];

  const activeContractJobIds = useMemo(
    () =>
      new Set(
        contracts
          .filter((contract) => contract?.status === 'active')
          .map((contract) => String(contract?.job?._id || contract?.job || ''))
          .filter(Boolean)
      ),
    [contracts]
  );

  const filteredRows = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => `${row.title} ${row.description || ''}`.toLowerCase().includes(normalized));
  }, [debouncedQuery, rows]);

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((row) => row.status === 'pending').length,
    active: rows.filter((row) => row.status === 'in_progress' || row.status === 'accepted').length,
    contracted: rows.filter((row) => activeContractJobIds.has(String(row?._id))).length,
  }), [activeContractJobIds, rows]);

  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const hasMore = visibleRows.length < filteredRows.length;
  const loadMore = () => setVisibleCount((count) => count + PAGE_SIZE);
  const sentinelRef = useInfiniteScroll({
    enabled: !jobsQuery.isLoading,
    hasMore,
    onLoadMore: loadMore,
  });

  return {
    query,
    setQuery,
    rows: visibleRows,
    totalRows: filteredRows.length,
    stats,
    hasMore,
    sentinelRef,
    activeContractJobIds,
    loading: jobsQuery.isLoading || contractsQuery.isLoading,
    error: jobsQuery.error || contractsQuery.error || acceptMutation.error || statusMutation.error,
    busyJobId:
      acceptMutation.isPending ? acceptMutation.variables :
      statusMutation.isPending ? statusMutation.variables?.jobId :
      '',
    acceptJob: (jobId) => acceptMutation.mutateAsync(jobId),
    setJobStatus: (jobId, status) => statusMutation.mutateAsync({ jobId, status }),
    retry: () => {
      jobsQuery.refetch();
      contractsQuery.refetch();
    },
  };
};
