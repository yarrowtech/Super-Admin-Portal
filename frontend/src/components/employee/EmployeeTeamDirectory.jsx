import React, { useEffect, useMemo, useState } from 'react';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const EmployeeTeamDirectory = () => {
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const res = await employeeApi.getTeam(token);
        setMembers(res?.data?.members || []);
      } catch (err) {
        setError(err.message || 'Failed to load team');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = `${member.name} ${member.role}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || (member.status || 'Unknown') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  const statusOptions = useMemo(() => ['All', ...new Set(members.map((member) => member.status || 'Unknown'))], [members]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading team directory...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-primary/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Team Directory</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">People & availability</h1>
          <p className="text-sm text-slate-500">Find collaborators and see status at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
          >
            {statusOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <article key={member.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div
                  className="size-14 rounded-2xl border border-white bg-cover bg-center shadow dark:border-slate-900"
                  style={{ backgroundImage: member.avatar ? `url(${member.avatar})` : undefined, backgroundColor: member.avatar ? undefined : '#e2e8f0' }}
                  data-alt={member.name}
                >
                  {!member.avatar && (
                    <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-700">
                      {member.name?.[0] || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-slate-500">{member.title || member.role}</p>
                  <p className="text-xs text-slate-400">{member.department}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200">
                  {member.status || 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{member.email}</span>
                <span>{member.phone || 'N/A'}</span>
              </div>
            </article>
          ))}
          {filteredMembers.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No teammates match this filter.</p>
          )}
        </div>
      </section>
    </main>
  );
};

export default EmployeeTeamDirectory;
