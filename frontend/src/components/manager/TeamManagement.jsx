import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { managerApi } from '../../api/manager';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const LOCAL_CACHE_KEY = 'managerTeamSnapshot';

const getInitials = (value = '') => {
  const parts = value
    .split(' ')
    .map((segment) => segment.charAt(0))
    .join('');
  return parts.slice(0, 2).toUpperCase() || 'TM';
};

const normalizeMembers = (members = [], fallbackDepartment = '') => {
  if (!Array.isArray(members)) return [];
  return members.map((member, index) => ({
    id: member.id || member._id || member.userId || `member-${index}`,
    name: member.name || `${member.firstName || 'Team'} ${member.lastName || 'Member'}`.trim(),
    role: member.role || member.title || member.position || 'Contributor',
    avatar: member.avatar || member.image || member.photo || '',
    department: member.department || fallbackDepartment || 'Team',
    status:
      member.status ||
      member.presence ||
      (typeof member.isActive === 'boolean' ? (member.isActive ? 'active' : 'offline') : 'active'),
    lastActive: member.lastActive || member.lastLogin || member.updatedAt,
    isActive: typeof member.isActive === 'boolean' ? member.isActive : true,
    email: member.email,
    phone: member.phone,
  }));
};

const deriveTeamsArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  if (Array.isArray(payload.team)) return payload.team;
  if (Array.isArray(payload.teams)) return payload.teams;
  if (Array.isArray(payload.members)) return payload.members;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data) {
    if (Array.isArray(payload.data.team)) return payload.data.team;
    if (Array.isArray(payload.data.teams)) return payload.data.teams;
    if (Array.isArray(payload.data.members)) return payload.data.members;
  }
  return [];
};

const normalizeTeamsPayload = (payload) => {
  const list = deriveTeamsArray(payload);
  if (!Array.isArray(list) || list.length === 0) return [];

  return list.map((team, index) => {
    const members = normalizeMembers(team.members || team.membersList, team.department);
    const membersCount =
      Number(team.membersCount ?? team.memberCount ?? team.size ?? team.totalMembers ?? members.length) ||
      members.length ||
      team.members ||
      0;
    const name = team.name || team.title || `Team ${index + 1}`;
    const description =
      team.description ||
      (team.summary ? `${team.summary}` : `Dedicated ${team.department || ''} team focused on ${team.focus || 'department goals'}.`);

    const openProjects = team.openProjects ?? team.projects ?? team.projectCount;
    const openRoles = team.openRoles ?? team.rolesOpen ?? team.hiringPlan ?? 0;
    const metrics =
      Array.isArray(team.metrics) && team.metrics.length > 0
        ? team.metrics
        : [
            { label: 'Active Members', value: `${membersCount}` },
            { label: 'Open Projects', value: typeof openProjects === 'number' ? `${openProjects}` : '—' },
            { label: 'Hiring Plan', value: openRoles ? `${openRoles} role${openRoles === 1 ? '' : 's'}` : 'Stable' },
          ];

    const leadName = team.lead?.name || team.leadName || members[0]?.name || `${name} Lead`;
    const leadAvatar = team.lead?.avatar || team.leadAvatar || team.lead?.image || members[0]?.avatar || '';
    const teamStatus = (team.status || 'active').toLowerCase();

    return {
      id: team.id || team._id || team.slug || `team-${index}`,
      name,
      department: team.department || team.departmentName || 'General',
      description,
      membersCount,
      leadAvatar,
      leadName,
      status: teamStatus,
      openRoles,
      metrics,
      members,
      updatedAt: team.updatedAt || Date.now(),
    };
  });
};

