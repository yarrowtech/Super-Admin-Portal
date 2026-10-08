import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const ALL = 'all';
const today = new Date();
export const DEFAULT_FILTERS = {
  projectId: ALL, startDate: new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10),
  endDate: today.toISOString().slice(0, 10), channel: ALL, state: ALL, city: ALL, campaign: ALL, status: ALL,
};
export const DEFAULT_LAYERS = { locations: true, schools: false, records: false, campaigns: false, boundaries: true };
export const pointKey = (point) => `${point.location}|${point.state || ''}`;
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const mapMotion = () => ({ duration: prefersReducedMotion() ? 0 : 1, easeLinearity: 0.25 });

export const focusViewport = (map, point) => {
  const zoom = Math.min(map.getMaxZoom(), Math.max(12, Math.round(map.getZoom())));
  const shift = map.getSize().x >= 640 ? [190, 0] : [0, Math.min(170, map.getSize().y * .2)];
  const center = map.unproject(map.project([point.latitude, point.longitude], zoom).add(shift), zoom);
  return { latitude: center.lat, longitude: center.lng, zoom };
};

const finite = (value, min, max) => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;

export const readMapUrl = (search) => {
  const params = new URLSearchParams(search);
  const filters = { ...DEFAULT_FILTERS };
  Object.keys(filters).forEach((key) => { if (params.get(key)) filters[key] = params.get(key); });
  let selection = params.get('location') ? { kind: 'location', key: params.get('location') } : null;
  const area = params.get('area')?.split(',').map(Number);
  if (!selection && area?.length === 4 && area.every(Number.isFinite)) selection = { kind: 'cluster', bounds: [[area[0], area[1]], [area[2], area[3]]] };
  const viewport = finite(params.get('lat'), -90, 90) && finite(params.get('lng'), -180, 180) && finite(params.get('zoom'), 4, 18)
    ? { latitude: Number(params.get('lat')), longitude: Number(params.get('lng')), zoom: Number(params.get('zoom')) } : null;
  const panel = params.get('panel') === 'unmapped' ? 'unmapped' : selection || params.get('record') ? 'location' : null;
  return {
    filters, selection, viewport, panel, recordId: params.get('record') || null,
    detailPage: Math.max(1, Number(params.get('page')) || 1), clusterPage: 1,
    recordsOpen: params.get('records') !== 'hidden', baseKey: params.get('base') === 'standard' ? 'standard' : 'humanitarian',
    layers: { ...DEFAULT_LAYERS, ...Object.fromEntries(Object.keys(DEFAULT_LAYERS).filter((key) => params.has(`layer.${key}`)).map((key) => [key, params.get(`layer.${key}`) === '1'])) },
    summaryOpen: params.get('summary') !== 'closed',
  };
};

export const writeMapUrl = (snapshot) => {
  const params = new URLSearchParams();
  Object.entries(snapshot.filters).forEach(([key, value]) => { if (value && value !== ALL && value !== DEFAULT_FILTERS[key]) params.set(key, value); });
  if (snapshot.selection?.kind === 'location') params.set('location', snapshot.selection.key);
  if (snapshot.selection?.kind === 'cluster') params.set('area', snapshot.selection.bounds.flat().join(','));
  if (snapshot.recordId) params.set('record', snapshot.recordId);
  if (snapshot.panel === 'unmapped') params.set('panel', 'unmapped');
  if (snapshot.detailPage > 1) params.set('page', snapshot.detailPage);
  if (!snapshot.recordsOpen) params.set('records', 'hidden');
  if (!snapshot.summaryOpen) params.set('summary', 'closed');
  if (snapshot.baseKey !== 'humanitarian') params.set('base', snapshot.baseKey);
  Object.entries(snapshot.layers).forEach(([key, value]) => { if (value !== DEFAULT_LAYERS[key]) params.set(`layer.${key}`, value ? '1' : '0'); });
  if (snapshot.viewport) {
    params.set('lat', snapshot.viewport.latitude.toFixed(6));
    params.set('lng', snapshot.viewport.longitude.toFixed(6));
    params.set('zoom', String(snapshot.viewport.zoom));
  }
  return `?${params.toString()}`;
};

const lastIndex = (session) => {
  try { return Number(sessionStorage.getItem(`marketing-map:${session}`)) || 0; } catch { return 0; }
};

export const useMarketingMapState = (mapRef) => {
  const location = useLocation();
  const navigate = useNavigate();
  const entry = useMemo(() => location.state?.marketingMap?.version === 1 ? location.state.marketingMap : {
    version: 1, session: `map-${location.key}`, index: 0, snapshot: readMapUrl(location.search),
  }, [location.key, location.search, location.state]);
  const current = useRef(entry);
  useLayoutEffect(() => { current.current = entry; }, [entry]);

  const viewportNow = useCallback(() => {
    const map = mapRef.current;
    if (!map) return current.current.snapshot.viewport;
    const center = map.getCenter();
    return { latitude: center.lat, longitude: center.lng, zoom: Math.round(map.getZoom()) };
  }, [mapRef]);

  const commit = useCallback((patch, { replace = false, captureViewport = true } = {}) => {
    const previous = current.current;
    const before = { ...previous.snapshot, ...(captureViewport ? { viewport: viewportNow() } : {}) };
    const after = { ...before, ...patch };
    if (JSON.stringify(before) === JSON.stringify(after) && previous.snapshot.viewport) return;
    const index = replace ? previous.index : previous.index + 1;
    const next = { ...previous, index, snapshot: after };
    // Save the departing camera before pushing. Restoration never calls commit.
    if (!replace) navigate({ pathname: location.pathname, search: writeMapUrl(before) }, { replace: true, state: { marketingMap: { ...previous, snapshot: before } } });
    current.current = next;
    if (!replace) { try { sessionStorage.setItem(`marketing-map:${next.session}`, String(index)); } catch { /* Storage may be unavailable. */ } }
    navigate({ pathname: location.pathname, search: writeMapUrl(after) }, { replace, state: { marketingMap: next } });
  }, [location.pathname, navigate, viewportNow]);

  const rememberViewport = useCallback(() => {
    const viewport = viewportNow();
    const before = current.current.snapshot.viewport;
    if (!viewport || before && Math.abs(before.latitude - viewport.latitude) < 0.000001 && Math.abs(before.longitude - viewport.longitude) < 0.000001 && before.zoom === viewport.zoom) return;
    commit({ viewport }, { replace: true, captureViewport: false });
  }, [commit, viewportNow]);

  return {
    snapshot: entry.snapshot, commit, rememberViewport, viewportNow,
    back: () => navigate(-1), forward: () => navigate(1),
    canBack: entry.index > 0, canForward: entry.index < lastIndex(entry.session),
    entryIndex: entry.index,
  };
};
