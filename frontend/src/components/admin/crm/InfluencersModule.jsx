/**
 * Influencer roster — the creators the agency works with, as distinct from the
 * client organisations that commission them.
 *
 * Carries its own upload rather than sending the operator to a shared import
 * screen: the sheet shapes differ (handles, reach, rate cards), and an import
 * landing in the section it was launched from is what makes a per-section
 * roster monitorable. The wizard itself is the shared ImportModule driven by
 * INFLUENCER_IMPORT, so the flow cannot drift from the client importer.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import SectionCard from '../../ui/SectionCard';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Pagination from '../../ui/Pagination';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import {
  apiFetch, DEPT_BADGE_TONE, PRIORITY_TONE, PRIORITY_OPTIONS,
  SINGLE_DEPT_OPTIONS, TextArea, useStatusOptions, useProjectScope,
} from './crmShared';
import ImportModule from './ImportModule';
import { INFLUENCER_IMPORT, compactNumber } from './importConfigs';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'x',         label: 'X' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'other',     label: 'Other' },
];

const TIERS = [
  { value: 'nano',  label: 'Nano (<10K)' },
  { value: 'micro', label: 'Micro (10K–100K)' },
  { value: 'mid',   label: 'Mid (100K–500K)' },
  { value: 'macro', label: 'Macro (500K–1M)' },
  { value: 'mega',  label: 'Mega (1M+)' },
];

const TIER_TONE = { nano: 'neutral', micro: 'info', mid: 'info', macro: 'success', mega: 'success' };

const PLATFORM_ICON = {
  instagram: 'photo_camera', youtube: 'smart_display', tiktok: 'music_note',
  x: 'tag', facebook: 'thumb_up', linkedin: 'work', other: 'public',
};

const money = (value, currency = 'INR') => {
  if (value === null || value === undefined || value === '') return '—';
  const symbol = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[currency] || '';
  return `${symbol}${Number(value).toLocaleString('en-IN')}`;
};

// ── Create / edit ───────────────────────────────────────────────────────────
const BLANK = {
  name: '', handle: '', platform: 'instagram', profileUrl: '', email: '', phone: '',
  location: '', followers: '', avgViews: '', avgLikes: '', engagementRate: '',
  ratePerPost: '', ratePerStory: '', ratePerReel: '', currency: 'INR',
  category: '', tier: '', department: 'marketing', status: 'Identified',
  priority: 'medium', campaignPeriod: '', notes: '',
};

function InfluencerFormModal({ open, onClose, onSaved, token, editData, statuses }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editData ? { ...BLANK, ...editData, tier: editData.tier || '' } : BLANK);
  }, [open, editData]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() && !form.handle?.trim()) {
      toast.error('Enter a name or a handle');
      return;
    }
    setBusy(true);
    try {
      // Empty numeric inputs must travel as null, not '', or "not captured"
      // would be stored as a measured zero.
      const numeric = ['followers', 'avgViews', 'avgLikes', 'engagementRate',
                       'ratePerPost', 'ratePerStory', 'ratePerReel'];
      const payload = { ...form };
      numeric.forEach(k => { payload[k] = payload[k] === '' || payload[k] === null ? null : Number(payload[k]); });
      if (!payload.tier) delete payload.tier;      // let the model derive it

      await apiFetch(
        editData ? `/influencers/${editData._id}` : '/influencers',
        token,
        { method: editData ? 'PUT' : 'POST', body: JSON.stringify(payload) },
      );
      toast.success(editData ? 'Influencer updated' : 'Influencer added');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editData ? 'Edit Influencer' : 'Add Influencer'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Display Name" name="name" value={form.name} onChange={set('name')} placeholder="e.g. Aisha Verma" />
          <Input label="Handle" name="handle" value={form.handle} onChange={set('handle')} placeholder="aishaeats (without @)" />
          <Select label="Platform" name="platform" value={form.platform} onChange={set('platform')} options={PLATFORMS} />
          <Input label="Profile URL" name="profileUrl" value={form.profileUrl} onChange={set('profileUrl')} placeholder="https://instagram.com/…" />
          <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone" name="phone" value={form.phone} onChange={set('phone')} />
          <Input label="Location" name="location" value={form.location} onChange={set('location')} placeholder="e.g. Mumbai" />
          <Input label="Category / Niche" name="category" value={form.category} onChange={set('category')} placeholder="e.g. Food, Travel" />
        </div>

        <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">Reach &amp; Engagement</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Input label="Followers" name="followers" type="number" min="0" value={form.followers ?? ''} onChange={set('followers')} />
            <Input label="Avg Views" name="avgViews" type="number" min="0" value={form.avgViews ?? ''} onChange={set('avgViews')} />
            <Input label="Avg Likes" name="avgLikes" type="number" min="0" value={form.avgLikes ?? ''} onChange={set('avgLikes')} />
            <Input label="Engagement %" name="engagementRate" type="number" min="0" max="100" step="0.01" value={form.engagementRate ?? ''} onChange={set('engagementRate')} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Select label="Tier" name="tier" value={form.tier} onChange={set('tier')}
              options={[{ value: '', label: 'Auto from followers' }, ...TIERS]}
              helperText="Left on auto, the tier follows the follower count" />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">Rate Card</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Input label="Per Post" name="ratePerPost" type="number" min="0" value={form.ratePerPost ?? ''} onChange={set('ratePerPost')} />
            <Input label="Per Story" name="ratePerStory" type="number" min="0" value={form.ratePerStory ?? ''} onChange={set('ratePerStory')} />
            <Input label="Per Reel" name="ratePerReel" type="number" min="0" value={form.ratePerReel ?? ''} onChange={set('ratePerReel')} />
            <Input label="Currency" name="currency" value={form.currency} onChange={set('currency')} placeholder="INR" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Department" name="department" value={form.department} onChange={set('department')} options={SINGLE_DEPT_OPTIONS} />
          <Select label="Status" name="status" value={form.status} onChange={set('status')}
            options={statuses?.length
              ? statuses.map(s => ({ value: s.name, label: s.name }))
              : [{ value: 'Identified', label: 'Identified' }]} />
          <Select label="Priority" name="priority" value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
        </div>

        <Input label="Campaign Period" name="campaignPeriod" value={form.campaignPeriod} onChange={set('campaignPeriod')} placeholder="e.g. 4 Dec 26 to 21 Mar 27" />
        <TextArea label="Notes" rows={2} name="notes" value={form.notes} onChange={set('notes')} />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>{editData ? 'Save Changes' : 'Add Influencer'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Headline tiles ──────────────────────────────────────────────────────────
function StatTiles({ stats }) {
  const tiles = [
    { label: 'Influencers', value: stats?.total ?? 0, icon: 'diversity_3' },
    { label: 'Posts Tracked', value: stats?.totalPosts ?? 0, icon: 'movie' },
    { label: 'Total Reach', value: compactNumber(stats?.totalReach ?? 0), icon: 'groups' },
    {
      label: 'Avg Engagement',
      // null means nothing has been measured yet, which is not the same as 0%.
      value: stats?.avgEngagement === null || stats?.avgEngagement === undefined
        ? '—' : `${Number(stats.avgEngagement).toFixed(2)}%`,
      icon: 'favorite',
    },
    { label: 'With Metrics', value: `${stats?.withMetrics ?? 0}/${stats?.total ?? 0}`, icon: 'query_stats' },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {tiles.map(t => (
        <div key={t.label} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{t.label}</p>
            <span className="material-symbols-outlined text-[18px] text-neutral-300 dark:text-neutral-600">{t.icon}</span>
          </div>
          <p className="mt-1 text-2xl font-black tabular-nums text-neutral-900 dark:text-neutral-100">{t.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Module ──────────────────────────────────────────────────────────────────
/**
 * Mounted by the module registry, which passes only token and department, so
 * the roster sources its own pipeline stages and permission check.
 */
