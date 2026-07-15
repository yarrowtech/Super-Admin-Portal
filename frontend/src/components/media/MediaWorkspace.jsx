import React, { useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { QK } from '../../utils/queryKeys';
import { findCanonicalProject } from '../../config/projectNames';
import PortalHeader from '../common/PortalHeader';
import MediaProjectList from './MediaProjectList';
import CampaignLifecycleStepper from './CampaignLifecycleStepper';
import ApprovalHistoryTimeline from './ApprovalHistoryTimeline';
import CampaignTaskBoard from './CampaignTaskBoard';
import BudgetTracker from './BudgetTracker';
import KpiFunnelChart from './KpiFunnelChart';
import MarketingCalendar from './MarketingCalendar';
import WeeklyPlanner from './WeeklyPlanner';
import ProjectChecklists from './ProjectChecklists';
import MarketingReportPanel from './MarketingReportPanel';

const MEDIA_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'campaign' },
  { id: 'projects', label: 'Projects', icon: 'folder_copy' },
  { id: 'assets', label: 'Assets', icon: 'perm_media' },
  { id: 'brand', label: 'Brand', icon: 'palette' },
  { id: 'content', label: 'Content', icon: 'edit_note' },
  { id: 'design', label: 'Design', icon: 'draw' },
  { id: 'video', label: 'Video', icon: 'movie' },
  { id: 'social', label: 'Social', icon: 'chat_bubble' },
  { id: 'campaigns', label: 'Campaigns', icon: 'ads_click' },
  { id: 'tasks', label: 'Tasks', icon: 'checklist' },
  { id: 'budget', label: 'Budget', icon: 'payments' },
  { id: 'funnel', label: 'KPI & Funnel', icon: 'insights' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
  { id: 'weekly-planning', label: 'Weekly Planning', icon: 'event_note' },
  { id: 'checklists', label: 'Checklists', icon: 'checklist_rtl' },
  { id: 'advertisements', label: 'Ads', icon: 'credit_card' },
  { id: 'seo', label: 'SEO', icon: 'search' },
  { id: 'website', label: 'Website', icon: 'public' },
  { id: 'testimonials', label: 'Testimonials', icon: 'reviews' },
  { id: 'case-studies', label: 'Case Studies', icon: 'description' },
  { id: 'approvals', label: 'Approvals', icon: 'fact_check' },
  { id: 'reporting', label: 'Reporting', icon: 'bar_chart' },
  { id: 'audit', label: 'Audit Trail', icon: 'history' },
];

const MODULE_FOR_SECTION = {
  assets: 'asset',
  brand: 'brand',
  content: 'content',
  design: 'design',
  video: 'video',
  social: 'social',
  campaigns: 'campaign',
  advertisements: 'advertisement',
  seo: 'seo',
  website: 'website',
  testimonials: 'testimonial',
  'case-studies': 'case-study',
  approvals: 'approval',
  reporting: 'report',
  audit: 'report',
};

const META = {
  dashboard: ['Media Command Center', 'Executive overview of media production, campaigns, approvals, and delivery', 'campaign'],
  projects: ['Projects', 'Click a project to open its full media & marketing plan', 'folder_copy'],
  assets: ['Digital Asset Management', 'Searchable, versioned asset vault', 'perm_media'],
  brand: ['Brand Management', 'Guidelines, templates, and compliance tracking', 'palette'],
  content: ['Content Studio', 'Blogs, copy, web content, and editorial workflow', 'edit_note'],
  design: ['Design Requests', 'Creative intake, assignment, revisions, and delivery', 'draw'],
  video: ['Video Production', 'Scripts, footage, edits, reviews, and publishing', 'movie'],
  social: ['Social Media', 'Calendar, scheduling, and performance', 'chat_bubble'],
  campaigns: ['Campaign Management', 'Planning, budgets, and KPI tracking', 'ads_click'],
  tasks: ['Campaign Tasks', 'Auto-generated task board across all campaigns', 'checklist'],
  budget: ['Budget Logic', 'Total budget, allocations, expenses, ROI, ROAS, and cost per lead', 'payments'],
  funnel: ['KPI & Marketing Funnel', 'Traffic-to-revenue KPIs and the awareness-to-referral funnel', 'insights'],
  calendar: ['Marketing Calendar', 'Every campaign, task, publish, and approval date in one view', 'calendar_month'],
  'weekly-planning': ['Weekly Planning', 'Objectives, owners, deadlines, and progress for the current week', 'event_note'],
  checklists: ['Project Checklists', 'Website, SEO, CRM, Ads, Email, WhatsApp, and reporting readiness', 'checklist_rtl'],
  advertisements: ['Advertisement Management', 'CPC, CPM, CTR, and ROI', 'credit_card'],
  seo: ['SEO Management', 'Keywords, rankings, backlinks, and technical SEO', 'search'],
  website: ['Website Media', 'Publishing workflow and approval tracking', 'public'],
  testimonials: ['Testimonial Management', 'Client proof, ratings, and success stories', 'reviews'],
  'case-studies': ['Case Studies', 'Impact stories and approvals', 'description'],
  approvals: ['Approval Center', 'Multi-level approvals and revision control', 'fact_check'],
  reporting: ['Reporting Center', 'Exportable marketing and operational reports', 'bar_chart'],
  audit: ['Audit Trail', 'Immutable activity and compliance logging', 'history'],
};

const EDITABLE_SECTIONS = new Set(['assets', 'content', 'brand', 'design', 'video', 'social', 'advertisements', 'seo', 'website', 'testimonials', 'case-studies']);
const SECTION_ACTIONS = {
  assets: {
    label: 'Asset',
    create: 'Create asset',
    createFn: 'createMediaAsset',
    updateFn: 'updateMediaAsset',
    deleteFn: 'deleteMediaAsset',
    requestApprovalFn: 'requestMediaApproval',
  },
  content: {
    label: 'Content',
    create: 'Create content',
    createFn: 'createMediaContent',
    updateFn: 'updateMediaContent',
    deleteFn: 'deleteMediaContent',
    requestApprovalFn: 'requestMediaContentApproval',
  },
  brand: {
    label: 'Brand Asset',
    create: 'Create brand asset',
    createFn: 'createMediaBrandAsset',
    updateFn: 'updateMediaBrandAsset',
    deleteFn: 'deleteMediaBrandAsset',
    requestApprovalFn: 'requestMediaBrandApproval',
  },
  design: {
    label: 'Design Item',
    create: 'Create design item',
    createFn: 'createMediaDesignItem',
    updateFn: 'updateMediaDesignItem',
    deleteFn: 'deleteMediaDesignItem',
    requestApprovalFn: 'requestMediaDesignApproval',
  },
  video: {
    label: 'Video Item',
    create: 'Create video item',
    createFn: 'createMediaVideoItem',
    updateFn: 'updateMediaVideoItem',
    deleteFn: 'deleteMediaVideoItem',
    requestApprovalFn: 'requestMediaVideoApproval',
  },
  social: {
    label: 'Social Post',
    create: 'Create social post',
    createFn: 'createMediaSocialPost',
    updateFn: 'updateMediaSocialPost',
    deleteFn: 'deleteMediaSocialPost',
    requestApprovalFn: 'requestMediaSocialApproval',
  },
  advertisements: {
    label: 'Advertisement',
    create: 'Create advertisement',
    createFn: 'createMediaAdvertisement',
    updateFn: 'updateMediaAdvertisement',
    deleteFn: 'deleteMediaAdvertisement',
    requestApprovalFn: 'requestMediaAdvertisementApproval',
  },
  seo: {
    label: 'SEO Item',
    create: 'Create SEO item',
    createFn: 'createMediaSeoItem',
    updateFn: 'updateMediaSeoItem',
    deleteFn: 'deleteMediaSeoItem',
    requestApprovalFn: 'requestMediaSeoApproval',
  },
  website: {
    label: 'Website Item',
    create: 'Create website item',
    createFn: 'createMediaWebsiteItem',
    updateFn: 'updateMediaWebsiteItem',
    deleteFn: 'deleteMediaWebsiteItem',
    requestApprovalFn: 'requestMediaWebsiteApproval',
  },
  testimonials: {
    label: 'Testimonial',
    create: 'Create testimonial',
    createFn: 'createMediaTestimonial',
    updateFn: 'updateMediaTestimonial',
    deleteFn: 'deleteMediaTestimonial',
    requestApprovalFn: 'requestMediaTestimonialApproval',
  },
  'case-studies': {
    label: 'Case Study',
    create: 'Create case study',
    createFn: 'createMediaCaseStudy',
    updateFn: 'updateMediaCaseStudy',
    deleteFn: 'deleteMediaCaseStudy',
    requestApprovalFn: 'requestMediaCaseStudyApproval',
  },
};

const DOMAIN_FIELDS = {
  assets: [
    { key: 'assetType', label: 'Asset Type', placeholder: 'Logo, banner, brochure, source file...' },
    { key: 'usageRights', label: 'Usage Rights', placeholder: 'Internal, web, paid ads, client approved...' },
  ],
  brand: [
    { key: 'brandArea', label: 'Brand Area', placeholder: 'Logo, typography, palette, guideline...' },
    { key: 'complianceNotes', label: 'Compliance Notes' },
  ],
  content: [
    { key: 'contentType', label: 'Content Type', placeholder: 'Blog, landing page, email, press release...' },
    { key: 'channel', label: 'Channel', placeholder: 'Website, newsletter, LinkedIn...' },
    { key: 'publishTarget', label: 'Publish Target' },
  ],
  design: [
    { key: 'format', label: 'Format', placeholder: 'Static, carousel, print, presentation...' },
    { key: 'dimensions', label: 'Dimensions', placeholder: '1080x1080, A4, 16:9...' },
    { key: 'revisionRound', label: 'Revision Round', type: 'number' },
  ],
  video: [
    { key: 'videoType', label: 'Video Type', placeholder: 'Reel, explainer, testimonial, ad...' },
    { key: 'durationSeconds', label: 'Duration (seconds)', type: 'number' },
    { key: 'aspectRatio', label: 'Aspect Ratio', placeholder: '9:16, 16:9, 1:1...' },
  ],
  social: [
    { key: 'platform', label: 'Platform', placeholder: 'Instagram, LinkedIn, YouTube...' },
    { key: 'caption', label: 'Caption' },
    { key: 'reach', label: 'Reach', type: 'number' },
    { key: 'engagement', label: 'Engagement', type: 'number' },
  ],
  advertisements: [
    { key: 'platform', label: 'Platform', placeholder: 'Google Ads, Meta, LinkedIn...' },
    { key: 'impressions', label: 'Impressions', type: 'number' },
    { key: 'clicks', label: 'Clicks', type: 'number' },
    { key: 'cpc', label: 'CPC', type: 'number' },
    { key: 'cpm', label: 'CPM', type: 'number' },
    { key: 'ctr', label: 'CTR (%)', type: 'number' },
    { key: 'spend', label: 'Spend', type: 'number', top: true },
    { key: 'roi', label: 'ROI (%)', type: 'number', top: true },
  ],
  seo: [
    { key: 'keyword', label: 'Keyword' },
    { key: 'targetUrl', label: 'Target URL' },
    { key: 'ranking', label: 'Ranking', type: 'number' },
    { key: 'searchVolume', label: 'Search Volume', type: 'number' },
    { key: 'backlinks', label: 'Backlinks', type: 'number' },
  ],
  website: [
    { key: 'pageUrl', label: 'Page URL' },
    { key: 'pageType', label: 'Page Type', placeholder: 'Landing, Blog, Product...' },
  ],
  testimonials: [
    { key: 'clientName', label: 'Client Name' },
    { key: 'rating', label: 'Rating (1-5)', type: 'number' },
    { key: 'source', label: 'Source', placeholder: 'Google, LinkedIn, Direct...' },
  ],
  'case-studies': [
    { key: 'clientName', label: 'Client Name' },
    { key: 'industry', label: 'Industry' },
    { key: 'resultsSummary', label: 'Results Summary' },
  ],
};

