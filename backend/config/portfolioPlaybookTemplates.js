// Starter-kit templates for adding new Digital Portfolio "information
// categories" (Section 6/7 of the portfolio spec) as Strategy Playbook
// slides. Deliberately NOT auto-seeded on every project — modules stay
// configurable per project (a software product needs Technology/Design; a
// marketing initiative needs Brand/Media/GTM), so these are offered as an
// opt-in picker when the admin adds a new slide. Content is intentionally
// blank; only the block skeleton (title/icon/type/layout) is templated.

const b = (title, type, icon, extra = {}) => ({ title, type, icon, ...extra });

const PORTFOLIO_CATEGORY_TEMPLATES = [
  {
    key: 'brand',
    label: 'Brand',
    icon: 'workspace_premium',
    blocks: [
      b('Brand Story', 'text', 'auto_stories'),
      b('Vision & Mission', 'text', 'flag'),
      b('Core Values', 'list', 'favorite'),
      b('Brand Promise', 'text', 'handshake'),
      b('Voice & Tone', 'text', 'record_voice_over'),
    ],
  },
  {
    key: 'product',
    label: 'Product / Service',
    icon: 'inventory_2',
    blocks: [
      b('Problem & Solution', 'text', 'lightbulb'),
      b('Core Features', 'list', 'checklist'),
      b('Key Benefits', 'list', 'thumb_up'),
      b('User Journey', 'text', 'route'),
      b('Differentiators', 'list', 'auto_awesome'),
    ],
  },
  {
    key: 'market',
    label: 'Market',
    icon: 'public',
    blocks: [
      b('Industry & Geography', 'text', 'travel_explore'),
      b('Market Opportunity', 'text', 'insights'),
      b('Market Trends', 'list', 'trending_up'),
      b('Competitive Landscape', 'list', 'sports_kabaddi'),
      b('Competitive Advantage', 'text', 'military_tech'),
    ],
  },
  {
    key: 'customer',
    label: 'Customer',
    icon: 'groups',
    blocks: [
      b('Target Audience / ICP', 'text', 'person_search'),
      b('Customer Segments', 'list', 'groups'),
      b('Pain Points', 'list', 'error'),
      b('Buying Triggers', 'list', 'bolt'),
      b('Customer Journey', 'text', 'route'),
    ],
  },
  {
    key: 'business',
    label: 'Business Model',
    icon: 'business_center',
    blocks: [
      b('Business Model', 'text', 'account_tree'),
      b('Revenue Model & Pricing', 'text', 'payments'),
      b('Growth Model', 'text', 'trending_up'),
      b('Business Goals', 'list', 'flag'),
    ],
  },
  {
    key: 'gtm',
    label: 'Go-To-Market',
    icon: 'rocket_launch',
    blocks: [
      b('GTM Flow', 'list', 'route', { subtitle: 'Market → ICP → Positioning → Message → Channel → Campaign → Lead → Customer → Retention → Growth' }),
      b('Primary Channels', 'list', 'hub'),
      b('Launch Plan', 'list', 'checklist'),
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    icon: 'campaign',
    blocks: [
      b('Marketing Strategy', 'text', 'campaign'),
      b('Channel Plan', 'list', 'hub', { groups: [{ heading: 'Organic', items: [] }, { heading: 'Paid', items: [] }, { heading: 'Direct', items: [] }, { heading: 'Partnerships', items: [] }] }),
      b('Content Strategy', 'list', 'edit_note'),
      b('Growth Strategy', 'text', 'trending_up'),
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: 'point_of_sale',
    blocks: [
      b('Sales Model', 'text', 'point_of_sale'),
      b('Acquisition Channels', 'list', 'hub'),
      b('Sales Strategy', 'text', 'strategy'),
      b('Pipeline Summary', 'text', 'filter_alt'),
    ],
  },
  {
    key: 'technology',
    label: 'Technology / IT',
    icon: 'dns',
    blocks: [
      b('Architecture Overview', 'text', 'account_tree'),
      b('Tech Stack', 'list', 'code'),
      b('Infrastructure & Hosting', 'text', 'dns'),
      b('Security & Integrations', 'list', 'security'),
    ],
  },
  {
    key: 'design',
    label: 'Design / UX',
    icon: 'palette',
    blocks: [
      b('Design Philosophy', 'text', 'palette'),
      b('Design System', 'list', 'grid_view'),
      b('UX Principles', 'list', 'touch_app'),
      b('Accessibility & Responsive', 'text', 'accessibility_new'),
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    icon: 'settings_suggest',
    blocks: [
      b('Operating Model', 'text', 'settings_suggest'),
      b('Core Processes', 'list', 'checklist'),
      b('Partners & Vendors', 'list', 'handshake'),
      b('Dependencies', 'list', 'link'),
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: 'account_balance',
    blocks: [
      b('Revenue Highlights', 'text', 'trending_up'),
      b('Major Cost Areas', 'list', 'payments'),
      b('Financial KPIs', 'list', 'query_stats'),
      b('ROI & Profitability', 'text', 'account_balance'),
    ],
  },
  {
    key: 'legal',
    label: 'Legal',
    icon: 'gavel',
    blocks: [
      b('Legal Structure', 'text', 'gavel'),
      b('Important Agreements', 'list', 'description'),
      b('Compliance Position', 'text', 'verified'),
      b('IP & Licenses', 'list', 'copyright'),
    ],
  },
  {
    key: 'media',
    label: 'Media / PR',
    icon: 'perm_media',
    blocks: [
      b('Media Positioning', 'text', 'perm_media'),
      b('Major Campaigns', 'list', 'campaign'),
      b('Press & Coverage', 'list', 'newspaper'),
      b('Media Performance', 'text', 'insights'),
    ],
  },
  {
    key: 'people',
    label: 'People',
    icon: 'diversity_3',
    blocks: [
      b('Leadership', 'list', 'star'),
      b('Key Contributors', 'list', 'groups'),
      b('Departments & Ownership', 'list', 'corporate_fare'),
    ],
  },
  {
    key: 'growth',
    label: 'Growth & Performance',
    icon: 'trending_up',
    blocks: [
      b('Key KPIs', 'list', 'query_stats'),
      b('Growth Highlights', 'list', 'trending_up'),
      b('Major Trends', 'text', 'insights'),
    ],
  },
  {
    key: 'achievements',
    label: 'Achievements',
    icon: 'military_tech',
    blocks: [
      b('Milestones', 'list', 'flag'),
      b('Awards & Recognition', 'list', 'military_tech'),
      b('Major Partnerships', 'list', 'handshake'),
      b('Major Customers', 'list', 'star'),
    ],
  },
  {
    key: 'caseStudies',
    label: 'Case Studies',
    icon: 'auto_stories',
    blocks: [
      b('Case Study', 'text', 'auto_stories', { subtitle: 'Problem → Approach → Solution → Result' }),
    ],
  },
];

const getTemplate = (key) => PORTFOLIO_CATEGORY_TEMPLATES.find((t) => t.key === key) || null;

const buildSlideFromTemplate = (key) => {
  const template = getTemplate(key);
  if (!template) return null;
  return {
    title: template.label,
    blocks: template.blocks.map((block, order) => ({ ...block, order })),
  };
};

module.exports = { PORTFOLIO_CATEGORY_TEMPLATES, getTemplate, buildSlideFromTemplate };