export default function InfluencersModule({ token, department }) {
  const { projectId } = useProjectScope();
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(user?.role);
  const [statuses] = useStatusOptions(token, department);

  const [view, setView]         = useState('roster');   // 'roster' | 'import'
  const [rows, setRows]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);

  const [searchInput, setSearch]  = useState('');
  const [platformFilter, setPlatform] = useState('');
  const [tierFilter, setTier]     = useState('');
  const [statusFilter, setStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Debounced so typing does not fire a request per keystroke.
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setQuery(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (department && department !== 'all') params.set('department', department);
      if (query) params.set('search', query);
      if (platformFilter) params.set('platform', platformFilter);
      if (tierFilter) params.set('tier', tierFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (projectId && projectId !== 'all') params.set('projectId', projectId);

      // The stats tiles must answer for the same set the table below lists, so
      // they take the same department and project scope.
      const statsParams = new URLSearchParams();
      if (department && department !== 'all') statsParams.set('department', department);
      if (projectId && projectId !== 'all') statsParams.set('projectId', projectId);
      const statsQuery = statsParams.toString();

      const [list, s] = await Promise.all([
        apiFetch(`/influencers?${params}`, token),
        apiFetch(`/influencers/stats${statsQuery ? `?${statsQuery}` : ''}`, token),
      ]);
      setRows(list.data || []);
      setTotal(list.total || 0);
      setStats(s.data || null);
    } catch (err) {
      toast.error(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, department, query, platformFilter, tierFilter, statusFilter, page, projectId, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Archive ${row.name}? They stay in reports and keep their import history.`)) return;
    try {
      await apiFetch(`/influencers/${row._id}`, token, { method: 'DELETE' });
      toast.success('Influencer archived');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statusOptions = useMemo(
    () => statuses.map(s => ({ value: s.name, label: s.name })), [statuses]);

  if (view === 'import') {
    return (
      <div className="space-y-4">
        <Button variant="secondary" size="sm" onClick={() => { setView('roster'); load(); }}
          icon={<span className="material-symbols-outlined text-base">arrow_back</span>}>
          Back to roster
        </Button>
        <ImportModule token={token} department={department} config={INFLUENCER_IMPORT} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InfluencerFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSaved={load}
        token={token}
        editData={editTarget}
        statuses={statuses}
      />

      <StatTiles stats={stats} />

      <SectionCard
        title={`Influencers${total ? ` (${total})` : ''}`}
        icon="diversity_3"
        description="Creators and bloggers engaged for campaigns, with reach, engagement and rate card."
        loading={loading}
        empty={!loading && rows.length === 0}
        emptyIcon="diversity_3"
        emptyTitle="No influencers yet"
        emptyDescription="Add a creator by hand, or upload a spreadsheet of them"
        emptyAction={{ label: 'Upload Spreadsheet', onClick: () => setView('import') }}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">search</span>
              <input
                value={searchInput}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search influencers…"
                aria-label="Search influencers"
                className="h-9 w-full min-w-[9rem] rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:w-44"
              />
            </div>
            <select value={platformFilter} onChange={e => { setPlatform(e.target.value); setPage(1); }}
              aria-label="Filter by platform"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
              <option value="">All platforms</option>
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={tierFilter} onChange={e => { setTier(e.target.value); setPage(1); }}
              aria-label="Filter by tier"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
              <option value="">All tiers</option>
              {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {statusOptions.length > 0 && (
              <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
                aria-label="Filter by status"
                className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                <option value="">All statuses</option>
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
            <Button variant="secondary" size="sm" onClick={() => setView('import')}
              icon={<span className="material-symbols-outlined text-base">upload_file</span>}>
              Upload
            </Button>
            <Button variant="accent" size="sm" onClick={() => { setEditTarget(null); setModalOpen(true); }}
              icon={<span className="material-symbols-outlined text-base">add</span>}>
              Add
            </Button>
          </div>
        }
      >
        <div className="crm-scroll-thin overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-800">
              <tr>
                {['Influencer', 'Platform', 'Posts', 'Followers', 'ER %', 'Tier', 'Rate / Post', 'Dept', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map(r => (
                <tr key={r._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</div>
                    <div className="text-xs text-neutral-500">
                      {r.handle ? `@${r.handle}` : r.email || '—'}
                      {r.category ? ` · ${r.category}` : ''}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                      <span className="material-symbols-outlined text-[16px]">{PLATFORM_ICON[r.platform] || 'public'}</span>
                      <span className="capitalize">{r.platform}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.postCount
                      ? <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-bold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                          <span className="material-symbols-outlined text-[14px]">movie</span>{r.postCount}
                        </span>
                      : <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-neutral-700 dark:text-neutral-300">
                    {r.followers === null || r.followers === undefined ? '—' : compactNumber(r.followers)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-neutral-700 dark:text-neutral-300">
                    {r.engagementRate === null || r.engagementRate === undefined ? '—' : `${r.engagementRate}%`}
                  </td>
                  <td className="px-3 py-2">
                    {r.tier ? <StatusBadge tone={TIER_TONE[r.tier] || 'neutral'} label={r.tier} dot={false} /> : '—'}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-neutral-700 dark:text-neutral-300">
                    {money(r.ratePerPost, r.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={DEPT_BADGE_TONE[r.department] || 'neutral'} label={r.department} dot={false} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={PRIORITY_TONE[r.priority] || 'neutral'} label={r.status} dot={false} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => { setEditTarget(r); setModalOpen(true); }}
                        aria-label={`Edit ${r.name}`}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => remove(r)}
                          aria-label={`Archive ${r.name}`}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                        >
                          <span className="material-symbols-outlined text-[18px]">archive</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="mt-3">
            <Pagination
              page={page}
              total={total}
              totalPages={Math.ceil(total / 20)}
              onPageChange={setPage}
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
