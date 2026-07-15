import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { findCanonicalProject, buildProjectSlugMap } from '../../config/projectNames';
import ThemeToggleButton from '../common/ThemeToggleButton';

const MEDIA_THEME = {
  '--portal-accent': '#0f766e',
  '--portal-accent-soft': '#ccfbf1',
  '--portal-accent-strong': '#134e4a',
};

const card = 'rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-neutral-800 dark:bg-neutral-900';
const soft = 'rounded-[1.25rem] border border-slate-200 bg-[#fbfeff] p-4 dark:border-neutral-800 dark:bg-neutral-900/60';
const sectionTitle = 'text-[11px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400';
const fieldLabel = 'text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
const inputCls = 'mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';
const textareaCls = `${inputCls} min-h-[96px] resize-y`;

const FRAMEWORK_PHASES = [
  { phase: 'Foundation Kit', hint: 'Before Launch' },
  { phase: 'Growth Kit', hint: 'Active Marketing' },
  { phase: 'Scaling Kit', hint: 'Growth Stage' },
];
const CHANNEL_CATEGORIES = ['Organic', 'Paid', 'Direct', 'Partnerships'];
const BUDGET_PHASES = ['Foundation', 'Growth', 'Scaling'];

const WEEKLY_CHECKLIST_TASKS = [
  'Website & Landing Pages', 'Vendor Onboarding', 'Google Analytics Setup', 'Meta Pixel Installation',
  'SEO Setup', 'Campaign Setup (Google Ads)', 'Campaign Setup (Meta Ads)', 'Social Media Content Plan',
  'Email Marketing Setup', 'WhatsApp Automation', 'Partnership Outreach', 'Content Published (Blog/Guides)',
  'Weekly Report & Dashboard',
];
const WEEKLY_UPDATE_WEEKS = [
  { week: 'Week 1', hint: 'Branding & Website' },
  { week: 'Week 2', hint: 'Vendor Onboarding & Partnerships' },
  { week: 'Week 3', hint: 'Campaign Setup' },
  { week: 'Week 4', hint: 'Lead Generation' },
  { week: 'Week 5', hint: 'Optimization' },
  { week: 'Week 6+', hint: 'Scaling & Expansion' },
];
const ACQUISITION_CHANNELS = [
  'Google Search Ads', 'Google Display Ads', 'Meta (Facebook) Ads', 'Instagram Ads', 'YouTube Ads',
  'Influencer Marketing', 'SEO & Content', 'Referral Program', 'Email & WhatsApp', 'Partnership Campaigns',
];
const FUNNEL_PERF_STAGES = [
  'Awareness (Impressions)', 'Website Visits', 'Registrations', 'Pass / Trip Planning', 'Bookings',
  'Paid Bookings', 'Retention', 'Referral',
];
const CONTENT_TRACKER_TYPES = [
  'Reels / Shorts', 'Social Media Posts', 'Blog Articles / Travel Guides', 'YouTube Videos',
  'Destination Spotlights', 'Email Campaigns', 'Vendor Stories', 'User Stories / Testimonials', 'Feature Updates',
];
const DELIVERABLES_ITEMS = [
  'Website & Landing Pages', 'Social Media Creatives', 'Ad Campaigns', 'Blog & SEO Content', 'Email Campaigns',
  'WhatsApp Automation', 'Lead Capturing & CRM', 'Tracking & Analytics', 'Weekly Reports', 'Monthly Strategy Review',
  'Content Calendar', 'Performance Review',
];

const DEFAULT_STRATEGY = {
  overview: {
    industry: 'Digital services',
    platform: 'Website, social media, paid ads, search, email, WhatsApp',
    targetAudience: 'Prospects, partners, and existing customers',
    usp: 'Clear value, fast onboarding, consistent service delivery',
    currentPhase: 'Foundation',
    overallStatus: 'On Track',
  },
  goals: {
    brand: ['Build a consistent public identity', 'Create trust across all customer touchpoints'],
    marketing: ['Launch full-funnel acquisition campaigns', 'Build measurable weekly lead flow'],
    business: ['Convert qualified leads into paying customers', 'Create repeatable growth systems'],
  },
  planning: {
    targetCustomers: ['Primary buyers with clear intent', 'Decision makers comparing alternatives', 'Existing users ready for upgrades'],
    painPoints: ['Lack of clarity before purchase', 'Too many disconnected communication channels', 'Low trust before the first transaction'],
    buyingTriggers: ['Urgent need for a reliable solution', 'Clear offer with measurable value', 'Social proof and simple onboarding'],
    positioning: 'A dependable digital solution that makes discovery, onboarding, and conversion easier for the right customers.',
    valueProposition: 'Customers get a clear offer, simple next steps, and a reliable experience from first touch to conversion.',
  },
};

const PROJECT_STRATEGIES = {
  BETTERPASS: {
    overview: {
      industry: 'Travel, tourism, and local experiences',
      platform: 'Website, mobile-first landing pages, Google, Meta, Instagram, WhatsApp',
      targetAudience: 'Travelers, students, families, tourists, travel vendors, and local activity providers',
      usp: 'One pass for easier trip planning, local discovery, vendor offers, and booking support',
      currentPhase: 'Foundation',
      overallStatus: 'On Track',
    },
    goals: {
      brand: ['Position Better Pass as the trusted travel and experience pass', 'Build confidence with vendor stories, destination content, and user proof'],
      marketing: ['Generate qualified traveler registrations', 'Build vendor acquisition and partnership demand', 'Create a repeatable content and paid acquisition engine'],
      business: ['Increase pass purchases and booking intent', 'Grow active vendor supply', 'Improve retention through offers, reminders, and referral loops'],
    },
    planning: {
      targetCustomers: ['Travelers planning short trips or weekend experiences', 'Students and young professionals looking for offers', 'Families comparing destinations and activities', 'Hotels, attractions, guides, and local vendors'],
      painPoints: ['Trip planning is scattered across too many sources', 'Travelers do not know which vendors are reliable', 'Vendors need more predictable online discovery', 'Offers and passes are not easy to compare'],
      buyingTriggers: ['Upcoming trip or holiday plan', 'Discounted pass or limited-time destination offer', 'Trusted vendor package', 'Referral from friend, influencer, or travel community'],
      positioning: 'Better Pass helps travelers discover, plan, and book experiences through one trusted pass-led platform.',
      valueProposition: 'Travelers save time and unlock better local options, while vendors get measurable discovery and booking opportunities.',
    },
  },
  EEC: {
    overview: {
      industry: 'Education technology',
      platform: 'Website, SEO, Google Search, Meta, email, WhatsApp',
      targetAudience: 'Students, parents, educators, and learning partners',
      usp: 'Structured learning support with measurable academic progress',
    },
  },
  ESPORTSM: {
    overview: {
      industry: 'Esports and gaming community',
      platform: 'Discord, YouTube, Instagram, Meta, event landing pages',
      targetAudience: 'Gamers, teams, organizers, sponsors, and gaming fans',
      usp: 'Competitive esports experiences with community-led growth',
    },
  },
};

