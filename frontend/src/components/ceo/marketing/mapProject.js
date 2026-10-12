export const isMapProject = project => String(project.code || project.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === 'EECB2B';
export const belongsToProject = (row, projectId) => Boolean(projectId && row?.projectId === projectId);
export const scopedPayload = (payload, projectId) => {
  if (!belongsToProject(payload, projectId)) throw new Error('The map response does not belong to the selected project.');
  const points = payload.points || payload.map?.points || [];
  if (points.some(point => !belongsToProject(point, projectId) || point.projectIds?.some(id => id !== projectId)) || payload.items?.some(row => !belongsToProject(row, projectId))) throw new Error('Mixed-project data was rejected. Please retry.');
  return payload;
};
