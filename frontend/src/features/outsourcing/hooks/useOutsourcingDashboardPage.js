import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { outsourcingApi } from '../../../services/outsourcing';
import { outsourcingKeys } from '../config/queryKeys';

export const useOutsourcingDashboardPage = () => {
  const { token, user } = useAuth();

  const normalizedOutsourcingType = String(user?.metadata?.outsourcingType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const isWorker =
    normalizedOutsourcingType === 'third_party_worker' ||
    normalizedOutsourcingType === '3rd_party_worker' ||
    normalizedOutsourcingType === 'thirdpartyworker' ||
    normalizedOutsourcingType === 'freelancer';

  const dashboardQuery = useQuery({
    queryKey: outsourcingKeys.dashboard(user?.role || 'anonymous'),
    queryFn: () => outsourcingApi.getDashboard(token),
    enabled: Boolean(token && !isWorker),
    staleTime: 60 * 1000,
  });

  const workspaceQuery = useQuery({
    queryKey: [...outsourcingKeys.all, 'workspace', user?.role || 'anonymous'],
    queryFn: () => outsourcingApi.getMyWorkspace(token),
    enabled: Boolean(token),
    staleTime: 30 * 1000,
  });

  const [jobsQuery, contractsQuery, timeLogsQuery] = useQueries({
    queries: [
      {
        queryKey: outsourcingKeys.jobs(),
        queryFn: () => outsourcingApi.getJobs(token),
        enabled: Boolean(token),
      },
      {
        queryKey: outsourcingKeys.contracts(),
        queryFn: () => outsourcingApi.getContracts(token),
        enabled: Boolean(token),
        staleTime: 60 * 1000,
      },
      {
        queryKey: outsourcingKeys.timeLogs(),
        queryFn: () => outsourcingApi.getTimeLogs(token),
        enabled: Boolean(token),
      },
    ],
  });

  const jobs = jobsQuery.data?.data || [];
  const contracts = contractsQuery.data?.data || [];
  const logs = timeLogsQuery.data?.data || [];
  const workspace = workspaceQuery.data?.data || null;

  const derivedData = useMemo(() => ({
    users: { freelancers: 0 },
    contracts: { total: contracts.length },
    payments: { totalEscrowFunded: 0 },
    jobsByStatus: [],
    myStats: {
      jobs: jobs.length,
      contracts: contracts.length,
      pendingLogs: logs.filter((entry) => entry.verificationStatus === 'pending').length,
    },
  }), [contracts.length, jobs.length, logs]);

  const dashboard = dashboardQuery.data?.data || derivedData;
  const workspaceSummary = workspace?.summary || {};

  const kpis = useMemo(() => {
    const next = [
      { label: 'Jobs', value: dashboard?.myStats?.jobs || 0, icon: 'work' },
      { label: 'Contracts', value: dashboard?.contracts?.total || 0, icon: 'contract' },
      { label: 'Escrow Funded', value: dashboard?.payments?.totalEscrowFunded || 0, icon: 'payments' },
      { label: 'My Jobs', value: dashboard?.myStats?.jobs || 0, icon: 'work' },
      { label: 'Pending Logs', value: dashboard?.myStats?.pendingLogs || 0, icon: 'schedule' },
    ];

    if (user?.role === 'admin') {
      next.unshift({
        label: 'Freelancers',
        value: dashboard?.users?.freelancers || dashboard?.users?.workers || 0,
        icon: 'person',
      });
    }

    return next;
  }, [dashboard, user?.role]);

  const workspaceKpis = useMemo(() => [
    { label: 'Assigned Projects', value: workspaceSummary.projects || jobs.length, icon: 'work' },
    { label: 'Active Contracts', value: workspaceSummary.activeContracts || contracts.filter((c) => c.status === 'active').length, icon: 'contract' },
    { label: 'Notifications', value: workspaceSummary.notifications || 0, icon: 'notifications' },
    { label: 'Pending Logs', value: workspaceSummary.pendingLogs ?? logs.filter((entry) => entry.verificationStatus === 'pending').length, icon: 'schedule' },
  ], [contracts, jobs.length, logs, workspaceSummary.activeContracts, workspaceSummary.notifications, workspaceSummary.pendingLogs, workspaceSummary.projects]);

  return {
    isWorker,
    loading:
      jobsQuery.isLoading ||
      contractsQuery.isLoading ||
      timeLogsQuery.isLoading ||
      workspaceQuery.isLoading ||
      (!isWorker && dashboardQuery.isLoading),
    error: dashboardQuery.error || jobsQuery.error || contractsQuery.error || timeLogsQuery.error || workspaceQuery.error,
    contracts,
    kpis,
    workspace,
    workspaceKpis,
    recentJobs: jobs.slice(0, 5),
    pendingVerification: logs.filter((entry) => entry.verificationStatus === 'pending').length,
    approvedLogs: logs.filter((entry) => entry.verificationStatus === 'approved').length,
  };
};