const DEFAULT_FRAMEWORK = [
  {
    phase: 'Foundation Kit',
    mainFocus: ['Brand story and visual identity', 'Landing pages and tracking setup', 'Content pillars and launch assets'],
    keyOutput: 'Launch-ready brand and measurement base',
  },
  {
    phase: 'Growth Kit',
    mainFocus: ['Paid and organic acquisition', 'Lead capture and nurturing', 'Weekly performance optimization'],
    keyOutput: 'Predictable lead and engagement engine',
  },
  {
    phase: 'Scaling Kit',
    mainFocus: ['Partnerships and referral loops', 'Automation and retargeting', 'Channel budget scaling'],
    keyOutput: 'Repeatable growth system',
  },
];

const DEFAULT_CHANNEL_PLAN = {
  Organic: ['SEO content', 'Instagram reels and posts', 'YouTube shorts', 'Community posts'],
  Paid: ['Google Search Ads', 'Meta conversion campaigns', 'Retargeting ads'],
  Direct: ['Email nurturing', 'WhatsApp broadcast and automation', 'Landing page lead forms'],
  Partnerships: ['Vendor partnerships', 'Influencer collaborations', 'Referral campaigns'],
};

const DEFAULT_FUNNEL = [
  'Awareness', 'Website Visits', 'Registrations', 'Qualified Leads', 'Bookings', 'Paid Bookings', 'Retention', 'Referral',
];

const DEFAULT_KPIS = [
  'Website visits and source split',
  'Registration conversion rate',
  'Qualified leads by channel',
  'Cost per lead and cost per booking',
  'Booking conversion rate',
  'Revenue, ROAS, and retention',
];

const DEFAULT_BUDGET = {
  Foundation: ['Brand identity and landing page setup', 'Analytics, pixels, and CRM setup', 'Launch content production'],
  Growth: ['Google and Meta acquisition campaigns', 'Influencer and creator tests', 'Email and WhatsApp nurturing'],
  Scaling: ['Retargeting and lookalike campaigns', 'Partnership campaigns', 'Automation and CRO experiments'],
};

const hasPlanContent = (data = {}) => {
  if (!data || typeof data !== 'object') return false;
  return Boolean(
    data._id ||
    Object.values(data.overview || {}).some(Boolean) ||
    ['brand', 'marketing', 'business'].some((key) => (data.goals?.[key] || []).length) ||
    (data.framework || []).some((row) => row?.mainFocus?.length || row?.keyOutput) ||
    Object.values(data.planning || {}).some((value) => (Array.isArray(value) ? value.length : Boolean(value))) ||
    (data.funnelStages || []).length ||
    (data.kpiPlan || []).length ||
    (data.budgetPlan || []).some((row) => row?.items?.length) ||
    (data.acquisitionBudget || []).some((row) => row?.monthlyInvestment || row?.leadsEstimate || row?.cpl)
  );
};

const buildSeedPlan = (project = {}, canonical = null) => {
  const key = canonical?.code || '';
  const strategy = {
    overview: { ...DEFAULT_STRATEGY.overview, ...(PROJECT_STRATEGIES[key]?.overview || {}) },
    goals: { ...DEFAULT_STRATEGY.goals, ...(PROJECT_STRATEGIES[key]?.goals || {}) },
    planning: { ...DEFAULT_STRATEGY.planning, ...(PROJECT_STRATEGIES[key]?.planning || {}) },
  };
  const name = canonical?.name || project?.name || project?.projectCode || 'Project';
  const description = project?.description || canonical?.description || '';

  return {
    overview: {
      ...strategy.overview,
      platform: strategy.overview.platform,
      currentPhase: project?.status === 'in-progress' ? 'Growth' : strategy.overview.currentPhase,
    },
    goals: strategy.goals,
    framework: DEFAULT_FRAMEWORK.map((row) => ({
      phase: row.phase,
      whenUsed: FRAMEWORK_PHASES.find((phase) => phase.phase === row.phase)?.hint || '',
      mainFocus: row.mainFocus,
      keyOutput: row.keyOutput,
    })),
    planning: {
      ...strategy.planning,
      positioning: strategy.planning.positioning.replace('digital solution', name),
      channelPlan: CHANNEL_CATEGORIES.map((category) => ({
        category,
        channels: DEFAULT_CHANNEL_PLAN[category] || [],
      })),
    },
    funnelStages: DEFAULT_FUNNEL,
    kpiPlan: DEFAULT_KPIS,
    budgetPlan: BUDGET_PHASES.map((phase) => ({ phase, items: DEFAULT_BUDGET[phase] || [] })),
    priorityMatrix: {
      high: ['Complete tracking setup', 'Publish landing pages', 'Launch first acquisition campaign'],
      medium: ['Build weekly content calendar', 'Create retargeting audiences', 'Prepare partner outreach list'],
      low: ['Archive old creative variants', 'Document learnings for future tests'],
    },
    notes: {
      keyObservations: description ? `Initial plan seeded from project context: ${description}` : '',
      nextWeekFocus: 'Finalize campaign assets, tracking, owners, and weekly KPI baseline.',
    },
  };
};

