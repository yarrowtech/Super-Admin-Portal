import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { profileApi } from '../../services/profile';
import { useDebounce } from '../../hooks/useDebounce';

const HRProfiles = () => {
  const { token } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [sort, setSort] = useState('latest');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [note, setNote] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const debouncedSkills = useDebounce(skills, 350);
  const debouncedExperience = useDebounce(experience, 350);

  const listQuery = useQuery({
    queryKey: ['hr-profiles', token, debouncedSearch, debouncedSkills, debouncedExperience, role, status, page],
    queryFn: () => profileApi.getHrProfiles(token, { search: debouncedSearch, skills: debouncedSkills, experience: debouncedExperience, role, status, page, limit: 20 }),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const users = useMemo(() => {
    const rows = listQuery.data?.data?.users || [];
    if (sort === 'skilled') {
      return [...rows].sort((a, b) => (b.profile?.skills?.length || 0) - (a.profile?.skills?.length || 0));
    }
    return rows;
  }, [listQuery.data, sort]);

  const detailQuery = useQuery({
    queryKey: ['hr-profile-detail', token, selectedId],
    queryFn: () => profileApi.getHrProfileById(token, selectedId),
    enabled: Boolean(token && selectedId),
  });

  const noteMutation = useMutation({
    mutationFn: () => profileApi.addHrInternalNote(token, selectedId, note),
    onSuccess: () => {
      toast.success('Internal note saved');
      setNote('');
      detailQuery.refetch();
    },
    onError: (err) => toast.error(err.message || 'Failed to save note'),
  });

  return (
    <main className="p-3 md:p-5">
      <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-2 md:grid-cols-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/skills" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skill filter" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          <input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Experience filter" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">All roles</option>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr">HR</option>
            <option value="finance">Finance</option>
            <option value="it">IT</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="latest">Latest updated</option>
            <option value="skilled">Most skilled</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-2">
          {(users || []).map((u) => (
            <button key={u._id} onClick={() => setSelectedId(u._id)} className={`w-full rounded-xl border p-3 text-left ${selectedId === u._id ? 'border-primary bg-primary/5' : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'}`}>
              <p className="font-semibold">{u.firstName} {u.lastName}</p>
              <p className="text-xs text-neutral-500">{u.role} • {u.department || 'N/A'}</p>
              <p className="mt-1 text-xs text-neutral-600">Skills: {(u.profile?.skills || []).slice(0, 4).join(', ') || 'N/A'}</p>
              <p className="mt-1 text-[11px] text-neutral-500">Score: {u.profileScore || u.profile?.metadata?.completion || 0}%</p>
            </button>
          ))}
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border px-3 py-1 disabled:opacity-40">Prev</button>
            <span>Page {listQuery.data?.data?.currentPage || page} / {listQuery.data?.data?.totalPages || 1}</span>
            <button disabled={page >= (listQuery.data?.data?.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {!selectedId && <p className="text-sm text-neutral-500">Select a profile to view details.</p>}
          {selectedId && detailQuery.isLoading && <div className="h-40 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}
          {selectedId && detailQuery.data && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">{detailQuery.data.data.user.firstName} {detailQuery.data.data.user.lastName}</h2>
                <p className="text-sm text-neutral-500">{detailQuery.data.data.user.email}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Bio</p>
                  <p className="text-sm">{detailQuery.data.data.user.profile?.basic?.bio || 'N/A'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Skills</p>
                  <p className="text-sm">{(detailQuery.data.data.user.profile?.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).join(', ') || 'N/A'}</p>
                </div>
                <div className="rounded-lg border p-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase text-neutral-500">Experience</p>
                  <ul className="mt-2 list-disc pl-5 text-sm">{(detailQuery.data.data.user.profile?.experience || []).map((x, i) => <li key={`${x.company || x}-${i}`}>{typeof x === 'string' ? x : `${x.company || ''} • ${x.role || ''}`}</li>)}</ul>
                </div>
              </div>
              {detailQuery.data.data.user.profile?.resumeUrl && (
                <a href={detailQuery.data.data.user.profile.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
                  Download Resume
                </a>
              )}
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">Add Internal Notes</p>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" placeholder="Private note for HR team" />
                <button disabled={!note.trim() || noteMutation.isPending} onClick={() => noteMutation.mutate()} className="mt-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  Save Note
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default HRProfiles;