const mapTeamSummaryToTeams = (teamSummary = {}) => {
  const members = normalizeMembers(teamSummary.members || [], teamSummary.department || 'General');
  if (!members.length) return [];

  const grouped = members.reduce((acc, member) => {
    const departmentName = member.department || teamSummary.department || 'General';
    if (!acc[departmentName]) acc[departmentName] = [];
    acc[departmentName].push(member);
    return acc;
  }, {});

  return Object.entries(grouped).map(([departmentName, deptMembers], index) => {
    const leadMember = deptMembers.find((member) => member.isActive) || deptMembers[0];
    const activeCount = deptMembers.filter((member) => member.isActive || member.status === 'active').length;
    const onLeave = deptMembers.filter((member) => (member.status || '').toLowerCase().includes('leave')).length;
    const teamId = `team-${departmentName.toLowerCase().replace(/\s+/g, '-') || index}`;
    return {
      id: teamId,
      name: `${departmentName} Team`,
      department: departmentName,
      description: `Live roster for the ${departmentName} department.`,
      membersCount: deptMembers.length,
      leadAvatar: leadMember?.avatar || '',
      leadName: leadMember?.name || `${departmentName} Lead`,
      status: onLeave > 0 ? 'paused' : activeCount > 0 ? 'active' : 'offline',
      openRoles: 0,
      metrics: [
        { label: 'Active Members', value: `${activeCount}` },
        { label: 'Total Members', value: `${deptMembers.length}` },
        { label: 'On Leave', value: `${onLeave}` },
      ],
      members: deptMembers,
      updatedAt: Date.now(),
    };
  });
};

const FALLBACK_RAW_TEAMS = [
  {
    id: 'team-eec',
    name: 'Team EEC',
    department: 'Engineering',
    description: 'Core engineering squad focused on the EEC commerce platform.',
    membersCount: 12,
    leadAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAv90Dv0ngG_fdukdx2lpCe_foDFKmgMxFOgwME4ya8YQmELcfKoYZf936q8aipwS14skpG72wJWGcbj0zlpSvLhE2cIcFvWBva-7mlNNa_pMe3OJYw7mB5kiBafxGKpGH8UrJAM0s5OZacFpogEld224iipbKP4QopfA_npNzN9bwsV0yVll53LVhacW1edRw3xYgN-ja03GIReY61NW4rV8w2S938-gYVI0qoK2e04ixyDFZOuCwXaVnTU_9hpEKA2jyPK2J6OVd1',
    leadName: 'Priya Patel',
    status: 'active',
    openRoles: 1,
  },
  {
    id: 'team-design',
    name: 'Design Mavericks',
    department: 'Design',
    description: 'A multidisciplinary squad focused on the new mobile experience for EEC.',
    membersCount: 5,
    leadAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCMdELkF8D_86oQJW6MEqhc5XDhGng4bNgMX98BQNJicFdNzbvIWz14zbsH5KF1PszAYaM9XhFTgCQRb9qdkCmyAiI5vEw7ffzCDJXjmAyh5Hbt9r7LqlEsS70YtYOxBSwnsYzU0jpQ0JFBKnoWUW7BoZaqWIoO9Vj_Ewsv7LPFTRW3SHYJCMpA1zQIao5pzXrs6ZutUaBcgUy91Al5drk8udnOeUF_O2OrM8Y744Uuyy3KOmtIa2qUkWflX8Y1uypHLXHysB0NCT3f',
    leadName: 'Michael Chen',
    status: 'hiring',
    openRoles: 2,
    members: [
      {
        id: 'design-lead',
        name: 'Michael Chen',
        role: 'Lead Designer',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCMdELkF8D_86oQJW6MEqhc5XDhGng4bNgMX98BQNJicFdNzbvIWz14zbsH5KF1PszAYaM9XhFTgCQRb9qdkCmyAiI5vEw7ffzCDJXjmAyh5Hbt9r7LqlEsS70YtYOxBSwnsYzU0jpQ0JFBKnoWUW7BoZaqWIoO9Vj_Ewsv7LPFTRW3SHYJCMpA1zQIao5pzXrs6ZutUaBcgUy91Al5drk8udnOeUF_O2OrM8Y744Uuyy3KOmtIa2qUkWflX8Y1uypHLXHysB0NCT3f',
      },
      {
        id: 'design-ux',
        name: 'Emily Rodriguez',
        role: 'UX Researcher',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAv90Dv0ngG_fdukdx2lpCe_foDFKmgMxFOgwME4ya8YQmELcfKoYZf936q8aipwS14skpG72wJWGcbj0zlpSvLhE2cIcFvWBva-7mlNNa_pMe3OJYw7mB5kiBafxGKpGH8UrJAM0s5OZacFpogEld224iipbKP4QopfA_npNzN9bwsV0yVll53LVhacW1edRw3xYgN-ja03GIReY61NW4rV8w2S938-gYVI0qoK2e04ixyDFZOuCwXaVnTU_9hpEKA2jyPK2J6OVd1',
      },
      {
        id: 'design-visual',
        name: 'David Kim',
        role: 'Visual Designer',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAkY6NpuCw7-UonpdrQglvbr2oBDsft4gBPRz46WJPtuKItznV7nM1CMhWuI8qNOi5LFvurZigEJ0TBFUSP-0K5Aq9522ID8bHhRl9lU6ASPq_Mt1NxIarxOpsQsZ-rp1BfqkletZSk3HtIGFPVQtlRpGP8U7sqX3mVeSNjFO8CrKouOd5lTrX_s60Swjs0-FMogG_gLGmk6RXCMC72sZTYJCuZgd1qQdtANn70kaaLpWe27vxXqqFkBpkZd3sXJd_4CWbHd9FQVXUW',
      },
    ],
  },
  {
    id: 'team-qa',
    name: 'QA Legends',
    department: 'Quality Assurance',
    description: 'QA strike team covering automation and regression suites.',
    membersCount: 6,
    leadAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAkY6NpuCw7-UonpdrQglvbr2oBDsft4gBPRz46WJPtuKItznV7nM1CMhWuI8qNOi5LFvurZigEJ0TBFUSP-0K5Aq9522ID8bHhRl9lU6ASPq_Mt1NxIarxOpsQsZ-rp1BfqkletZSk3HtIGFPVQtlRpGP8U7sqX3mVeSNjFO8CrKouOd5lTrX_s60Swjs0-FMogG_gLGmk6RXCMC72sZTYJCuZgd1qQdtANn70kaaLpWe27vxXqqFkBpkZd3sXJd_4CWbHd9FQVXUW',
    leadName: 'Alexis Romero',
    status: 'at capacity',
  },
  {
    id: 'team-marketing',
    name: 'Marketing Gurus',
    department: 'Marketing',
    description: 'Growth marketers weaving together lifecycle, paid, and field programs.',
    membersCount: 7,
    leadAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDk7gNShtZIkL3LpnGF1sR1aYqcxNAvlUZNTPQI09NgrFZR8k-2lgXWrmpkJxQIPe8Sy3F_N5EAet4aUm96nbSM8iGmFH2pfCQx3vpIMNwQCqJHzsM29TRFMK6feAC8miVBwACGgq1lYpX7ZNcXcm2CmGYqZgI021VFXOn_uP7DNzgixLl2GqAl1ZfhN875M_QKXoF07E8F4XpnWzD5xNg6KEZAQo6Eeu_ZgRAKpndzOsp15qWNPayaf4MrRfxUVS1IZ1-HMqaOYfgi',
    leadName: 'Helena Schultz',
    status: 'paused',
    openRoles: 0,
  },
];