const STATUS_OPTIONS = ['all', 'draft', 'pending', 'in review', 'approved', 'live', 'active', 'published', 'needs revision', 'rejected'];
const CAMPAIGN_STAGES = [
  'draft',
  'objective-defined',
  'platform-selected',
  'budget-allocated',
  'team-assigned',
  'content-in-progress',
  'in-approval',
  'scheduled',
  'live',
  'tracking',
  'closed',
];
const CAMPAIGN_STAGE_LABELS = {
  draft: 'Draft',
  'objective-defined': 'Objective Defined',
  'platform-selected': 'Platform Selected',
  'budget-allocated': 'Budget Allocated',
  'team-assigned': 'Team Assigned',
  'content-in-progress': 'Content In Progress',
  'in-approval': 'In Approval',
  scheduled: 'Scheduled',
  live: 'Live',
  tracking: 'Tracking',
  closed: 'Closed',
};
const CREATIVE_SECTION_IDS = new Set(['assets', 'brand', 'content', 'design', 'video', 'social']);
const CREATIVE_DETAILS = {
  assets: ['Asset Library', 'Manage logos, campaign files, source assets, and approved deliverables.', 'assetType', 'Asset types'],
  brand: ['Brand Control', 'Keep guidelines, templates, identity assets, and compliance notes in one place.', 'brandArea', 'Brand areas'],
  content: ['Content Pipeline', 'Create, revise, approve, and publish copy across every channel.', 'contentType', 'Content types'],
  design: ['Design Queue', 'Track design requests, revisions, owners, and delivery files.', 'format', 'Formats'],
  video: ['Video Production', 'Manage scripts, edits, cuts, review files, and publishing status.', 'videoType', 'Video types'],
  social: ['Social Desk', 'Plan posts, attach creatives, and capture platform performance.', 'platform', 'Platforms'],
};
const CREATIVE_WORKFLOWS = {
  assets: [
    ['Intake', 'Upload source file, assign owner, tag usage.'],
    ['Organize', 'Attach category, rights, and project context.'],
    ['Approve', 'Request approval before final use.'],
    ['Publish', 'Use approved files in campaigns and reports.'],
  ],
  brand: [
    ['Guideline', 'Define brand area, notes, and source asset.'],
    ['Compliance', 'Check logo, type, colors, and usage rules.'],
    ['Approve', 'Lock approved versions for reuse.'],
    ['Distribute', 'Share final templates and reference files.'],
  ],
  content: [
    ['Brief', 'Capture type, channel, target, and owner.'],
    ['Draft', 'Write, attach files, and update status.'],
    ['Review', 'Move through approval and revisions.'],
    ['Publish', 'Mark scheduled, live, or published.'],
  ],
  design: [
    ['Request', 'Capture format, size, owner, and brief.'],
    ['Production', 'Attach work files and revision notes.'],
    ['Review', 'Track approval and requested changes.'],
    ['Delivery', 'Store final creative for campaign use.'],
  ],
  video: [
    ['Script', 'Define type, duration, ratio, and owner.'],
    ['Edit', 'Attach cuts, thumbnails, and review files.'],
    ['Approve', 'Route edits through approval.'],
    ['Publish', 'Mark scheduled, live, or archived.'],
  ],
  social: [
    ['Plan', 'Set platform, caption, owner, and asset.'],
    ['Schedule', 'Track status and publish timing.'],
    ['Review', 'Approve creative and caption together.'],
    ['Measure', 'Update reach and engagement.'],
  ],
};
const CHANNEL_SECTION_IDS = new Set(['advertisements', 'seo', 'website', 'testimonials', 'case-studies']);
const CHANNEL_DETAILS = {
  advertisements: ['Paid Ads Control', 'Manage paid media creatives, spend, platform performance, approvals, and ROI snapshots.', 'platform', 'Platforms'],
  seo: ['SEO Growth Desk', 'Track keyword ownership, ranking movement, backlinks, page targets, and optimization status.', 'keyword', 'Keywords'],
  website: ['Website Publishing Desk', 'Control page updates, launch readiness, owners, approvals, and publishing evidence.', 'pageType', 'Page types'],
  testimonials: ['Proof & Testimonial Desk', 'Collect, approve, and reuse client proof across campaigns, sales pages, and social channels.', 'source', 'Sources'],
  'case-studies': ['Case Study Pipeline', 'Build client impact stories from intake through proof, approval, publishing, and reuse.', 'industry', 'Industries'],
};
const CHANNEL_WORKFLOWS = {
  advertisements: [
    ['Plan', 'Define platform, target, budget, and creative owner.'],
    ['Launch', 'Attach ad creative and move approved work live.'],
    ['Optimize', 'Update spend, CPC, CPM, CTR, and ROI snapshots.'],
    ['Report', 'Keep performance evidence tied to project and campaign.'],
  ],
  seo: [
    ['Research', 'Capture keyword, target page, volume, and intent.'],
    ['Optimize', 'Assign page owner, content work, and technical fixes.'],
    ['Measure', 'Update rank, backlinks, and search volume.'],
    ['Improve', 'Keep next actions visible until ranking target is reached.'],
  ],
  website: [
    ['Request', 'Capture page type, URL, owner, and project context.'],
    ['Build', 'Track copy, design, dev, and media requirements.'],
    ['Approve', 'Route page changes through review before publish.'],
    ['Publish', 'Mark live, attach proof, and keep launch records auditable.'],
  ],
  testimonials: [
    ['Collect', 'Capture client, rating, quote source, and permission.'],
    ['Verify', 'Check proof, consent, and reusable marketing claims.'],
    ['Approve', 'Move testimonial through review before publishing.'],
    ['Reuse', 'Attach to campaigns, website pages, ads, and sales content.'],
  ],
  'case-studies': [
    ['Qualify', 'Select client, industry, problem, and measurable outcome.'],
    ['Write', 'Build story, result summary, assets, and supporting proof.'],
    ['Approve', 'Route internal and client approval before publishing.'],
    ['Distribute', 'Use approved story across website, campaigns, and sales.'],
  ],
};

const EXPORT_OPTIONS = ['PDF', 'Excel', 'CSV', 'PPT'];
const COLORS = ['#22d3ee', '#38bdf8', '#10b981', '#f59e0b', '#a78bfa', '#ec4899'];

const card = 'rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-neutral-800 dark:bg-neutral-900';
const soft = 'rounded-[1.5rem] border border-slate-200 bg-[#fbfeff] p-4 dark:border-neutral-800 dark:bg-neutral-900/60';
const glass = 'rounded-[1.75rem] border border-teal-200 bg-teal-50/80 p-5 dark:border-teal-900/60 dark:bg-teal-500/10';
const tone = (status = '') => {
  const v = String(status).toLowerCase();
  if (v.includes('approved') || v.includes('live') || v.includes('published')) return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (v.includes('pending') || v.includes('review') || v.includes('draft')) return 'border-amber-300 bg-amber-50 text-amber-700';
  if (v.includes('reject') || v.includes('revision') || v.includes('hold')) return 'border-rose-300 bg-rose-50 text-rose-700';
  return 'border-teal-300 bg-teal-50 text-teal-700';
};
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num(value));
const average = (values) => {
  const valid = values.map(num).filter((value) => value > 0);
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};
const getChannelInsights = (section, records) => {
  if (section === 'advertisements') {
    const spend = records.reduce((sum, item) => sum + num(item?.budgetImpact?.spend || item?.metadata?.spend), 0);
    const clicks = records.reduce((sum, item) => sum + num(item?.metadata?.clicks), 0);
    return [
      ['Total Spend', money(spend), 'payments'],
      ['Clicks', clicks.toLocaleString(), 'ads_click'],
      ['Avg CTR', `${average(records.map((item) => item?.metadata?.ctr)).toFixed(1)}%`, 'percent'],
      ['Avg ROI', `${average(records.map((item) => item?.budgetImpact?.roiAtSnapshot || item?.metadata?.roi)).toFixed(1)}%`, 'trending_up'],
    ];
  }
  if (section === 'seo') {
    const topTen = records.filter((item) => num(item?.metadata?.ranking) > 0 && num(item?.metadata?.ranking) <= 10).length;
    const backlinks = records.reduce((sum, item) => sum + num(item?.metadata?.backlinks), 0);
    return [
      ['Tracked Keywords', records.length.toLocaleString(), 'search'],
      ['Top 10 Ranks', topTen.toLocaleString(), 'military_tech'],
      ['Backlinks', backlinks.toLocaleString(), 'link'],
      ['Avg Position', average(records.map((item) => item?.metadata?.ranking)).toFixed(1), 'leaderboard'],
    ];
  }
  if (section === 'website') {
    const liveCount = records.filter((item) => ['live', 'published', 'approved'].some((status) => recordStatus(item).includes(status))).length;
    const urls = new Set(records.map((item) => String(item?.metadata?.pageUrl || '').trim()).filter(Boolean)).size;
    return [
      ['Pages', records.length.toLocaleString(), 'web'],
      ['URLs', urls.toLocaleString(), 'link'],
      ['Live/Approved', liveCount.toLocaleString(), 'published_with_changes'],
      ['Page Types', new Set(records.map((item) => String(item?.metadata?.pageType || '').trim()).filter(Boolean)).size.toLocaleString(), 'category'],
    ];
  }
  if (section === 'testimonials') {
    const avgRating = average(records.map((item) => item?.metadata?.rating));
    const clients = new Set(records.map((item) => String(item?.metadata?.clientName || '').trim()).filter(Boolean)).size;
    return [
      ['Testimonials', records.length.toLocaleString(), 'reviews'],
      ['Clients', clients.toLocaleString(), 'business_center'],
      ['Avg Rating', avgRating ? `${avgRating.toFixed(1)}/5` : '0/5', 'star'],
      ['Approved', records.filter((item) => recordStatus(item).includes('approved')).length.toLocaleString(), 'verified'],
    ];
  }
  if (section === 'case-studies') {
    const clients = new Set(records.map((item) => String(item?.metadata?.clientName || '').trim()).filter(Boolean)).size;
    const industries = new Set(records.map((item) => String(item?.metadata?.industry || '').trim()).filter(Boolean)).size;
    return [
      ['Stories', records.length.toLocaleString(), 'description'],
      ['Clients', clients.toLocaleString(), 'business_center'],
      ['Industries', industries.toLocaleString(), 'domain'],
      ['Approved', records.filter((item) => recordStatus(item).includes('approved')).length.toLocaleString(), 'verified'],
    ];
  }
  return [];
};
const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'pending';
const bytes = (value) => {
  const n = num(value);
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};
const arr = (value) => (Array.isArray(value) ? value : []);
const pick = (...values) => values.find((value) => typeof value === 'string' && value.trim()) || '-';
const toInputValue = (value) => (value === undefined || value === null ? '' : String(value));
const recordStatus = (record) => String(record?.status || record?.state || record?.approvalStatus || '').trim().toLowerCase();

