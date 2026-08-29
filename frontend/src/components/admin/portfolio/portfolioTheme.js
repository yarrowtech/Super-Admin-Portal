// Icon + accent presets shared by the portfolio card (PortfolioGroupsPanel),
// the Category Workspace header, and the Settings "Visual" section. Named
// accents (not raw Tailwind classes) are what's persisted on
// PortfolioGroup.accent / PortfolioCategory.accent, so this is the single
// place that maps a name to its gradient/soft/text classes.

export const ACCENT_PRESETS = {
  indigo:  { name: 'indigo',  grad: 'from-indigo-500 to-violet-500',  bar: 'bg-indigo-500',  soft: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-600 dark:text-indigo-300',  swatch: 'bg-indigo-500' },
  blue:    { name: 'blue',    grad: 'from-blue-500 to-cyan-500',      bar: 'bg-blue-500',    soft: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-300',      swatch: 'bg-blue-500' },
  violet:  { name: 'violet',  grad: 'from-violet-500 to-purple-500',  bar: 'bg-violet-500',  soft: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-300',  swatch: 'bg-violet-500' },
  fuchsia: { name: 'fuchsia', grad: 'from-fuchsia-500 to-pink-500',   bar: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', text: 'text-fuchsia-600 dark:text-fuchsia-300', swatch: 'bg-fuchsia-500' },
  purple:  { name: 'purple',  grad: 'from-purple-500 to-indigo-500',  bar: 'bg-purple-500',  soft: 'bg-purple-50 dark:bg-purple-500/10',   text: 'text-purple-600 dark:text-purple-300',  swatch: 'bg-purple-500' },
  cyan:    { name: 'cyan',    grad: 'from-cyan-500 to-blue-500',      bar: 'bg-cyan-500',    soft: 'bg-cyan-50 dark:bg-cyan-500/10',       text: 'text-cyan-600 dark:text-cyan-300',      swatch: 'bg-cyan-500' },
  emerald: { name: 'emerald', grad: 'from-emerald-500 to-teal-500',   bar: 'bg-emerald-500', soft: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', swatch: 'bg-emerald-500' },
  amber:   { name: 'amber',   grad: 'from-amber-500 to-orange-500',   bar: 'bg-amber-500',   soft: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-300',    swatch: 'bg-amber-500' },
  rose:    { name: 'rose',    grad: 'from-rose-500 to-red-500',       bar: 'bg-rose-500',    soft: 'bg-rose-50 dark:bg-rose-500/10',       text: 'text-rose-600 dark:text-rose-300',      swatch: 'bg-rose-500' },
};

export const ACCENT_NAMES = Object.keys(ACCENT_PRESETS);

export const getAccent = (name) => ACCENT_PRESETS[name] || ACCENT_PRESETS.indigo;

// A curated set — not exhaustive — of Material Symbols that make sense for a
// portfolio group or category (content pillars, workspaces, campaigns…).
export const ICON_PRESETS = [
  'folder_open', 'view_column', 'article', 'campaign', 'newspaper', 'photo_camera',
  'videocam', 'podcasts', 'forum', 'storefront', 'travel_explore', 'auto_awesome',
  'trending_up', 'flag', 'workspaces', 'hub', 'design_services', 'gavel',
];
