// Shared role/department lookups for the User Directory (filter sidebar, table, and
// active-filter chips). Kept in one place so the three views can't drift out of sync.

// ROLE_LABELS/getRoleLabel now live in utils/roleLabels.js (shared with every sidebar's role
// badge) — imported and re-exported here so existing imports from this file keep working unchanged.
import { ROLE_LABELS, getRoleLabel } from '../../../utils/roleLabels';
export { ROLE_LABELS, getRoleLabel };

// Department-wise grouping, matching the SUPER ADMIN / CEO / HR / IT / FINANCE / MEDIA / LAW /
// OUTSOURCING hierarchy. Single-role departments filter directly on click; multi-role
// departments (IT, Finance, Media, Law) expand to let you filter by the whole department
// (all its roles combined, via a comma-joined `role` query param) or by one sub-role.
// Each department carries its own accent color so the list scans quickly at a glance.
export const departmentGroups = [
  { key: 'admin', label: 'Super Admin', icon: 'shield_person', roles: ['admin'], badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  { key: 'ceo', label: 'CEO', icon: 'business_center', roles: ['ceo'], badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { key: 'hr', label: 'HR', icon: 'badge', roles: ['hr'], badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  {
    key: 'it', label: 'IT', icon: 'computer', badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    subRoles: [
      { value: 'it_manager', label: 'IT Manager' },
      { value: 'it_admin', label: 'IT Admin' },
      { value: 'it_employee', label: 'IT Employee' },
      { value: 'it_hr', label: 'IT HR' },
    ],
  },
  {
    key: 'finance', label: 'Finance', icon: 'payments', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    subRoles: [
      { value: 'finance_manager', label: 'Finance Manager' },
      { value: 'finance_employee', label: 'Finance Employee' },
    ],
  },
  {
    key: 'media', label: 'Media', icon: 'photo_camera', badge: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
    subRoles: [
      { value: 'media_head', label: 'Media Head' },
      { value: 'media_sales', label: 'Media Sales' },
      { value: 'media_marketing', label: 'Media Marketing' },
    ],
  },
  {
    key: 'law', label: 'Law', icon: 'gavel', badge: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    subRoles: [
      { value: 'law_head', label: 'Law Head' },
      { value: 'law_employee', label: 'Law Employee' },
    ],
  },
  { key: 'outsourcing', label: 'Outsourcing', icon: 'handshake', roles: ['freelancer'], badge: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
];

export const ROLE_ICONS = {
  admin: 'shield_person',
  ceo: 'business_center',
  hr: 'badge',
  it_manager: 'computer',
  it_admin: 'admin_panel_settings',
  it_employee: 'computer',
  it_hr: 'badge',
  finance_manager: 'payments',
  finance_employee: 'payments',
  media_head: 'photo_camera',
  media_sales: 'trending_up',
  media_marketing: 'campaign',
  law_head: 'gavel',
  law_employee: 'gavel',
  freelancer: 'person',
  employee: 'person',
};

export const getRoleIcon = (role) => ROLE_ICONS[role] || 'person';

// Quick presets for the "Joined" filter. Applied client-side against whatever
// page of users is currently loaded (the directory list is paginated server-side).
export const JOINED_WITHIN_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'This year' },
];

export const getJoinedWithinLabel = (value) =>
  JOINED_WITHIN_OPTIONS.find((option) => option.value === value)?.label || '';

// Resolves a `filters.role` value (single role, or comma-joined multi-role group) back to a
// human label for display in filter chips.
export const getDepartmentChipLabel = (roleFilterValue) => {
  if (!roleFilterValue) return '';

  for (const group of departmentGroups) {
    if (!group.subRoles) {
      if (group.roles?.[0] === roleFilterValue) return group.label;
      continue;
    }
    const groupValue = group.subRoles.map((r) => r.value).join(',');
    if (groupValue === roleFilterValue) return group.label;
    const sub = group.subRoles.find((r) => r.value === roleFilterValue);
    if (sub) return `${group.label} • ${sub.label}`;
  }

  return getRoleLabel(roleFilterValue);
};