const FALLBACK_TEAMS = normalizeTeamsPayload(FALLBACK_RAW_TEAMS);
const DEFAULT_SELECTED_TEAM_ID = FALLBACK_TEAMS[0]?.id || null;

const readCachedTeams = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(LOCAL_CACHE_KEY) || 'null');
    if (Array.isArray(cached?.teams)) {
      return cached.teams;
    }
  } catch (error) {
    console.warn('Failed to parse cached manager team snapshot:', error);
  }
  return null;
};

const TeamManagement = () => {
  const { token, user } = useAuth();
  const [teams, setTeams] = useState(FALLBACK_TEAMS);
  const [selectedTeamId, setSelectedTeamId] = useState(DEFAULT_SELECTED_TEAM_ID);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const socketRef = useRef(null);

  const applyTeamsFromPayload = useCallback(
    (payload, options = {}) => {
      const normalized = options.preNormalized ? payload || [] : normalizeTeamsPayload(payload);
      if (!Array.isArray(normalized)) return;

      if (normalized.length === 0) {
        if (options.allowEmpty) {
          setTeams([]);
        } else {
          setTeams((prev) => {
            if (prev.length > 0) return prev;
            return FALLBACK_TEAMS;
          });
        }
        return;
      }

      setTeams(normalized);
      setLastUpdated(options.timestamp || Date.now());

      setSelectedTeamId((prev) => {
        if (options.preserveSelection && prev && normalized.some((team) => team.id === prev)) {
          return prev;
        }
        return normalized[0]?.id || null;
      });

      if (!options.skipBroadcast && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            LOCAL_CACHE_KEY,
            JSON.stringify({ teams: normalized, updatedAt: options.timestamp || Date.now() })
          );
        } catch (storageErr) {
          console.warn('Failed to cache teams snapshot:', storageErr);
        }
        window.dispatchEvent(new CustomEvent('managerTeamUpdated', { detail: normalized }));
      }
    },
    []
  );

  const fetchTeams = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await managerApi.getTeam(token);
      const normalized = normalizeTeamsPayload(response);
      if (normalized.length > 0) {
        applyTeamsFromPayload(normalized, { preNormalized: true, preserveSelection: true });
        return;
      }

      const dashboardResponse = await managerApi.getDashboard(token);
      const snapshot = dashboardResponse?.data?.data || dashboardResponse?.data || dashboardResponse;
      const summary = snapshot?.teamSummary || {};
      const derivedTeams = mapTeamSummaryToTeams(summary);
      if (derivedTeams.length > 0) {
        applyTeamsFromPayload(derivedTeams, { preNormalized: true, preserveSelection: true });
        return;
      }

      applyTeamsFromPayload([], { allowEmpty: false });
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      setError(err.message || 'Failed to load team data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, applyTeamsFromPayload]);

  useEffect(() => {
    const cached = readCachedTeams();
    if (cached?.length) {
      applyTeamsFromPayload(cached, { preNormalized: true, preserveSelection: true, skipBroadcast: true });
    } else {
      applyTeamsFromPayload(FALLBACK_TEAMS, { preNormalized: true, preserveSelection: true, skipBroadcast: true });
    }
    fetchTeams();
  }, [applyTeamsFromPayload, fetchTeams]);

  useEffect(() => {
    const handleTeamBroadcast = (event) => {
      if (!event?.detail) return;
      applyTeamsFromPayload(event.detail, { preNormalized: true, preserveSelection: true, skipBroadcast: true });
    };
    const handleStorage = (event) => {
      if (event.key && event.key !== LOCAL_CACHE_KEY) return;
      const payload = event.newValue ? JSON.parse(event.newValue) : null;
      if (payload?.teams) {
        applyTeamsFromPayload(payload.teams, { preNormalized: true, preserveSelection: true, skipBroadcast: true });
      }
    };

    window.addEventListener('managerTeamUpdated', handleTeamBroadcast);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('managerTeamUpdated', handleTeamBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyTeamsFromPayload]);

  useEffect(() => {
    if (!token || !user) return undefined;
    const managerId = user.id || user._id;
    if (!managerId) return undefined;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    const subscriptionPayload = { managerId };

    socket.on('connect', () => {
      socket.emit('manager:subscribe', subscriptionPayload);
    });

    const handleTeamEvent = (payload) => {
      if (!payload) return;
      applyTeamsFromPayload(payload, { preserveSelection: true });
    };

    const handleDashboardEvent = (snapshot) => {
      const summary = snapshot?.teamSummary;
      if (!summary) return;
      const derivedTeams = mapTeamSummaryToTeams(summary);
      if (derivedTeams.length > 0) {
        applyTeamsFromPayload(derivedTeams, { preNormalized: true, preserveSelection: true });
      }
    };

    socket.on('manager:team', handleTeamEvent);
    socket.on('manager:team:update', handleTeamEvent);
    socket.on('manager:dashboard', handleDashboardEvent);

    return () => {
      socket.emit('manager:unsubscribe', subscriptionPayload);
      socket.off('manager:team', handleTeamEvent);
      socket.off('manager:team:update', handleTeamEvent);
      socket.off('manager:dashboard', handleDashboardEvent);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, applyTeamsFromPayload]);

  const managerDepartment = useMemo(
    () => (user?.department ? user.department.trim().toLowerCase() : 'it'),
    [user]
  );

  const scopedTeams = useMemo(() => {
    if (!managerDepartment) return teams;
    const matches = teams.filter((team) =>
      (team.department || '').toLowerCase().includes(managerDepartment)
    );
    return matches.length > 0 ? matches : teams;
  }, [teams, managerDepartment]);

  useEffect(() => {
    if (selectedTeamId && !scopedTeams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(scopedTeams[0]?.id || null);
    }
  }, [selectedTeamId, scopedTeams]);

  const activeTeam = useMemo(
    () => scopedTeams.find((team) => team.id === selectedTeamId) || scopedTeams[0] || null,
    [scopedTeams, selectedTeamId]
  );

  const departmentOptions = useMemo(() => {
    const unique = Array.from(new Set(scopedTeams.map((team) => team.department))).filter(Boolean);
    return unique;
  }, [scopedTeams]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(scopedTeams.map((team) => team.status))).filter(Boolean);
    return unique;
  }, [scopedTeams]);

  const filteredTeams = useMemo(() => {
    return scopedTeams.filter((team) => {
      const matchesDepartment = departmentFilter === 'all' || team.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || team.status === statusFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        team.name.toLowerCase().includes(term) ||
        team.department.toLowerCase().includes(term) ||
        team.leadName?.toLowerCase().includes(term);
      return matchesDepartment && matchesStatus && matchesSearch;
    });
  }, [scopedTeams, searchTerm, departmentFilter, statusFilter]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderLeadAvatar = (avatar, name) => {
    if (avatar) {
      return <div className="size-8 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${avatar})` }} />;
    }
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
        {getInitials(name || '')}
      </div>
    );
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                <span className="size-2 rounded-full bg-emerald-500" />
                Live team data
              </div>
              <h1 className="text-3xl font-black text-neutral-900 dark:text-white">Team Management</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Organize and manage teams across different departments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Last sync <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formatTime(lastUpdated)}</span>
              </div>
              <button
                type="button"
                onClick={fetchTeams}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800/60"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Refresh
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/40 sm:flex-row">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Search</label>
              <div className="mt-2 flex h-11 items-center rounded-lg border border-neutral-200 bg-white shadow-sm transition dark:border-neutral-700 dark:bg-neutral-900/60">
                <span className="flex h-full items-center border-r border-neutral-200 px-3 text-neutral-400 dark:border-neutral-800">
                  <span className="material-symbols-outlined text-base">search</span>
                </span>
                <input
                  type="text"
                  className="flex-1 bg-transparent px-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100"
                  placeholder="Search teams or leads"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Department</label>
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100"
              >
                <option value="all">All Departments</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Status</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/^\w/, (letter) => letter.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200">
              <span>Teams ({filteredTeams.length})</span>
              {loading && (
                <span className="flex items-center gap-2 text-xs font-medium text-primary">
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Syncing
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 dark:divide-neutral-800">
                <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-3">Team</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Members</th>
                    <th className="px-6 py-3">Lead</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
                  {filteredTeams.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                        No teams match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTeams.map((team) => {
                      const isActive = team.id === selectedTeamId;
                      return (
                        <tr
                          key={team.id}
                          className={`cursor-pointer transition hover:bg-neutral-50 dark:hover:bg-neutral-800/40 ${
                            isActive ? 'bg-primary/5 dark:bg-primary/10' : ''
                          }`}
                          onClick={() => setSelectedTeamId(team.id)}
                        >
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-white">{team.name}</td>
                          <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{team.department}</td>
                          <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{team.membersCount}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {renderLeadAvatar(team.leadAvatar, team.leadName)}
                              <div>
                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{team.leadName}</p>
                                <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">{team.status}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            <div className="flex items-center justify-end gap-4">
                              <button className="text-primary hover:text-primary/80">Edit</button>
                              <button className="text-red-600 hover:text-red-500">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
          {!activeTeam ? (
            <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">Select a team to view more details.</div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{activeTeam.name}</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{activeTeam.department}</p>
                </div>
                <button className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{activeTeam.description}</p>
              <div className="grid grid-cols-3 gap-3">
                {activeTeam.metrics.map((metric) => (
                  <div
                    key={`${activeTeam.id}-${metric.label}`}
                    className="rounded-lg bg-neutral-100 p-3 text-center text-sm font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-white"
                  >
                    <p className="text-xl">{metric.value}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{metric.label}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Members</h3>
                {activeTeam.members.length === 0 ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    No roster data yet. Assign members to this team to track their status.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeTeam.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="size-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                            {getInitials(member.name)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{member.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.role}</p>
                        </div>
                        <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {member.status || 'active'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                Need to update team staffing? <span className="font-semibold text-primary">Open hiring workflow</span>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
};

export default TeamManagement;
