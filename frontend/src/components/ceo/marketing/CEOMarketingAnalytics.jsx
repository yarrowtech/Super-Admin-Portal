import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import DataTable from '../../ui/DataTable';
import Drawer from '../../ui/Drawer';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import SectionCard from '../../ui/SectionCard';
import Skeleton from '../../ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { marketingAnalyticsApi } from '../../../services/marketingAnalytics';
import { normalizeMarketingData } from './normalizeMarketingData';

// The map is the heaviest dependency on the page (Leaflet + tiles), so it loads in its own
// chunk rather than in the CEO portal's main bundle.
const IndiaMarketingMap = lazy(() => import('./IndiaMarketingMap'));
// Likewise the import workflow: most visits never open it, so its drawer, tables and
// upload handling stay out of the page's chunk until the button is pressed.
const MarketingImportDrawer = lazy(() => import('./MarketingImportDrawer'));

const card = 'rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950';

const fmt = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0);
// Large figures read better abbreviated on a KPI card: 1.82M, 348K.
const compact = (n) => {
  const value = Number(n) || 0;
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)}Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)}L`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return fmt(value);
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
// Axis labels stay short so a month of ticks does not overlap; the tooltip shows the full date.
const fmtAxisDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '');
const unwrap = (res) => (res && typeof res === 'object' && 'data' in res ? res.data : res);
const iso = (d) => d.toISOString().slice(0, 10);

// Channel palette. Fixed per channel so a channel keeps its colour between the donut and
// any other chart on the page.
const CHANNEL_COLORS = ['#2563eb', '#7c3aed', '#059669', '#f59e0b', '#dc2626', '#0891b2', '#db2777', '#65a30d'];

const ALL = 'all';
const today = new Date();
const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

const emptyFilters = {
  projectId: ALL,
  startDate: iso(thirtyDaysAgo),
  endDate: iso(today),
  channel: ALL,
  state: ALL,
  city: ALL,
  campaign: ALL,
  status: ALL,
};

// Professional loading state (§17): the real layout in skeleton form, so the page does not
// jump when data arrives.
const LoadingState = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
    </div>
    <Skeleton className="h-130" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
    </div>
  </div>
);

const toOptions = (values = [], allLabel) => [
  { value: ALL, label: allLabel },
  ...values.map((v) => ({ value: v, label: v })),
];

const CEOMarketingAnalytics = () => {
  const { token, user } = useAuth();

  const [filters, setFilters] = useState(emptyFilters);
  // `applied` is what the API is called with; `filters` is what the form holds. Keeping
  // them separate is what makes "Apply Filters" meaningful instead of refetching on
  // every keystroke.
  const [applied, setApplied] = useState(emptyFilters);
  const [projects, setProjects] = useState([]);
  const [projectsError, setProjectsError] = useState(null);
  const [status, setStatus] = useState(null);
  const [data, setData] = useState(null);
  // Nothing loads until the user asks for it (§3, §15): selecting a project and pressing
  // Load is the trigger, so the page opens on the selector rather than on a spinner for
  // data nobody has chosen yet.
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [contacts, setContacts] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  // The activity rollup is already capped server-side, so searching and paging it in the
  // browser costs nothing and avoids a request per keystroke.
  const [activitySearch, setActivitySearch] = useState('');
  const [activityPageNo, setActivityPageNo] = useState(1);
  // Filters start open (there is nothing else to look at yet) and collapse once the
  // dashboard has data, so eight controls do not compete with the analytics they produced.
  const [showFilters, setShowFilters] = useState(true);
  const [drawerContact, setDrawerContact] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Spreadsheet-imported records, kept separate from the platform response so the two
  // sources stay distinguishable on the map and in the "Imported Data" badge.
  const [importOpen, setImportOpen] = useState(false);
  const [imported, setImported] = useState(null);
  // Bumped after a successful import so the points refetch without a page reload (§20).
  const [importKey, setImportKey] = useState(0);
  // The View Details drawer (§34). `city` null means closed; 'unmapped' is the §32 variant
  // showing records no marker could represent.
  const [detail, setDetail] = useState(null);
  const [detailRows, setDetailRows] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(1);

  // Whether the integration is configured at all. Asked first, so a deployment without
  // credentials gets an explanation rather than a failed data call.
  useEffect(() => {
    let alive = true;
    marketingAnalyticsApi.getStatus(token)
      .then((res) => { if (alive) setStatus(unwrap(res)); })
      .catch(() => { if (alive) setStatus({ configured: false }); });
    return () => { alive = false; };
  }, [token]);

  // Projects come from OUR project database — the master source — not the marketing
  // platform, so the selector is populated and usable even with no platform configured.
  // A failure here is surfaced rather than swallowed: an unexplained empty dropdown is
  // the hardest kind of broken to diagnose.
  useEffect(() => {
    let alive = true;
    marketingAnalyticsApi.getProjects(token)
      .then((res) => {
        if (!alive) return;
        setProjects(unwrap(res) || []);
        setProjectsError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setProjects([]);
        setProjectsError(err?.message || 'Could not load the project list');
      });
    return () => { alive = false; };
  }, [token]);

  // Bumped by Load / Refresh / Retry. Incrementing this is the only thing that starts a
  // fetch, which is what makes project selection the trigger rather than page mount.
  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => {
    setLoading(true);
    setHasLoaded(true);
    setReloadKey((k) => k + 1);
  }, []);

  // Applies a filter change and immediately reloads — used by the in-page drill-downs
  // (clicking a state or a map marker), where a second click on "Load" would be friction.
  // Before the first load it only stages the filters, so a drill-down cannot fire a
  // request for a project that has not been chosen.
  const applyFilterSet = useCallback((next) => {
    setFilters(next);
    setApplied(next);
    setSelectedLocation(null);
    if (hasLoaded) { setLoading(true); setReloadKey((k) => k + 1); }
  }, [hasLoaded]);

  // The dashboard fetch. `alive` guards against a slow response for old filters landing
  // after a newer one and overwriting the page with stale figures.
  useEffect(() => {
    // reloadKey 0 means nothing has been requested yet — the initial state (§15).
    if (!reloadKey) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await marketingAnalyticsApi.getAnalytics(token, applied, { page: 1, limit: 25 });
        if (!alive) return;
        // Normalised once here (§25); no section below touches the raw response.
        const payload = normalizeMarketingData(unwrap(res));
        setData(payload);
        setContacts(payload.contacts);
        setError(null);
        setPage(1);
        setLastUpdated(new Date());
        // Hand the screen over to the analytics once they exist; the Filters button
        // reopens the panel on demand.
        setShowFilters(false);
      } catch (err) {
        if (!alive) return;
        // The backend distinguishes "not configured" from "unreachable"; carry that
        // through so the UI can offer Retry only where it would help. The selected
        // project is deliberately left untouched (§17).
        setError({
          message: err?.message || 'Unable to load marketing data',
          code: err?.code || err?.data?.code,
          retryable: err?.retryable !== false,
        });
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, applied, reloadKey]);

  // Debounced search, so typing does not fire a request per character (§19).
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Contacts are paged and searched on their own endpoint, so the charts above are not
  // recomputed when the table changes.
  useEffect(() => {
    if (!data || !reloadKey) return undefined;
    let alive = true;
    marketingAnalyticsApi.getContacts(token, applied, { page, limit: 25, search: searchTerm })
      .then((res) => { if (alive) setContacts(unwrap(res)); })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, applied, page, searchTerm]);

  // Imported points for the selected project. Keyed on the project rather than on the full
  // filter set, because an import carries no campaign, channel or date — filtering it by
  // those would silently hide every imported record. A failure is swallowed: imported data
  // is additive, and an error here must not take down the platform dashboard beside it.
  useEffect(() => {
    let alive = true;
    (async () => {
      // "All Projects" is a filter, not a project (§2): the server expands it to the set
      // the caller is authorised to see, so it is a real query rather than a reason to
      // show nothing.
      const projectId = applied.projectId || ALL;
      try {
        const res = await marketingAnalyticsApi.getImportedPoints(token, projectId);
        if (alive) setImported(unwrap(res));
      } catch {
        if (alive) setImported(null);
      }
    })();
    return () => { alive = false; };
  }, [token, applied.projectId, importKey]);

  // Records for the open detail drawer. Paged on the server (§34): a city can hold
  // thousands of rows, and the drawer is for inspection, not bulk export.
  useEffect(() => {
    if (!detail) return undefined;
    let alive = true;
    (async () => {
      setDetailLoading(true);
      try {
        const res = detail.city === 'unmapped'
          ? await marketingAnalyticsApi.getUnmappedRecords(token, applied.projectId, { page: detailPage })
          : await marketingAnalyticsApi.getLocationRecords(token, applied.projectId, detail.city, { page: detailPage });
        if (alive) setDetailRows(unwrap(res));
      } catch (err) {
        if (alive) setDetailRows({ error: err?.message || 'Could not load these records' });
      } finally {
        if (alive) setDetailLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, applied.projectId, detail, detailPage]);

  const openDetail = useCallback((point) => {
    setDetail({ city: point.location, state: point.state, point });
    setDetailRows(null);
    setDetailPage(1);
  }, []);

  const openUnmapped = useCallback(() => {
    setDetail({ city: 'unmapped' });
    setDetailRows(null);
    setDetailPage(1);
  }, []);

  const openContact = async (row) => {
    if (!row?.id) return;
    setDrawerLoading(true);
    setDrawerContact({ id: row.id });
    try {
      setDrawerContact(unwrap(await marketingAnalyticsApi.getContact(token, row.id, applied)));
    } catch {
      setDrawerContact({ id: row.id, error: 'Could not load this contact' });
    } finally {
      setDrawerLoading(false);
    }
  };

  const summary = data?.summary;
  const facets = data?.facets || {};
  const projectOptions = useMemo(
    () => [{ value: ALL, label: 'All Projects' }, ...projects.map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name }))],
    [projects]
  );
  const activeProjectName = projectOptions.find((o) => o.value === applied.projectId)?.label || 'All Projects';
  const filtersDirty = JSON.stringify(filters) !== JSON.stringify(applied);
  // Narrowing filters only — the project and the date window are always set, so counting
  // them would make the badge read "3" on a page nobody has filtered.
  const activeFilterCount = ['channel', 'state', 'city', 'campaign', 'status']
    .filter((key) => filters[key] && filters[key] !== ALL).length;

  // Every figure is derived from the API response; none is hardcoded (§19). A count's
  // period-on-period change reads better as an absolute than a percentage, so those are
  // rendered as context rather than a trend arrow.
  const absoluteDelta = (value, suffix) =>
    value === null || value === undefined ? suffix : `${value >= 0 ? '+' : ''}${value} vs previous period`;

  // ── Activity table: search, then page ─────────────────────────────────────
  const ACTIVITY_PAGE_SIZE = 20;
  const activityRows = useMemo(() => {
    const rows = data?.activity || [];
    const term = activitySearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.city, r.state, r.campaign, r.channel, r.status].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [data, activitySearch]);
  const activityTotalPages = Math.max(1, Math.ceil(activityRows.length / ACTIVITY_PAGE_SIZE));
  // Clamped rather than reset: a search that shrinks the result set should not silently
  // leave the user on an empty page beyond the end.
  const safeActivityPage = Math.min(activityPageNo, activityTotalPages);
  const activityPage = useMemo(
    () => activityRows.slice((safeActivityPage - 1) * ACTIVITY_PAGE_SIZE, safeActivityPage * ACTIVITY_PAGE_SIZE),
    [activityRows, safeActivityPage]
  );

  // Money the platform has not reported reads "Not reported" — never ₹0, which would be a
  // confident wrong number rather than an honest gap.
  const NOT_REPORTED = 'Not reported';
  const money = (value) => (value === null || value === undefined
    ? NOT_REPORTED
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value));

  // ── Map points: platform + imported (§10, §11) ────────────────────────────
  // One map, two sources (§10 forbids a second map). Imported records are folded into the
  // same point list the platform produces, merged by city so a city present in both shows
  // as one bubble rather than two stacked at the same coordinate.
  //
  // `activities` is the map's weight, so imported records contribute to bubble size and to
  // heatmap intensity on the same scale as platform activity. `schools` and `records` ride
  // along for the marker's own labelling. Nothing per-contact is carried — the endpoint
  // does not return it.
  const mapPoints = useMemo(() => {
    const platform = data?.map?.points || [];
    const importedPoints = imported?.points || [];
    if (!importedPoints.length) return platform;

    const byCity = new Map();
    for (const point of platform) {
      byCity.set(`${point.location}|${point.state || ''}`.toLowerCase(), { ...point });
    }
    for (const row of importedPoints) {
      const key = `${row.location}|${row.state || ''}`.toLowerCase();
      const existing = byCity.get(key);
      if (existing) {
        existing.activities = (existing.activities || existing.leads || 0) + row.records;
        existing.importedRecords = row.records;
        existing.importedSchools = row.schools;
      } else {
        byCity.set(key, {
          location: row.location,
          state: row.state,
          latitude: row.latitude,
          longitude: row.longitude,
          // An imported point has no platform metrics; its record count is its only volume,
          // and leaving leads/conversions at 0 is accurate rather than a guess.
          activities: row.records,
          leads: 0,
          engagement: 0,
          conversions: 0,
          conversionRate: 0,
          campaigns: 0,
          channelCount: 0,
          channels: {},
          spend: null,
          importedRecords: row.records,
          importedSchools: row.schools,
          importedOnly: true,
        });
      }
    }
    return [...byCity.values()].sort((a, b) => (b.activities || 0) - (a.activities || 0));
  }, [data, imported]);

  // Records neither source could place. Both are honest about their own gaps, so they add.
  const unplacedTotal = (data?.map?.unplaced || 0) + (imported?.unresolved || 0);
  const hasImported = Boolean(imported?.total);

  // ── Map summary (§28) ─────────────────────────────────────────────────────
  // Every figure is counted from the two payloads already on screen; none is estimated.
  // Shown above the map so the user can read the shape of the data before interacting.
  const mapSummary = useMemo(() => {
    const placed = mapPoints.length;
    const importedTotal = imported?.total || 0;
    const platformRecords = data?.summary?.activities || 0;
    const records = platformRecords + importedTotal;
    if (!records && !placed) return null;
    const mappable = records - unplacedTotal;
    const rows = [
      { label: 'Locations', value: fmt(placed) },
      { label: 'Records', value: compact(records) },
    ];
    if (imported?.schools) rows.push({ label: 'Schools', value: fmt(imported.schools) });
    if (records > 0) {
      rows.push({
        label: 'Mapped',
        value: `${Math.round((mappable / records) * 1000) / 10}%`,
        tone: 'good',
      });
      if (unplacedTotal > 0) {
        rows.push({
          label: 'Unmapped',
          value: `${Math.round((unplacedTotal / records) * 1000) / 10}%`,
          tone: 'warn',
        });
      }
    }
    return rows;
  }, [mapPoints, imported, data, unplacedTotal]);

  // ── Executive insights (§7) ───────────────────────────────────────────────
  // Each headline is computed from the response the charts already use, and is emitted
  // only when the data genuinely supports it: a single location is not a "strongest
  // market", and a channel with two leads is not the "best channel". Thresholds are
  // deliberate — an insight nobody can trust is worse than an empty panel.
  const insights = useMemo(() => {
    if (!data || !summary || summary.leads === 0) return [];
    const out = [];
    const MIN_SAMPLE = 10;

    const topLocation = data.map.points[0];
    if (topLocation && data.map.points.length > 1 && summary.leads >= MIN_SAMPLE) {
      const share = Math.round((topLocation.leads / summary.leads) * 1000) / 10;
      out.push({
        label: 'Strongest market', icon: 'emoji_events', tone: 'text-emerald-700 dark:text-emerald-300',
        body: `${topLocation.location} generated ${share}% of leads (${fmt(topLocation.leads)} of ${fmt(summary.leads)}) across ${fmt(data.map.points.length)} locations.`,
      });
    }

    // Best channel by conversion rate, not volume — and only among channels with enough
    // leads for a rate to mean anything.
    const rated = data.channels.filter((c) => c.leads >= MIN_SAMPLE);
    if (rated.length > 1) {
      const best = rated.slice().sort((a, b) => b.conversionRate - a.conversionRate)[0];
      if (best.conversionRate > 0) {
        out.push({
          label: 'Best channel', icon: 'hub', tone: 'text-blue-700 dark:text-blue-300',
          body: `${best.channel} converts at ${best.conversionRate}% — the highest of ${fmt(rated.length)} channels with meaningful volume.`,
        });
      }
    }

    // Attention: high activity with no conversions is the pattern worth surfacing.
    const unconverting = data.states
      .filter((s) => s.leads >= MIN_SAMPLE && s.conversions === 0)
      .sort((a, b) => b.leads - a.leads)[0];
    if (unconverting) {
      out.push({
        label: 'Attention required', icon: 'warning', tone: 'text-amber-700 dark:text-amber-300',
        body: `${unconverting.state} produced ${fmt(unconverting.leads)} leads with no conversions recorded in this period.`,
      });
    }

    // Concentration risk, only when there is enough spread for it to be a real finding.
    if (data.states.length >= 3 && data.states[0].share >= 50) {
      out.push({
        label: 'Concentration', icon: 'pie_chart', tone: 'text-neutral-700 dark:text-neutral-300',
        body: `${data.states[0].state} accounts for ${data.states[0].share}% of all activity — results depend heavily on one state.`,
      });
    }

    if (summary.spend === null) {
      out.push({
        label: 'Data gap', icon: 'info', tone: 'text-neutral-600 dark:text-neutral-400',
        body: 'The platform reports no cost or revenue data, so spend, cost per lead and ROAS cannot be calculated.',
      });
    }
    return out;
  }, [data, summary]);

  const kpis = summary ? [
    { title: 'Total Activities', value: compact(summary.activities), icon: 'campaign', trend: summary.deltas?.reach, context: 'marketing touches delivered' },
    { title: 'Leads', value: fmt(summary.leads), icon: 'group_add', trend: summary.deltas?.leads, context: `${fmt(summary.states)} state${summary.states === 1 ? '' : 's'}` },
    { title: 'Conversions', value: fmt(summary.conversions), icon: 'verified', trend: summary.deltas?.conversions, context: 'leads that converted' },
    { title: 'Conversion Rate', value: `${summary.conversionRate}%`, icon: 'percent', context: `${fmt(summary.conversions)} of ${fmt(summary.leads)} leads` },
    { title: 'Campaigns', value: fmt(data.campaigns.length), icon: 'ads_click', context: `${fmt(data.channels.length)} channel${data.channels.length === 1 ? '' : 's'} in use` },
    { title: 'Active Locations', value: fmt(summary.cities), icon: 'location_city', context: absoluteDelta(summary.deltas?.cities, 'cities with activity') },
    {
      title: 'Spend', value: money(summary.spend), icon: 'payments',
      context: summary.spend === null ? 'platform reports no cost data' : 'in the selected period',
    },
    {
      title: 'Cost / Lead', value: money(summary.costPerLead), icon: 'price_check',
      context: summary.costPerLead === null ? 'needs spend data' : `across ${fmt(summary.leads)} leads`,
    },
    {
      title: 'ROAS', value: summary.roas === null ? NOT_REPORTED : `${summary.roas}x`, icon: 'trending_up',
      context: summary.roas === null ? 'needs spend and revenue data' : `on ${money(summary.spend)} spend`,
    },
  ] : [];


  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortalHeader
          title="Marketing Analytics"
          subtitle={`${activeProjectName} · ${fmtDate(applied.startDate)} – ${fmtDate(applied.endDate)}`}
          icon="trending_up"
          user={user}
          showSearch={false}
          showNotifications
          showThemeToggle
        />

        {/* ── Project + filters (§3, §16) ──────────────────────────────── */}
        {/* The platform connection is a small indicator, never the page itself (§1): the
            selector is what the CEO came here for, so it stays the first thing visible. */}
        <section className={card}>
          <div className="p-4 lg:p-5">
            {/* Control bar: the project is the dominant control and sits with the primary
                action, so the decision and the trigger are one gesture. Connection state
                and the last-updated time ride along as small metadata — informative, never
                the subject of the page. */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
              <div className="min-w-0 flex-1">
                <Select
                  label="Project"
                  value={filters.projectId}
                  // Switching project clears the loaded dashboard. Leaving the previous
                  // project's charts on screen under a different project name in the
                  // selector would be actively misleading.
                  onChange={(e) => {
                    const projectId = e.target.value;
                    setFilters((f) => ({ ...f, projectId }));
                    if (projectId !== applied.projectId) {
                      setData(null);
                      setContacts(null);
                      setSelectedLocation(null);
                      setError(null);
                      setLastUpdated(null);
                      setActivitySearch('');
                      setActivityPageNo(1);
                      setHasLoaded(false);
                      setShowFilters(true);
                    }
                  }}
                  options={projectOptions}
                  className="text-base font-semibold"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button" variant="primary" size="sm"
                  onClick={() => { setApplied(filters); load(); }}
                  disabled={loading || (hasLoaded && !filtersDirty)}
                >
                  <span className="material-symbols-outlined mr-1 text-[16px]">
                    {hasLoaded ? 'filter_alt' : 'travel_explore'}
                  </span>
                  {loading ? 'Loading…' : hasLoaded ? 'Apply Filters' : 'Load Marketing Data'}
                </Button>
                {hasLoaded && (
                  <Button type="button" variant="secondary" size="sm" onClick={load} disabled={loading} aria-label="Refresh marketing data">
                    <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                  </Button>
                )}
                {/* Secondary to Load (§29): importing is a deliberate, occasional action,
                    so it sits beside the primary trigger without competing with it. */}
                <Button type="button" variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                  <span className="material-symbols-outlined mr-1 text-[16px]">upload_file</span>
                  Import Marketing Data
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters} aria-controls="marketing-filter-panel">
                  <span className="material-symbols-outlined mr-1 text-[16px]">tune</span>
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              {status && (
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 font-bold ${
                    status.configured
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                  title={status.configured
                    ? 'Marketing platform connection is configured on the server.'
                    : 'Marketing platform connection is configured on the server. No connection is currently set.'}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${status.configured ? 'bg-emerald-500' : 'bg-neutral-400'}`} aria-hidden="true" />
                  {status.configured ? 'Connected' : 'Not connected'}
                </span>
              )}
              {hasLoaded && <span>{activeProjectName}</span>}
              <span>{fmtDate(applied.startDate)} – {fmtDate(applied.endDate)}</span>
              {lastUpdated && (
                <span>Last updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {/* §21 — a subtle badge, so it is clear the map is showing more than the
                  platform's own data without the fact dominating the control bar. */}
              {hasImported && (
                <span
                  className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2 py-0.5 font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  title={`${fmt(imported.total)} imported record${imported.total === 1 ? '' : 's'} in this project, ${fmt(imported.total - imported.unresolved)} placed on the map.`}
                >
                  <span className="material-symbols-outlined text-[13px]">upload_file</span>
                  Imported data · {fmt(imported.total)} record{imported.total === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {projectsError && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
                <span className="material-symbols-outlined text-[15px]">error</span>
                <span>{projectsError}. The project list comes from the project database, not the marketing platform.</span>
              </p>
            )}

            {/* Non-blocking warning, placed where it is relevant rather than over the page. */}
            {status && !status.configured && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <span className="material-symbols-outlined text-[15px]">warning</span>
                <span>
                  Marketing data source is not configured. Configure the server connection to load live
                  marketing data — the dashboard below stays available.
                </span>
              </p>
            )}

            {/* Filters collapse by default once data is loaded: eight controls are noise
                next to the analytics they produced. */}
            <div
              id="marketing-filter-panel"
              hidden={!showFilters}
              className="mt-4 grid grid-cols-1 gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-neutral-800"
            >
              <Input label="From" type="date" value={filters.startDate} max={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} />
              <Input label="To" type="date" value={filters.endDate} min={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} />
              <Select label="Channel" value={filters.channel}
                onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value }))}
                options={toOptions(facets.channels, 'All Channels')} />
              <Select label="State" value={filters.state}
                onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
                options={toOptions(facets.states, 'All States')} />
              <Select label="Status" value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                options={toOptions(facets.statuses, 'All Status')} />
              <Select label="City" value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                options={toOptions(facets.cities, 'All Cities')} />
              <Select label="Campaign" value={filters.campaign}
                onChange={(e) => setFilters((f) => ({ ...f, campaign: e.target.value }))}
                options={toOptions(facets.campaigns, 'All Campaigns')} />
              <div className="flex items-end">
                <Button type="button" variant="secondary" size="sm" onClick={() => applyFilterSet(emptyFilters)}
                  disabled={activeFilterCount === 0}>
                  Reset filters
                </Button>
              </div>
            </div>
            {hasLoaded && filtersDirty && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Filters changed — select Apply Filters to update the dashboard.
              </p>
            )}
          </div>
        </section>

        {/* ── Error (§17) ──────────────────────────────────────────────── */}
        {error && (
          <ErrorState
            title="Unable to load marketing data"
            description={
              error.code === 'MARKETING_PLATFORM_NOT_CONFIGURED'
                ? 'The external marketing platform is not configured on the server.'
                : `${error.message} The external marketing platform could not be reached.`
            }
            onRetry={error.retryable ? load : undefined}
          />
        )}

        {loading && !data && <LoadingState />}

        {/* ── Initial state (§15) ──────────────────────────────────────── */}
        {/* A real but empty India map, so the page reads as ready rather than broken —
            and deliberately no markers, because inventing points would be worse than
            showing none. */}
        {/* Imported records need no platform load to be shown — they are in our own
            database — so an import made before pressing Load still appears here, and the
            "choose a project" overlay only covers a map that genuinely has nothing on it. */}
        {!hasLoaded && !loading && !error && (
          <SectionCard
            title="India Marketing Activity"
            icon="public"
            description={hasImported
              ? 'Showing imported records. Load marketing data to add activity from the marketing platform.'
              : 'Select a project above and load its data to plot marketing activity across India.'}
          >
            <div className="relative">
              <Suspense fallback={<Skeleton className="h-130" />}>
                <IndiaMarketingMap
                  points={mapPoints}
                  unplaced={unplacedTotal}
                  selectedLocation={selectedLocation?.location || ''}
                  onSelectLocation={hasImported ? setSelectedLocation : undefined}
                />
              </Suspense>
              {!hasImported && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-xl bg-white/92 px-5 py-4 text-center shadow-lg dark:bg-neutral-900/92">
                    <span className="material-symbols-outlined text-3xl text-neutral-400">travel_explore</span>
                    <p className="mt-1 text-sm font-bold text-neutral-800 dark:text-neutral-100">No project selected</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      Choose a project to see where its marketing is running.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── No data (§18) ───────────────────────────────────────────── */}
        {/* Names the project and the remedy, and keeps a real (empty) map on screen
            rather than replacing it with a bare message. */}
        {/* Imported data is independent of the platform, so a project with imported records
            and no platform activity still gets a real, populated map rather than an empty
            one behind an "no activity" message. */}
        {!loading && !error && summary && summary.leads === 0 && (
          <SectionCard
            title="India Marketing Activity"
            icon="public"
            description={hasImported ? 'Showing imported records. The marketing platform reported no activity for this period.' : undefined}
          >
            {!hasImported && (
              <EmptyState
                icon="query_stats"
                title="No marketing activity"
                description={`No marketing activity is available for ${activeProjectName} during the selected period. Try changing the date range or the marketing channel.`}
              />
            )}
            <div className={hasImported ? '' : 'mt-3 opacity-60'}>
              <Suspense fallback={<Skeleton className="h-130" />}>
                <IndiaMarketingMap
                  points={mapPoints}
                  unplaced={unplacedTotal}
                  selectedLocation={selectedLocation?.location || ''}
                  onSelectLocation={hasImported ? setSelectedLocation : undefined}
                  height={hasImported ? 520 : 320}
                />
              </Suspense>
            </div>
          </SectionCard>
        )}

        {!error && summary && summary.leads > 0 && (
          <>
            {/* ── KPI cards (§10) ────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
              {kpis.map((kpi) => <KPICard key={kpi.title} {...kpi} />)}
            </div>

            {/* ── Marketing performance overview (§8) ────────────────── */}
            {/* Two series on one axis rather than four separate charts: activity volume
                carries the shape, conversions carry the outcome, and the gap between them
                is the story an executive is reading for. */}
            {data.trend.length > 1 && (
              <SectionCard
                title="Marketing Performance"
                icon="show_chart"
                description="Activity and conversions per day across the selected period"
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mkt-activity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => fmtAxisDate(d)} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} width={48} />
                      <RTooltip
                        formatter={(value, name) => [fmt(value), name]}
                        labelFormatter={(d) => fmtDate(d)}
                        contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid rgba(0,0,0,0.08)' }}
                      />
                      <Legend verticalAlign="top" height={28} iconType="plainline" />
                      <Area type="monotone" dataKey="activities" name="Activities" stroke="#2563eb" strokeWidth={2} fill="url(#mkt-activity)" />
                      <Area type="monotone" dataKey="leads" name="Leads" stroke="#7c3aed" strokeWidth={2} fill="transparent" />
                      <Area type="monotone" dataKey="conversions" name="Conversions" stroke="#059669" strokeWidth={2} fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            )}

            {/* ── Map + insight panel (§5, §7) ───────────────── */}
            {/* The map keeps the width it needs to be read, and the column beside it
                answers "so what" — a selected location's metrics when one is chosen,
                otherwise the computed headlines. On narrow screens the panel stacks under
                the map rather than squeezing it. */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
              <SectionCard
                title="Marketing Activity by Location"
                icon="public"
                description="Bubble size and colour show activity volume. Click a location for its breakdown."
                action={
                  applied.state !== ALL ? (
                    <Button type="button" size="sm" variant="secondary"
                      onClick={() => applyFilterSet({ ...applied, state: ALL })}>
                      Clear {applied.state}
                    </Button>
                  ) : null
                }
              >
                {/* §28 — a compact read of the data before the user touches the map. */}
                {mapSummary && (
                  <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
                    {mapSummary.map((row) => (
                      <div key={row.label}>
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{row.label}</dt>
                        <dd className={`text-base font-black tabular-nums ${
                          row.tone === 'good' ? 'text-emerald-700 dark:text-emerald-300'
                            : row.tone === 'warn' ? 'text-amber-700 dark:text-amber-300'
                              : 'text-neutral-900 dark:text-white'
                        }`}>
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                <Suspense fallback={<Skeleton className="h-130" />}>
                  <IndiaMarketingMap
                    points={mapPoints}
                    unplaced={unplacedTotal}
                    selectedState={applied.state === ALL ? '' : applied.state}
                    selectedLocation={selectedLocation?.location || ''}
                    onSelectLocation={setSelectedLocation}
                    onViewDetails={openDetail}
                    onViewUnmapped={hasImported ? openUnmapped : undefined}
                  />
                </Suspense>
              </SectionCard>

              <div className="space-y-4">
                {/* Selected-location metrics (§5/§6). Replaces the insights panel while a
                    location is chosen, because that is what the user just asked about. */}
                {selectedLocation ? (
                  <SectionCard
                    title={selectedLocation.location}
                    icon="place"
                    description={selectedLocation.state || undefined}
                    action={
                      <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedLocation(null)} aria-label="Clear selected location">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </Button>
                    }
                  >
                    <dl className="space-y-2">
                      {[
                        // Platform metrics are omitted entirely for an imported-only
                        // location: it has none, and a column of zeroes would read as a
                        // failed campaign rather than a different data source.
                        ...(selectedLocation.importedOnly ? [] : [
                          ['Activities', compact(selectedLocation.activities)],
                          ['Leads', fmt(selectedLocation.leads)],
                          ['Conversions', fmt(selectedLocation.conversions)],
                          ['Conversion rate', `${selectedLocation.conversionRate}%`],
                          ['Campaigns', fmt(selectedLocation.campaigns)],
                          ['Channels', fmt(selectedLocation.channelCount)],
                          ['Spend', money(selectedLocation.spend)],
                        ]),
                        ...(selectedLocation.importedSchools ? [['Schools (imported)', fmt(selectedLocation.importedSchools)]] : []),
                        ...(selectedLocation.importedRecords ? [['Records (imported)', fmt(selectedLocation.importedRecords)]] : []),
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-1.5 last:border-0 dark:border-neutral-800">
                          <dt className="text-xs text-neutral-500 dark:text-neutral-400">{label}</dt>
                          <dd className="text-sm font-bold text-neutral-900 dark:text-white">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    {Object.keys(selectedLocation.channels || {}).length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">By channel</p>
                        <ul className="space-y-1">
                          {Object.entries(selectedLocation.channels).sort((a, b) => b[1] - a[1]).map(([channel, count]) => (
                            <li key={channel} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-neutral-600 dark:text-neutral-300">{channel}</span>
                              <span className="font-bold text-neutral-900 dark:text-white">{fmt(count)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* §35 — straight into the records behind this location. Offered only
                        where there are imported records to show. */}
                    {selectedLocation.importedRecords > 0 && (
                      <Button type="button" size="sm" variant="primary" className="mt-3 w-full"
                        onClick={() => openDetail(selectedLocation)}>
                        <span className="material-symbols-outlined mr-1 text-[16px]">table_rows</span>
                        View {fmt(selectedLocation.importedRecords)} record{selectedLocation.importedRecords === 1 ? '' : 's'}
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="secondary" className="mt-2 w-full"
                      onClick={() => applyFilterSet({ ...applied, city: selectedLocation.location })}>
                      Filter dashboard to {selectedLocation.location}
                    </Button>
                  </SectionCard>
                ) : (
                  /* §7 — headlines computed from the same response the charts use. Each one
                     is stated only when the data supports it; nothing is inferred. */
                  <SectionCard title="Marketing Insights" icon="lightbulb" description="Computed from the current selection">
                    {insights.length ? (
                      <ul className="space-y-3">
                        {insights.map((insight) => (
                          <li key={insight.label}>
                            <p className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${insight.tone}`}>
                              <span className="material-symbols-outlined text-[14px]">{insight.icon}</span>
                              {insight.label}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">{insight.body}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Not enough activity in this selection to draw a reliable conclusion.
                      </p>
                    )}
                    {data.map.unplaced > 0 && (
                      <p className="mt-3 border-t border-neutral-100 pt-2 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                        {fmt(data.map.unplaced)} record{data.map.unplaced === 1 ? '' : 's'} could not be placed on the map and are
                        excluded from location figures, but are counted in the totals above.
                      </p>
                    )}
                  </SectionCard>
                )}
              </div>
            </div>

            {/* ── Channel + state analytics (§11, §13) ───────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard title="Marketing Channels" icon="donut_small" description="Share of leads by channel">
                {data.channels?.length ? (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data.channels} dataKey="leads" nameKey="channel" innerRadius="52%" outerRadius="80%" paddingAngle={2}>
                            {data.channels.map((entry, i) => (
                              <Cell key={entry.channel} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                            ))}
                          </Pie>
                          <RTooltip formatter={(value, name) => [`${fmt(value)} leads`, name]} />
                          <Legend verticalAlign="bottom" height={32} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {data.channels.map((channel, i) => (
                        <li key={channel.channel} className="flex items-center gap-3 text-sm">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} aria-hidden="true" />
                          <span className="w-28 shrink-0 font-semibold text-neutral-700 dark:text-neutral-200">{channel.channel}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <span className="block h-full rounded-full" style={{ width: `${channel.share}%`, backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                          </span>
                          <span className="w-24 shrink-0 text-right text-xs text-neutral-500">{fmt(channel.leads)} · {channel.share}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <EmptyState icon="donut_small" title="No channel activity" />}
              </SectionCard>

              <SectionCard title="Marketing Activity by State" icon="map" description="Click a state to focus the map on it">
                {data.states?.length ? (
                  <div className="h-88">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.states.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="state" type="category" width={110} tick={{ fontSize: 11 }} />
                        <RTooltip formatter={(value, _n, item) => [`${fmt(value)} leads (${item.payload.share}%)`, item.payload.state]} />
                        <Bar dataKey="leads" radius={[0, 4, 4, 0]} cursor="pointer"
                          onClick={(bar) => {
                            const next = { ...applied, state: bar?.payload?.state || ALL };
                            applyFilterSet(next);
                          }}>
                          {data.states.slice(0, 10).map((row) => (
                            <Cell key={row.state} fill={row.state === applied.state ? '#dc2626' : '#2563eb'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyState icon="map" title="No state activity" />}
              </SectionCard>
            </div>

            {/* ── Campaign + channel performance (§17) ───────────────── */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <SectionCard title="Campaign Performance" icon="campaign" description="Sorted by activity volume">
              <DataTable
                rows={data.campaigns}
                rowKey="campaign"
                emptyTitle="No campaigns in this period"
                columns={[
                  { key: 'campaign', header: 'Campaign', render: (r) => <span className="font-semibold">{r.campaign}</span> },
                  {
                    key: 'channel',
                    header: 'Channel',
                    // A campaign on several channels says so, rather than implying it ran on one.
                    render: (r) => (
                      <span className="flex items-center gap-1.5">
                        <StatusBadge status={r.channel} />
                        {r.channelMix > 1 && <span className="text-[10px] font-semibold text-neutral-500">+{r.channelMix - 1}</span>}
                      </span>
                    ),
                  },
                  { key: 'activities', header: 'Activities', render: (r) => compact(r.activities) },
                  { key: 'leads', header: 'Leads', render: (r) => fmt(r.leads) },
                  { key: 'conversions', header: 'Conversions', render: (r) => fmt(r.conversions) },
                  { key: 'conversionRate', header: 'Conv. rate', render: (r) => `${r.conversionRate}%` },
                  {
                    key: 'status',
                    header: 'Status',
                    // Null means the platform reported no state; saying so beats guessing.
                    render: (r) => (r.status ? <StatusBadge status={r.status} /> : <span className="text-xs text-neutral-400">Not reported</span>),
                  },
                ]}
              />
            </SectionCard>

            {/* The donut above answers "what share"; this answers "how well each performs",
                which is a different question and needs the numbers side by side. */}
            <SectionCard title="Channel Performance" icon="hub" description="Conversion rate by channel">
              <DataTable
                rows={data.channels}
                rowKey="channel"
                emptyTitle="No channel activity"
                columns={[
                  { key: 'channel', header: 'Channel', render: (r) => <span className="font-semibold">{r.channel}</span> },
                  { key: 'leads', header: 'Leads', render: (r) => fmt(r.leads) },
                  { key: 'conversions', header: 'Conv.', render: (r) => fmt(r.conversions) },
                  { key: 'conversionRate', header: 'Rate', render: (r) => `${r.conversionRate}%` },
                ]}
              />
            </SectionCard>
            </div>

            {/* ── Marketing activity (§18) ───────────────────────────── */}
            {/* Aggregated by day, location and channel — the detailed view a CEO can read
                without any row identifying a person. Contact-level data stays in the
                authorised table below. */}
            <SectionCard
              title="Marketing Activity"
              icon="table_rows"
              description={`Aggregated by day, location and channel · ${fmt(activityRows.length)} row${activityRows.length === 1 ? '' : 's'}`}
              action={
                <div className="w-56">
                  <Input
                    placeholder="Search city, campaign, channel…"
                    aria-label="Search marketing activity"
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                  />
                </div>
              }
            >
              <DataTable
                rows={activityPage}
                rowKey={(r) => `${r.date}-${r.city}-${r.channel}-${r.campaign}`}
                emptyTitle={activitySearch ? 'No activity matches that search' : 'No activity in this period'}
                columns={[
                  { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
                  { key: 'city', header: 'City', render: (r) => <span className="font-semibold">{r.city}</span> },
                  { key: 'state', header: 'State' },
                  { key: 'campaign', header: 'Campaign' },
                  { key: 'channel', header: 'Channel', render: (r) => <StatusBadge status={r.channel} /> },
                  { key: 'activities', header: 'Activities', render: (r) => compact(r.activities) },
                  { key: 'leads', header: 'Leads', render: (r) => fmt(r.leads) },
                  { key: 'conversions', header: 'Conv.', render: (r) => fmt(r.conversions) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
              {activityTotalPages > 1 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-neutral-500">
                    Page {safeActivityPage} of {activityTotalPages} · {fmt(activityRows.length)} rows
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" disabled={safeActivityPage <= 1}
                      onClick={() => setActivityPageNo(safeActivityPage - 1)}>Previous</Button>
                    <Button type="button" size="sm" variant="secondary" disabled={safeActivityPage >= activityTotalPages}
                      onClick={() => setActivityPageNo(safeActivityPage + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ── Contacts (§14) ─────────────────────────────────────── */}
            <SectionCard
              title="Marketing Contacts"
              icon="contacts"
              description="Contact details are masked here; open a record to see them in full."
              action={
                <div className="w-56">
                  <Input placeholder="Search name, email, city…" aria-label="Search contacts"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              }
            >
              <DataTable
                rows={contacts?.items || []}
                rowKey="id"
                onRowClick={openContact}
                emptyTitle={searchTerm ? 'No contacts match that search' : 'No contacts in this period'}
                columns={[
                  { key: 'name', header: 'Name', render: (r) => <span className="font-semibold">{r.name || '—'}</span> },
                  { key: 'email', header: 'Email', render: (r) => <span className="font-mono text-xs">{r.email || '—'}</span> },
                  { key: 'city', header: 'City' },
                  { key: 'state', header: 'State' },
                  { key: 'channel', header: 'Channel' },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'createdAt', header: 'First contact', render: (r) => fmtDate(r.createdAt) },
                ]}
              />
              {contacts?.pagination && contacts.pagination.totalPages > 1 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-neutral-500">
                    Page {contacts.pagination.page} of {contacts.pagination.totalPages} · {fmt(contacts.pagination.total)} contacts
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button type="button" size="sm" variant="secondary"
                      disabled={page >= contacts.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </SectionCard>
          </>
        )}

        {/* ── Contact detail drawer (§14) ──────────────────────────────── */}
        <Drawer
          open={Boolean(drawerContact)}
          title="Contact details"
          onClose={() => setDrawerContact(null)}
          className="p-5"
        >
          {drawerContact && (
            <>
              {drawerLoading ? (
                <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : drawerContact.error ? (
                <ErrorState description={drawerContact.error} />
              ) : (
                <dl className="space-y-4">
                  {[
                    ['Name', drawerContact.name],
                    ['Email', drawerContact.email],
                    ['Phone', drawerContact.phone],
                    ['Location', [drawerContact.city, drawerContact.state].filter(Boolean).join(', ')],
                    ['Pincode', drawerContact.pincode],
                    ['Address', drawerContact.address],
                    ['Project', drawerContact.projectName],
                    ['Campaign', drawerContact.campaign],
                    ['Channel', drawerContact.channel],
                    ['Source', drawerContact.source],
                    ['Status', drawerContact.status],
                    ['First contact', drawerContact.createdAt ? fmtDate(drawerContact.createdAt) : null],
                    ['Last activity', drawerContact.lastActivityAt ? fmtDate(drawerContact.lastActivityAt) : null],
                  ].filter(([, value]) => value).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
        </Drawer>

        {/* ── Location / unmapped records drawer (§34, §32) ────────────── */}
        {/* The authorised detail view. Reached by an explicit click on a marker or on the
            unmapped pill — never part of an aggregate payload, which is what keeps contact
            details off the map while still making them available to a CEO who asks. */}
        <Drawer
          open={Boolean(detail)}
          title={detail?.city === 'unmapped' ? 'Records without a location' : `${detail?.city || ''} — imported records`}
          onClose={() => { setDetail(null); setDetailRows(null); }}
          className="max-w-3xl p-5"
        >
          {detail && (
            <>
              <p className="-mt-1 mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                {detail.city === 'unmapped'
                  ? 'These records were imported and are counted in every total, but their location could not be resolved to coordinates, so they cannot be placed on the map. Correct the location in the source file and re-import to place them.'
                  : `${[detail.state, activeProjectName].filter(Boolean).join(' · ')}`}
              </p>

              {detail.city !== 'unmapped' && detail.point && (
                <dl className="mb-4 flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900">
                  {[
                    ['Records', fmt(detail.point.importedRecords || 0)],
                    ['Schools', fmt(detail.point.importedSchools || 0)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{label}</dt>
                      <dd className="text-base font-black tabular-nums text-neutral-900 dark:text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {detailLoading && !detailRows ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : detailRows?.error ? (
                <ErrorState description={detailRows.error} />
              ) : (
                <>
                  <DataTable
                    rows={detailRows?.items || []}
                    rowKey="id"
                    loading={detailLoading}
                    emptyTitle="No records"
                    columns={[
                      { key: 'school', header: 'School', render: (r) => <span className="font-semibold">{r.school}</span> },
                      { key: 'email', header: 'Email', render: (r) => <span className="font-mono text-xs">{r.email || '—'}</span> },
                      { key: 'location', header: 'Location (as imported)' },
                      ...(detail.city === 'unmapped' ? [] : [{
                        key: 'state', header: 'State', render: (r) => r.state || '—',
                      }]),
                      { key: 'sourceFile', header: 'Source file', render: (r) => <span className="text-xs text-neutral-500">{r.sourceFile || '—'}</span> },
                      { key: 'createdAt', header: 'Imported', render: (r) => fmtDate(r.createdAt) },
                    ]}
                  />
                  {detailRows?.pagination && detailRows.pagination.totalPages > 1 && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-neutral-500">
                        Page {detailRows.pagination.page} of {detailRows.pagination.totalPages} · {fmt(detailRows.pagination.total)} records
                      </p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="secondary" disabled={detailPage <= 1}
                          onClick={() => setDetailPage((p) => p - 1)}>Previous</Button>
                        <Button type="button" size="sm" variant="secondary"
                          disabled={detailPage >= detailRows.pagination.totalPages}
                          onClick={() => setDetailPage((p) => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </Drawer>

        {/* ── Import workflow (§2) ─────────────────────────────────────── */}
        {/* Mounted only while open, so the lazy chunk is fetched on first use and the
            drawer's state starts clean on every visit. */}
        {importOpen && (
          <Suspense fallback={null}>
            <MarketingImportDrawer
              open
              onClose={() => setImportOpen(false)}
              projectId={filters.projectId}
              // Real projects only — "All Projects" is not a destination an import can
              // belong to, so it is not offered as one.
              projects={projectOptions.filter((o) => o.value !== ALL).map((o) => ({ id: o.value, label: o.label }))}
              onImported={(res) => {
                // Follow the data: the drawer may have imported into a project other than
                // the one on screen, and showing the import on a different project's map
                // would be wrong. Switching the selection is what makes the new records
                // visible rather than silently filtered out.
                const target = res?.projectId;
                if (target && target !== applied.projectId) {
                  setFilters((f) => ({ ...f, projectId: target }));
                  setApplied((a) => ({ ...a, projectId: target }));
                }
                setImportKey((k) => k + 1);
              }}
            />
          </Suspense>
        )}
      </div>
    </main>
  );
};

export default CEOMarketingAnalytics;
