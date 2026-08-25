const mongoose = require('mongoose');
const { buildSlideFromTemplate } = require('../config/portfolioPlaybookTemplates');

const PORTFOLIO_ITEM_STATUSES = ['not-started', 'in-progress', 'done'];
const PORTFOLIO_STATUSES = ['draft', 'active', 'archived'];

const portfolioItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: '' },
    link: { type: String, trim: true, default: '' },
    image: {
      url: String,
      storageKey: String,
      storageProvider: String,
      thumbnailUrl: String,
    },
    status: { type: String, enum: PORTFOLIO_ITEM_STATUSES, default: 'not-started' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const portfolioSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
    items: [portfolioItemSchema],
  },
  { timestamps: true }
);

// Strategy Playbook — a richer, presentation-style content type (Overview,
// Goals, Roadmap, Strategy...) navigated as slides, distinct from the
// checklist-style pillars above. Each block is a flexible content card:
// plain text, a bullet list, a grouped/sectioned list, or a status badge.
const PLAYBOOK_BLOCK_TYPES = ['text', 'list', 'badge'];

const playbookGroupSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, default: '' },
    items: [{ type: String, trim: true }],
  },
  { _id: false }
);

const playbookBlockSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: '' },
    badgeNumber: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    type: { type: String, enum: PLAYBOOK_BLOCK_TYPES, default: 'list' },
    text: { type: String, trim: true, default: '' },
    items: [{ type: String, trim: true }],
    groups: [playbookGroupSchema],
    footer: { type: String, trim: true, default: '' },
    tone: { type: String, trim: true, default: 'neutral' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const playbookSlideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    blocks: [playbookBlockSchema],
  },
  { timestamps: true }
);

const portfolioSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      unique: true,
    },
    projectName: { type: String, trim: true },
    projectCode: { type: String, trim: true },
    summary: { type: String, trim: true, default: '' },
    coverImage: {
      url: String,
      storageKey: String,
      storageProvider: String,
    },
    liveUrl: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true }],
    status: { type: String, enum: PORTFOLIO_STATUSES, default: 'active' },
    sections: [portfolioSectionSchema],
    playbook: [playbookSlideSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

portfolioSchema.index({ status: 1 });

// Default 6-pillar template (Product Portfolio 1/2, Secure/Data, ICP+Message,
// Target market, GTM system) seeded on creation — admin can freely rename,
// add, or remove sections/items afterwards.
const DEFAULT_PORTFOLIO_SECTIONS = [
  { title: 'Product Portfolio 1', items: ['Blogs', 'Articles', 'Collabs', 'PR post', 'SEO / AEO', 'Offline articles'] },
  { title: 'Product Portfolio 2', items: ['PR / feedback', 'Reviews / revise', 'PITCH', 'CRM + Database + Emails'] },
  { title: 'Secure / Data', items: ['REV / Sale', 'POCs', 'Product-wise', 'PR', 'Solution', 'Safe content', 'Referral', 'Offer / Pipeline'] },
  { title: 'ICP + Message', items: ['Product + Channel', 'GMT, LTV', 'Funnel, CAC', 'ARR/AVC, ICP, MAT'] },
  { title: 'Target market', items: ['Demographic', 'Aesthetics / Vision', 'Voice + Tone', 'Clear message', 'MAT', 'Positions'] },
  { title: 'GTM system', items: ['KPI tree', 'Sales playbook', 'Marketing playbook', 'Market plan'] },
];

const buildDefaultSections = () =>
  DEFAULT_PORTFOLIO_SECTIONS.map((section, sectionOrder) => ({
    title: section.title,
    order: sectionOrder,
    items: section.items.map((title, itemOrder) => ({ title, order: itemOrder })),
  }));

// Default 4-slide Strategy Playbook template — block titles/icons/layout are
// pre-set, but content is left blank for the admin to fill in per project.
const DEFAULT_PLAYBOOK_SLIDES = [
  {
    title: 'Overview',
    blocks: [
      { title: 'Industry', type: 'text', icon: 'category' },
      { title: 'Platform', type: 'text', icon: 'devices' },
      { title: 'Target Audience', type: 'text', icon: 'groups' },
      { title: 'USP', type: 'text', icon: 'stars' },
      { title: 'Current Phase', type: 'text', icon: 'timeline' },
      { title: 'Overall Status', type: 'badge', icon: 'flag', tone: 'success' },
    ],
  },
  {
    title: 'Goals',
    blocks: [
      { title: 'Brand Goal', type: 'list', icon: 'workspace_premium' },
      { title: 'Marketing Goal', type: 'list', icon: 'campaign' },
      { title: 'Business Goal', type: 'list', icon: 'trending_up' },
    ],
  },
  {
    title: 'Roadmap',
    blocks: [
      { title: 'Foundation Kit', type: 'list', icon: 'foundation', badgeNumber: '01', subtitle: 'Before Launch', footer: '' },
      { title: 'Growth Kit', type: 'list', icon: 'trending_up', badgeNumber: '02', subtitle: 'Active Marketing', footer: '' },
      { title: 'Scaling Kit', type: 'list', icon: 'rocket_launch', badgeNumber: '03', subtitle: 'Expansion Stage', footer: '' },
    ],
  },
  {
    title: 'Strategy',
    blocks: [
      { title: 'Target Customer', type: 'list', icon: 'groups' },
      { title: 'Pain Points', type: 'list', icon: 'error' },
      { title: 'Buying Triggers', type: 'list', icon: 'bolt' },
      { title: 'Positioning', type: 'text', icon: 'explore' },
      { title: 'Value Proposition', type: 'text', icon: 'diamond' },
      { title: 'Channel Plan', type: 'list', icon: 'hub', groups: [{ heading: 'Organic', items: [] }, { heading: 'Paid', items: [] }, { heading: 'Direct', items: [] }, { heading: 'Partnerships', items: [] }] },
    ],
  },
];

// Media and Legal are part of the standard slide set for every project (not
// an opt-in template) — every project should show its final Media/Law
// information the same way, mirroring how those portals work for every
// project uniformly.
const buildDefaultPlaybook = () => {
  const base = DEFAULT_PLAYBOOK_SLIDES.map((slide, slideOrder) => ({
    title: slide.title,
    order: slideOrder,
    blocks: slide.blocks.map((block, blockOrder) => ({ ...block, order: blockOrder })),
  }));
  const extras = [buildSlideFromTemplate('media'), buildSlideFromTemplate('legal')].filter(Boolean);
  return [...base, ...extras.map((slide, i) => ({ ...slide, order: base.length + i }))];
};

const Portfolio = mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;
module.exports.PORTFOLIO_ITEM_STATUSES = PORTFOLIO_ITEM_STATUSES;
module.exports.PORTFOLIO_STATUSES = PORTFOLIO_STATUSES;
module.exports.PLAYBOOK_BLOCK_TYPES = PLAYBOOK_BLOCK_TYPES;
module.exports.buildDefaultSections = buildDefaultSections;
module.exports.buildDefaultPlaybook = buildDefaultPlaybook;