const parseMetric = (value) => Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
const formatPlainNumber = (value) => (value ? value.toLocaleString('en-IN') : '');
const formatInr = (value) => (value ? `INR ${value.toLocaleString('en-IN')}` : '');
const calcCpl = (investment, leads) => {
  const spend = parseMetric(investment);
  const leadCount = parseMetric(leads);
  return spend && leadCount ? Math.round(spend / leadCount) : 0;
};
const calcConversion = (current, previous) => {
  const now = parseMetric(current);
  const before = parseMetric(previous);
  return now && before ? `${((now / before) * 100).toFixed(1)}%` : '';
};

const applyPlanCalculations = (payload) => {
  const acquisitionBudget = (payload.acquisitionBudget || []).map((row) => {
    const cpl = row.cpl || (calcCpl(row.monthlyInvestment, row.leadsEstimate) || '');
    const hasSpend = parseMetric(row.monthlyInvestment) > 0;
    return {
      ...row,
      cpl: cpl ? String(cpl) : '',
      status: row.status || (hasSpend ? 'Active' : 'Planned'),
    };
  });

  const funnelPerformance = (payload.funnelPerformance || []).map((row, idx, rows) => ({
    ...row,
    conversionPct: row.conversionPct || (idx > 0 ? calcConversion(row.actual, rows[idx - 1]?.actual) : ''),
  }));

  return { ...payload, acquisitionBudget, funnelPerformance };
};

const emptyPlan = () => ({
  overview: { industry: '', platform: '', targetAudience: '', usp: '', currentPhase: '', overallStatus: 'On Track' },
  goals: { brand: [], marketing: [], business: [] },
  framework: FRAMEWORK_PHASES.map((f) => ({ phase: f.phase, whenUsed: f.hint, mainFocus: [], keyOutput: '' })),
  planning: {
    targetCustomers: [],
    painPoints: [],
    buyingTriggers: [],
    positioning: '',
    valueProposition: '',
    channelPlan: CHANNEL_CATEGORIES.map((c) => ({ category: c, channels: [] })),
  },
  funnelStages: [],
  kpiPlan: [],
  budgetPlan: BUDGET_PHASES.map((p) => ({ phase: p, items: [] })),

  weeklyChecklist: WEEKLY_CHECKLIST_TASKS.map((task) => ({ task, owner: '', done: false })),
  weeklyUpdates: WEEKLY_UPDATE_WEEKS.map((w) => ({ week: w.week, focusArea: w.hint, progress: '' })),
  acquisitionBudget: ACQUISITION_CHANNELS.map((channel) => ({ channel, monthlyInvestment: '', leadsEstimate: '', cpl: '', status: '' })),
  funnelPerformance: FUNNEL_PERF_STAGES.map((stage) => ({ stage, target: '', actual: '', conversionPct: '' })),
  contentTracker: CONTENT_TRACKER_TYPES.map((contentType) => ({ contentType, target: '', completed: '' })),
  priorityMatrix: { high: [], medium: [], low: [] },
  deliverables: DELIVERABLES_ITEMS.map((label) => ({ label, done: false })),
  performanceSnapshot: { websiteVisits: '', registrations: '', vendorSignups: '', bookings: '', revenue: '', roas: '' },
  notes: { keyObservations: '', challenges: '', nextWeekFocus: '', actionItems: '' },
});

const mergePlan = (data = {}) => {
  const base = emptyPlan();
  return {
    overview: { ...base.overview, ...(data.overview || {}) },
    goals: { ...base.goals, ...(data.goals || {}) },
    framework: FRAMEWORK_PHASES.map((f) => {
      const row = (data.framework || []).find((r) => r.phase === f.phase) || {};
      return { phase: f.phase, whenUsed: row.whenUsed || f.hint, mainFocus: row.mainFocus || [], keyOutput: row.keyOutput || '' };
    }),
    planning: {
      ...base.planning,
      ...(data.planning || {}),
      channelPlan: CHANNEL_CATEGORIES.map((c) => {
        const row = (data.planning?.channelPlan || []).find((r) => r.category === c) || {};
        return { category: c, channels: row.channels || [] };
      }),
    },
    funnelStages: Array.isArray(data.funnelStages) && data.funnelStages.length ? data.funnelStages : [],
    kpiPlan: Array.isArray(data.kpiPlan) ? data.kpiPlan : [],
    budgetPlan: BUDGET_PHASES.map((p) => {
      const row = (data.budgetPlan || []).find((r) => r.phase === p) || {};
      return { phase: p, items: row.items || [] };
    }),

    weeklyChecklist: WEEKLY_CHECKLIST_TASKS.map((task) => {
      const row = (data.weeklyChecklist || []).find((r) => r.task === task) || {};
      return { task, owner: row.owner || '', done: Boolean(row.done) };
    }),
    weeklyUpdates: WEEKLY_UPDATE_WEEKS.map((w) => {
      const row = (data.weeklyUpdates || []).find((r) => r.week === w.week) || {};
      return { week: w.week, focusArea: row.focusArea || w.hint, progress: row.progress || '' };
    }),
    acquisitionBudget: ACQUISITION_CHANNELS.map((channel) => {
      const row = (data.acquisitionBudget || []).find((r) => r.channel === channel) || {};
      return { channel, monthlyInvestment: row.monthlyInvestment || '', leadsEstimate: row.leadsEstimate || '', cpl: row.cpl || '', status: row.status || '' };
    }),
    funnelPerformance: FUNNEL_PERF_STAGES.map((stage) => {
      const row = (data.funnelPerformance || []).find((r) => r.stage === stage) || {};
      return { stage, target: row.target || '', actual: row.actual || '', conversionPct: row.conversionPct || '' };
    }),
    contentTracker: CONTENT_TRACKER_TYPES.map((contentType) => {
      const row = (data.contentTracker || []).find((r) => r.contentType === contentType) || {};
      return { contentType, target: row.target || '', completed: row.completed || '' };
    }),
    priorityMatrix: {
      high: Array.isArray(data.priorityMatrix?.high) ? data.priorityMatrix.high : [],
      medium: Array.isArray(data.priorityMatrix?.medium) ? data.priorityMatrix.medium : [],
      low: Array.isArray(data.priorityMatrix?.low) ? data.priorityMatrix.low : [],
    },
    deliverables: DELIVERABLES_ITEMS.map((label) => {
      const row = (data.deliverables || []).find((r) => r.label === label) || {};
      return { label, done: Boolean(row.done) };
    }),
    performanceSnapshot: { ...base.performanceSnapshot, ...(data.performanceSnapshot || {}) },
    notes: { ...base.notes, ...(data.notes || {}) },
  };
};

