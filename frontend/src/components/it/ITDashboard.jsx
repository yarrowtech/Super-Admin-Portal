import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { itApi } from '../../api/it';
import { useAuth } from '../../context/AuthContext';

const PROJECT_STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Planning', value: 'planning' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'On Hold', value: 'on-hold' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PRIORITY_OPTIONS = [
  { label: 'All priorities', value: 'all' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const TICKET_STATUS_OPTIONS = [
  { label: 'All tickets', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Waiting', value: 'waiting' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PRIORITY_CLASSES = {
  critical: 'text-red-600 dark:text-red-400 bg-red-500/10',
  high: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
  medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
  low: 'text-green-600 dark:text-green-400 bg-green-500/10',
};

const TICKET_STATUS_CLASSES = {
  open: 'text-red-600 dark:text-red-400 bg-red-500/10',
  'in-progress': 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  waiting: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
  resolved: 'text-green-600 dark:text-green-400 bg-green-500/10',
  closed: 'text-neutral-600 dark:text-neutral-300 bg-neutral-500/10',
  cancelled: 'text-neutral-500 dark:text-neutral-400 bg-neutral-500/10',
};

const PROJECT_STATUS_CLASSES = {
  planning: 'text-neutral-700 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800/70',
  'in-progress': 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  'on-hold': 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
  completed: 'text-green-600 dark:text-green-400 bg-green-500/10',
  cancelled: 'text-neutral-500 dark:text-neutral-400 bg-neutral-500/10',
};

const priorityOrder = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const formatUserName = (user) => {
  if (!user) {
    return 'Unassigned';
  }
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unassigned';
};

const clampPercent = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

const formatStatusLabel = (status) =>
  status ? status.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown';

const ITDashboard = () => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilters, setProjectFilters] = useState({
    status: 'all',
    priority: 'all',
  });
  const [ticketFilters, setTicketFilters] = useState({
    status: 'open',
    priority: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(
    async ({ showLoader = true } = {}) => {
      if (!token) {
        return;
      }

      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      try {
        const [dashboardRes, projectsRes, ticketsRes] = await Promise.all([
          itApi.getDashboard(token),
          itApi.getProjects(token, { limit: 20 }),
          itApi.getSupportTickets(token, { limit: 20 }),
        ]);

        setDashboardData(dashboardRes?.data || null);
        setProjects(projectsRes?.data?.projects || []);
        setTickets(ticketsRes?.data?.tickets || []);
      } catch (err) {
        setError(err.message || 'Failed to load IT dashboard data');
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadDashboard();
  }, [token, loadDashboard]);

  const handleRefresh = async () => {
    if (!token) {
      return;
    }
    setRefreshing(true);
    try {
      await loadDashboard({ showLoader: false });
    } finally {
      setRefreshing(false);
    }
  };

  const searchValue = searchTerm.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        !searchValue ||
        [project.name, project.projectCode, project.client?.name]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchValue));

      const matchesStatus =
        projectFilters.status === 'all' || project.status === projectFilters.status;

      const matchesPriority =
        projectFilters.priority === 'all' || project.priority === projectFilters.priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, searchValue, projectFilters]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        !searchValue ||
        [ticket.title, ticket.ticketNumber, ticket.requester?.firstName, ticket.requester?.lastName]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchValue));

      const matchesStatus =
        ticketFilters.status === 'all' || ticket.status === ticketFilters.status;

      const matchesPriority =
        ticketFilters.priority === 'all' || ticket.priority === ticketFilters.priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchValue, ticketFilters]);

  const highlightedTickets = useMemo(() => {
    return [...filteredTickets]
      .sort((a, b) => {
        const priorityDiff =
          (priorityOrder[a.priority] ?? Number.MAX_SAFE_INTEGER) -
          (priorityOrder[b.priority] ?? Number.MAX_SAFE_INTEGER);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      })
      .slice(0, 3);
  }, [filteredTickets]);

  const featuredProjects = useMemo(() => {
    return [...filteredProjects]
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 3);
  }, [filteredProjects]);

  const totalProjects = dashboardData?.totalProjects || 0;
  const activeProjects = dashboardData?.activeProjects || 0;
  const totalTickets = dashboardData?.totalTickets || 0;
  const openTickets = dashboardData?.openTickets || 0;
  const criticalTickets = dashboardData?.criticalTickets || 0;

  const completedProjectsPercent = totalProjects
    ? clampPercent(((totalProjects - activeProjects) / totalProjects) * 100)
    : 0;
  const ticketResolutionPercent = totalTickets
    ? clampPercent(((totalTickets - openTickets) / totalTickets) * 100)
    : 0;
  const criticalTicketPercent = totalTickets
    ? clampPercent((criticalTickets / totalTickets) * 100)
    : 0;

  const statCards = [
    {
      label: 'Total Projects',
      value: totalProjects,
      helper: 'All tracked initiatives',
    },
    {
      label: 'Active Projects',
      value: activeProjects,
      helper: 'Currently running',
    },
    {
      label: 'Open Support Tickets',
      value: openTickets,
      helper: 'Awaiting resolution',
    },
    {
      label: 'Critical Tickets',
      value: criticalTickets,
      helper: 'Require immediate action',
    },
  ];

  const hasContent = Boolean(
    dashboardData || projects.length > 0 || tickets.length > 0
  );

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex h-full items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">Loading IT dashboard...</p>
        </div>
      </main>
    );
  }

  if (error && !hasContent) {
    return (
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center gap-4">
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Retry load
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              IT Department Dashboard
            </p>
            <p className="text-base font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Live overview of infrastructure workstreams, project health, and support queues.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              <span className="material-symbols-outlined text-base">
                {refreshing ? 'progress_activity' : 'refresh'}
              </span>
              {refreshing ? 'Refreshing' : 'Refresh data'}
            </button>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              <span className="truncate">New Project</span>
            </button>
          </div>
        </div>

        {error && hasContent && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 font-semibold"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Retry now
            </button>
          </div>
        )}

        <div className="py-6">
          <label className="flex h-12 min-w-40 w-full flex-col">
            <div className="flex h-full w-full items-stretch rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <div className="flex items-center justify-center rounded-l-lg bg-transparent pl-4 text-neutral-500 dark:text-neutral-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="form-input flex w-full min-w-0 flex-1 rounded-r-lg border-none bg-transparent px-4 text-base text-neutral-800 placeholder:text-neutral-500 focus:border-none focus:outline-0 focus:ring-0 dark:text-neutral-100 dark:placeholder:text-neutral-400"
                placeholder="Search projects or support tickets..."
              />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <p className="text-base font-medium text-neutral-600 dark:text-neutral-300">
                {card.label}
              </p>
              <p className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 dark:text-white">
                {typeof card.value === 'number' ? card.value : '—'}
              </p>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {card.helper}
              </p>
            </div>
          ))}
        </div>

        {dashboardData?.permissions?.length ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            {dashboardData.permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 capitalize dark:border-neutral-700 dark:bg-neutral-800/60"
              >
                {permission.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <div className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                  Delivery Operations
                </h3>
                <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-300">
                  Real-time metrics
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-neutral-600 dark:text-neutral-400">Project completion</p>
                    <p className="font-semibold text-green-500">{completedProjectsPercent}%</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${completedProjectsPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-neutral-600 dark:text-neutral-400">Ticket resolution</p>
                    <p className="font-semibold text-blue-500">{ticketResolutionPercent}%</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${ticketResolutionPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-neutral-600 dark:text-neutral-400">Critical ticket load</p>
                    <p className="font-semibold text-orange-500">{criticalTicketPercent}%</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-2 rounded-full bg-orange-500"
                      style={{ width: `${criticalTicketPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                  System Assistance Requests
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={ticketFilters.status}
                    onChange={(event) =>
                      setTicketFilters((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    {TICKET_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ticketFilters.priority}
                    onChange={(event) =>
                      setTicketFilters((prev) => ({
                        ...prev,
                        priority: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <span className="material-symbols-outlined text-base text-primary">
                  support_agent
                </span>
                {filteredTickets.length} ticket
                {filteredTickets.length === 1 ? '' : 's'} match the filters
              </div>
              <div className="flex flex-col gap-3">
                {highlightedTickets.length ? (
                  highlightedTickets.map((ticket) => (
                    <div
                      key={ticket._id}
                      className="flex flex-col gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                            {ticket.title}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {ticket.ticketNumber || ticket._id?.slice(-6)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_CLASSES[ticket.priority] || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300'}`}
                        >
                          {formatStatusLabel(ticket.priority)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">person</span>
                          {formatUserName(ticket.requester)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${TICKET_STATUS_CLASSES[ticket.status] || 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'}`}
                        >
                          <span className="material-symbols-outlined text-base">flag</span>
                          {formatStatusLabel(ticket.status)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No tickets match the selected filters.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50">
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                Featured Project Teams
              </h3>
              {featuredProjects.length ? (
                featuredProjects.map((project) => {
                  const teamCount = project.teamMembers?.length || 0;
                  return (
                    <div
                      key={project._id}
                      className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                            {project.name}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Managed by {formatUserName(project.projectManager)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PROJECT_STATUS_CLASSES[project.status] || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300'}`}
                        >
                          {formatStatusLabel(project.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{teamCount} team member{teamCount === 1 ? '' : 's'}</span>
                        <span>{project.progress ?? 0}% complete</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${clampPercent(project.progress)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No active projects to highlight yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                  Project Portfolio
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {filteredProjects.length} project
                  {filteredProjects.length === 1 ? '' : 's'} in view
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={projectFilters.status}
                  onChange={(event) =>
                    setProjectFilters((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={projectFilters.priority}
                  onChange={(event) =>
                    setProjectFilters((prev) => ({
                      ...prev,
                      priority: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
                <thead className="bg-neutral-100 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-3">Project</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Manager</th>
                    <th className="px-6 py-3">Team</th>
                    <th className="px-6 py-3">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.slice(0, 8).map((project) => {
                    const teamCount = project.teamMembers?.length || 0;
                    return (
                      <tr
                        key={project._id}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                              {project.name}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {project.projectCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${PROJECT_STATUS_CLASSES[project.status] || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300'}`}
                          >
                            {formatStatusLabel(project.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_CLASSES[project.priority] || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300'}`}
                          >
                            {formatStatusLabel(project.priority)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-700 dark:text-neutral-200">
                          {formatUserName(project.projectManager)}
                        </td>
                        <td className="px-6 py-4 text-neutral-700 dark:text-neutral-200">
                          {teamCount} member{teamCount === 1 ? '' : 's'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 rounded-full bg-neutral-200 dark:bg-neutral-700">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${clampPercent(project.progress)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                              {project.progress ?? 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredProjects.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400"
                      >
                        No projects match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ITDashboard;
