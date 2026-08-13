import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { departmentApi } from '../../services/departments';
import { findCanonicalProject, buildProjectSlugMap } from '../../config/projectNames';
import ThemeToggleButton from '../common/ThemeToggleButton';

const DEFAULT_ACCENT = '#0f766e';
const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

const formatRole = (role = '') =>
  String(role).split('_').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const THEME_PRESETS = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#dc2626', '#0891b2'];

const hexToRgb = (hex) => {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => `${c}${c}`).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};
const rgba = (hex, alpha) => {
  const rgb = hexToRgb(hex) || { r: 15, g: 118, b: 110 };
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};
const shade = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const mix = (channel) => Math.max(0, Math.min(255, Math.round(channel + (target - channel) * p)));
  return `#${[mix(rgb.r), mix(rgb.g), mix(rgb.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
// `-strong` is a darkened shade — safe for gradients and white-text buttons in
// either theme, but illegible as *text on top of the soft tint* once the page
// itself turns dark (dark text on a dark-tinted chip). `-ink` is the variant
// meant for that specific case: it flips lighter in dark mode so text drawn
// on top of `-soft` chips stays readable against both page themes.
const buildThemeVars = (accent, isDark = false) => {
  const base = HEX_RE.test(accent || '') ? accent : DEFAULT_ACCENT;
  return {
    '--portal-accent': base,
    '--portal-accent-soft': rgba(base, isDark ? 0.28 : 0.16),
    '--portal-accent-strong': shade(base, -0.28),
    '--portal-accent-ink': isDark ? shade(base, 0.42) : shade(base, -0.28),
  };
};

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)] dark:border-neutral-800 dark:bg-neutral-900';
const soft = 'rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/45';
const sectionTitle = 'text-[11px] font-black uppercase tracking-[0.14em]';
const fieldLabel = 'text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400';
const inputCls = 'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition-all duration-200 focus:border-[var(--portal-accent)] focus:shadow-[0_0_0_3px_var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:shadow-[0_0_0_3px_rgba(15,118,110,0.25)]';
const textareaCls = `${inputCls} min-h-[96px] resize-y`;
const tableWrap = 'mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/30';
const tableHead = 'text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400 [&>th]:bg-slate-50 dark:[&>th]:bg-neutral-900/70';
const tableTh = 'border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800';
const tableTd = 'border-b border-neutral-100 px-3 py-3 dark:border-neutral-800';

const FRAMEWORK_PHASES = [
  { phase: 'Foundation Kit', hint: 'Before Launch' },
  { phase: 'Growth Kit', hint: 'Active Marketing' },
  { phase: 'Scaling Kit', hint: 'Growth Stage' },
];
const CHANNEL_CATEGORIES = ['Organic', 'Paid', 'Direct', 'Partnerships'];
const BUDGET_PHASES = ['Foundation', 'Growth', 'Scaling'];

const WEEKLY_CHECKLIST_TASKS = [
  'Website & Landing Pages', 'Partner / Stakeholder Onboarding', 'Google Analytics Setup', 'Meta Pixel Installation',
  'AEO Setup', 'Campaign Setup (Google Ads)', 'Campaign Setup (Meta Ads)', 'Social Media Content Plan',
  'Email Marketing Setup', 'WhatsApp Automation', 'Partnership Outreach', 'Content Published (Blog/Guides)',
  'Weekly Report & Dashboard',
];
const WEEKLY_UPDATE_WEEKS = [
  { week: 'Week 1', hint: 'Branding & Website' },
  { week: 'Week 2', hint: 'Partner Onboarding & Partnerships' },
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
  'Awareness (Impressions)', 'Website Visits', 'Registrations', 'Product / Service Interest', 'Bookings',
  'Paid Bookings', 'Retention', 'Referral',
];
const CONTENT_TRACKER_TYPES = [
  'Reels / Shorts', 'Social Media Posts', 'Blog Articles / Travel Guides', 'YouTube Videos',
  'Product / Service Spotlights', 'Email Campaigns', 'Partner / Customer Stories', 'User Stories / Testimonials', 'Feature Updates',
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
    goals: {
      brand: ['Position EdifyEight as a trusted learning and academic-support platform', 'Build credibility through outcomes, faculty proof, and parent/student stories'],
      marketing: ['Generate qualified student and parent enquiries', 'Improve counselling/demo bookings through targeted campaigns', 'Build a repeatable education content engine'],
      business: ['Increase admissions, course purchases, and renewals', 'Grow learning partner demand', 'Improve retention through progress updates and nurture flows'],
    },
    planning: {
      targetCustomers: ['Students comparing learning support options', 'Parents evaluating academic outcomes', 'Schools and educators looking for structured programs', 'Learning partners and tutors'],
      painPoints: ['Parents lack clear evidence before enrolment', 'Students need structured guidance and progress tracking', 'Course benefits are hard to compare', 'Follow-up after enquiry is inconsistent'],
      buyingTriggers: ['Exam preparation window', 'Low academic confidence', 'Visible success proof', 'Clear counselling or demo path'],
      positioning: 'EdifyEight helps students and parents find structured learning support with clear progress signals.',
      valueProposition: 'Students get guided learning and measurable improvement, while parents get clarity, confidence, and simple next steps.',
    },
  },
  ESPORTSM: {
    overview: {
      industry: 'Esports and gaming community',
      platform: 'Discord, YouTube, Instagram, Meta, event landing pages',
      targetAudience: 'Gamers, teams, organizers, sponsors, and gaming fans',
      usp: 'Competitive esports experiences with community-led growth',
    },
    goals: {
      brand: ['Position ESPORTSM as a credible esports community and tournament platform', 'Build excitement through player stories, event highlights, and sponsor proof'],
      marketing: ['Grow community joins and tournament registrations', 'Drive sponsor and team interest', 'Create a repeatable short-form video and event promotion engine'],
      business: ['Increase paid entries, sponsorships, and event partnerships', 'Improve participant retention between events', 'Build recurring community engagement loops'],
    },
    planning: {
      targetCustomers: ['Competitive gamers and teams', 'Casual gaming communities', 'Tournament organizers', 'Brands and sponsors targeting gaming audiences'],
      painPoints: ['Players lack trusted event discovery', 'Teams need visibility and organized competition', 'Sponsors need measurable gaming-community reach', 'Community attention drops between events'],
      buyingTriggers: ['Upcoming tournament', 'Prize pool announcement', 'Influencer or team participation', 'Sponsor-backed event campaign'],
      positioning: 'ESPORTSM helps gamers, teams, and sponsors connect through organized esports experiences and community-led promotion.',
      valueProposition: 'Players get credible competitions and visibility, while sponsors and organizers get measurable community engagement.',
    },
  },
  EHC: {
    overview: {
      industry: 'Employee services and operations',
      platform: 'Employee portal, email, WhatsApp, internal communications',
      targetAudience: 'Employees, department heads, HR teams, and operations stakeholders',
      usp: 'Centralized employee service communication and request handling',
    },
  },
  ERMS: {
    overview: {
      industry: 'Resource and relationship management',
      platform: 'Website, CRM, email, WhatsApp, search, and partner channels',
      targetAudience: 'Clients, operators, partners, and internal business teams',
      usp: 'Organized relationship tracking with measurable business follow-through',
    },
  },
  EFNBMMS: {
    overview: {
      industry: 'Admin management and business operations',
      platform: 'Admin portal, operational dashboards, email, and internal workflows',
      targetAudience: 'Admins, managers, operations teams, and business stakeholders',
      usp: 'Structured admin-management workflows with auditable operational visibility',
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

const DEFAULT_EXECUTION_PROFILE = {
  weeklyChecklistTasks: WEEKLY_CHECKLIST_TASKS,
  weeklyUpdateWeeks: WEEKLY_UPDATE_WEEKS,
  funnelPerformanceStages: FUNNEL_PERF_STAGES,
  contentTrackerTypes: CONTENT_TRACKER_TYPES,
  deliverables: DELIVERABLES_ITEMS,
  performanceLabels: {
    websiteVisits: 'Website Visits',
    registrations: 'Registrations',
    vendorSignups: 'Partner Signups',
    bookings: 'Conversions',
    revenue: 'Revenue (INR)',
    roas: 'ROAS',
  },
};

const PROJECT_EXECUTION_PROFILES = {
  BETTERPASS: {
    weeklyChecklistTasks: [
      'Website & Landing Pages', 'Vendor Onboarding', 'Google Analytics Setup', 'Meta Pixel Installation',
      'AEO Setup', 'Campaign Setup (Google Ads)', 'Campaign Setup (Meta Ads)', 'Social Media Content Plan',
      'Email Marketing Setup', 'WhatsApp Automation', 'Partnership Outreach', 'Content Published (Blog/Guides)',
      'Weekly Report & Dashboard',
    ],
    weeklyUpdateWeeks: [
      { week: 'Week 1', hint: 'Branding & Website' },
      { week: 'Week 2', hint: 'Vendor Onboarding & Partnerships' },
      { week: 'Week 3', hint: 'Campaign Setup' },
      { week: 'Week 4', hint: 'Lead Generation' },
      { week: 'Week 5', hint: 'Optimization' },
      { week: 'Week 6+', hint: 'Scaling & Expansion' },
    ],
    funnelPerformanceStages: [
      'Awareness (Impressions)', 'Website Visits', 'Registrations', 'Pass / Trip Planning', 'Bookings',
      'Paid Bookings', 'Retention', 'Referral',
    ],
    contentTrackerTypes: [
      'Reels / Shorts', 'Social Media Posts', 'Blog Articles / Travel Guides', 'YouTube Videos',
      'Destination Spotlights', 'Email Campaigns', 'Vendor Stories', 'User Stories / Testimonials', 'Feature Updates',
    ],
    performanceLabels: {
      vendorSignups: 'Vendor Signups',
      bookings: 'Bookings',
    },
  },
  EEC: {
    weeklyChecklistTasks: [
      'Course Landing Pages', 'Lead Form & CRM Setup', 'Google Analytics Setup', 'Meta Pixel Installation',
      'AEO Setup', 'Google Search Campaigns', 'Meta Lead Campaigns', 'Academic Content Plan',
      'Email Marketing Setup', 'WhatsApp Counselling Flow', 'School / Partner Outreach', 'Blogs & Learning Guides',
      'Weekly Report & Dashboard',
    ],
    funnelPerformanceStages: [
      'Awareness (Impressions)', 'Website Visits', 'Enquiries', 'Counselling Requests', 'Demo Bookings',
      'Admissions / Purchases', 'Retention', 'Referral',
    ],
    contentTrackerTypes: [
      'Reels / Shorts', 'Social Media Posts', 'Learning Guides', 'YouTube Videos',
      'Course Spotlights', 'Email Campaigns', 'Student Success Stories', 'Parent Testimonials', 'Feature Updates',
    ],
    performanceLabels: {
      registrations: 'Enquiries',
      vendorSignups: 'Demo Requests',
      bookings: 'Admissions',
    },
  },
  ESPORTSM: {
    weeklyChecklistTasks: [
      'Event Landing Pages', 'Community Onboarding', 'Analytics Setup', 'Meta Pixel Installation',
      'AEO Setup', 'Tournament Campaigns', 'Meta / Instagram Campaigns', 'Gaming Content Plan',
      'Email Marketing Setup', 'Discord / WhatsApp Automation', 'Sponsor Outreach', 'Match Highlights Published',
      'Weekly Report & Dashboard',
    ],
    funnelPerformanceStages: [
      'Awareness (Impressions)', 'Website Visits', 'Community Joins', 'Tournament Interest', 'Registrations',
      'Paid Entries / Sponsors', 'Retention', 'Referral',
    ],
    contentTrackerTypes: [
      'Reels / Shorts', 'Social Media Posts', 'Tournament Updates', 'YouTube Videos',
      'Player / Team Spotlights', 'Email Campaigns', 'Sponsor Stories', 'Community Testimonials', 'Feature Updates',
    ],
    performanceLabels: {
      registrations: 'Community Joins',
      vendorSignups: 'Team Signups',
      bookings: 'Tournament Entries',
    },
  },
  EHC: {
    performanceLabels: {
      registrations: 'Employee Requests',
      vendorSignups: 'Department Requests',
      bookings: 'Resolved Requests',
    },
  },
  ERMS: {
    performanceLabels: {
      registrations: 'Leads',
      vendorSignups: 'Client Signups',
      bookings: 'Deals / Bookings',
    },
  },
  EFNBMMS: {
    performanceLabels: {
      registrations: 'Admin Requests',
      vendorSignups: 'Account Setups',
      bookings: 'Completed Operations',
    },
  },
};

const getExecutionProfile = (canonical = null) => {
  const custom = PROJECT_EXECUTION_PROFILES[canonical?.code || ''] || {};
  return {
    ...DEFAULT_EXECUTION_PROFILE,
    ...custom,
    performanceLabels: {
      ...DEFAULT_EXECUTION_PROFILE.performanceLabels,
      ...(custom.performanceLabels || {}),
    },
  };
};

const listFromProfile = (profile, key) => (Array.isArray(profile?.[key]) && profile[key].length ? profile[key] : DEFAULT_EXECUTION_PROFILE[key]);
const rowsFromLabels = (labels = [], rowFactory) => labels.map((label) => rowFactory(label));

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
  const executionProfile = getExecutionProfile(canonical);
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
    weeklyChecklist: rowsFromLabels(listFromProfile(executionProfile, 'weeklyChecklistTasks'), (task) => ({ task, owner: '', done: false })),
    weeklyUpdates: listFromProfile(executionProfile, 'weeklyUpdateWeeks').map((w) => ({ week: w.week, focusArea: w.hint, progress: '' })),
    acquisitionBudget: ACQUISITION_CHANNELS.map((channel) => ({ channel, monthlyInvestment: '', leadsEstimate: '', cpl: '', status: '' })),
    funnelPerformance: rowsFromLabels(listFromProfile(executionProfile, 'funnelPerformanceStages'), (stage) => ({ stage, target: '', actual: '', conversionPct: '' })),
    contentTracker: rowsFromLabels(listFromProfile(executionProfile, 'contentTrackerTypes'), (contentType) => ({ contentType, target: '', completed: '' })),
    deliverables: rowsFromLabels(listFromProfile(executionProfile, 'deliverables'), (label) => ({ label, done: false })),
    performanceLabels: executionProfile.performanceLabels,
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

const emptyPlan = (executionProfile = DEFAULT_EXECUTION_PROFILE) => ({
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

  weeklyChecklist: rowsFromLabels(listFromProfile(executionProfile, 'weeklyChecklistTasks'), (task) => ({ task, owner: '', done: false })),
  weeklyUpdates: listFromProfile(executionProfile, 'weeklyUpdateWeeks').map((w) => ({ week: w.week, focusArea: w.hint, progress: '' })),
  acquisitionBudget: ACQUISITION_CHANNELS.map((channel) => ({ channel, monthlyInvestment: '', leadsEstimate: '', cpl: '', status: '' })),
  funnelPerformance: rowsFromLabels(listFromProfile(executionProfile, 'funnelPerformanceStages'), (stage) => ({ stage, target: '', actual: '', conversionPct: '' })),
  contentTracker: rowsFromLabels(listFromProfile(executionProfile, 'contentTrackerTypes'), (contentType) => ({ contentType, target: '', completed: '' })),
  priorityMatrix: { high: [], medium: [], low: [] },
  deliverables: rowsFromLabels(listFromProfile(executionProfile, 'deliverables'), (label) => ({ label, done: false })),
  performanceSnapshot: { websiteVisits: '', registrations: '', vendorSignups: '', bookings: '', revenue: '', roas: '' },
  performanceLabels: { ...DEFAULT_EXECUTION_PROFILE.performanceLabels, ...(executionProfile.performanceLabels || {}) },
  notes: { keyObservations: '', challenges: '', nextWeekFocus: '', actionItems: '' },
});

const mergeRows = (defaults = [], dataRows = [], key) => {
  const rows = Array.isArray(dataRows) && dataRows.length ? dataRows : defaults;
  return rows.map((defaultRow) => {
    const label = defaultRow?.[key];
    const savedRow = (Array.isArray(dataRows) ? dataRows : []).find((row) => row?.[key] === label) || {};
    return { ...defaultRow, ...savedRow, [key]: savedRow?.[key] || label };
  });
};

const mergePlan = (data = {}, executionProfile = DEFAULT_EXECUTION_PROFILE) => {
  const base = emptyPlan(executionProfile);
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

    weeklyChecklist: mergeRows(base.weeklyChecklist, data.weeklyChecklist, 'task').map((row) => ({ task: row.task, owner: row.owner || '', done: Boolean(row.done) })),
    weeklyUpdates: mergeRows(base.weeklyUpdates, data.weeklyUpdates, 'week').map((row) => ({ week: row.week, focusArea: row.focusArea || '', progress: row.progress || '' })),
    acquisitionBudget: ACQUISITION_CHANNELS.map((channel) => {
      const row = (data.acquisitionBudget || []).find((r) => r.channel === channel) || {};
      return { channel, monthlyInvestment: row.monthlyInvestment || '', leadsEstimate: row.leadsEstimate || '', cpl: row.cpl || '', status: row.status || '' };
    }),
    funnelPerformance: mergeRows(base.funnelPerformance, data.funnelPerformance, 'stage').map((row) => ({ stage: row.stage, target: row.target || '', actual: row.actual || '', conversionPct: row.conversionPct || '' })),
    contentTracker: mergeRows(base.contentTracker, data.contentTracker, 'contentType').map((row) => ({ contentType: row.contentType, target: row.target || '', completed: row.completed || '' })),
    priorityMatrix: {
      high: Array.isArray(data.priorityMatrix?.high) ? data.priorityMatrix.high : [],
      medium: Array.isArray(data.priorityMatrix?.medium) ? data.priorityMatrix.medium : [],
      low: Array.isArray(data.priorityMatrix?.low) ? data.priorityMatrix.low : [],
    },
    deliverables: mergeRows(base.deliverables, data.deliverables, 'label').map((row) => ({ label: row.label, done: Boolean(row.done) })),
    performanceSnapshot: { ...base.performanceSnapshot, ...(data.performanceSnapshot || {}) },
    performanceLabels: { ...base.performanceLabels, ...(data.performanceLabels || {}) },
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
  performanceLabels: { ...(plan.performanceLabels || DEFAULT_EXECUTION_PROFILE.performanceLabels) },
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
  performanceLabels: { ...(draft.performanceLabels || DEFAULT_EXECUTION_PROFILE.performanceLabels) },
  notes: { ...draft.notes },
});

const BulletList = ({ items = [], empty = 'Not defined yet.' }) =>
  items.length ? (
    <ul className="space-y-1.5">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm leading-5 text-neutral-700 dark:text-neutral-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_0_3px_var(--portal-accent-soft)]" style={{ background: 'var(--portal-accent)' }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm italic text-neutral-400">{empty}</p>
  );

const OverviewField = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
    <p className={fieldLabel}>{label}</p>
    <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{value || '-'}</p>
  </div>
);

const SectionHeader = ({ eyebrow, title, description, icon, index }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {index ? (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black"
            style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent-ink)' }}
          >
            {index}
          </span>
        ) : null}
        <p className={sectionTitle} style={{ color: 'var(--portal-accent)' }}>{eyebrow}</p>
      </div>
      {title ? <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-neutral-100">{title}</h2> : null}
      {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-neutral-400">{description}</p> : null}
    </div>
    {icon ? (
      <span
        className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-xl border text-[20px]"
        style={{ background: 'var(--portal-accent-soft)', borderColor: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }}
      >
        {icon}
      </span>
    ) : null}
  </div>
);

const StatusPill = ({ value }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-[0_6px_14px_rgba(15,118,110,0.25)]"
    style={{ background: 'linear-gradient(135deg, var(--portal-accent), var(--portal-accent-strong))' }}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
    {value || 'On Track'}
  </span>
);

const MediaProjectDetail = () => {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { projectSlug } = useParams();

  // media_head opens this workspace from the Head portal (via the "Marketing
  // Plan" button on MediaHeadProjectDetail.jsx) and shares full edit rights
  // on it, but "back" must return them to their own portal's project list —
  // not into the Marketing user's dashboard shell, which has a different
  // sidebar and previously stranded head users in the wrong portal.
  const isHeadUser = String(user?.role || '').toLowerCase() === 'media_head';
  const projectsHome = isHeadUser ? '/media/head/projects' : '/media/dashboard/projects';
  const portalLabel = isHeadUser ? 'Media Head Portal' : 'Media Portal';

  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [planMeta, setPlanMeta] = useState(null);
  const [plan, setPlan] = useState(emptyPlan());
  const [draft, setDraft] = useState(buildDraft(emptyPlan()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [page, setPage] = useState('1');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const logoInputRef = React.useRef(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeError, setThemeError] = useState('');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeColorInputRef = React.useRef(null);

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
          const projectCanonical = findCanonicalProject(match);
          const executionProfile = getExecutionProfile(projectCanonical);
          const seed = buildSeedPlan(match, projectCanonical);
          const merged = mergePlan(hasPlanContent(planData) ? planData : seed, executionProfile);
          setPlan(merged);
          setDraft(buildDraft(merged));
          // updatedBy only arrives as a populated {firstName,lastName,email,role}
          // object once the backend has picked up the population change —
          // treat an unpopulated raw id (a plain string) as "unknown" rather
          // than rendering a misleading "Someone" placeholder.
          const updatedByUser = planData.updatedBy && typeof planData.updatedBy === 'object' ? planData.updatedBy : null;
          setPlanMeta(updatedByUser && planData.updatedAt ? {
            name: [updatedByUser.firstName, updatedByUser.lastName].filter(Boolean).join(' ') || updatedByUser.email || 'Unknown user',
            role: formatRole(updatedByUser.role),
            updatedAt: planData.updatedAt,
          } : null);
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
  const activeAccent = HEX_RE.test(project?.themeColor || '') ? project.themeColor : DEFAULT_ACCENT;
  const themeVars = useMemo(() => buildThemeVars(activeAccent, theme === 'dark'), [activeAccent, theme]);

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const resolvedId = String(project?._id || project?.id || '');
    if (!file || !resolvedId) return;
    setLogoUploading(true);
    setLogoError('');
    try {
      const res = await departmentApi.uploadMediaProjectLogo(token, resolvedId, file);
      setProject(res?.data || project);
    } catch (err) {
      setLogoError(err.message || 'Failed to upload logo.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleThemeColorChange = async (color) => {
    const resolvedId = String(project?._id || project?.id || '');
    if (!resolvedId || !HEX_RE.test(color || '')) return;
    setThemeMenuOpen(false);
    setThemeSaving(true);
    setThemeError('');
    try {
      const res = await departmentApi.updateMediaProjectThemeColor(token, resolvedId, color);
      setProject(res?.data || { ...project, themeColor: color });
    } catch (err) {
      setThemeError(err.message || 'Failed to update theme color.');
    } finally {
      setThemeSaving(false);
    }
  };

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
      const saved = mergePlan(res?.data || payload, getExecutionProfile(canonical));
      setPlan(saved);
      setDraft(buildDraft(saved));
      setEditing(false);
      setSaveMessage('Marketing plan saved.');
      setPlanMeta({
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'You',
        role: formatRole(user?.role),
        updatedAt: new Date().toISOString(),
      });
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
  const completedDeliverables = (editing ? draft.deliverables : plan.deliverables).filter((item) => item.done).length;
  const totalDeliverables = (editing ? draft.deliverables : plan.deliverables).length;
  const currentPlan = editing ? buildPayload(draft) : plan;
  const performanceLabels = {
    ...DEFAULT_EXECUTION_PROFILE.performanceLabels,
    ...(currentPlan.performanceLabels || {}),
  };
  const commandStats = [
    { label: 'Phase', value: currentPlan.overview.currentPhase || 'Foundation', icon: 'rocket_launch' },
    { label: 'Status', value: currentPlan.overview.overallStatus || 'On Track', icon: 'verified' },
    { label: 'Budget', value: formatInr(totalMonthlyInvestment) || 'Not budgeted', icon: 'payments' },
    { label: 'Leads Est.', value: formatPlainNumber(totalLeads) || 'No target', icon: 'groups' },
    { label: 'Deliverables', value: `${completedDeliverables}/${totalDeliverables}`, icon: 'task_alt' },
  ];

  return (
    <div
      className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f4_45%,#f6f8fb_100%)] text-neutral-900 dark:bg-background-dark dark:text-neutral-100"
      style={themeVars}
    >
      <main className="portal-page">
        <div className="portal-page-inner max-w-[1480px] space-y-4">
          <nav className="flex items-center gap-1.5 px-1 text-[12px] font-semibold text-neutral-400 dark:text-neutral-500">
            <button type="button" onClick={() => navigate(projectsHome)} className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300">
              {portalLabel}
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <button type="button" onClick={() => navigate(projectsHome)} className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300">
              Projects
            </button>
            {!notFound ? (
              <>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="truncate font-black" style={{ color: 'var(--portal-accent)' }}>{projectName}</span>
              </>
            ) : null}
          </nav>

          <header className="sticky top-0 z-30 overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90">
            <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, var(--portal-accent-strong), var(--portal-accent))' }} />
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(projectsHome)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-all duration-200 hover:border-teal-300 hover:text-teal-700 hover:shadow-md active:scale-95 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                  title="Back to Projects"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading || notFound}
                  title={project?.logo?.url ? 'Change project logo' : 'Upload project logo'}
                  className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-slate-50 shadow-sm transition-all duration-200 hover:border-teal-300 hover:shadow-md disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  {project?.logo?.url ? (
                    <img src={project.logo.url} alt={`${projectName} logo`} className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className="text-[16px] font-black uppercase text-white"
                      style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--portal-accent), var(--portal-accent-strong))' }}
                    >
                      {projectName.trim().charAt(0) || '?'}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className={`material-symbols-outlined text-[18px] text-white ${logoUploading ? 'animate-spin' : ''}`}>
                      {logoUploading ? 'progress_activity' : 'photo_camera'}
                    </span>
                  </span>
                </button>

                <div className="relative shrink-0">
                  <input
                    ref={themeColorInputRef}
                    type="color"
                    value={activeAccent}
                    className="hidden"
                    onChange={(e) => handleThemeColorChange(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setThemeMenuOpen((v) => !v)}
                    disabled={themeSaving || notFound}
                    title="Change project theme color"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-all duration-200 hover:border-teal-300 hover:text-teal-700 hover:shadow-md active:scale-95 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${themeSaving ? 'animate-spin' : ''}`} style={{ color: themeSaving ? undefined : activeAccent }}>
                      {themeSaving ? 'progress_activity' : 'palette'}
                    </span>
                  </button>
                  {themeMenuOpen ? (
                    <>
                      <button
                        type="button"
                        aria-label="Close theme color menu"
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setThemeMenuOpen(false)}
                      />
                      <div className="absolute left-0 top-12 z-20 w-52 rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.16)] dark:border-neutral-800 dark:bg-neutral-900">
                        <p className="text-[11px] font-black uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">Theme color</p>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {THEME_PRESETS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => handleThemeColorChange(color)}
                              title={color}
                              className={`h-8 w-8 rounded-lg border-2 transition-transform duration-150 hover:scale-110 ${activeAccent.toLowerCase() === color.toLowerCase() ? 'border-neutral-900 dark:border-white' : 'border-transparent'}`}
                              style={{ background: color }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => themeColorInputRef.current?.click()}
                          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-2 py-1.5 text-[12px] font-bold text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          <span className="material-symbols-outlined text-[15px]">colorize</span>
                          Custom color
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-[22px] font-black leading-tight tracking-tight text-slate-950 dark:text-neutral-100">{projectName}</h1>
                    {!notFound ? <StatusPill value={currentPlan.overview.overallStatus} /> : null}
                  </div>
                  <p className="mt-1 max-w-3xl text-sm leading-5 text-neutral-500 dark:text-neutral-400">{projectDescription}</p>
                  {logoError ? <p className="truncate text-[11px] font-semibold text-red-600">{logoError}</p> : null}
                  {themeError ? <p className="truncate text-[11px] font-semibold text-red-600">{themeError}</p> : null}
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
                      className="rounded-xl border border-neutral-300 px-4 py-2 text-[13px] font-bold text-neutral-600 transition-all duration-200 hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="rounded-xl px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(15,118,110,0.28)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_10px_24px_rgba(15,118,110,0.35)] active:scale-[0.98] disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, var(--portal-accent), var(--portal-accent-strong))' }}
                    >
                      {saving ? 'Saving...' : 'Save Plan'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="rounded-xl px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(15,118,110,0.28)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_10px_24px_rgba(15,118,110,0.35)] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, var(--portal-accent), var(--portal-accent-strong))' }}
                  >
                    Edit Plan
                  </button>
                )}
                <ThemeToggleButton />
              </div>
            </div>
          </header>

          {editing && !notFound && !loading ? (
            <div
              className="sticky top-21.5 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-[12px] font-bold shadow-sm"
              style={{ background: 'var(--portal-accent-soft)', borderColor: 'var(--portal-accent-soft)', color: 'var(--portal-accent-ink)' }}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Editing marketing plan — changes are not saved yet.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-lg border border-current/30 px-3 py-1 text-[11px] font-bold transition hover:bg-white/40 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-lg px-3 py-1 text-[11px] font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'var(--portal-accent)' }}
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </div>
          ) : null}

          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

          {notFound && !loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
              <span className="material-symbols-outlined text-[32px] text-neutral-400">search_off</span>
              <p className="mt-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Project not found.</p>
              <p className="mt-1 text-xs text-neutral-400">This link may be outdated, or the project may no longer be accessible.</p>
              <button
                type="button"
                onClick={() => navigate(projectsHome)}
                className="mt-4 rounded-xl px-4 py-2 text-[13px] font-bold text-white shadow-sm transition"
                style={{ background: 'var(--portal-accent)' }}
              >
                Back to Projects
              </button>
            </div>
          ) : null}

          {!loading && !notFound ? (
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-neutral-900">
              {[
                { id: '1', label: 'Marketing Command Center', icon: 'dashboard' },
                { id: '2', label: 'Weekly Execution', icon: 'checklist' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPage(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all duration-200 ${
                    page === tab.id
                      ? 'text-white shadow-[0_6px_16px_var(--portal-accent-soft)]'
                      : 'text-neutral-500 hover:bg-slate-50 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                  style={page === tab.id ? { background: 'linear-gradient(135deg, var(--portal-accent), var(--portal-accent-strong))' } : undefined}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === '1' ? 'Command Center' : 'Execution'}</span>
                </button>
              ))}
            </div>
          ) : null}

          {!loading && !notFound ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-neutral-900">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {commandStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)] dark:border-neutral-800 dark:bg-neutral-950/40"
                  >
                    <span
                      className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[21px] transition-transform duration-200 group-hover:scale-105"
                      style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }}
                    >
                      {stat.icon}
                    </span>
                    <div className="min-w-0">
                      <p className={fieldLabel}>{stat.label}</p>
                      <p className="truncate text-[15px] font-black text-slate-950 dark:text-neutral-100">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900" />
              {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="h-3 w-32 rounded bg-slate-200 dark:bg-neutral-800" />
                  <div className="mt-3 h-4 w-56 rounded bg-slate-200 dark:bg-neutral-800" />
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((cell) => (
                      <div key={cell} className="h-16 rounded-xl bg-slate-100 dark:bg-neutral-800/60" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : notFound ? null : page === '1' ? (
            <>
              {/* Project Overview */}
              <section className={card}>
                <SectionHeader
                  index="01"
                  eyebrow="Project Overview"
                  title="Marketing command center"
                  description="Core audience, market position, active phase, and status for the project."
                  icon="dashboard"
                />
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
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                      <p className={fieldLabel}>Overall Status</p>
                      <div className="mt-2"><StatusPill value={plan.overview.overallStatus} /></div>
                    </div>
                  </div>
                )}
              </section>

              {/* Main Goal */}
              <section className={card}>
                <SectionHeader
                  index="02"
                  eyebrow="Main Goal"
                  title="Outcome alignment"
                  description="Brand, marketing, and business goals side by side for fast review."
                  icon="track_changes"
                />
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
                <SectionHeader
                  index="03"
                  eyebrow="Three-Phase Media Framework"
                  title="Foundation, growth, and scaling path"
                  description="A compact view of when each phase is used, what the team focuses on, and the expected output."
                  icon="account_tree"
                />
                <div className={tableWrap}>
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className={tableHead}>
                        <th className={tableTh}>Phase</th>
                        <th className={tableTh}>When Used</th>
                        <th className={tableTh}>Main Focus</th>
                        <th className={tableTh}>Key Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? draft.framework : plan.framework).map((row, idx) => (
                        <tr key={row.phase} className="odd:bg-slate-50/50 align-top transition-colors duration-150 hover:bg-slate-50 dark:odd:bg-neutral-950/25 dark:hover:bg-neutral-800/40">
                          <td className={`${tableTd} font-bold`} style={{ color: 'var(--portal-accent)' }}>
                            {row.phase}
                          </td>
                          <td className={tableTd}>
                            {editing ? (
                              <input className={inputCls} value={row.whenUsed} onChange={(e) => setFrameworkField(idx, 'whenUsed', e.target.value)} />
                            ) : (
                              row.whenUsed || '-'
                            )}
                          </td>
                          <td className={tableTd}>
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
                          <td className={tableTd}>
                            {editing ? (
                              <input className={inputCls} value={row.keyOutput} onChange={(e) => setFrameworkField(idx, 'keyOutput', e.target.value)} />
                            ) : (
                              row.keyOutput || '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Before Campaign Starts - Required Planning */}
              <section className={card}>
                <SectionHeader
                  index="04"
                  eyebrow="Required Planning"
                  title="Before campaign starts"
                  description="Audience segments, friction points, triggers, positioning, value proposition, and channel mix."
                  icon="fact_check"
                />
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
                <SectionHeader
                  index="05"
                  eyebrow="Funnel Structure"
                  title="Acquisition journey"
                  description="The ordered path from awareness through retention and referral."
                  icon="schema"
                />
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
                          <span
                            className="rounded-xl border px-3 py-2 text-[13px] font-bold shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            style={{ background: 'var(--portal-accent-soft)', borderColor: 'var(--portal-accent-soft)', color: 'var(--portal-accent-ink)' }}
                          >
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
                <SectionHeader
                  index="06"
                  eyebrow="KPI Plan"
                  title="Measurement focus"
                  description="The core signals used to monitor acquisition quality and campaign efficiency."
                  icon="insights"
                />
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
                <SectionHeader
                  index="07"
                  eyebrow="Budget Plan"
                  title="Investment overview"
                  description="High-level spending themes for each stage of the media plan."
                  icon="account_balance_wallet"
                />
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
                <SectionHeader
                  index="01"
                  eyebrow="Weekly Checklist"
                  title="Execution readiness"
                  description="Task ownership and completion status for the current marketing cycle."
                  icon="checklist"
                />
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400 [&>th]:bg-slate-50/70 dark:[&>th]:bg-neutral-900/40">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Task</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Owner</th>
                        <th className="border-b border-neutral-200 px-3 py-2 text-center dark:border-neutral-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? draft.weeklyChecklist : plan.weeklyChecklist).map((row, idx) => (
                        <tr key={row.task} className="odd:bg-slate-50/50 transition-colors duration-150 hover:bg-slate-50 dark:odd:bg-neutral-950/25 dark:hover:bg-neutral-800/40">
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">{row.task}</td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.owner} onChange={(e) => setChecklistField(idx, 'owner', e.target.value)} />
                            ) : (
                              row.owner || '-'
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 text-center dark:border-neutral-800">
                            <input
                              type="checkbox"
                              checked={row.done}
                              disabled={!editing}
                              onChange={(e) => setChecklistField(idx, 'done', e.target.checked)}
                              className="h-4 w-4"
                              style={{ accentColor: 'var(--portal-accent)' }}
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
                <SectionHeader
                  index="02"
                  eyebrow="Weekly Update"
                  title="Progress by week"
                  description="Focus area and progress notes across launch and scaling weeks."
                  icon="event_note"
                />
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400 [&>th]:bg-slate-50/70 dark:[&>th]:bg-neutral-900/40">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Week</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Focus Area</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? draft.weeklyUpdates : plan.weeklyUpdates).map((row, idx) => (
                        <tr key={row.week} className="odd:bg-slate-50/50 transition-colors duration-150 hover:bg-slate-50 dark:odd:bg-neutral-950/25 dark:hover:bg-neutral-800/40">
                          <td className="border-b border-neutral-100 px-3 py-2.5 font-bold dark:border-neutral-800" style={{ color: 'var(--portal-accent)' }}>{row.week}</td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.focusArea} onChange={(e) => setWeeklyUpdateField(idx, 'focusArea', e.target.value)} />
                            ) : (
                              row.focusArea || '-'
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} placeholder="Progress notes" value={row.progress} onChange={(e) => setWeeklyUpdateField(idx, 'progress', e.target.value)} />
                            ) : (
                              row.progress || '-'
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
                <SectionHeader
                  index="03"
                  eyebrow="Acquisition Budget"
                  title="Channel investment plan"
                  description="Monthly investment, estimated leads, calculated CPL, and channel status."
                  icon="payments"
                />
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400 [&>th]:bg-slate-50/70 dark:[&>th]:bg-neutral-900/40">
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
                          <tr key={row.channel} className="odd:bg-slate-50/50 transition-colors duration-150 hover:bg-slate-50 dark:odd:bg-neutral-950/25 dark:hover:bg-neutral-800/40">
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
                      <tr className="font-black text-neutral-900 dark:text-neutral-100" style={{ background: 'var(--portal-accent-soft)' }}>
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
                <SectionHeader
                  index="04"
                  eyebrow="Funnel Performance"
                  title="Weekly conversion tracker"
                  description="Targets, actuals, and calculated conversion between funnel stages."
                  icon="filter_alt"
                />
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400 [&>th]:bg-slate-50/70 dark:[&>th]:bg-neutral-900/40">
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
                          <tr key={row.stage} className="odd:bg-slate-50/50 transition-colors duration-150 hover:bg-slate-50 dark:odd:bg-neutral-950/25 dark:hover:bg-neutral-800/40">
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
                <SectionHeader
                  index="05"
                  eyebrow="Content Tracker"
                  title="Monthly publishing output"
                  description="Planned and completed output by content format."
                  icon="edit_note"
                />
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400 [&>th]:bg-slate-50/70 dark:[&>th]:bg-neutral-900/40">
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Content Type</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Target</th>
                        <th className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? draft.contentTracker : plan.contentTracker).map((row, idx) => (
                        <tr key={row.contentType} className="odd:bg-slate-50/50 transition-colors duration-150 hover:bg-slate-50 dark:odd:bg-neutral-950/25 dark:hover:bg-neutral-800/40">
                          <td className="border-b border-neutral-100 px-3 py-2.5 font-semibold dark:border-neutral-800">{row.contentType}</td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.target} onChange={(e) => setContentTrackerField(idx, 'target', e.target.value)} />
                            ) : (
                              row.target || '-'
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                            {editing ? (
                              <input className={inputCls} value={row.completed} onChange={(e) => setContentTrackerField(idx, 'completed', e.target.value)} />
                            ) : (
                              row.completed || '-'
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
                <SectionHeader
                  index="06"
                  eyebrow="Priority Matrix"
                  title="Next action focus"
                  description="High, medium, and low priority work for campaign execution."
                  icon="priority_high"
                />
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
                <SectionHeader
                  index="07"
                  eyebrow="Deliverables Checklist"
                  title="Campaign assets and systems"
                  description="The reusable deliverables required for a complete media operation."
                  icon="task_alt"
                />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(editing ? draft.deliverables : plan.deliverables).map((row, idx) => (
                    <label
                      key={row.label}
                      className="flex items-center gap-2 rounded-lg border border-neutral-100 px-3 py-2 text-sm transition-colors duration-150 hover:bg-(--portal-accent-soft) dark:border-neutral-800"
                    >
                      <input
                        type="checkbox"
                        checked={row.done}
                        disabled={!editing}
                        onChange={(e) => setDeliverableField(idx, 'done', e.target.checked)}
                        className="h-4 w-4"
                        style={{ accentColor: 'var(--portal-accent)' }}
                      />
                      <span className="text-neutral-700 dark:text-neutral-300">{row.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Performance Snapshot */}
              <section className={card}>
                <SectionHeader
                  index="08"
                  eyebrow="Performance Snapshot"
                  title="This month"
                  description="Current headline metrics for traffic, leads, supply, conversions, revenue, and ROAS."
                  icon="monitoring"
                />
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { key: 'websiteVisits', label: performanceLabels.websiteVisits },
                    { key: 'registrations', label: performanceLabels.registrations },
                    { key: 'vendorSignups', label: performanceLabels.vendorSignups },
                    { key: 'bookings', label: performanceLabels.bookings },
                    { key: 'revenue', label: performanceLabels.revenue },
                    { key: 'roas', label: performanceLabels.roas },
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
                        <p className="mt-1 text-lg font-black text-neutral-900 dark:text-neutral-100">{plan.performanceSnapshot[key] || '-'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Notes & Next Week Focus */}
              <section className={card}>
                <SectionHeader
                  index="09"
                  eyebrow="Notes & Focus"
                  title="Review and next moves"
                  description="Observations, blockers, next-week focus, and action items for the team."
                  icon="notes"
                />
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
            <div className="flex items-center justify-center pb-2 pt-1">
              <button
                type="button"
                onClick={() => { setPage(page === '1' ? '2' : '1'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-5 py-2 text-[12px] font-bold text-neutral-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                style={{ color: 'var(--portal-accent)' }}
              >
                {page === '1' ? 'Continue to Weekly Execution' : 'Back to Marketing Command Center'}
                <span className="material-symbols-outlined text-[16px]">{page === '1' ? 'arrow_forward' : 'arrow_back'}</span>
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default MediaProjectDetail;