const MediaWorkspace = ({ activeSection, onSectionChange, selectedProjectId, onProjectChange }) => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignTasks, setCampaignTasks] = useState([]);
  const [content, setContent] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [designItems, setDesignItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [seoItems, setSeoItems] = useState([]);
  const [websiteItems, setWebsiteItems] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [reporting, setReporting] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [campaignEditor, setCampaignEditor] = useState({ open: false, mode: 'create', record: null });
  const [campaignDetailId, setCampaignDetailId] = useState(null);
  const [campaignDraft, setCampaignDraft] = useState({
    name: '',
    objective: '',
    description: '',
    platform: '',
    status: 'draft',
    budgetAllocated: '',
    startDate: '',
    endDate: '',
    projectName: '',
    teamMembersText: '',
    targetReach: '',
    targetLeads: '',
    targetConversions: '',
    targetRevenue: '',
  });
  const [editor, setEditor] = useState({ open: false, mode: 'create', section: 'assets', record: null });
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    status: 'Draft',
    priority: 'Medium',
    category: '',
    projectName: '',
    ownerName: '',
    domainFields: {},
  });
  const effectiveProjectId = selectedProjectId !== undefined ? selectedProjectId : activeProjectId;
  const buildProjectOptions = (projectItems = []) =>
    projectItems
      .map((project) => {
        const value = String(project?._id || project?.id || '').trim();
        if (!value) return null;

        const canonicalProject = findCanonicalProject(project);
        const code = canonicalProject?.code || project?.projectCode || project?.code || '';
        const name = canonicalProject?.name || project?.name || project?.projectCode || 'Untitled project';
        const description = canonicalProject?.description || project?.description || 'Project workspace';

        return {
          code,
          name,
          description,
          status: String(project?.status || 'active').trim() || 'active',
          accessGranted: true,
          assigned: false,
          label: name,
          value,
        };
      })
      .filter(Boolean);

  useEffect(() => {
    if (selectedProjectId !== undefined) {
      setActiveProjectId(String(selectedProjectId || ''));
      return;
    }

    try {
      const stored = localStorage.getItem('activeProjectId');
      if (stored && stored !== 'all' && !stored.startsWith('virtual-')) setActiveProjectId(stored);
      else setActiveProjectId('');
    } catch {
      setActiveProjectId('');
    }
  }, [selectedProjectId]);

  useEffect(() => {
    try {
      if (effectiveProjectId) localStorage.setItem('activeProjectId', String(effectiveProjectId));
      else localStorage.removeItem('activeProjectId');
    } catch {}
  }, [effectiveProjectId]);

  // Client-side cache layer: every list below is a TanStack Query, keyed by
  // project + params via QK.media.*. Revisiting a section (or a project you
  // already loaded this session) reads from cache instead of refetching, and
  // the cache itself is persisted to localStorage (see localStorageCache.js)
  // so a page reload shows instant stale-while-revalidate data too.
  const projectParams = useMemo(() => {
    const storedProjectId = String(effectiveProjectId || '');
    const hasRealProjectId = Boolean(storedProjectId && !storedProjectId.startsWith('virtual-'));
    return hasRealProjectId ? { projectId: storedProjectId } : {};
  }, [effectiveProjectId]);
  const listParams = useMemo(() => ({ ...projectParams, limit: 12 }), [projectParams]);
  const enabled = Boolean(token);

  const [
    projectsQuery, dashboardQuery, assetsQuery, campaignsQuery, contentQuery, brandAssetsQuery,
    approvalsQuery, reportingQuery, campaignTasksQuery, designQuery, videoQuery, socialQuery,
    advertisementsQuery, seoQuery, websiteQuery, testimonialsQuery, caseStudiesQuery,
  ] = useQueries({
    queries: [
      { queryKey: QK.media.projects({ limit: 200 }), queryFn: () => departmentApi.getMediaProjects(token, { limit: 200 }), enabled },
      { queryKey: QK.media.dashboard(projectParams), queryFn: () => departmentApi.getMediaDashboard(token, projectParams), enabled },
      { queryKey: QK.media.assets(listParams), queryFn: () => departmentApi.getMediaAssets(token, listParams), enabled },
      { queryKey: QK.media.campaigns(listParams), queryFn: () => departmentApi.getMediaCampaigns(token, listParams), enabled },
      { queryKey: QK.media.content(listParams), queryFn: () => departmentApi.getMediaContent(token, listParams), enabled },
      { queryKey: QK.media.brandAssets(listParams), queryFn: () => departmentApi.getMediaBrandAssets(token, listParams), enabled },
      { queryKey: QK.media.approvals(listParams), queryFn: () => departmentApi.getMediaApprovals(token, listParams), enabled },
      { queryKey: QK.media.reporting(projectParams), queryFn: () => departmentApi.getMediaReportingSummary(token, projectParams), enabled },
      { queryKey: QK.media.campaignTasks(projectParams), queryFn: () => departmentApi.getMediaCampaignTasks(token, projectParams), enabled },
      { queryKey: QK.media.design(listParams), queryFn: () => departmentApi.getMediaDesignItems(token, listParams), enabled },
      { queryKey: QK.media.video(listParams), queryFn: () => departmentApi.getMediaVideoItems(token, listParams), enabled },
      { queryKey: QK.media.social(listParams), queryFn: () => departmentApi.getMediaSocialPosts(token, listParams), enabled },
      { queryKey: QK.media.advertisements(listParams), queryFn: () => departmentApi.getMediaAdvertisements(token, listParams), enabled },
      { queryKey: QK.media.seo(listParams), queryFn: () => departmentApi.getMediaSeoItems(token, listParams), enabled },
      { queryKey: QK.media.website(listParams), queryFn: () => departmentApi.getMediaWebsiteItems(token, listParams), enabled },
      { queryKey: QK.media.testimonials(listParams), queryFn: () => departmentApi.getMediaTestimonials(token, listParams), enabled },
      { queryKey: QK.media.caseStudies(listParams), queryFn: () => departmentApi.getMediaCaseStudies(token, listParams), enabled },
    ],
  });

  // Sync each cached query into the same local state the rest of this component
  // (and every optimistic create/update/delete handler below) already reads and
  // writes — the write path is untouched, only where the initial data comes from.
  useEffect(() => {
    const projectItems = arr(projectsQuery.data?.data?.items || projectsQuery.data?.data?.data?.items);
    setProjects(buildProjectOptions(projectItems));
  }, [projectsQuery.data]);
  useEffect(() => { setDashboard(dashboardQuery.data?.data || null); }, [dashboardQuery.data]);
  useEffect(() => { setAssets(arr(assetsQuery.data?.data?.items)); }, [assetsQuery.data]);
  useEffect(() => { setCampaigns(arr(campaignsQuery.data?.data?.items)); }, [campaignsQuery.data]);
  useEffect(() => { if (activeSection !== 'campaigns') setCampaignDetailId(null); }, [activeSection]);
  useEffect(() => { setContent(arr(contentQuery.data?.data?.items)); }, [contentQuery.data]);
  useEffect(() => { setBrandAssets(arr(brandAssetsQuery.data?.data?.items)); }, [brandAssetsQuery.data]);
  useEffect(() => { setApprovals(arr(approvalsQuery.data?.data?.items)); }, [approvalsQuery.data]);
  useEffect(() => { setReporting(reportingQuery.data?.data || null); }, [reportingQuery.data]);
  useEffect(() => { setCampaignTasks(arr(campaignTasksQuery.data?.data?.items)); }, [campaignTasksQuery.data]);
  useEffect(() => { setDesignItems(arr(designQuery.data?.data?.items)); }, [designQuery.data]);
  useEffect(() => { setVideoItems(arr(videoQuery.data?.data?.items)); }, [videoQuery.data]);
  useEffect(() => { setSocialPosts(arr(socialQuery.data?.data?.items)); }, [socialQuery.data]);
  useEffect(() => { setAdvertisements(arr(advertisementsQuery.data?.data?.items)); }, [advertisementsQuery.data]);
  useEffect(() => { setSeoItems(arr(seoQuery.data?.data?.items)); }, [seoQuery.data]);
  useEffect(() => { setWebsiteItems(arr(websiteQuery.data?.data?.items)); }, [websiteQuery.data]);
  useEffect(() => { setTestimonials(arr(testimonialsQuery.data?.data?.items)); }, [testimonialsQuery.data]);
  useEffect(() => { setCaseStudies(arr(caseStudiesQuery.data?.data?.items)); }, [caseStudiesQuery.data]);

  const anyLoading = [
    projectsQuery, dashboardQuery, assetsQuery, campaignsQuery, contentQuery, brandAssetsQuery,
    approvalsQuery, reportingQuery, campaignTasksQuery, designQuery, videoQuery, socialQuery,
    advertisementsQuery, seoQuery, websiteQuery, testimonialsQuery, caseStudiesQuery,
  ].some((q) => q.isLoading);

  useEffect(() => {
    setLoading(anyLoading);
    if (!anyLoading) setLastUpdated(Date.now());
  }, [anyLoading]);

  // Mirrors the previous behaviour: a failure on the critical `projects` fetch
  // surfaces as the page-level error; individual section fetches fail silently
  // (arr()/`|| null` fall back to empty state), same as the old Promise.allSettled.
  useEffect(() => {
    if (projectsQuery.isError) {
      setError(projectsQuery.error?.message || 'Failed to load Media Portal.');
    } else if (projectsQuery.isSuccess) {
      setError('');
    }
  }, [projectsQuery.isError, projectsQuery.isSuccess, projectsQuery.error]);

  // Auto-pick a project the first time the user lands on a project-scoped section
  // with none selected — purely local (reads already-fetched `projects`), so it
  // doesn't reintroduce a network round-trip on every section switch.
  useEffect(() => {
    if (activeSection === 'dashboard' || activeSection === 'projects') return;
    const storedProjectId = String(effectiveProjectId || '');
    const hasRealProjectId = Boolean(storedProjectId && !storedProjectId.startsWith('virtual-'));
    if (hasRealProjectId) return;
    const fallbackProject = projects.find((project) => project.value);
    if (fallbackProject) onProjectChange?.(fallbackProject.value);
  }, [activeSection, projects, effectiveProjectId, onProjectChange]);

  const summary = useMemo(() => {
    const kpis = dashboard?.kpis || {};
    const recent = arr(dashboard?.charts?.recentItems);
    const moduleRows = arr(dashboard?.charts?.moduleBreakdown);
    const statusRows = arr(dashboard?.charts?.statusBreakdown);
    return {
      activeProjects: num(kpis.activeProjects ?? projects.length),
      runningCampaigns: num(kpis.runningCampaigns ?? campaigns.length),
      pendingApprovals: num(kpis.pendingApprovals ?? approvals.length),
      assetStorage: kpis.assetStorageUsageLabel || bytes(kpis.assetStorageUsage),
      adSpend: money(kpis.advertisementSpend),
      roi: typeof kpis.marketingRoi === 'number' ? `${kpis.marketingRoi.toFixed(1)}%` : `${kpis.marketingRoi || 0}%`,
      productivity: num(kpis.teamProductivity),
      socialReach: num(kpis.socialReach),
      socialEngagement: num(kpis.socialEngagement),
      published: num(kpis.contentProductionStatus?.published),
      inReview: num(kpis.contentProductionStatus?.inReview),
      deadlines: num(kpis.upcomingDeadlines),
      recent,
      moduleRows,
      statusRows,
      reportRows: arr(reporting?.auditRows),
    };
  }, [approvals.length, campaigns.length, dashboard, projects.length, reporting]);

  const projectOptions = useMemo(
    () => projects.filter((project) => project.value),
    [projects]
  );
  const selectedProjectLabel = projectOptions.find((item) => item.value === effectiveProjectId)?.code || 'All Projects';
  const lastSyncLabel = formatTime(lastUpdated);

  const moduleCount = (section) => {
    const key = MODULE_FOR_SECTION[section];
    if (!key) return 0;
    return num(summary.moduleRows.find((row) => String(row.name || row._id).toLowerCase() === key)?.value || 0);
  };

  const updateProject = (projectId) => {
    onProjectChange?.(projectId);
    if (selectedProjectId === undefined) {
      setActiveProjectId(projectId);
    }
  };

  const getSectionAction = (section) => SECTION_ACTIONS[section] || null;

  const extractDomainFields = (record = {}, section) => {
    const defs = DOMAIN_FIELDS[section] || [];
    const result = {};
    defs.forEach((f) => {
      if (f.top) {
        result[f.key] = toInputValue(f.key === 'spend' ? record?.budgetImpact?.spend : record?.budgetImpact?.roiAtSnapshot);
      } else {
        result[f.key] = toInputValue(record?.metadata?.[f.key]);
      }
    });
    return result;
  };

  const buildDraftFromRecord = (record = {}, section = activeSection) => ({
    title: toInputValue(record.title || record.name || record.contentName || record.assetName),
    description: toInputValue(record.description || record.objective || record.summary || ''),
    status: toInputValue(record.status || record.state || 'Draft'),
    priority: toInputValue(record.priority || 'Medium'),
    category: toInputValue(record.category || record.type || ''),
    tags: toInputValue(arr(record.tags).join(', ')),
    projectName: toInputValue(record.projectName || record.project?.name || ''),
    ownerName: toInputValue(record.ownerName || record.owner || record.author || record.assignedTo || ''),
    storageUrl: toInputValue(record.storageUrl),
    storageKey: toInputValue(record.storageKey),
    storageProvider: toInputValue(record.storageProvider),
    thumbnailUrl: toInputValue(record.thumbnailUrl),
    mimeType: toInputValue(record.mimeType),
    fileSizeBytes: record.fileSizeBytes || 0,
    file: null,
    section,
    domainFields: extractDomainFields(record, section),
  });

  const openEditor = (mode, section, record = null) => {
    setActionMessage('');
    setEditor({ open: true, mode, section, record });
    setDraft(buildDraftFromRecord(record || {}, section));
  };

  const closeEditor = () => {
    setEditor({ open: false, mode: 'create', section: activeSection, record: null });
    setDraft(buildDraftFromRecord({}, activeSection));
  };

  const refreshData = () => queryClient.invalidateQueries({ queryKey: QK.media.root() });

  const resolveRecordId = (record) => String(record?._id || record?.id || '').trim();

  const getRecordStatus = (record) => recordStatus(record);

  const matchesSearch = (record) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const haystack = [
      record?.title,
      record?.name,
      record?.contentName,
      record?.assetName,
      record?.description,
      record?.objective,
      record?.summary,
      record?.status,
      record?.state,
      record?.approvalStatus,
      record?.projectName,
      record?.ownerName,
      record?.owner,
      record?.author,
      record?.assignedTo,
      record?.lead,
      record?.category,
      record?.moduleType,
      record?.section,
      ...arr(record?.tags),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  };

  const matchesStatusFilter = (record) => {
    if (statusFilter === 'all') return true;
    return getRecordStatus(record).includes(statusFilter.toLowerCase());
  };

  const filterRecords = (records = []) => records.filter((record) => matchesSearch(record) && matchesStatusFilter(record));

  const sectionStateSetter = (section) => {
    switch (section) {
      case 'assets': return setAssets;
      case 'content': return setContent;
      case 'brand': return setBrandAssets;
      case 'design': return setDesignItems;
      case 'video': return setVideoItems;
      case 'social': return setSocialPosts;
      case 'advertisements': return setAdvertisements;
      case 'seo': return setSeoItems;
      case 'website': return setWebsiteItems;
      case 'testimonials': return setTestimonials;
      case 'case-studies': return setCaseStudies;
      default: return null;
    }
  };

  const upsertLocalRecord = (section, record) => {
    const setter = sectionStateSetter(section);
    if (!setter || !record) return;
    const id = resolveRecordId(record);
    setter((prev) => {
      const exists = prev.some((item) => resolveRecordId(item) === id);
      return exists ? prev.map((item) => (resolveRecordId(item) === id ? record : item)) : [record, ...prev];
    });
  };

  const removeLocalRecord = (section, id) => {
    const setter = sectionStateSetter(section);
    if (!setter || !id) return;
    setter((prev) => prev.filter((item) => resolveRecordId(item) !== id));
  };

  const patchLocalRecord = (section, id, patch) => {
    const setter = sectionStateSetter(section);
    if (!setter || !id) return;
    setter((prev) => prev.map((item) => (resolveRecordId(item) === id ? { ...item, ...patch } : item)));
  };

  const persistRecord = async (mode, section, recordId) => {
    const config = getSectionAction(section);
    if (!config) throw new Error('Unsupported editor section');
    if (mode === 'create' && !effectiveProjectId) throw new Error('Select a project before creating media records.');

    const moduleType = MODULE_FOR_SECTION[section] || section;

    setActionBusy(true);
    try {
      let fileFields = {
        storageUrl: draft.storageUrl,
        storageKey: draft.storageKey,
        storageProvider: draft.storageProvider,
        thumbnailUrl: draft.thumbnailUrl,
        mimeType: draft.mimeType,
        fileSizeBytes: draft.fileSizeBytes,
      };

      if (draft.file) {
        const uploadRes = await departmentApi.uploadMediaFile(token, draft.file, {
          section: moduleType,
          projectId: effectiveProjectId,
        });
        const uploaded = uploadRes?.data || {};
        fileFields = {
          storageUrl: uploaded.url || '',
          storageKey: uploaded.storageKey || '',
          storageProvider: uploaded.storageProvider || 'cloudinary',
          thumbnailUrl: uploaded.thumbnailUrl || '',
          mimeType: uploaded.mimeType || '',
          fileSizeBytes: uploaded.fileSizeBytes || 0,
        };
      }

      const domainDefs = DOMAIN_FIELDS[section] || [];
      const domainMetadata = {};
      const domainTopFields = {};
      domainDefs.forEach((f) => {
        const raw = draft.domainFields?.[f.key];
        const value = f.type === 'number' ? (raw === '' || raw === undefined ? undefined : Number(raw)) : (raw || undefined);
        if (value === undefined) return;
        if (f.top) domainTopFields[f.key] = value;
        else domainMetadata[f.key] = value;
      });

      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: draft.status.trim() || 'Draft',
        priority: draft.priority.trim() || 'Medium',
        category: draft.category.trim(),
        tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        projectName: draft.projectName.trim(),
        ownerName: draft.ownerName.trim(),
        section: moduleType,
        moduleType,
        projectId: effectiveProjectId || undefined,
        ...fileFields,
        ...domainTopFields,
        metadata: domainMetadata,
      };

      let saved;
      if (mode === 'edit') {
        const res = await departmentApi[config.updateFn](token, recordId, payload);
        saved = res?.data;
        setActionMessage(`${config.label} updated.`);
      } else {
        const res = await departmentApi[config.createFn](token, payload);
        saved = res?.data;
        setActionMessage(`${config.label} created.`);
      }
      upsertLocalRecord(section, saved);
      closeEditor();
    } catch (err) {
      setError(err.message || `Failed to save ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const deleteRecord = async (section, record) => {
    const config = getSectionAction(section);
    const id = resolveRecordId(record);
    if (!config || !id) return;
    const ok = window.confirm(`Delete this ${config.label.toLowerCase()}? This cannot be undone.`);
    if (!ok) return;

    setActionBusy(true);
    try {
      await departmentApi[config.deleteFn](token, id);
      setActionMessage(`${config.label} deleted.`);
      removeLocalRecord(section, id);
    } catch (err) {
      setError(err.message || `Failed to delete ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const requestApproval = async (section, record) => {
    const config = getSectionAction(section);
    const id = resolveRecordId(record);
    if (!config || !id) return;
    setActionBusy(true);
    try {
      await departmentApi[config.requestApprovalFn](token, id, {});
      setActionMessage(`${config.label} sent for approval.`);
      patchLocalRecord(section, id, { approvalStatus: 'pending', status: 'In Review' });
    } catch (err) {
      setError(err.message || `Failed to request approval for ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const decideApproval = async (workflowId, decision) => {
    if (!workflowId) return;
    setActionBusy(true);
    try {
      await departmentApi.decideMediaApproval(token, workflowId, { decision, remarks: '' });
      setActionMessage(`Approval ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      const nextStatus = decision === 'approve' ? 'Approved' : 'Needs Revision';
      const patch = { approvalStatus: decision === 'approve' ? 'approved' : 'rejected', status: nextStatus };
      const matchesWorkflow = (item) => item?.approvalWorkflowId === workflowId || item?.workflowId === workflowId;
      [setAssets, setContent, setBrandAssets, setDesignItems, setVideoItems, setSocialPosts, setAdvertisements, setSeoItems, setWebsiteItems, setTestimonials, setCaseStudies, setApprovals].forEach((setter) => {
        setter((prev) => prev.map((item) => (matchesWorkflow(item) ? { ...item, ...patch } : item)));
      });
    } catch (err) {
      setError(err.message || 'Failed to update approval decision.');
    } finally {
      setActionBusy(false);
    }
  };

  const toDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  };

  const buildCampaignDraft = (record = {}) => ({
    name: toInputValue(record.name),
    objective: toInputValue(record.objective),
    description: toInputValue(record.description),
    platform: arr(record.platform).join(', '),
    status: toInputValue(record.status || 'draft'),
    budgetAllocated: toInputValue(record.budgetAllocated || ''),
    startDate: toDateInput(record.startDate),
    endDate: toDateInput(record.endDate),
    projectName: toInputValue(record.projectName || ''),
    teamMembersText: arr(record.teamMembers)
      .map((member) => [member.name, member.role].filter(Boolean).join(' - '))
      .join('\n'),
    targetReach: toInputValue(record.kpiTargets?.reach || ''),
    targetLeads: toInputValue(record.kpiTargets?.leads || ''),
    targetConversions: toInputValue(record.kpiTargets?.conversions || ''),
    targetRevenue: toInputValue(record.kpiTargets?.revenue || ''),
  });

  const openCampaignEditor = (mode = 'create', record = null) => {
    setActionMessage('');
    setCampaignEditor({ open: true, mode, record });
    setCampaignDraft(buildCampaignDraft(record || {}));
  };

  const closeCampaignEditor = () => {
    setCampaignEditor({ open: false, mode: 'create', record: null });
    setCampaignDraft(buildCampaignDraft({}));
  };

  const parseCampaignTeamMembers = (value = '') =>
    String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, ...roleParts] = line.split(/\s+-\s+|,/);
        return {
          name: String(name || '').trim(),
          role: roleParts.join(' ').trim(),
        };
      })
      .filter((member) => member.name || member.role);

  const buildCampaignPayload = () => {
    const selectedProject = projectOptions.find((project) => project.value === effectiveProjectId);
    return {
      projectId: effectiveProjectId || undefined,
      projectName: campaignDraft.projectName.trim() || selectedProject?.name || undefined,
      name: campaignDraft.name.trim(),
      objective: campaignDraft.objective.trim(),
      description: campaignDraft.description.trim(),
      platform: campaignDraft.platform.split(',').map((item) => item.trim()).filter(Boolean),
      status: campaignDraft.status || 'draft',
      budgetAllocated: Number(campaignDraft.budgetAllocated) || 0,
      startDate: campaignDraft.startDate || undefined,
      endDate: campaignDraft.endDate || undefined,
      teamMembers: parseCampaignTeamMembers(campaignDraft.teamMembersText),
      kpiTargets: {
        reach: Number(campaignDraft.targetReach) || 0,
        leads: Number(campaignDraft.targetLeads) || 0,
        conversions: Number(campaignDraft.targetConversions) || 0,
        revenue: Number(campaignDraft.targetRevenue) || 0,
      },
    };
  };

  const persistCampaignRecord = async (event) => {
    event.preventDefault();
    if (!effectiveProjectId) {
      setError('Select a project before creating a campaign.');
      return;
    }
    if (!campaignDraft.name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    setActionBusy(true);
    try {
      const payload = buildCampaignPayload();
      let saved;
      if (campaignEditor.mode === 'edit') {
        const id = campaignEditor.record?._id || campaignEditor.record?.id;
        const res = await departmentApi.updateMediaCampaign(token, id, payload);
        saved = res?.data;
        if (saved) setCampaigns((prev) => prev.map((item) => (String(item._id) === String(id) ? saved : item)));
        setActionMessage('Campaign updated.');
      } else {
        const res = await departmentApi.createMediaCampaign(token, payload);
        saved = res?.data;
        if (saved) setCampaigns((prev) => [saved, ...prev]);
        setActionMessage('Campaign created.');
      }
      closeCampaignEditor();
    } catch (err) {
      setError(err.message || 'Failed to save campaign.');
    } finally {
      setActionBusy(false);
    }
  };

  const advanceCampaignStage = async (campaignId, nextStage) => {
    setActionBusy(true);
    try {
      const res = await departmentApi.advanceMediaCampaignStage(token, campaignId, nextStage);
      if (res?.data) {
        setCampaigns((prev) => prev.map((item) => (String(item._id) === String(campaignId) ? res.data : item)));
      }
      if (nextStage === 'content-in-progress') {
        const projectParams = effectiveProjectId ? { projectId: effectiveProjectId } : {};
        const tasksRes = await departmentApi.getMediaCampaignTasks(token, projectParams);
        setCampaignTasks(arr(tasksRes?.data?.items));
      }
      setActionMessage(`Campaign moved to ${nextStage.replace(/-/g, ' ')}.`);
    } catch (err) {
      setError(err.message || 'Failed to update campaign stage.');
    } finally {
      setActionBusy(false);
    }
  };

  const deleteCampaignRecord = async (campaignId) => {
    const ok = window.confirm('Delete this campaign? This cannot be undone.');
    if (!ok) return;
    setActionBusy(true);
    try {
      await departmentApi.deleteMediaCampaign(token, campaignId);
      setActionMessage('Campaign deleted.');
      setCampaigns((prev) => prev.filter((item) => String(item._id) !== String(campaignId)));
      setCampaignTasks((prev) => prev.filter((task) => String(task.campaignId) !== String(campaignId)));
      setCampaignDetailId((prev) => (String(prev) === String(campaignId) ? null : prev));
    } catch (err) {
      setError(err.message || 'Failed to delete campaign.');
    } finally {
      setActionBusy(false);
    }
  };

  const renderCampaignDetail = (campaign) => {
    const statusIndex = Math.max(CAMPAIGN_STAGES.indexOf(campaign.status), 0);
    const progress = Math.round(((statusIndex + 1) / CAMPAIGN_STAGES.length) * 100);
    const tasksForCampaign = campaignTasks.filter((task) => String(task.campaignId) === String(campaign._id));
    const tasksDone = tasksForCampaign.filter((task) => task.status === 'completed').length;
    const kpiTargets = campaign.kpiTargets || {};
    const teamMembers = arr(campaign.teamMembers);
    const history = arr(campaign.lifecycleHistory).slice().reverse();

    const now = Date.now();
    const start = campaign.startDate ? new Date(campaign.startDate).getTime() : null;
    const end = campaign.endDate ? new Date(campaign.endDate).getTime() : null;
    let timelinePercent = null;
    let timelineLabel = 'No dates set';
    if (start && end && end > start) {
      timelinePercent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      timelineLabel = now > end ? 'Timeline ended' : now < start ? 'Not started yet' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`;
    } else if (start) {
      timelineLabel = now < start ? 'Not started yet' : 'In progress (no end date)';
    }

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setCampaignDetailId(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to campaigns
        </button>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-slate-950 dark:text-neutral-100">{campaign.name}</h2>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(campaign.status)}`}>
                  {CAMPAIGN_STAGE_LABELS[campaign.status] || campaign.status}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-neutral-400">{campaign.objective || campaign.description || 'No objective set yet.'}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {arr(campaign.platform).length ? arr(campaign.platform).map((platform) => (
                  <span key={platform} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{platform}</span>
                )) : <span className="text-xs text-slate-400">No platforms set</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" disabled={actionBusy} onClick={() => openCampaignEditor('edit', campaign)} className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300">
                Edit
              </button>
              <button type="button" disabled={actionBusy} onClick={() => deleteCampaignRecord(campaign._id)} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
                Delete
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Budget Allocated', money(campaign.budgetAllocated), 'payments'],
              ['Team Members', teamMembers.length || 'Unassigned', 'group'],
              ['Tasks', `${tasksDone}/${tasksForCampaign.length}`, 'checklist'],
              ['Lifecycle Progress', `${progress}%`, 'timeline'],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                  <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{icon}</span>
                </div>
                <p className="mt-2 text-xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <CampaignLifecycleStepper
              status={campaign.status}
              busy={actionBusy}
              onAdvance={(nextStage) => advanceCampaignStage(campaign._id, nextStage)}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className={card}>
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Timeline</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-neutral-300">
              {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'No start date'}
              {' → '}
              {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'No end date'}
            </p>
            {timelinePercent !== null ? (
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${timelinePercent}%` }} />
              </div>
            ) : null}
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-neutral-400">{timelineLabel}</p>

            <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Description</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-neutral-300">{campaign.description || 'No description added.'}</p>
          </section>

          <section className={card}>
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">KPI Targets</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                ['Reach', kpiTargets.reach],
                ['Leads', kpiTargets.leads],
                ['Conversions', kpiTargets.conversions],
                ['Revenue', kpiTargets.revenue != null ? money(kpiTargets.revenue) : null],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-neutral-100">{value || value === 0 ? value : '—'}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Team</h3>
            {teamMembers.length ? (
              <div className="mt-2 space-y-2">
                {teamMembers.map((member, index) => (
                  <div key={`${member.name}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950/50">
                    <span className="font-semibold text-slate-800 dark:text-neutral-200">{member.name || 'Unnamed'}</span>
                    <span className="text-xs text-slate-500 dark:text-neutral-400">{member.role || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No team members assigned yet.</p>
            )}
          </section>
        </div>

        <section className={card}>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Campaign Tasks</h3>
          <div className="mt-4">
            <CampaignTaskBoard tasks={tasksForCampaign} busy={actionBusy} onMove={moveCampaignTask} />
          </div>
        </section>

        <section className={card}>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Lifecycle History</h3>
          {history.length ? (
            <div className="mt-3 space-y-2">
              {history.map((entry, index) => (
                <div key={`${entry.stage}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950/50">
                  <span className="font-semibold text-slate-800 dark:text-neutral-200">{CAMPAIGN_STAGE_LABELS[entry.stage] || entry.stage}</span>
                  <span className="text-xs text-slate-500 dark:text-neutral-400">{entry.enteredAt ? new Date(entry.enteredAt).toLocaleString() : ''}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No lifecycle changes recorded yet.</p>
          )}
        </section>
      </div>
    );
  };

  const renderCampaigns = () => {
    const rows = filterRecords(campaigns);
    const totalBudget = rows.reduce((sum, campaign) => sum + num(campaign.budgetAllocated), 0);
    const liveCount = rows.filter((campaign) => ['live', 'tracking'].includes(campaign.status)).length;
    const planningCount = rows.filter((campaign) => ['draft', 'objective-defined', 'platform-selected', 'budget-allocated', 'team-assigned'].includes(campaign.status)).length;
    const reviewCount = rows.filter((campaign) => ['content-in-progress', 'in-approval', 'scheduled'].includes(campaign.status)).length;
    const selectedProject = projectOptions.find((project) => project.value === effectiveProjectId);

    const detailCampaign = campaignDetailId ? campaigns.find((item) => String(item._id) === String(campaignDetailId)) : null;
    if (detailCampaign) return renderCampaignDetail(detailCampaign);

    return (
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[22px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
                  ads_click
                </span>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-neutral-100">Campaign Command Center</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Plan, launch, track, and close media campaigns with budget, KPI, team, and lifecycle control.</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Project: {selectedProject?.name || (effectiveProjectId ? 'Selected project' : 'All projects')}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Showing {rows.length} of {campaigns.length}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openCampaignEditor('create')}
              disabled={actionBusy || !effectiveProjectId}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              New Campaign
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ['Campaigns', rows.length, 'campaign'],
              ['Planning', planningCount, 'edit_calendar'],
              ['Production/Review', reviewCount, 'rate_review'],
              ['Live/Tracking', liveCount, 'monitoring'],
              ['Budget', money(totalBudget), 'payments'],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                  <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{icon}</span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {!effectiveProjectId ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Select a project before creating a campaign.
          </section>
        ) : null}

        {rows.length ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-neutral-800">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-neutral-950 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Budget</th>
                  <th className="px-4 py-3">Timeline</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                {rows.map((campaign) => {
                  const statusIndex = Math.max(CAMPAIGN_STAGES.indexOf(campaign.status), 0);
                  const progress = Math.round(((statusIndex + 1) / CAMPAIGN_STAGES.length) * 100);
                  return (
                    <tr key={campaign._id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="max-w-md">
                          <button type="button" onClick={() => setCampaignDetailId(campaign._id)} className="text-left font-black text-slate-950 hover:text-teal-700 hover:underline dark:text-neutral-100 dark:hover:text-teal-300">
                            {campaign.name}
                          </button>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-neutral-400">{campaign.objective || campaign.description || '-'}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {arr(campaign.platform).length ? arr(campaign.platform).map((platform) => (
                              <span key={platform} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{platform}</span>
                            )) : <span className="text-xs text-slate-400">No platforms</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(campaign.status)}`}>
                          {CAMPAIGN_STAGE_LABELS[campaign.status] || campaign.status}
                        </span>
                        <div className="mt-2 h-2 w-36 rounded-full bg-slate-100 dark:bg-neutral-800">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${progress}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700 dark:text-neutral-300">{money(campaign.budgetAllocated)}</td>
                      <td className="px-4 py-4 text-xs text-slate-500 dark:text-neutral-400">
                        <p>{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'No start'}</p>
                        <p>{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'No end'}</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 dark:text-neutral-400">
                        {arr(campaign.teamMembers).length ? `${campaign.teamMembers.length} member${campaign.teamMembers.length === 1 ? '' : 's'}` : 'Unassigned'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={actionBusy} onClick={() => setCampaignDetailId(campaign._id)} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
                            View
                          </button>
                          <button type="button" disabled={actionBusy} onClick={() => openCampaignEditor('edit', campaign)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300">
                            Edit
                          </button>
                          <button type="button" disabled={actionBusy} onClick={() => deleteCampaignRecord(campaign._id)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : empty('No campaigns found', 'Create a campaign to start the objective, platform, budget, team, and content pipeline.')}

        {rows.length ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {rows.map((campaign) => (
              <article key={`${campaign._id}-lifecycle`} className={card}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-neutral-950 dark:text-neutral-100">{campaign.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{CAMPAIGN_STAGE_LABELS[campaign.status] || campaign.status}</p>
                  </div>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {money(campaign.budgetAllocated)}
                  </span>
                </div>
                <div className="mt-4">
                  <CampaignLifecycleStepper
                    status={campaign.status}
                    busy={actionBusy}
                    onAdvance={(nextStage) => advanceCampaignStage(campaign._id, nextStage)}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const moveCampaignTask = async (task, nextStatus) => {
    setActionBusy(true);
    try {
      const res = await departmentApi.updateMediaCampaignTaskStatus(token, task.campaignId, task._id, nextStatus);
      const saved = res?.data;
      setCampaignTasks((prev) => prev.map((item) => (String(item._id) === String(task._id) ? (saved || { ...item, status: nextStatus }) : item)));
      setActionMessage(`Task moved to ${nextStatus.replace(/-/g, ' ')}.`);
    } catch (err) {
      setError(err.message || 'Failed to update task status.');
    } finally {
      setActionBusy(false);
    }
  };

  const renderCampaignTasks = () => {
    const rows = filterRecords(campaignTasks);
    const counts = {
      pending: rows.filter((task) => task.status === 'pending').length,
      working: rows.filter((task) => task.status === 'in-progress').length,
      review: rows.filter((task) => task.status === 'review').length,
      completed: rows.filter((task) => task.status === 'completed').length,
    };
    const productionCampaigns = campaigns.filter((campaign) => ['content-in-progress', 'in-approval', 'scheduled', 'live', 'tracking'].includes(campaign.status));
    const selectedProject = projectOptions.find((project) => project.value === effectiveProjectId);

    return (
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[22px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
                  checklist
                </span>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-neutral-100">Campaign Task Board</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Track production work from assignment to review and completion.</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Project: {selectedProject?.name || (effectiveProjectId ? 'Selected project' : 'All projects')}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {productionCampaigns.length} production campaign{productionCampaigns.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSectionChange?.('campaigns')}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <span className="material-symbols-outlined text-[18px]">ads_click</span>
              Open Campaigns
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Pending', counts.pending, 'pending_actions'],
              ['Working', counts.working, 'engineering'],
              ['Review', counts.review, 'rate_review'],
              ['Completed', counts.completed, 'task_alt'],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                  <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{icon}</span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {rows.length ? (
          <CampaignTaskBoard tasks={rows} busy={actionBusy} onMove={moveCampaignTask} />
        ) : (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border-b border-slate-200 bg-slate-50 p-6 dark:border-neutral-800 dark:bg-neutral-950/50 lg:border-b-0 lg:border-r">
                <span className="material-symbols-outlined rounded-2xl border border-teal-200 bg-teal-50 p-3 text-3xl text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
                  account_tree
                </span>
                <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-neutral-100">No campaign tasks are active</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-neutral-400">
                  Move a campaign into content production when the campaign plan is ready. Tasks will appear here as a board.
                </p>
                <button
                  type="button"
                  onClick={() => onSectionChange?.('campaigns')}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  Go to Campaigns
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
                {[
                  ['1', 'Create campaign', 'Set objective, budget, platforms, dates, and team.'],
                  ['2', 'Advance lifecycle', 'Move the campaign to content production from Campaigns.'],
                  ['3', 'Work the board', 'Design, write, review, approval, and publish tasks show here.'],
                ].map(([step, title, detail]) => (
                  <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">{step}</span>
                    <p className="mt-4 text-sm font-black text-slate-950 dark:text-neutral-100">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-neutral-400">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    );
  };

  const renderMetric = (label, value, icon, detail) => (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-teal-800 dark:hover:bg-teal-500/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-neutral-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
        </div>
        <span className="material-symbols-outlined rounded-2xl border border-teal-200 bg-teal-100 p-3 text-2xl text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
          {icon}
        </span>
      </div>
      {detail ? <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">{detail}</p> : null}
    </article>
  );

  const empty = (title, message) => <div className={soft}><p className="text-sm font-semibold text-slate-950 dark:text-neutral-100">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">{message}</p></div>;
  const renderFileCell = (item) =>
    item?.storageUrl ? (
      <div className="flex items-center gap-2">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="h-8 w-8 rounded-lg border border-slate-200 object-cover dark:border-neutral-700" />
        ) : (
          <span className="material-symbols-outlined text-base text-neutral-400">
            {String(item.mimeType || '').startsWith('video/') ? 'movie' : 'description'}
          </span>
        )}
        <a
          href={item.storageUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300"
        >
          View file{item.fileSizeBytes ? ` (${bytes(item.fileSizeBytes)})` : ''}
        </a>
      </div>
    ) : (
      <span className="text-xs text-neutral-400 dark:text-neutral-500">No file</span>
    );
  const sectionMeta = META[activeSection] || META.dashboard;
  const activeSectionAction = getSectionAction(activeSection);

  const renderDashboard = () => (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-teal-200 bg-[linear-gradient(135deg,rgba(8,47,73,0.98),rgba(15,118,110,0.92))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(202,138,4,0.12),transparent_28%)]" />
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-teal-200/40 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
                  Media Command Center
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-50">
                  Project-linked operations
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Media production, approvals, campaigns, and reporting in one executive view.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-teal-50/85 sm:text-lg">
                Use this workspace to manage every asset, content piece, campaign, and media request with the same project association and approval discipline used across the portal.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Last sync: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'pending'}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Projects: {summary.activeProjects}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Approvals: {summary.pendingApprovals}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Deadlines: {summary.deadlines}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Storage: {summary.assetStorage}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:w-[460px]">
              {[
                ['Active Projects', summary.activeProjects, 'folder_open', 'from-cyan-400 to-sky-500'],
                ['Campaigns Running', summary.runningCampaigns, 'ads_click', 'from-emerald-400 to-teal-500'],
                ['Pending Approvals', summary.pendingApprovals, 'fact_check', 'from-amber-400 to-orange-500'],
                ['Team Productivity', `${summary.productivity}%`, 'groups', 'from-fuchsia-400 to-violet-500'],
                ['Advertisement Spend', summary.adSpend, 'payments', 'from-rose-400 to-pink-500'],
                ['Marketing ROI', summary.roi, 'insights', 'from-lime-400 to-emerald-500'],
              ].map(([label, value, icon, accent]) => (
                <article key={label} className="rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className={`inline-flex rounded-2xl bg-gradient-to-br ${accent} p-2 text-white shadow-lg`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>
                  <p className="mt-4 text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-50/70">{label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <article className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Operational mix</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Where the media organization is actually working</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXPORT_OPTIONS.map((option) => (
                    <button key={option} type="button" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50">
                      Export {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={soft}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Workflow status</p>
                    <span className="text-xs text-neutral-400">records by stage</span>
                  </div>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.statusRows}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 16 }} />
                        <Bar dataKey="value" fill="#22d3ee" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={soft}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Module split</p>
                    <span className="text-xs text-neutral-400">assets, content, approvals</span>
                  </div>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={summary.moduleRows} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={3}>
                          {summary.moduleRows.map((entry, index) => (
                            <Cell key={entry.name || index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 16 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </article>

            <article className={card}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Executive signals</p>
                  <h2 className="mt-2 text-2xl font-black text-white">What needs attention now</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-300">
                  Live feed
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ['Advertisement Spend', summary.adSpend, Math.min(summary.runningCampaigns * 12, 100)],
                  ['Marketing ROI', summary.roi, Math.min(Math.max(parseFloat(summary.roi) || 0, 0), 100)],
                  ['Social Reach', summary.socialReach.toLocaleString(), Math.min(summary.socialReach / 100000, 100)],
                  ['Social Engagement', summary.socialEngagement.toLocaleString(), Math.min(summary.socialEngagement / 5000, 100)],
                  ['Upcoming Deadlines', summary.deadlines, Math.min(summary.deadlines * 10, 100)],
                ].map(([label, value, pct]) => (
                  <div key={label} className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between text-sm text-neutral-300">
                      <span>{label}</span>
                      <span className="font-semibold text-white">{value}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" style={{ width: `${Math.max(8, Math.min(100, pct))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {renderMetric('Assets', assets.length, 'image', 'Uploaded and versioned media items')}
        {renderMetric('Content', content.length, 'draft', 'Blogs, copy, newsletters, and web content')}
        {renderMetric('Brand Assets', brandAssets.length, 'brand_family', 'Guidelines, logos, and templates')}
        {renderMetric('Reports', arr(reporting?.recentItems).length, 'assessment', 'Recent reporting and audit outputs')}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className={card}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Recent media activity</p>
              <p className="text-xs text-neutral-400">Latest assets, content, campaigns, and approvals</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-300">
              Updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'pending'}
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-neutral-400">
                <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {summary.recent.length ? summary.recent.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-white">{item.title}</td>
                    <td className="px-4 py-3 text-neutral-300">{item.section}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span></td>
                  </tr>
                )) : <tr><td className="px-4 py-8 text-center text-neutral-400" colSpan={3}>No media records available yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className={glass}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Account controls</p>
              <p className="text-xs text-neutral-400">Project context and operating mode</p>
            </div>
            <span className="material-symbols-outlined text-2xl text-cyan-300">tune</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Reach</p>
              <p className="mt-2 text-3xl font-black text-white">{summary.socialReach.toLocaleString()}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Engagement</p>
              <p className="mt-2 text-3xl font-black text-white">{summary.socialEngagement.toLocaleString()}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Content review</p>
              <p className="mt-2 text-3xl font-black text-white">{summary.inReview}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          ['Project linked', summary.activeProjects, 'folder_copy'],
          ['Pending approvals', summary.pendingApprovals, 'fact_check'],
          ['Deadline pressure', summary.deadlines, 'schedule'],
        ].map(([label, value, icon]) => (
          <article key={label} className={glass}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{label}</p>
              <span className="material-symbols-outlined text-cyan-300">{icon}</span>
            </div>
            <p className="mt-4 text-3xl font-black text-white">{value}</p>
          </article>
        ))}
      </div>
    </div>
  );

  const renderTable = (items, columns, emptyTitle, emptyMessage, options = {}) => {
    const rows = filterRecords(items);
    const actionsEnabled = Boolean(options.rowActions);

    return rows.length ? (
      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-neutral-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-neutral-800">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              {columns.map((column) => <th key={column.label} className="px-4 py-3">{column.label}</th>)}
              {actionsEnabled ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
            {rows.map((item) => (
              <tr key={item._id || item.id || item.title}>
                {columns.map((column) => (
                  <td key={column.label} className="px-4 py-3 align-top text-neutral-700 dark:text-neutral-300">
                    {column.render ? column.render(item) : pick(item?.[column.key], item?.metadata?.[column.key], '-')}
                  </td>
                ))}
                {actionsEnabled ? (
                  <td className="px-4 py-3 align-top text-neutral-700 dark:text-neutral-300">
                    <div className="flex flex-wrap gap-2">
                      {options.rowActions(item)}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-lg font-black text-slate-950 dark:text-neutral-100">
            {items.length ? 'No records match your filters' : emptyTitle}
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-neutral-400">
            {items.length ? 'Clear the search or status filter to restore the section rows.' : emptyMessage}
          </p>
        </div>
        {options.emptyAccessory || null}
      </div>
    );
  };

  const renderCreativeSection = (section, records, columns, emptyTitle, emptyMessage) => {
    const rows = filterRecords(records);
    const config = getSectionAction(section);
    const details = CREATIVE_SECTION_IDS.has(section)
      ? CREATIVE_DETAILS[section]
      : CHANNEL_DETAILS[section] || (META[section] || [config?.label || 'Records', 'Manage records for this section.']);
    const workflow = CREATIVE_WORKFLOWS[section] || CHANNEL_WORKFLOWS[section] || [];
    const channelInsights = CHANNEL_SECTION_IDS.has(section) ? getChannelInsights(section, records) : [];
    const approvedCount = records.filter((item) => ['approved', 'live', 'published'].some((status) => getRecordStatus(item).includes(status))).length;
    const inReviewCount = records.filter((item) => ['pending', 'review'].some((status) => getRecordStatus(item).includes(status))).length;
    const attachedCount = records.filter((item) => item?.storageUrl || item?.thumbnailUrl).length;
    const metadataKey = details?.[2];
    const metadataLabel = details?.[3] || 'Types';
    const metadataCount = metadataKey
      ? new Set(records.map((item) => String(item?.metadata?.[metadataKey] || item?.category || '').trim()).filter(Boolean)).size
      : 0;
    const ownerCount = new Set(records.map((item) => String(item?.ownerName || '').trim()).filter(Boolean)).size;
    const recentCount = records.filter((item) => {
      const updatedAt = item?.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      return updatedAt && Date.now() - updatedAt <= 1000 * 60 * 60 * 24 * 7;
    }).length;
    const selectedProject = projectOptions.find((project) => project.value === effectiveProjectId);
    const recentRecords = [...records]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 3);

    return (
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[20px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
                  {META[section]?.[2] || 'perm_media'}
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-950 dark:text-neutral-100">{details[0]}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{details[1]}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Project: {selectedProject?.name || (effectiveProjectId ? 'Selected project' : 'All projects')}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Showing {rows.length} of {records.length}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {recentCount} updated this week
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openEditor('create', section)}
              disabled={actionBusy || !effectiveProjectId}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {config?.create || 'Create record'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              ['Total', records.length, 'inventory_2'],
              ['In Review', inReviewCount, 'pending_actions'],
              ['Approved/Live', approvedCount, 'verified'],
              ['Files', attachedCount, 'attach_file'],
              [metadataLabel, metadataCount, 'category'],
              ['Owners', ownerCount, 'groups'],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                  <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{icon}</span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {!effectiveProjectId ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Select a project before creating a new {String(config?.label || 'record').toLowerCase()}.
          </section>
        ) : null}

        {channelInsights.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Channel Control</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Operational numbers for planning, optimization, approvals, and reporting.</p>
              </div>
              <button
                type="button"
                onClick={() => openEditor('create', section)}
                disabled={actionBusy || !effectiveProjectId}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                New {config?.label || 'Record'}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              {channelInsights.map(([label, value, icon]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                    <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{icon}</span>
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Production Workflow</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">A consistent path from intake to publish.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {workflow.length} steps
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            {workflow.map(([title, detail], index) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">{index + 1}</span>
                <p className="mt-4 text-sm font-black text-slate-950 dark:text-neutral-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-neutral-400">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {recentRecords.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Recent Work</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Latest records updated in this workspace.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
              {recentRecords.map((record) => (
                <article key={resolveRecordId(record) || record.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950 dark:text-neutral-100">{record.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-neutral-400">{record.ownerName || record.projectName || config?.label || 'Creative record'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone(record.status)}`}>
                      {record.status || 'Draft'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-neutral-400">
                    <span>{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : 'No date'}</span>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => openEditor('edit', section, record)}
                      className="rounded-full border border-teal-200 bg-white px-3 py-1 font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-50 dark:border-teal-900/60 dark:bg-neutral-900 dark:text-teal-300 dark:hover:bg-teal-500/10"
                    >
                      Open
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {renderTable(records, columns, emptyTitle, emptyMessage, {
          rowActions: (item) => renderRowActions(section, item),
          emptyAccessory: (
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-neutral-100">Start this workspace</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Create the first record with owner, project, status, metadata, and file attachment.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditor('create', section)}
                  disabled={actionBusy || !effectiveProjectId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  {config?.create || 'Create record'}
                </button>
              </div>
            </section>
          ),
        })}
      </div>
    );
  };

  const renderProjectHub = () => <MediaProjectList projects={projectOptions} />;

  const renderGeneric = (section) => {
    const meta = META[section] || META.dashboard;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderMetric('Records', moduleCount(section), meta[2])}
          {renderMetric('Project Scope', summary.activeProjects, 'filter_alt')}
          {renderMetric('Approvals', summary.pendingApprovals, 'verified')}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {empty(meta[0], meta[1])}
          {empty('Workflow', 'Draft -> project link -> approval -> publish -> report -> archive. Keep version history and audit trail attached to every update.')}
        </div>
      </div>
    );
  };

  const renderGovernanceHeader = (section, stats = []) => {
    const meta = META[section] || META.approvals;
    const selectedProject = projectOptions.find((project) => project.value === effectiveProjectId);

    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[20px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
                {meta[2]}
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-neutral-100">{meta[0]}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{meta[1]}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                Project: {selectedProject?.name || (effectiveProjectId ? 'Selected project' : 'All projects')}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                Updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'now'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshData}
            disabled={actionBusy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(([label, value, icon]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{icon}</span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderApprovalsGovernance = () => {
    const pending = approvals.filter((item) => getRecordStatus(item).includes('pending')).length;
    const approved = approvals.filter((item) => getRecordStatus(item).includes('approved')).length;
    const rejected = approvals.filter((item) => getRecordStatus(item).includes('rejected') || getRecordStatus(item).includes('revision')).length;

    return (
      <div className="space-y-4">
        {renderGovernanceHeader('approvals', [
          ['Total', approvals.length, 'fact_check'],
          ['Pending', pending, 'pending_actions'],
          ['Approved', approved, 'verified'],
          ['Needs Revision', rejected, 'report'],
        ])}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Approval Queue</h3>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {pending} waiting
            </span>
          </div>
          {renderTable(approvals, [
            { key: 'title', label: 'Request', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description || item.moduleType || 'Approval request'}</p></div> },
            { key: 'projectName', label: 'Project' },
            { key: 'moduleType', label: 'Module' },
            { key: 'ownerName', label: 'Owner' },
            { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status || item.approvalStatus)}`}>{item.status || item.approvalStatus}</span> },
            { key: 'createdAt', label: 'Submitted', render: (item) => (item.submittedAt || item.createdAt ? new Date(item.submittedAt || item.createdAt).toLocaleDateString() : '-') },
          ], 'No pending approvals', 'Approval flows will appear here once media records are submitted for review.', {
            rowActions: (item) => renderRowActions('approvals', item),
          })}
        </section>
      </div>
    );
  };

  const renderReportingGovernance = () => {
    const recentItems = arr(reporting?.recentItems);
    const auditRows = arr(reporting?.auditRows);
    const reportModules = arr(reporting?.byType || reporting?.moduleRows);

    return (
      <div className="space-y-4">
        {renderGovernanceHeader('reporting', [
          ['Recent Items', recentItems.length, 'article'],
          ['Audit Rows', auditRows.length, 'history'],
          ['Published', summary.published, 'publish'],
          ['In Review', summary.inReview, 'pending'],
        ])}
        <MarketingReportPanel projectId={effectiveProjectId} />
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Recent Records</h3>
            <div className="mt-4 space-y-2">
              {recentItems.length ? recentItems.slice(0, 6).map((item) => (
                <div key={resolveRecordId(item) || item.title} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950 dark:text-neutral-100">{item.title || item.action || 'Media record'}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-neutral-400">{item.projectName || item.moduleType || item.targetType || '-'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone(item.status)}`}>{item.status || item.moduleType || 'Record'}</span>
                </div>
              )) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400">No recent report records.</p>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Module Breakdown</h3>
            <div className="mt-4 space-y-3">
              {(reportModules.length ? reportModules : summary.moduleRows).slice(0, 8).map((row) => {
                const label = row.name || row._id || 'Module';
                const value = num(row.value ?? row.count);
                const total = Math.max(1, (reportModules.length ? reportModules : summary.moduleRows).reduce((sum, item) => sum + num(item.value ?? item.count), 0));
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-neutral-300">{label}</span>
                      <span className="text-slate-500 dark:text-neutral-500">{value}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-neutral-800">
                      <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.min(100, (value / total) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
              {!reportModules.length && !summary.moduleRows.length ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400">No module reporting data.</p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderAuditGovernance = () => {
    const rows = summary.reportRows;
    const createCount = rows.filter((item) => String(item.action || '').toLowerCase().includes('created')).length;
    const updateCount = rows.filter((item) => String(item.action || '').toLowerCase().includes('updated')).length;
    const deleteCount = rows.filter((item) => String(item.action || '').toLowerCase().includes('deleted')).length;

    return (
      <div className="space-y-4">
        {renderGovernanceHeader('audit', [
          ['Entries', rows.length, 'history'],
          ['Created', createCount, 'add_circle'],
          ['Updated', updateCount, 'edit'],
          ['Deleted', deleteCount, 'delete'],
        ])}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Activity Log</h3>
          </div>
          {renderTable(rows, [
            { key: 'action', label: 'Action', render: (item) => <span className="font-semibold text-slate-900 dark:text-neutral-100">{String(item.action || '-').replaceAll('_', ' ')}</span> },
            { key: 'module', label: 'Module' },
            { key: 'targetType', label: 'Target' },
            { key: 'createdAt', label: 'Timestamp', render: (item) => (item.createdAt ? new Date(item.createdAt).toLocaleString() : '-') },
          ], 'No audit trail entries found', 'Create, update, delete, approval, publish, and file actions will appear here.')}
        </section>
      </div>
    );
  };

  const renderRowActions = (section, item) => {
    const id = resolveRecordId(item);
    const config = getSectionAction(section);
    const workflowId = item?.approvalWorkflowId || item?.workflowId || item?.metadata?.approvalWorkflowId;
    const approvalState = getRecordStatus(item);

    return (
      <>
        {config ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => openEditor('edit', section, item)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
          >
            Edit
          </button>
        ) : null}
        {config ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => requestApproval(section, item)}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
          >
            Request approval
          </button>
        ) : null}
        {config ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => deleteRecord(section, item)}
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
          >
            Delete
          </button>
        ) : null}
        {workflowId && approvalState === 'pending' ? (
          <>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => decideApproval(workflowId, 'approve')}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => decideApproval(workflowId, 'reject')}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
            >
              Reject
            </button>
          </>
        ) : null}
        {!config && !workflowId ? <span className="text-xs text-neutral-500 dark:text-neutral-400">No actions</span> : null}
        {workflowId && approvalState !== 'pending' ? (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Workflow: {approvalState || 'n/a'}</span>
        ) : null}
        {!id ? <span className="text-xs text-neutral-500 dark:text-neutral-400">No ID</span> : null}
      </>
    );
  };

  const renderSection = () => {
    if (activeSection === 'dashboard') return renderDashboard();
    if (activeSection === 'projects') return renderProjectHub();
    if (activeSection === 'assets') return renderCreativeSection('assets', assets, [
      { key: 'title', label: 'Asset', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || item.moduleType || 'Asset'}</p></div> },
      { key: 'assetType', label: 'Type', render: (item) => item?.metadata?.assetType || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'version', label: 'Version', render: (item) => item?.version?.current || 'v1.0' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No assets uploaded yet', 'Upload images, logos, banners, PDFs, videos, or creative files to populate the DAM view.');
    if (activeSection === 'campaigns') return renderCampaigns();
    if (activeSection === 'tasks') return renderCampaignTasks();
    if (activeSection === 'budget') return <BudgetTracker projectId={effectiveProjectId} />;
    if (activeSection === 'funnel') return <KpiFunnelChart projectId={effectiveProjectId} />;
    if (activeSection === 'calendar') return <MarketingCalendar projectId={effectiveProjectId} />;
    if (activeSection === 'weekly-planning') return <WeeklyPlanner projectId={effectiveProjectId} />;
    if (activeSection === 'checklists') return <ProjectChecklists projectId={effectiveProjectId} />;
    if (activeSection === 'content') return renderCreativeSection('content', content, [
      { key: 'title', label: 'Content', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description || 'Editorial item'}</p></div> },
      { key: 'contentType', label: 'Type', render: (item) => item?.metadata?.contentType || item.category || '-' },
      { key: 'channel', label: 'Channel', render: (item) => item?.metadata?.channel || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No content pieces found', 'Use the content studio to manage blogs, articles, landing pages, newsletters, and press releases.');
    if (activeSection === 'brand') return renderCreativeSection('brand', brandAssets, [
      { key: 'title', label: 'Brand Asset', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Brand guide'}</p></div> },
      { key: 'brandArea', label: 'Area', render: (item) => item?.metadata?.brandArea || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No brand assets found', 'Store brand guidelines, logo variations, typography rules, palette references, and templates.');
    if (activeSection === 'design') return renderCreativeSection('design', designItems, [
      { key: 'title', label: 'Design Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Design request'}</p></div> },
      { key: 'format', label: 'Format', render: (item) => item?.metadata?.format || item.category || '-' },
      { key: 'dimensions', label: 'Size', render: (item) => item?.metadata?.dimensions || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No design requests found', 'Track banners, creatives, and layouts from intake through revision to final delivery.');
    if (activeSection === 'video') return renderCreativeSection('video', videoItems, [
      { key: 'title', label: 'Video Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Video production'}</p></div> },
      { key: 'videoType', label: 'Type', render: (item) => item?.metadata?.videoType || item.category || '-' },
      { key: 'durationSeconds', label: 'Duration', render: (item) => item?.metadata?.durationSeconds ? `${item.metadata.durationSeconds}s` : '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No video items found', 'Track scripts, footage, edits, reviews, and publishing for every video production.');
    if (activeSection === 'social') return renderCreativeSection('social', socialPosts, [
      { key: 'title', label: 'Social Post', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Social post'}</p></div> },
      { key: 'platform', label: 'Platform', render: (item) => item?.metadata?.platform || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'reach', label: 'Reach', render: (item) => num(item?.metadata?.reach || item?.analytics?.reach).toLocaleString() },
      { key: 'engagement', label: 'Engagement', render: (item) => num(item?.metadata?.engagement || item?.analytics?.engagement).toLocaleString() },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No social posts found', 'Plan and track scheduled posts, captions, and performance across every platform.');
    if (activeSection === 'advertisements') return renderCreativeSection('advertisements', advertisements, [
      { key: 'title', label: 'Advertisement', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item?.metadata?.platform || item.category || 'Ad creative'}</p></div> },
      { key: 'platform', label: 'Platform', render: (item) => item?.metadata?.platform || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'spend', label: 'Spend', render: (item) => money(item?.budgetImpact?.spend) },
      { key: 'roi', label: 'ROI', render: (item) => `${num(item?.budgetImpact?.roiAtSnapshot)}%` },
      { key: 'ctr', label: 'CTR', render: (item) => (item?.metadata?.ctr ? `${item.metadata.ctr}%` : '-') },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No advertisements found', 'Create paid media records with platform, budget, spend, CTR, ROI, approvals, and final creative evidence.');
    if (activeSection === 'seo') return renderCreativeSection('seo', seoItems, [
      { key: 'title', label: 'SEO Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item?.metadata?.keyword || item.category || 'Keyword / page'}</p></div> },
      { key: 'keyword', label: 'Keyword', render: (item) => item?.metadata?.keyword || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'targetUrl', label: 'Target URL', render: (item) => item?.metadata?.targetUrl || '-' },
      { key: 'ranking', label: 'Ranking', render: (item) => item?.metadata?.ranking ?? '-' },
      { key: 'backlinks', label: 'Backlinks', render: (item) => item?.metadata?.backlinks ?? '-' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No SEO records found', 'Create SEO records with keyword, target URL, ranking, search volume, backlinks, owner, and approval status.');
    if (activeSection === 'website') return renderCreativeSection('website', websiteItems, [
      { key: 'title', label: 'Website Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item?.metadata?.pageUrl || item.category || 'Page / update'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'pageUrl', label: 'Page URL', render: (item) => item?.metadata?.pageUrl || '-' },
      { key: 'pageType', label: 'Page Type', render: (item) => item?.metadata?.pageType || '-' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No website items found', 'Create website records for page changes, publish readiness, approvals, launch evidence, and final URLs.');
    if (activeSection === 'testimonials') return renderCreativeSection('testimonials', testimonials, [
      { key: 'title', label: 'Testimonial', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description || 'Client proof'}</p></div> },
      { key: 'clientName', label: 'Client', render: (item) => item?.metadata?.clientName || '-' },
      { key: 'rating', label: 'Rating', render: (item) => (item?.metadata?.rating ? `${item.metadata.rating}/5` : '-') },
      { key: 'source', label: 'Source', render: (item) => item?.metadata?.source || '-' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No testimonials found', 'Create testimonial records with client, rating, source, permission, approval state, and reusable proof assets.');
    if (activeSection === 'case-studies') return renderCreativeSection('case-studies', caseStudies, [
      { key: 'title', label: 'Case Study', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description || 'Impact story'}</p></div> },
      { key: 'clientName', label: 'Client', render: (item) => item?.metadata?.clientName || '-' },
      { key: 'industry', label: 'Industry', render: (item) => item?.metadata?.industry || '-' },
      { key: 'resultsSummary', label: 'Results', render: (item) => item?.metadata?.resultsSummary || '-' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No case studies found', 'Create case study records with client, industry, results, approval state, publish status, and reusable assets.');
    if (activeSection === 'approvals') return renderApprovalsGovernance();
    if (activeSection === 'reporting') return renderReportingGovernance();
    if (activeSection === 'audit') return renderAuditGovernance();
    return renderGeneric(activeSection);
  };

  const renderCampaignEditorModal = () => {
    if (!campaignEditor.open) return null;
    const isEdit = campaignEditor.mode === 'edit';

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
        <form onSubmit={persistCampaignRecord} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">{isEdit ? 'Edit Campaign' : 'New Campaign'}</p>
              <h3 className="mt-2 text-2xl font-black text-white">{campaignDraft.name || 'Campaign record'}</h3>
              <p className="mt-2 text-sm text-neutral-400">Define the campaign plan, team, budget, lifecycle stage, and KPI targets.</p>
            </div>
            <button type="button" onClick={closeCampaignEditor} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white/10">
              Close
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Campaign Name</span>
              <input required value={campaignDraft.name} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, name: e.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400" placeholder="Launch campaign name" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Project</span>
              <select
                value={effectiveProjectId || ''}
                onChange={(e) => {
                  const projectId = e.target.value;
                  const project = projectOptions.find((item) => item.value === projectId);
                  updateProject(projectId);
                  setCampaignDraft((prev) => ({ ...prev, projectName: project?.name || prev.projectName }));
                }}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
              >
                <option className="text-slate-950" value="">Select project</option>
                {projectOptions.map((project) => (
                  <option className="text-slate-950" key={project.value} value={project.value}>{project.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Stage</span>
              <select value={campaignDraft.status} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, status: e.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400">
                {CAMPAIGN_STAGES.map((stage) => (
                  <option className="text-slate-950" key={stage} value={stage}>{CAMPAIGN_STAGE_LABELS[stage] || stage}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Objective</span>
              <textarea rows={3} value={campaignDraft.objective} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, objective: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" placeholder="Primary outcome and audience" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Description</span>
              <textarea rows={4} value={campaignDraft.description} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" placeholder="Execution notes, offers, segments, creative direction" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Platforms</span>
              <input value={campaignDraft.platform} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, platform: e.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400" placeholder="Meta, Google, LinkedIn" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Budget</span>
              <input type="number" min="0" value={campaignDraft.budgetAllocated} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, budgetAllocated: e.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400" placeholder="0" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Start Date</span>
              <input type="date" value={campaignDraft.startDate} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, startDate: e.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">End Date</span>
              <input type="date" value={campaignDraft.endDate} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, endDate: e.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Team Members</span>
              <textarea rows={4} value={campaignDraft.teamMembersText} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, teamMembersText: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" placeholder={'One per line: Name - Role'} />
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 md:col-span-4">KPI targets</p>
            {[
              ['targetReach', 'Reach'],
              ['targetLeads', 'Leads'],
              ['targetConversions', 'Conversions'],
              ['targetRevenue', 'Revenue'],
            ].map(([key, label]) => (
              <label key={key} className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{label}</span>
                <input type="number" min="0" value={campaignDraft[key]} onChange={(e) => setCampaignDraft((prev) => ({ ...prev, [key]: e.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400" placeholder="0" />
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-400">{isEdit ? 'Update the campaign record.' : 'Create the campaign record.'}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={closeCampaignEditor} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white/10">
                Cancel
              </button>
              <button type="submit" disabled={actionBusy || !campaignDraft.name.trim() || !effectiveProjectId} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/40 hover:bg-cyan-400/20 disabled:opacity-50">
                {actionBusy ? 'Saving...' : isEdit ? 'Save changes' : 'Create campaign'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  const renderEditorModal = () => {
    if (!editor.open || !activeSectionAction) return null;
    const title = editor.mode === 'edit' ? `Edit ${activeSectionAction.label}` : activeSectionAction.create;
    const sectionInfo = CHANNEL_DETAILS[editor.section] || CREATIVE_DETAILS[editor.section] || META[editor.section] || [activeSectionAction.label, 'Manage this media record.', 'category'];
    const domainFields = DOMAIN_FIELDS[editor.section] || [];
    const sectionIcon = META[editor.section]?.[2] || MODULE_FOR_SECTION[editor.section] || 'edit_note';
    const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500';
    const textareaClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500';
    const labelClass = 'text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-500';
    const updateDomainField = (key, value) => {
      setDraft((prev) => ({
        ...prev,
        domainFields: { ...prev.domainFields, [key]: value },
      }));
    };

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-[0_30px_120px_rgba(15,23,42,0.35)] dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="material-symbols-outlined rounded-xl bg-teal-50 p-2 text-[20px] text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  {sectionIcon}
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">{title}</p>
                  <h3 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-neutral-100">
                    {draft.title || `${activeSectionAction.label} record`}
                  </h3>
                </div>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-neutral-400">
                {sectionInfo[1] || 'Keep this record aligned to project, owner, approval status, and final evidence.'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto">
            <div className="p-5">
              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-neutral-100">Basic Information</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className={labelClass}>Title</span>
                      <input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} className={fieldClass} placeholder="Enter title" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Project</span>
                      <select
                        value={effectiveProjectId || ''}
                        onChange={(e) => {
                          const projectId = e.target.value;
                          const project = projectOptions.find((item) => item.value === projectId);
                          updateProject(projectId);
                          setDraft((prev) => ({ ...prev, projectName: project?.name || prev.projectName }));
                        }}
                        className={fieldClass}
                      >
                        <option className="text-slate-950" value="">Select project</option>
                        {projectOptions.map((project) => (
                          <option className="text-slate-950" key={project.value} value={project.value}>{project.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className={labelClass}>Description</span>
                      <textarea rows={4} value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} className={textareaClass} placeholder="Brief, placement, target audience, notes, or approval context" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Status</span>
                      <select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))} className={fieldClass}>
                        {['Draft', 'Pending', 'In Review', 'Approved', 'Scheduled', 'Live', 'Published', 'Needs Revision', 'Rejected', 'Archived'].map((option) => (
                          <option className="text-slate-950" key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Priority</span>
                      <select value={draft.priority} onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value }))} className={fieldClass}>
                        {['Low', 'Medium', 'High', 'Critical'].map((option) => (
                          <option className="text-slate-950" key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Owner</span>
                      <input value={draft.ownerName} onChange={(e) => setDraft((prev) => ({ ...prev, ownerName: e.target.value }))} className={fieldClass} placeholder="Owner name" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Category</span>
                      <input value={draft.category} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))} className={fieldClass} placeholder="Category or type" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className={labelClass}>Tags</span>
                      <input value={draft.tags} onChange={(e) => setDraft((prev) => ({ ...prev, tags: e.target.value }))} className={fieldClass} placeholder="Comma separated tags" />
                    </label>
                  </div>
                </section>

                {domainFields.length ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="mb-4">
                      <p className="text-sm font-black text-slate-950 dark:text-neutral-100">{SECTION_ACTIONS[editor.section]?.label} Details</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {domainFields.map((field) => (
                        <label key={field.key} className={field.top ? 'space-y-2' : 'space-y-2'}>
                          <span className={labelClass}>{field.label}</span>
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={draft.domainFields?.[field.key] ?? ''}
                            onChange={(e) => updateDomainField(field.key, e.target.value)}
                            className={fieldClass}
                            placeholder={field.placeholder || field.label}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="mb-4">
                    <p className="text-sm font-black text-slate-950 dark:text-neutral-100">File & Evidence</p>
                  </div>
                  <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-teal-400 hover:bg-teal-50/50 dark:border-neutral-700 dark:bg-neutral-950/70 dark:hover:border-teal-700 dark:hover:bg-teal-500/10">
                    <span className={labelClass}>Upload File</span>
                    <input
                      type="file"
                      onChange={(e) => setDraft((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                      className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-teal-700 dark:text-neutral-300"
                    />
                    {draft.file ? (
                      <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300">Selected: {draft.file.name} ({bytes(draft.file.size)})</p>
                    ) : draft.storageUrl ? (
                      <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">
                        Current file:{' '}
                        <a href={draft.storageUrl} target="_blank" rel="noreferrer" className="font-semibold text-teal-700 hover:underline dark:text-teal-300">
                          view{draft.fileSizeBytes ? ` (${bytes(draft.fileSizeBytes)})` : ''}
                        </a>
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">No file attached yet. Images, videos, PDFs, and docs are stored on Cloudinary.</p>
                    )}
                  </label>
                </section>

                {editor.section === 'content' && editor.mode === 'edit' && arr(editor.record?.approvalSteps).length ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-neutral-500">Approval history</p>
                    <ApprovalHistoryTimeline steps={editor.record.approvalSteps} />
                  </section>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeEditor} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800">
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy || !draft.title.trim() || !effectiveProjectId}
                onClick={() => persistRecord(editor.mode, editor.section, resolveRecordId(editor.record))}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">{editor.mode === 'edit' ? 'save' : 'add_circle'}</span>
                {actionBusy ? 'Saving...' : editor.mode === 'edit' ? 'Save changes' : `Create ${activeSectionAction.label}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isProjectHub = activeSection === 'projects';

  return (
    <main className="portal-page">
      <div className="mx-auto w-full max-w-[1720px] p-3 sm:p-4 lg:p-6 2xl:p-8">
        <PortalHeader
          title={sectionMeta[0]}
          subtitle={sectionMeta[1]}
          user={user}
          icon={sectionMeta[2]}
          showSearch={false}
          showNotifications
          showThemeToggle
        >
          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[760px]">
            <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Last sync {lastSyncLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-cyan-700">
                <span className="material-symbols-outlined text-[14px]">folder_copy</span>
                Scope {selectedProjectLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                <span className="material-symbols-outlined text-[14px]">checklist</span>
                {summary.recent.length} recent
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isProjectHub ? (
                <div className="relative min-w-[220px] flex-1 xl:flex-none">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${activeSection === 'dashboard' ? 'media records' : activeSection}...`}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-[var(--portal-accent)]"
                  />
                </div>
              ) : null}
              {!isProjectHub ? (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-[var(--portal-accent)]"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All Statuses' : option}
                    </option>
                  ))}
                </select>
              ) : null}
              {activeSectionAction && !CREATIVE_SECTION_IDS.has(activeSection) ? (
                <button
                  type="button"
                  onClick={() => openEditor('create', activeSection)}
                  disabled={actionBusy || !effectiveProjectId}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-teal-200 bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  {activeSectionAction.create}
                </button>
              ) : null}
              {!isProjectHub ? (
                <button
                  type="button"
                  onClick={refreshData}
                  disabled={actionBusy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Refresh
                </button>
              ) : null}
            </div>
            {activeSection !== 'projects' ? (
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Project scope</p>
                  <button
                    type="button"
                    onClick={() => updateProject('')}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      !effectiveProjectId
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {projectOptions.map((project, index) => {
                    const isActive = effectiveProjectId === project.value;
                    const accentClasses = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500'];
                    const accent = accentClasses[index % accentClasses.length];

                    return (
                      <button
                        key={project.value || project.code}
                        type="button"
                        onClick={() => updateProject(project.value)}
                        className={`group rounded-xl border p-3 text-left transition ${
                          isActive
                            ? 'border-teal-500 bg-teal-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className={`h-1 w-full rounded-full ${accent}`} />
                        <p className="mt-2 truncate text-sm font-black text-slate-950">{project.name || project.code}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{project.description || 'Project workspace'}</p>
                      </button>
                    );
                  })}
                  {!projectOptions.length ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-semibold text-slate-500 sm:col-span-3">
                      No approved projects found.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </PortalHeader>

        {actionMessage ? (
          <section className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {actionMessage}
          </section>
        ) : null}

        {loading ? <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" /> : error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div> : renderSection()}
        {renderCampaignEditorModal()}
        {renderEditorModal()}
      </div>
    </main>
  );
};

export { MEDIA_SECTIONS };
export default MediaWorkspace;
