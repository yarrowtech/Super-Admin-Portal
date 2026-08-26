/**
 * Maps a free-text record status (e.g. "Approved", "In Review", "Needs revision")
 * to the tone vocabulary shared by StatusBadge/KPICard (success|warning|danger|info|neutral),
 * so every status pill in the app resolves color the same way and stays dark-mode aware.
 */
export const statusToTone = (status = '') => {
  const value = String(status).toLowerCase();
  if (value.includes('approved') || value.includes('live') || value.includes('published') || value.includes('active')) return 'success';
  if (value.includes('pending') || value.includes('review') || value.includes('draft')) return 'warning';
  if (value.includes('reject') || value.includes('revision') || value.includes('hold') || value.includes('archiv')) return 'danger';
  return 'info';
};

export default statusToTone;
