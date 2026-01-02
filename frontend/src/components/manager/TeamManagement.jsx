import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { managerApi } from '../../api/manager';
import { useAuth } from '../../context/AuthContext';

const TeamManagement = () => {
  const { token } = useAuth();
  const [team, setTeam] = useState([]);
  const [managedTeams, setManagedTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [formState, setFormState] = useState({
    name: '',
    projectCode: '',
    description: '',
    dueDate: '',
  });
  const [createStatus, setCreateStatus] = useState({ loading: false, error: '', success: '' });

  const fetchTeam = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const response = await managerApi.getTeam(token);
      const payload = response?.data || {};
      setTeam(payload.team || []);
    } catch (err) {
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchManagedTeams = useCallback(async () => {
    if (!token) return;
    try {
      setTeamsLoading(true);
      const response = await managerApi.getProjectTeams(token);
      const payload = response?.data || response || [];
      setManagedTeams(payload);
    } catch (err) {
      console.error('Failed to load project teams', err);
    } finally {
      setTeamsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTeam();
    fetchManagedTeams();
  }, [fetchTeam, fetchManagedTeams]);

  const filteredTeam = useMemo(() => {
    if (!searchQuery) return team;
    const term = searchQuery.toLowerCase();
    return team.filter((member) => {
      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase();
      return (
        fullName.includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.role?.toLowerCase().includes(term)
      );
    });
  }, [team, searchQuery]);

  const selectedMemberDetails = useMemo(() => {
    const lookup = new Set(selectedMembers);
    return team.filter((member) => lookup.has(member._id?.toString() || member.id));
  }, [team, selectedMembers]);

  const toggleMemberSelection = (memberId) => {
    if (!memberId) return;
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const allFilteredSelected =
    filteredTeam.length > 0 &&
    filteredTeam.every((member) =>
      selectedMembers.includes(member._id?.toString() || member.id)
    );

  const toggleAllFiltered = () => {
    const filteredIds = filteredTeam.map((member) => member._id?.toString() || member.id);
    if (allFilteredSelected) {
      setSelectedMembers((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedMembers((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState({
      name: '',
      projectCode: '',
      description: '',
      dueDate: '',
    });
    setSelectedMembers([]);
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    if (!token) return;
    if (!formState.name.trim() || selectedMembers.length === 0) return;

    setCreateStatus({ loading: true, error: '', success: '' });
    try {
      const payload = {
        name: formState.name.trim(),
        description: formState.description?.trim() || '',
        memberIds: selectedMembers,
      };
      if (formState.projectCode.trim()) {
        payload.projectCode = formState.projectCode.trim();
      }
      if (formState.dueDate) {
        payload.dueDate = formState.dueDate;
      }
      await managerApi.createProjectTeam(token, payload);
      setCreateStatus({
        loading: false,
        error: '',
        success: `Team "${formState.name.trim()}" created. Employees have been notified.`,
      });
      resetForm();
      fetchManagedTeams();
    } catch (err) {
      setCreateStatus({
        loading: false,
        error: err.message || 'Failed to create project team',
        success: '',
      });
    }
  };

  const renderTeamStatusBadge = (isActive) =>
    `rounded-full px-2 py-0.5 text-xs font-semibold ${
      isActive
        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
    }`;

  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() || 'T';
    return `${parts[0]?.[0] || ''}${parts[parts.length - 1]?.[0] || ''}`.toUpperCase();
  };

  const canCreateTeam = formState.name.trim() && selectedMembers.length > 0 && !createStatus.loading;

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white">Team Management</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Assign project teams, send notifications, and spin up chat spaces instantly.
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/40 sm:flex-row">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Search</label>
            <div className="mt-2 flex h-11 items-center rounded-lg border border-neutral-200 bg-white shadow-sm transition dark:border-neutral-700 dark:bg-neutral-900/60">
              <span className="flex h-full items-center border-r border-neutral-200 px-3 text-neutral-400 dark:border-neutral-800">
                <span className="material-symbols-outlined text-base">search</span>
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-3 text-sm text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-white dark:placeholder:text-neutral-500"
                placeholder="Search by name, email, or role"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
              Team size:{' '}
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{team.length}</span>
            </div>
            <button
              type="button"
              onClick={fetchTeam}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh list
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Project Assignment Builder</h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {selectedMembers.length} member{selectedMembers.length === 1 ? '' : 's'} selected
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Select employees below and share project details to notify them instantly and create a chat group.
            </p>

            {createStatus.error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                {createStatus.error}
              </div>
            )}
            {createStatus.success && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                {createStatus.success}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    Project / Team Name
                  </label>
                  <input
                    value={formState.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    placeholder="e.g., Mobile Banking Revamp"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    Project Code (optional)
                  </label>
                  <input
                    value={formState.projectCode}
                    onChange={(e) => handleFormChange('projectCode', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    placeholder="PRJ-2045"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formState.dueDate}
                    onChange={(e) => handleFormChange('dueDate', e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    Brief / Instructions
                  </label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    placeholder="Share a brief message for your team..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                  <span>Selected Members</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMembers([])}
                    className="text-primary hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
                {selectedMemberDetails.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Choose employees from the table below to include them in this project team.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMemberDetails.map((member) => {
                      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                      const memberId = member._id?.toString() || member.id;
                      return (
                        <span
                          key={memberId}
                          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/60 dark:text-primary-light"
                        >
                          {fullName || member.email}
                          <button
                            type="button"
                            onClick={() => toggleMemberSelection(memberId)}
                            className="text-[10px] text-primary/80 hover:text-primary"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!canCreateTeam}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition ${
                  canCreateTeam
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-neutral-400 text-neutral-200 dark:bg-neutral-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {createStatus.loading ? 'progress_activity' : 'groups'}
                </span>
                {createStatus.loading ? 'Creating team...' : 'Create project team'}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Managed Project Teams</h2>
              <button
                type="button"
                onClick={fetchManagedTeams}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {teamsLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/20 dark:text-neutral-300">
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Loading teams...
                </div>
              ) : managedTeams.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No project teams created yet. Build one using the form to notify your employees.
                </p>
              ) : (
                managedTeams.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                          {project.name}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {project.projectCode ? `Code: ${project.projectCode}` : 'No project code'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {project.members?.length || 0} member{(project.members?.length || 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                    {project.description && (
                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{project.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {(project.members || []).slice(0, 5).map((member) => {
                        const memberName = member.employee?.name || 'Member';
                        return (
                          <span
                            key={member.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                            title={memberName}
                          >
                            {getInitials(memberName)}
                          </span>
                        );
                      })}
                      {(project.members || []).length > 5 && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          +{(project.members || []).length - 5} more
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                      {project.dueDate && (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">event</span>
                          Due {new Date(project.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {project.chatThread?.name && (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">forum</span>
                          Chat: {project.chatThread.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                    />
                    Include
                  </div>
                </th>
                <th className="px-6 py-3 text-left">Employee</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Department</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Loading team members...
                  </td>
                </tr>
              )}
              {!loading && filteredTeam.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No team members found.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredTeam.map((member) => {
                  const memberId = member._id?.toString() || member.id;
                  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                  return (
                    <tr key={memberId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                          checked={selectedMembers.includes(memberId)}
                          onChange={() => toggleMemberSelection(memberId)}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">
                        {fullName || member.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                        {member.role}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {member.department || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{member.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={renderTeamStatusBadge(member.isActive)}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default TeamManagement;
