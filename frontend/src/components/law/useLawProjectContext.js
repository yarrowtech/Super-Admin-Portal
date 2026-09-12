import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export const isRealLawProjectId = (projectId) =>
  Boolean(projectId) && !String(projectId).startsWith('virtual-');

export const getProjectIdFromSearch = (search = '') => {
  const raw = new URLSearchParams(search).get('projectId') || '';
  return isRealLawProjectId(raw) ? raw : '';
};

export default function useLawProjectContext(projects = []) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawProjectId = searchParams.get('projectId') || '';
  const projectId = isRealLawProjectId(rawProjectId) ? rawProjectId : '';

  useEffect(() => {
    if (!rawProjectId || isRealLawProjectId(rawProjectId)) return;
    const next = new URLSearchParams(searchParams);
    next.delete('projectId');
    setSearchParams(next, { replace: true });
  }, [rawProjectId, searchParams, setSearchParams]);

  const project = useMemo(() => (
    projects.find((item) => String(item?._id || item?.id || '') === String(projectId)) || null
  ), [projects, projectId]);

  const updateUrlProject = useCallback((nextProjectId, options = {}) => {
    const next = new URLSearchParams(location.search);
    if (isRealLawProjectId(nextProjectId)) {
      next.set('projectId', nextProjectId);
      try { localStorage.setItem('activeLawProjectId', String(nextProjectId)); } catch {
        // Storage can be unavailable in private browsing or tests.
      }
    } else {
      next.delete('projectId');
      try { localStorage.removeItem('activeLawProjectId'); } catch {
        // Storage can be unavailable in private browsing or tests.
      }
    }
    const qs = next.toString();
    const target = `${options.pathname || location.pathname}${qs ? `?${qs}` : ''}`;
    if (options.navigate === false) setSearchParams(next, { replace: options.replace });
    else navigate(target, { replace: options.replace });
  }, [location.pathname, location.search, navigate, setSearchParams]);

  const withProjectContext = useCallback((path, nextProjectId = projectId) => {
    const [pathname, existingSearch = ''] = String(path).split('?');
    const next = new URLSearchParams(existingSearch);
    if (isRealLawProjectId(nextProjectId)) next.set('projectId', nextProjectId);
    else next.delete('projectId');
    const qs = next.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  }, [projectId]);

  return {
    projectId,
    project,
    setProject: updateUrlProject,
    clearProject: () => updateUrlProject(''),
    isProjectScoped: Boolean(projectId),
    withProjectContext,
  };
}
