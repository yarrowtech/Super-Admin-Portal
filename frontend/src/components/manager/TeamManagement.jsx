import React, { useEffect, useMemo, useState } from 'react';
import { managerApi } from '../../api/manager';
import { useAuth } from '../../context/AuthContext';

const TeamManagement = () => {
  const { token } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeam = async () => {
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
  };

  useEffect(() => {
    fetchTeam();
  }, [token]);

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

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white">Team Management</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              View your direct team members and their current roles.
            </p>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-3 text-sm text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-white dark:placeholder:text-neutral-500"
                placeholder="Search by name, email, or role"
              />
            </div>
          </div>
          <div className="flex items-end gap-3 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
              Team size: <span className="font-semibold text-neutral-800 dark:text-neutral-100">{team.length}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
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
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Loading team members...
                  </td>
                </tr>
              )}
              {!loading && filteredTeam.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No team members found.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredTeam.map((member) => (
                  <tr key={member._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400 capitalize">{member.role}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{member.department || '-'}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{member.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'}`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default TeamManagement;
