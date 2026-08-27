/**
 * Maps a free-text record status (e.g. "Approved", "In Review", "Needs revision")
 * to the tone vocabulary shared by StatusBadge/KPICard (success|warning|danger|info|neutral),
 * so every status pill in the app resolves color the same way and stays dark-mode aware.
 *
 * Vocabulary (matches the app-wide semantic status system):
 *   success: Approved / Completed / Healthy / Paid / Resolved
 *   warning: Pending / Needs Review / At Risk / Draft-for-review
 *   danger:  Failed / Overdue / Blocked / Critical / Rejected / Over-budget
 *   info:    In Progress / Scheduled
 *   neutral: Draft / Unassigned / Archived / Inactive
 */
export const statusToTone = (status = '') => {
  const value = String(status).toLowerCase();
  if (value.includes('inactive') || value.includes('unassigned') || value.includes('archiv') || (value.includes('draft') && !value.includes('review'))) return 'neutral';
  if (
    value.includes('approved') || value.includes('live') || value.includes('published') || value.includes('active') ||
    value.includes('completed') || value.includes('healthy') || value.includes('paid') || value.includes('resolved') ||
    value.includes('success')
  ) return 'success';
  if (
    value.includes('failed') || value.includes('overdue') || value.includes('blocked') || value.includes('critical') ||
    value.includes('reject') || value.includes('revision') || value.includes('hold') || value.includes('over-budget') ||
    value.includes('over budget')
  ) return 'danger';
  if (value.includes('pending') || value.includes('review') || value.includes('at risk') || value.includes('at-risk')) return 'warning';
  if (value.includes('in progress') || value.includes('in-progress') || value.includes('scheduled')) return 'info';
  return 'info';
};

export default statusToTone;