const toLines = (arr) => (Array.isArray(arr) ? arr.join('\n') : '');
const fromLines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);

const buildDraft = (plan) => ({
  overview: { ...plan.overview },
  goalsBrand: toLines(plan.goals.brand),
  goalsMarketing: toLines(plan.goals.marketing),
  goalsBusiness: toLines(plan.goals.business),
  framework: plan.framework.map((r) => ({ phase: r.phase, whenUsed: r.whenUsed, mainFocus: toLines(r.mainFocus), keyOutput: r.keyOutput })),
  targetCustomers: toLines(plan.planning.targetCustomers),
  painPoints: toLines(plan.planning.painPoints),
  buyingTriggers: toLines(plan.planning.buyingTriggers),
  positioning: plan.planning.positioning,
  valueProposition: plan.planning.valueProposition,
  channelPlan: plan.planning.channelPlan.map((r) => ({ category: r.category, channels: toLines(r.channels) })),
  funnelStages: toLines(plan.funnelStages),
  kpiPlan: toLines(plan.kpiPlan),
  budgetPlan: plan.budgetPlan.map((r) => ({ phase: r.phase, items: toLines(r.items) })),

  weeklyChecklist: plan.weeklyChecklist.map((r) => ({ ...r })),
  weeklyUpdates: plan.weeklyUpdates.map((r) => ({ ...r })),
  acquisitionBudget: plan.acquisitionBudget.map((r) => ({ ...r })),
  funnelPerformance: plan.funnelPerformance.map((r) => ({ ...r })),
  contentTracker: plan.contentTracker.map((r) => ({ ...r })),
  priorityHigh: toLines(plan.priorityMatrix.high),
  priorityMedium: toLines(plan.priorityMatrix.medium),
  priorityLow: toLines(plan.priorityMatrix.low),
  deliverables: plan.deliverables.map((r) => ({ ...r })),
  performanceSnapshot: { ...plan.performanceSnapshot },
  notes: { ...plan.notes },
});

const buildPayload = (draft) => applyPlanCalculations({
  overview: { ...draft.overview },
  goals: {
    brand: fromLines(draft.goalsBrand),
    marketing: fromLines(draft.goalsMarketing),
    business: fromLines(draft.goalsBusiness),
  },
  framework: draft.framework.map((r) => ({ phase: r.phase, whenUsed: r.whenUsed, mainFocus: fromLines(r.mainFocus), keyOutput: r.keyOutput })),
  planning: {
    targetCustomers: fromLines(draft.targetCustomers),
    painPoints: fromLines(draft.painPoints),
    buyingTriggers: fromLines(draft.buyingTriggers),
    positioning: draft.positioning,
    valueProposition: draft.valueProposition,
    channelPlan: draft.channelPlan.map((r) => ({ category: r.category, channels: fromLines(r.channels) })),
  },
  funnelStages: fromLines(draft.funnelStages),
  kpiPlan: fromLines(draft.kpiPlan),
  budgetPlan: draft.budgetPlan.map((r) => ({ phase: r.phase, items: fromLines(r.items) })),

  weeklyChecklist: draft.weeklyChecklist,
  weeklyUpdates: draft.weeklyUpdates,
  acquisitionBudget: draft.acquisitionBudget,
  funnelPerformance: draft.funnelPerformance,
  contentTracker: draft.contentTracker,
  priorityMatrix: {
    high: fromLines(draft.priorityHigh),
    medium: fromLines(draft.priorityMedium),
    low: fromLines(draft.priorityLow),
  },
  deliverables: draft.deliverables,
  performanceSnapshot: { ...draft.performanceSnapshot },
  notes: { ...draft.notes },
});

const BulletList = ({ items = [], empty = 'Not defined yet.' }) =>
  items.length ? (
    <ul className="space-y-1.5">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm leading-5 text-neutral-700 dark:text-neutral-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm italic text-neutral-400">{empty}</p>
  );

const OverviewField = ({ label, value }) => (
  <div>
    <p className={fieldLabel}>{label}</p>
    <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{value || '—'}</p>
  </div>
);

