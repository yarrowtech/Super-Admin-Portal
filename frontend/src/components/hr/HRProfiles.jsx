import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { profileApi } from '../../services/profile';
import { useDebounce } from '../../hooks/useDebounce';
import PortalHeader from '../common/PortalHeader';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';

const roleOptions = [
  { value: '', label: 'All roles' },
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'it', label: 'IT' },
];

const statusOptions = [
  { value: '', label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const sortOptions = [
  { value: 'latest', label: 'Latest updated' },
  { value: 'skilled', label: 'Most skilled' },
];

const HRProfiles = () => {
  const { user, token } = useAuth();
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

  const totalPages = listQuery.data?.data?.totalPages || 1;
  const currentPage = listQuery.data?.data?.currentPage || page;

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Employee Profiles"
          subtitle="Read-only employee profile intelligence"
          user={user}
          icon="person_search"
        />

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Input aria-label="Search name or skills" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/skills" />
            <Input aria-label="Skill filter" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skill filter" />
            <Input aria-label="Experience filter" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Experience filter" />
            <Select aria-label="Role filter" value={role} onChange={(e) => setRole(e.target.value)} options={roleOptions} />
            <Select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
            <Select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} options={sortOptions} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="space-y-2">
            {users.length === 0 ? (
              <EmptyState
                icon="person_search"
                title="No profiles found"
                description="Try adjusting your search or filters to find employee profiles."
              />
            ) : (
              <>
                {users.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => setSelectedId(u._id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      selectedId === u._id
                        ? 'border-primary bg-primary/5'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
                    }`}
                  >
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{u.role} • {u.department || 'N/A'}</p>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">Skills: {(u.profile?.skills || []).slice(0, 4).join(', ') || 'N/A'}</p>
                    <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">Score: {u.profileScore || u.profile?.metadata?.completion || 0}%</p>
                  </button>
                ))}
                <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                  <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {!selectedId && <p className="text-sm text-neutral-500 dark:text-neutral-400">Select a profile to view details.</p>}
            {selectedId && detailQuery.isLoading && <div className="h-40 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}
            {selectedId && detailQuery.data && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{detailQuery.data.data.user.firstName} {detailQuery.data.data.user.lastName}</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{detailQuery.data.data.user.email}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Bio</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">{detailQuery.data.data.user.profile?.basic?.bio || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Skills</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">{(detailQuery.data.data.user.profile?.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).join(', ') || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800 md:col-span-2">
                    <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Experience</p>
                    <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700 dark:text-neutral-200">{(detailQuery.data.data.user.profile?.experience || []).map((x, i) => <li key={`${x.company || x}-${i}`}>{typeof x === 'string' ? x : `${x.company || ''} • ${x.role || ''}`}</li>)}</ul>
                  </div>
                </div>
                {detailQuery.data.data.user.profile?.resumeUrl && (
                  <Button as="a" href={detailQuery.data.data.user.profile.resumeUrl} target="_blank" rel="noreferrer" size="sm">
                    Download Resume
                  </Button>
                )}
                <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                  <p className="mb-2 text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Add Internal Notes</p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    placeholder="Private note for HR team"
                  />
                  <Button size="sm" className="mt-2" disabled={!note.trim() || noteMutation.isPending} onClick={() => noteMutation.mutate()}>
                    Save Note
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default HRProfiles;
