/**
 * Per-entity configuration for the shared spreadsheet import wizard.
 *
 * The wizard's four steps are identical whatever is being imported — only the
 * endpoints, the mappable fields, the preview columns and the nouns in the
 * copy change. Keeping those here means a new importable section is a config
 * entry rather than another 600-line copy of the wizard, and a fix to the flow
 * lands in every section at once.
 *
 * `basePath` is appended to /api/v1/crm, so the client importer keeps its
 * existing /import/* routes and influencers get /influencers/import/*.
 */

/** Singular/plural without a library, for "1 client" vs "3 clients". */
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const CLIENT_IMPORT = {
  key: 'client',
  basePath: '/import',
  templateFile: 'crm-import-template.xlsx',
  noun: 'client',
  nounPlural: 'clients',
  title: 'Import CRM Data from Excel',
  description: 'Upload an .xlsx, .xls or .csv file. Clients are created project-wise under Media or Marketing.',
  projectHelper: 'Every imported client is filed under this project',
  defaultDepartment: 'media',
  fields: [
    { key: 'name',           label: 'Client Name', required: true },
    { key: 'contactPerson',  label: 'Contact Person' },
    { key: 'email',          label: 'Email' },
    { key: 'phone',          label: 'Phone' },
    { key: 'website',        label: 'Website' },
    { key: 'address',        label: 'Address' },
    { key: 'department',     label: 'Department' },
    { key: 'status',         label: 'Status / Stage' },
    { key: 'priority',       label: 'Priority' },
    { key: 'projectName',    label: 'Project Name' },
    { key: 'source',         label: 'Source' },
    { key: 'campaignSource', label: 'Campaign Source' },
    { key: 'notes',          label: 'Notes' },
  ],
  // Preview columns for the review step. `get` reads a validated record.
  preview: [
    { label: 'Client',   get: r => r.name },
    { label: 'Contact',  get: r => r.contactPerson },
    { label: 'Email',    get: r => r.email },
    { label: 'Dept',     get: r => r.department, kind: 'dept' },
    { label: 'Status',   get: r => r.status },
    { label: 'Priority', get: r => r.priority, kind: 'priority' },
  ],
};

/** Compact display for reach figures: 1_250_000 -> "1.3M". */
const compactNumber = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '';
  const value = Number(n);
  if (value >= 1e9) return `${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
};

export const INFLUENCER_IMPORT = {
  key: 'influencer',
  basePath: '/influencers/import',
  templateFile: 'crm-influencer-template.xlsx',
  noun: 'influencer',
  nounPlural: 'influencers',
  title: 'Import Influencers from Excel',
  description: 'Upload an .xlsx, .xls or .csv file. Follower counts accept "12.5K" or "1.2M", and rates may carry a currency symbol.',
  projectHelper: 'Every imported influencer is filed under this campaign project',
  defaultDepartment: 'marketing',
  // Name is not marked required: a creator known only by their handle is normal,
  // and the service falls back to the handle for the display name.
  fields: [
    { key: 'name',           label: 'Influencer Name' },
    { key: 'handle',         label: 'Handle' },
    { key: 'platform',       label: 'Platform' },
    { key: 'profileUrl',     label: 'Profile URL' },
    { key: 'email',          label: 'Email' },
    { key: 'phone',          label: 'Phone' },
    { key: 'location',       label: 'Location' },
    { key: 'followers',      label: 'Followers' },
    { key: 'avgViews',       label: 'Avg Views' },
    { key: 'avgLikes',       label: 'Avg Likes' },
    { key: 'engagementRate', label: 'Engagement Rate' },
    { key: 'ratePerPost',    label: 'Rate / Post' },
    { key: 'ratePerStory',   label: 'Rate / Story' },
    { key: 'ratePerReel',    label: 'Rate / Reel' },
    { key: 'currency',       label: 'Currency' },
    { key: 'category',       label: 'Category' },
    { key: 'tier',           label: 'Tier' },
    { key: 'department',     label: 'Department' },
    { key: 'status',         label: 'Status / Stage' },
    { key: 'priority',       label: 'Priority' },
    { key: 'campaignPeriod', label: 'Campaign Period' },
    { key: 'notes',          label: 'Notes' },
  ],
  preview: [
    { label: 'Influencer', get: r => r.name },
    { label: 'Handle',     get: r => (r.handle ? `@${r.handle}` : '') },
    { label: 'Platform',   get: r => r.platform },
    { label: 'Followers',  get: r => compactNumber(r.followers) },
    { label: 'ER %',       get: r => (r.engagementRate === null || r.engagementRate === undefined ? '' : `${r.engagementRate}%`) },
    { label: 'Category',   get: r => r.category },
  ],
};

export { compactNumber };