const MediaProjectDetail = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { projectSlug } = useParams();

  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [plan, setPlan] = useState(emptyPlan());
  const [draft, setDraft] = useState(buildDraft(emptyPlan()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [page, setPage] = useState('1');

  useEffect(() => {
    let alive = true;
    if (!token || !projectSlug) return undefined;
    setLoading(true);
    setError('');
    setNotFound(false);

    departmentApi
      .getMediaProjects(token, { limit: 200 })
      .then((projectsRes) => {
        if (!alive) return undefined;
        const items = projectsRes?.data?.items || projectsRes?.data?.data?.items || [];
        const slugMap = buildProjectSlugMap(items);
        const match = items.find((p) => {
          const id = String(p?._id || p?.id || '').trim();
          return id && slugMap.get(id) === projectSlug;
        });

        if (!match) {
          setProject(null);
          setNotFound(true);
          return undefined;
        }

        setProject(match);
        const resolvedId = String(match._id || match.id);
        return departmentApi.getMediaMarketingPlan(token, resolvedId, { forceRefresh: true }).then((planRes) => {
          if (!alive) return;
          const planData = planRes?.data || {};
          const seed = buildSeedPlan(match, findCanonicalProject(match));
          const merged = mergePlan(hasPlanContent(planData) ? planData : seed);
          setPlan(merged);
          setDraft(buildDraft(merged));
        });
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Failed to load project.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, projectSlug]);

  const canonical = useMemo(() => (project ? findCanonicalProject(project) : null), [project]);
  const projectName = canonical?.name || project?.name || project?.projectCode || 'Project';
  const projectDescription = canonical?.description || project?.description || 'Media & marketing summary';

  const startEdit = () => {
    setDraft(buildDraft(plan));
    setSaveMessage('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(buildDraft(plan));
    setEditing(false);
  };

  const save = async () => {
    const resolvedId = String(project?._id || project?.id || '');
    if (!resolvedId) return;
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload(draft);
      const res = await departmentApi.saveMediaMarketingPlan(token, resolvedId, payload);
      const saved = mergePlan(res?.data || payload);
      setPlan(saved);
      setDraft(buildDraft(saved));
      setEditing(false);
      setSaveMessage('Marketing plan saved.');
    } catch (err) {
      setError(err.message || 'Failed to save marketing plan.');
    } finally {
      setSaving(false);
    }
  };

  const setOverviewField = (key, value) => setDraft((d) => ({ ...d, overview: { ...d.overview, [key]: value } }));
  const setFrameworkField = (idx, key, value) =>
    setDraft((d) => ({ ...d, framework: d.framework.map((r, i) => (i === idx ? { ...r, [key]: value } : r)) }));
  const setChannelField = (idx, value) =>
    setDraft((d) => ({ ...d, channelPlan: d.channelPlan.map((r, i) => (i === idx ? { ...r, channels: value } : r)) }));
  const setBudgetField = (idx, value) =>
    setDraft((d) => ({ ...d, budgetPlan: d.budgetPlan.map((r, i) => (i === idx ? { ...r, items: value } : r)) }));
  const setRowField = (listKey) => (idx, key, value) =>
    setDraft((d) => ({ ...d, [listKey]: d[listKey].map((r, i) => (i === idx ? { ...r, [key]: value } : r)) }));
  const setChecklistField = setRowField('weeklyChecklist');
  const setWeeklyUpdateField = setRowField('weeklyUpdates');
  const setAcquisitionField = setRowField('acquisitionBudget');
  const setFunnelPerfField = setRowField('funnelPerformance');
  const setContentTrackerField = setRowField('contentTracker');
  const setDeliverableField = setRowField('deliverables');
  const setPerformanceSnapshotField = (key, value) => setDraft((d) => ({ ...d, performanceSnapshot: { ...d.performanceSnapshot, [key]: value } }));
  const setNotesField = (key, value) => setDraft((d) => ({ ...d, notes: { ...d.notes, [key]: value } }));

  const activeAcquisitionBudget = editing ? draft.acquisitionBudget : plan.acquisitionBudget;
  const activeFunnelPerformance = editing ? draft.funnelPerformance : plan.funnelPerformance;
  const totalMonthlyInvestment = activeAcquisitionBudget.reduce((sum, r) => sum + parseMetric(r.monthlyInvestment), 0);
  const totalLeads = activeAcquisitionBudget.reduce((sum, r) => sum + parseMetric(r.leadsEstimate), 0);
  const totalCpl = calcCpl(totalMonthlyInvestment, totalLeads);

  return (
    <div
      className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f4_45%,#f6f8fb_100%)] text-neutral-900 dark:bg-background-dark dark:text-neutral-100"
      style={MEDIA_THEME}
    >
      <main className="portal-page">
        <div className="portal-page-inner space-y-4">
          <header className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <div className="h-1 w-full" style={{ background: 'var(--portal-accent)' }} />
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/media/dashboard/projects')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition hover:border-teal-300 hover:text-teal-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                  title="Back to Projects"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-[18px] font-black leading-tight">{projectName}</h1>
                  <p className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{projectDescription}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {saveMessage && !editing ? (
                  <span className="text-[12px] font-semibold text-emerald-600">{saveMessage}</span>
                ) : null}
                {notFound ? null : editing ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="rounded-xl border border-neutral-300 px-4 py-2 text-[13px] font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="rounded-xl px-4 py-2 text-[13px] font-bold text-white shadow-sm transition disabled:opacity-50"
                      style={{ background: 'var(--portal-accent)' }}
                    >
                      {saving ? 'Saving…' : 'Save Plan'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="rounded-xl px-4 py-2 text-[13px] font-bold text-white shadow-sm transition"
                    style={{ background: 'var(--portal-accent)' }}
                  >
                    Edit Plan
                  </button>
                )}
                <ThemeToggleButton />
              </div>
            </div>
          </header>

          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

          {notFound && !loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
              <span className="material-symbols-outlined text-[32px] text-neutral-400">search_off</span>
              <p className="mt-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Project not found.</p>
              <p className="mt-1 text-xs text-neutral-400">This link may be outdated, or the project may no longer be accessible.</p>
              <button
                type="button"
                onClick={() => navigate('/media/dashboard/projects')}
                className="mt-4 rounded-xl px-4 py-2 text-[13px] font-bold text-white shadow-sm transition"
                style={{ background: 'var(--portal-accent)' }}
              >
                Back to Projects
              </button>
            </div>
          ) : null}

          {!loading && !notFound ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-[12px] font-bold text-neutral-500 dark:text-neutral-400">
                Page {page} of 2 — {page === '1' ? 'Marketing Command Center' : 'Weekly Execution'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage('1')}
                  disabled={page === '1'}
                  className="flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-[12px] font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-neutral-700 dark:text-neutral-300"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage('2')}
                  disabled={page === '2'}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition disabled:opacity-40"
                  style={{ background: 'var(--portal-accent)' }}
                >
                  Next
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="h-56 animate-pulse rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
          ) : notFound ? null : page === '1' ? (
            <>
              {/* Project Overview */}
              <section className={card}>
                <p className={sectionTitle}>Project Overview</p>
                {editing ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block">
                      <span className={fieldLabel}>Industry</span>
                      <input className={inputCls} value={draft.overview.industry} onChange={(e) => setOverviewField('industry', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className={fieldLabel}>Platform</span>
                      <input className={inputCls} value={draft.overview.platform} onChange={(e) => setOverviewField('platform', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className={fieldLabel}>Target Audience</span>
                      <input className={inputCls} value={draft.overview.targetAudience} onChange={(e) => setOverviewField('targetAudience', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className={fieldLabel}>USP</span>
                      <input className={inputCls} value={draft.overview.usp} onChange={(e) => setOverviewField('usp', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className={fieldLabel}>Current Phase</span>
                      <input className={inputCls} value={draft.overview.currentPhase} onChange={(e) => setOverviewField('currentPhase', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className={fieldLabel}>Overall Status</span>
                      <input className={inputCls} value={draft.overview.overallStatus} onChange={(e) => setOverviewField('overallStatus', e.target.value)} />
                    </label>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <OverviewField label="Industry" value={plan.overview.industry} />
                    <OverviewField label="Platform" value={plan.overview.platform} />
                    <OverviewField label="Target Audience" value={plan.overview.targetAudience} />
                    <OverviewField label="USP" value={plan.overview.usp} />
                    <OverviewField label="Current Phase" value={plan.overview.currentPhase} />
                    <div>
                      <p className={fieldLabel}>Overall Status</p>
                      <span className="mt-1 inline-flex items-center rounded-full bg-teal-600 px-3 py-1 text-[12px] font-black uppercase tracking-wide text-white">
                        {plan.overview.overallStatus || 'On Track'}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {/* Main Goal */}
              <section className={card}>
                <p className={sectionTitle}>Main Goal</p>
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {[
                    { key: 'brand', label: 'Brand Goal', draftKey: 'goalsBrand' },
                    { key: 'marketing', label: 'Marketing Goal', draftKey: 'goalsMarketing' },
                    { key: 'business', label: 'Business Goal', draftKey: 'goalsBusiness' },
                  ].map(({ key, label, draftKey }) => (
                    <div key={key} className={soft}>
                      <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">{label}</p>
                      <div className="mt-2">
                        {editing ? (
                          <textarea
                            className={textareaCls}
                            placeholder="One goal per line"
                            value={draft[draftKey]}
                            onChange={(e) => setDraft((d) => ({ ...d, [draftKey]: e.target.value }))}
                          />
                        ) : (
                          <BulletList items={plan.goals[key]} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Three-Phase Media Framework */}
              <section className={card}>
                <p className={sectionTitle}>Three-Phase Media Framework</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Phase</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">When Used</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Main Focus</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Key Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? draft.framework : plan.framework).map((row, idx) => (
                        <tr key={row.phase} className="align-top">
                          <td className="border-b border-neutral-100 px-3 py-3 font-bold text-teal-700 dark:border-neutral-800 dark:text-teal-400">
                            {row.phase}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-3 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.whenUsed} onChange={(e) => setFrameworkField(idx, 'whenUsed', e.target.value)} />
                            ) : (
                              row.whenUsed || '—'
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-3 dark:border-neutral-800">
                            {editing ? (
                              <textarea
                                className={textareaCls}
                                placeholder="One focus area per line"
                                value={row.mainFocus}
                                onChange={(e) => setFrameworkField(idx, 'mainFocus', e.target.value)}
                              />
                            ) : (
                              <BulletList items={row.mainFocus} />
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-3 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.keyOutput} onChange={(e) => setFrameworkField(idx, 'keyOutput', e.target.value)} />
                            ) : (
                              row.keyOutput || '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Before Campaign Starts – Required Planning */}
              <section className={card}>
                <p className={sectionTitle}>Before Campaign Starts — Required Planning</p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className={soft}>
                    <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">Target Customer</p>
                    <div className="mt-2">
                      {editing ? (
                        <textarea className={textareaCls} placeholder="One segment per line" value={draft.targetCustomers} onChange={(e) => setDraft((d) => ({ ...d, targetCustomers: e.target.value }))} />
                      ) : (
                        <BulletList items={plan.planning.targetCustomers} />
                      )}
                    </div>
                  </div>
                  <div className={soft}>
                    <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">Pain Points</p>
                    <div className="mt-2">
                      {editing ? (
                        <textarea className={textareaCls} placeholder="One pain point per line" value={draft.painPoints} onChange={(e) => setDraft((d) => ({ ...d, painPoints: e.target.value }))} />
                      ) : (
                        <BulletList items={plan.planning.painPoints} />
                      )}
                    </div>
                  </div>
                  <div className={soft}>
                    <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">Buying Triggers</p>
                    <div className="mt-2">
                      {editing ? (
                        <textarea className={textareaCls} placeholder="One trigger per line" value={draft.buyingTriggers} onChange={(e) => setDraft((d) => ({ ...d, buyingTriggers: e.target.value }))} />
                      ) : (
                        <BulletList items={plan.planning.buyingTriggers} />
                      )}
                    </div>
                  </div>
                  <div className={soft}>
                    <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">Positioning</p>
                    <div className="mt-2">
                      {editing ? (
                        <textarea className={textareaCls} placeholder="Positioning statement" value={draft.positioning} onChange={(e) => setDraft((d) => ({ ...d, positioning: e.target.value }))} />
                      ) : (
                        <p className="text-sm leading-5 text-neutral-700 dark:text-neutral-300">{plan.planning.positioning || <span className="italic text-neutral-400">Not defined yet.</span>}</p>
                      )}
                    </div>
                  </div>
                  <div className={soft}>
                    <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">Value Proposition</p>
                    <div className="mt-2">
                      {editing ? (
                        <textarea className={textareaCls} placeholder="Value proposition statement" value={draft.valueProposition} onChange={(e) => setDraft((d) => ({ ...d, valueProposition: e.target.value }))} />
                      ) : (
                        <p className="text-sm leading-5 text-neutral-700 dark:text-neutral-300">{plan.planning.valueProposition || <span className="italic text-neutral-400">Not defined yet.</span>}</p>
                      )}
                    </div>
                  </div>
                  <div className={soft}>
                    <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">Channel Plan</p>
                    <div className="mt-2 space-y-3">
                      {(editing ? draft.channelPlan : plan.planning.channelPlan).map((row, idx) => (
                        <div key={row.category}>
                          <p className="text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{row.category}</p>
                          {editing ? (
                            <textarea
                              className={`${textareaCls} min-h-[64px]`}
                              placeholder="One channel per line"
                              value={row.channels}
                              onChange={(e) => setChannelField(idx, e.target.value)}
                            />
                          ) : (
                            <BulletList items={row.channels} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Funnel Structure */}
              <section className={card}>
                <p className={sectionTitle}>Funnel Structure</p>
                <div className="mt-3">
                  {editing ? (
                    <textarea
                      className={textareaCls}
                      placeholder="One funnel stage per line, in order"
                      value={draft.funnelStages}
                      onChange={(e) => setDraft((d) => ({ ...d, funnelStages: e.target.value }))}
                    />
                  ) : plan.funnelStages.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {plan.funnelStages.map((stage, idx) => (
                        <React.Fragment key={stage}>
                          <span className="rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-[13px] font-bold text-teal-800 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
                            {stage}
                          </span>
                          {idx < plan.funnelStages.length - 1 ? (
                            <span className="material-symbols-outlined text-[18px] text-neutral-400">arrow_forward</span>
                          ) : null}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-neutral-400">Not defined yet.</p>
                  )}
                </div>
              </section>

              {/* KPI Plan */}
              <section className={card}>
                <p className={sectionTitle}>KPI Plan</p>
                <div className="mt-3">
                  {editing ? (
                    <textarea
                      className={textareaCls}
                      placeholder="One KPI per line"
                      value={draft.kpiPlan}
                      onChange={(e) => setDraft((d) => ({ ...d, kpiPlan: e.target.value }))}
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                      <BulletList items={plan.kpiPlan} />
                    </div>
                  )}
                </div>
              </section>

              {/* Budget Plan Overview */}
              <section className={card}>
                <p className={sectionTitle}>Budget Plan (Overview)</p>
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {(editing ? draft.budgetPlan : plan.budgetPlan).map((row, idx) => (
                    <div key={row.phase} className={soft}>
                      <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">{row.phase}</p>
                      <div className="mt-2">
                        {editing ? (
                          <textarea
                            className={textareaCls}
                            placeholder="One budget line per line"
                            value={row.items}
                            onChange={(e) => setBudgetField(idx, e.target.value)}
                          />
                        ) : (
                          <BulletList items={row.items} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Weekly Checklist */}
              <section className={card}>
                <p className={sectionTitle}>Weekly Checklist</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Task</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Owner</th>
                        <th className="border-b border-neutral-200 px-3 py-2 text-center dark:border-neutral-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? draft.weeklyChecklist : plan.weeklyChecklist).map((row, idx) => (
                        <tr key={row.task}>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">{row.task}</td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.owner} onChange={(e) => setChecklistField(idx, 'owner', e.target.value)} />
                            ) : (
                              row.owner || '—'
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 text-center dark:border-neutral-800">
                            <input
                              type="checkbox"
                              checked={row.done}
                              disabled={!editing}
                              onChange={(e) => setChecklistField(idx, 'done', e.target.checked)}
                              className="h-4 w-4 accent-teal-600"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Weekly Update */}
              <section className={card}>
                <p className={sectionTitle}>Weekly Update</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Week</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Focus Area</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? draft.weeklyUpdates : plan.weeklyUpdates).map((row, idx) => (
                        <tr key={row.week}>
                          <td className="border-b border-neutral-100 px-3 py-2.5 font-bold text-teal-700 dark:border-neutral-800 dark:text-teal-400">{row.week}</td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.focusArea} onChange={(e) => setWeeklyUpdateField(idx, 'focusArea', e.target.value)} />
                            ) : (
                              row.focusArea || '—'
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} placeholder="Progress notes" value={row.progress} onChange={(e) => setWeeklyUpdateField(idx, 'progress', e.target.value)} />
                            ) : (
                              row.progress || '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Acquisition = Investment (Budget) */}
              <section className={card}>
                <p className={sectionTitle}>Acquisition = Investment (Budget)</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Channel</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Monthly Investment (INR)</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Leads (Est.)</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">CPL (INR)</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAcquisitionBudget.map((row, idx) => {
                        const calculatedCpl = calcCpl(row.monthlyInvestment, row.leadsEstimate);
                        const displayCpl = row.cpl || (calculatedCpl ? formatPlainNumber(calculatedCpl) : '');
                        const displayStatus = row.status || (parseMetric(row.monthlyInvestment) ? 'Active' : 'Planned');
                        return (
                          <tr key={row.channel}>
                            <td className="border-b border-neutral-100 px-3 py-2.5 font-semibold dark:border-neutral-800">{row.channel}</td>
                            <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                              {editing ? (
                                <input className={inputCls} value={row.monthlyInvestment} onChange={(e) => setAcquisitionField(idx, 'monthlyInvestment', e.target.value)} />
                              ) : (
                                row.monthlyInvestment || '-'
                              )}
                            </td>
                            <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                              {editing ? (
                                <input className={inputCls} value={row.leadsEstimate} onChange={(e) => setAcquisitionField(idx, 'leadsEstimate', e.target.value)} />
                              ) : (
                                row.leadsEstimate || '-'
                              )}
                            </td>
                            <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                              {editing ? (
                                <div>
                                  <input className={inputCls} value={row.cpl} placeholder={displayCpl || 'Auto'} onChange={(e) => setAcquisitionField(idx, 'cpl', e.target.value)} />
                                  {calculatedCpl ? <p className="mt-1 text-[11px] font-semibold text-neutral-400">Auto: {formatInr(calculatedCpl)}</p> : null}
                                </div>
                              ) : (
                                displayCpl || '-'
                              )}
                            </td>
                            <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                              {editing ? (
                                <input className={inputCls} value={row.status} placeholder={displayStatus} onChange={(e) => setAcquisitionField(idx, 'status', e.target.value)} />
                              ) : (
                                displayStatus || '-'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-black text-neutral-900 dark:text-neutral-100">
                        <td className="px-3 py-2.5">TOTAL</td>
                        <td className="px-3 py-2.5">{formatInr(totalMonthlyInvestment) || '-'}</td>
                        <td className="px-3 py-2.5">{formatPlainNumber(totalLeads) || '-'}</td>
                        <td className="px-3 py-2.5">{formatInr(totalCpl) || '-'}</td>
                        <td className="px-3 py-2.5">{totalMonthlyInvestment ? 'Budgeted' : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Funnel Performance (Weekly) */}
              <section className={card}>
                <p className={sectionTitle}>Funnel Performance (Weekly)</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Stage</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Target</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Actual</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Conversion %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeFunnelPerformance.map((row, idx) => {
                        const calculatedConversion = idx > 0 ? calcConversion(row.actual, activeFunnelPerformance[idx - 1]?.actual) : '';
                        const displayConversion = row.conversionPct || calculatedConversion;
                        return (
                          <tr key={row.stage}>
                            <td className="border-b border-neutral-100 px-3 py-2.5 font-semibold dark:border-neutral-800">{row.stage}</td>
                            <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                              {editing ? (
                                <input className={inputCls} value={row.target} onChange={(e) => setFunnelPerfField(idx, 'target', e.target.value)} />
                              ) : (
                                row.target || '-'
                              )}
                            </td>
                            <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                              {editing ? (
                                <input className={inputCls} value={row.actual} onChange={(e) => setFunnelPerfField(idx, 'actual', e.target.value)} />
                              ) : (
                                row.actual || '-'
                              )}
                            </td>
                            <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                              {editing ? (
                                <div>
                                  <input className={inputCls} value={row.conversionPct} placeholder={calculatedConversion || 'Auto'} onChange={(e) => setFunnelPerfField(idx, 'conversionPct', e.target.value)} />
                                  {calculatedConversion ? <p className="mt-1 text-[11px] font-semibold text-neutral-400">Auto: {calculatedConversion}</p> : null}
                                </div>
                              ) : (
                                displayConversion || '-'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Content Tracker (Monthly) */}
              <section className={card}>
                <p className={sectionTitle}>Content Tracker (Monthly)</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Content Type</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Target</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? draft.contentTracker : plan.contentTracker).map((row, idx) => (
                        <tr key={row.contentType}>
                          <td className="border-b border-neutral-100 px-3 py-2.5 font-semibold dark:border-neutral-800">{row.contentType}</td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.target} onChange={(e) => setContentTrackerField(idx, 'target', e.target.value)} />
                            ) : (
                              row.target || '—'
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.completed} onChange={(e) => setContentTrackerField(idx, 'completed', e.target.value)} />
                            ) : (
                              row.completed || '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Priority Matrix */}
              <section className={card}>
                <p className={sectionTitle}>Priority Matrix</p>
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {[
                    { key: 'high', label: 'High Priority', draftKey: 'priorityHigh' },
                    { key: 'medium', label: 'Medium Priority', draftKey: 'priorityMedium' },
                    { key: 'low', label: 'Low Priority', draftKey: 'priorityLow' },
                  ].map(({ key, label, draftKey }) => (
                    <div key={key} className={soft}>
                      <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">{label}</p>
                      <div className="mt-2">
                        {editing ? (
                          <textarea
                            className={textareaCls}
                            placeholder="One item per line"
                            value={draft[draftKey]}
                            onChange={(e) => setDraft((d) => ({ ...d, [draftKey]: e.target.value }))}
                          />
                        ) : (
                          <BulletList items={plan.priorityMatrix[key]} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Deliverables Checklist */}
              <section className={card}>
                <p className={sectionTitle}>Deliverables Checklist</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(editing ? draft.deliverables : plan.deliverables).map((row, idx) => (
                    <label key={row.label} className="flex items-center gap-2 rounded-lg border border-neutral-100 px-3 py-2 text-sm dark:border-neutral-800">
                      <input
                        type="checkbox"
                        checked={row.done}
                        disabled={!editing}
                        onChange={(e) => setDeliverableField(idx, 'done', e.target.checked)}
                        className="h-4 w-4 accent-teal-600"
                      />
                      <span className="text-neutral-700 dark:text-neutral-300">{row.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Performance Snapshot */}
              <section className={card}>
                <p className={sectionTitle}>Performance Snapshot (This Month)</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { key: 'websiteVisits', label: 'Website Visits' },
                    { key: 'registrations', label: 'Registrations' },
                    { key: 'vendorSignups', label: 'Vendor Signups' },
                    { key: 'bookings', label: 'Bookings' },
                    { key: 'revenue', label: 'Revenue (₹)' },
                    { key: 'roas', label: 'ROAS' },
                  ].map(({ key, label }) => (
                    <div key={key} className={soft}>
                      <p className={fieldLabel}>{label}</p>
                      {editing ? (
                        <input
                          className={inputCls}
                          value={draft.performanceSnapshot[key]}
                          onChange={(e) => setPerformanceSnapshotField(key, e.target.value)}
                        />
                      ) : (
                        <p className="mt-1 text-lg font-black text-neutral-900 dark:text-neutral-100">{plan.performanceSnapshot[key] || '—'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Notes & Next Week Focus */}
              <section className={card}>
                <p className={sectionTitle}>Notes & Next Week Focus</p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { key: 'keyObservations', label: 'Key Observations' },
                    { key: 'challenges', label: 'Challenges' },
                    { key: 'nextWeekFocus', label: 'Next Week Focus' },
                    { key: 'actionItems', label: 'Action Items' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <p className={fieldLabel}>{label}</p>
                      {editing ? (
                        <textarea
                          className={`${textareaCls} mt-1 min-h-[72px]`}
                          value={draft.notes[key]}
                          onChange={(e) => setNotesField(key, e.target.value)}
                        />
                      ) : (
                        <p className="mt-1 text-sm leading-5 text-neutral-700 dark:text-neutral-300">
                          {plan.notes[key] || <span className="italic text-neutral-400">Not defined yet.</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {!loading && !notFound ? (
            <div className="flex items-center justify-between gap-3 pb-2">
              <button
                type="button"
                onClick={() => setPage('1')}
                disabled={page === '1'}
                className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-[13px] font-bold text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage('2')}
                disabled={page === '2'}
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-[13px] font-bold text-white shadow-sm transition disabled:opacity-40"
                style={{ background: 'var(--portal-accent)' }}
              >
                Next
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default MediaProjectDetail;
