import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import Select from '../../ui/Select';
import Input from '../../ui/Input';
import { useAuth } from '../../../context/AuthContext';
import { marketingMapApi as api } from '../../../services/marketingAnalytics';
import { ALL, DEFAULT_FILTERS, focusViewport, pointKey, useMarketingMapState } from './useMarketingMapState';
import MarkerLayers, { MapBoundary, MapCamera } from './MarketingMapLayers';
import { AnimatedNumber, MapButton, MapIcon, MapPopover, MapPresence, ProjectPicker, RecordDetails } from './MapUi';
import { isMapProject, belongsToProject, scopedPayload } from './mapProject';
import { SchoolStatus } from './MarketingJourney';
import { PIN_BANDS, PIN_STYLES } from './LocationPin';
import './marketing-map.css';

const unwrap = (res) => res && typeof res === 'object' && 'data' in res ? res.data : res;
const fmt = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);
const BASE_LAYERS = {
  humanitarian: { label: 'Light', url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', subdomains: 'ab', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles courtesy of <a href="https://www.hotosm.org/">Humanitarian OSM Team</a>' },
  standard: { label: 'Standard', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: 'abc', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
};

const initialRuntime = {
  journey: { stages: [], canUpdate: false }, journeyError: null, projects: [], projectsError: null, dataset: { imported: null, platform: null, key: '', projectId: null, loading: true, error: null },
  details: { key: '', loading: false, data: null, error: null }, record: { key: '', data: null, error: null },
  popover: null, query: '', search: { key: '', items: [], loading: false, error: null },
  draftFilters: null, moving: false, mapError: null, reload: 0, recordReload: 0, notice: null,
};
const reducer = (state, action) => ({ ...state, ...action });

const RecordRows = ({ rows, selectedId, onRecord, stages }) => <ul className="map-records">{rows.map((row, index) => <li key={row.id} className="map-stagger" style={{ '--row-delay': `${Math.min(index, 12) * 60}ms` }}><button type="button" aria-label={`View ${row.school || 'record'}`} aria-pressed={selectedId === row.id} onClick={() => onRecord(row)}><span className="map-record-text"><strong>{row.school || 'Unnamed record'}</strong><span>{row.location || 'No location supplied'}</span><span className="map-record-meta"><SchoolStatus record={row} stages={stages} compact /><small>{row.projectName || 'Project not supplied'}</small></span></span><MapIcon name="chevron_right" /></button></li>)}</ul>;

const Pagination = ({ page, totalPages, loading, onChange }) => totalPages > 1 && <div className="map-pagination"><MapButton icon="chevron_left" label="Previous page" disabled={loading || page <= 1} onClick={() => onChange(page - 1)} /><span>{page} / {totalPages}</span><MapButton icon="chevron_right" label="Next page" disabled={loading || page >= totalPages} onClick={() => onChange(page + 1)} /></div>;

const MarketingMapExperience = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const root = useRef(null);
  const dialogRef = useRef(null);
  const [runtime, dispatch] = useReducer(reducer, initialRuntime);
  const navigation = useMarketingMapState(mapRef);
  const { snapshot, commit, rememberViewport } = navigation;
  const { filters, layers } = snapshot;
  const allowedProject = runtime.projects.filter(isMapProject).length === 1 ? runtime.projects.find(isMapProject) : null;
  const projectReady = Boolean(allowedProject && filters.projectId === allowedProject.id);
  const stages = projectReady ? runtime.journey.stages : [];
  const datasetKey = JSON.stringify(filters);
  const loading = !projectReady || runtime.dataset.loading || runtime.dataset.key !== datasetKey;
  const imported = projectReady && runtime.dataset.projectId === filters.projectId ? runtime.dataset.imported : null;
  const platform = projectReady && runtime.dataset.projectId === filters.projectId ? runtime.dataset.platform : null;

  useEffect(() => {
    if (!projectReady) return undefined;
    const controller = new AbortController();
    api.getMarketingJourney(token, { signal: controller.signal, projectId: filters.projectId })
      .then(res => { if (!controller.signal.aborted) dispatch({ journey: unwrap(res), journeyError: null }); })
      .catch(error => { if (!controller.signal.aborted) dispatch({ journeyError: error.message || 'Unable to load journey stages.' }); });
    return () => controller.abort();
  }, [token, runtime.reload, projectReady, filters.projectId]);

  useEffect(() => {
    let alive = true;
    api.getProjects(token).then((res) => { const projects = (unwrap(res) || []).filter(isMapProject); if (projects.length !== 1) throw new Error('The EEC-B2B project could not be resolved.'); if (alive) dispatch({ projects, projectsError: null }); })
      .catch((error) => { if (alive) dispatch({ projectsError: error.message || 'Unable to load projects.' }); });
    return () => { alive = false; };
  }, [token, runtime.reload]);

  useEffect(() => {
    if (!allowedProject || projectReady) return;
    // Invalid/stale project routes cannot carry another project's selections into this map.
    const preserve = !filters.projectId || filters.projectId === ALL;
    commit({ filters: { ...(preserve ? filters : DEFAULT_FILTERS), projectId: allowedProject.id }, ...(preserve ? {} : { selection: null, recordId: null, panel: null, viewport: null, detailPage: 1, recordStatus: ALL, recordDepartment: '', recordQuery: '' }) }, { replace: true, captureViewport: false });
  }, [allowedProject, projectReady, filters, commit]);

  useEffect(() => {
    if (!projectReady) return undefined;
    const controller = new AbortController();
    const load = async () => {
      dispatch({ dataset: { ...initialRuntime.dataset, ...runtime.dataset, loading: true }, mapError: null });
      const [imp, plat] = await Promise.allSettled([
        api.getImportedPoints(token, filters.projectId, { signal: controller.signal, marketingStage: filters.marketingStage, department: filters.department, city: filters.city, state: filters.state }),
        api.getAnalytics(token, filters, { page: 1, limit: 1, signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      dispatch({ dataset: {
        key: datasetKey, projectId: filters.projectId, imported: imp.status === 'fulfilled' ? scopedPayload(unwrap(imp.value), filters.projectId) : null,
        platform: plat.status === 'fulfilled' ? scopedPayload(unwrap(plat.value), filters.projectId) : null, loading: false,
        error: imp.status === 'rejected' ? imp.reason?.message || 'Unable to load locations.' : null,
      } });
    };
    load().catch(error => { if (!controller.signal.aborted) dispatch({ dataset: { ...initialRuntime.dataset, key: datasetKey, projectId: filters.projectId, loading: false, error: error.message } }); });
    return () => controller.abort();
    // The key contains every applied filter; runtime.dataset is the outgoing visual state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, datasetKey, runtime.reload, projectReady]);

  const allPoints = useMemo(() => {
    const byCity = new Map();
    for (const point of imported?.points || []) {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue;
      const item = { ...point, records: Number(point.records) || 0, schools: Number(point.schools) || 0, campaigns: 0 };
      byCity.set(pointKey(item).toLowerCase(), item);
    }
    for (const point of (filters.marketingStage === ALL && filters.department === ALL ? platform?.map?.points : []) || []) {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue;
      const existing = byCity.get(pointKey(point).toLowerCase());
      if (existing) existing.campaigns = Number(point.campaigns) || 0;
      else byCity.set(pointKey(point).toLowerCase(), { ...point, records: Number(point.activities || point.leads) || 0, schools: 0, campaigns: Number(point.campaigns) || 0 });
    }
    return [...byCity.values()].sort((a, b) => b.records - a.records);
  }, [imported, platform, filters.marketingStage, filters.department]);

  const points = useMemo(() => allPoints.filter((point) =>
    (filters.city === ALL || point.location.toLowerCase() === filters.city.toLowerCase())
    && (filters.state === ALL || point.state?.toLowerCase() === filters.state.toLowerCase())
  ), [allPoints, filters.city, filters.state]);

  const selection = snapshot.selection;
  const selected = useMemo(() => {
    if (!selection) return null;
    if (!projectReady) return null;
    if (selection.kind === 'location') {
      const point = points.find(item => pointKey(item) === selection.key);
      if (point) return point;
      const inspected = runtime.record.key === `${filters.projectId}|${snapshot.recordId}` ? runtime.record.data : null;
      if (belongsToProject(inspected, filters.projectId) && pointKey({ location: inspected.city, state: inspected.state }) === selection.key && Number.isFinite(inspected.latitude) && Number.isFinite(inspected.longitude)) return { location: inspected.city, state: inspected.state, latitude: inspected.latitude, longitude: inspected.longitude, records: 0, schools: 0, campaigns: 0, outsideFilters: true };
      return null;
    }
    const bounds = L.latLngBounds(selection.bounds);
    const keys = selection.keys ? new Set(selection.keys) : null;
    const locations = points.filter((point) => keys ? keys.has(pointKey(point)) : bounds.contains([point.latitude, point.longitude]));
    return { kind: 'cluster', location: 'Selected area', state: `${locations.length} locations`, bounds: selection.bounds, locations,
      records: locations.reduce((sum, point) => sum + point.records, 0), schools: locations.reduce((sum, point) => sum + point.schools, 0), campaigns: locations.reduce((sum, point) => sum + point.campaigns, 0) };
  }, [points, selection, runtime.record, filters.projectId, snapshot.recordId, projectReady]);
  const visiblePoints = useMemo(() => layers.locations ? points : points.filter((point) => layers.schools && point.schools > 0 || layers.records && point.records > 0 || layers.campaigns && point.campaigns > 0), [points, layers]);

  const detailCity = snapshot.panel === 'unmapped' ? 'unmapped' : selected && selected.kind !== 'cluster' && snapshot.recordsOpen ? selected.location : null;
  const recordControlsKey = `${snapshot.recordQuery}|${snapshot.recordSort}|${snapshot.recordStatus}|${snapshot.recordDepartment}|${filters.marketingStage}`;
  const detailKey = detailCity ? `${filters.projectId}|${detailCity}|${snapshot.detailPage}|${recordControlsKey}` : '';
  useEffect(() => {
    if (!projectReady || !detailCity) return undefined;
    const controller = new AbortController();
    const load = async () => {
      dispatch({ details: { key: detailKey, loading: true, data: null, error: null } });
      try {
        const options = { page: snapshot.detailPage, signal: controller.signal, search: snapshot.recordQuery, sort: snapshot.recordSort, marketingStage: snapshot.recordStatus === ALL ? filters.marketingStage : snapshot.recordStatus, department: snapshot.recordDepartment || filters.department };
        const res = detailCity === 'unmapped' ? await api.getUnmappedRecords(token, filters.projectId, options) : await api.getLocationRecords(token, filters.projectId, detailCity, options);
        if (!controller.signal.aborted) dispatch({ details: { key: detailKey, loading: false, data: scopedPayload(unwrap(res), filters.projectId), error: null } });
      } catch (error) { if (!controller.signal.aborted) dispatch({ details: { key: detailKey, loading: false, data: null, error: error.message || 'Unable to load records.' } }); }
    };
    load();
    return () => controller.abort();
  }, [token, detailCity, detailKey, filters.projectId, snapshot.detailPage, runtime.recordReload, snapshot.recordQuery, snapshot.recordSort, snapshot.recordStatus, snapshot.recordDepartment, filters.marketingStage, filters.department, projectReady]);

  const recordKey = snapshot.recordId ? `${filters.projectId}|${snapshot.recordId}` : '';
  useEffect(() => {
    if (!projectReady || !snapshot.recordId) return undefined;
    const controller = new AbortController();
    api.getImportedRecord(token, filters.projectId, snapshot.recordId, { signal: controller.signal })
      .then((res) => { if (!controller.signal.aborted) dispatch({ record: { key: recordKey, data: scopedPayload(unwrap(res), filters.projectId), error: null } }); })
      .catch((error) => { if (!controller.signal.aborted) dispatch({ record: { key: recordKey, data: null, error: error.message || 'Unable to load this record.' } }); });
    return () => controller.abort();
  }, [token, filters.projectId, snapshot.recordId, recordKey, runtime.recordReload, projectReady]);

  const searchKey = `${filters.projectId}|${filters.marketingStage}|${runtime.query.trim()}`;
  useEffect(() => {
    if (!projectReady || runtime.query.trim().length < 2 || runtime.popover !== 'search') return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      dispatch({ search: { key: searchKey, loading: true, items: [], error: null } });
      try {
        const res = await api.searchImportedRecords(token, filters.projectId, runtime.query.trim(), { signal: controller.signal, marketingStage: filters.marketingStage });
        if (!controller.signal.aborted) dispatch({ search: { key: searchKey, items: scopedPayload(unwrap(res), filters.projectId).items || [], loading: false, error: null } });
      } catch (error) { if (!controller.signal.aborted) dispatch({ search: { key: searchKey, items: [], loading: false, error: error.message || 'Search is unavailable.' } }); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [token, filters.projectId, runtime.query, runtime.popover, searchKey, filters.marketingStage, projectReady]);

  const closePopover = useCallback(() => dispatch({ popover: null }), []);
  const selectLocation = useCallback((point, recordId = null) => {
    const map = mapRef.current;
    const viewport = map ? focusViewport(map, point) : null;
    commit({ selection: { kind: 'location', key: pointKey(point) }, panel: 'location', recordId, detailPage: 1, recordsOpen: true, viewport, layers: layers.locations ? layers : { ...layers, locations: true } });
    dispatch({ popover: null, query: '' });
  }, [commit, layers]);
  const selectCluster = useCallback((locations, bounds) => {
    const map = mapRef.current;
    let center = L.latLngBounds(bounds).getCenter();
    const zoom = map ? Math.min(map.getMaxZoom(), Math.max(11, map.getBoundsZoom(L.latLngBounds(bounds), false, L.point(100, 100)))) : 11;
    if (map) center = map.unproject(map.project(center, zoom).add(map.getSize().x >= 640 ? [205, 0] : [0, Math.min(170, map.getSize().y * .2)]), zoom);
    commit({ selection: { kind: 'cluster', keys: locations.map(pointKey), bounds }, panel: 'location', recordId: null, detailPage: 1, clusterPage: 1, viewport: { latitude: center.lat, longitude: center.lng, zoom } });
    dispatch({ popover: null });
  }, [commit]);
  const selectRecord = (row) => commit({ recordId: row.id, recordsOpen: true });
  const changeProject = (projectId) => {
    if (!runtime.projects.some(project => isMapProject(project) && project.id === projectId)) return;
    commit({ filters: { ...DEFAULT_FILTERS, projectId }, selection: null, recordId: null, panel: null, viewport: null, detailPage: 1 });
    dispatch({ popover: null });
  };
  const closePanel = useCallback(() => commit({ panel: null, selection: null, recordId: null, detailPage: 1 }), [commit]);
  const onMap = useCallback((map) => { mapRef.current = map; }, []);
  const onMoving = useCallback((moving) => dispatch({ moving }), []);
  const onMapError = useCallback((mapError) => dispatch({ mapError }), []);

  useEffect(() => {
    if (!snapshot.panel) return undefined;
    const escape = (event) => { if (event.key === 'Escape' && !runtime.popover && !event.defaultPrevented && !event.target.closest('.map-popover, .map-project-menu')) closePanel(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [snapshot.panel, closePanel, runtime.popover]);
  useEffect(() => {
    if (snapshot.panel !== 'unmapped') return undefined;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const trap = (event) => {
      if (event.key !== 'Tab') return;
      const elements = dialogRef.current?.querySelectorAll('button:not(:disabled), input, a[href]');
      if (!elements?.length) return;
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [snapshot.panel]);

  const projectOptions = useMemo(() => runtime.projects.filter(isMapProject).map((project) => ({ value: project.id, label: project.name })), [runtime.projects]);
  const projectName = projectOptions.find((project) => project.value === filters.projectId)?.label || allowedProject?.name || 'Loading project...';
  const total = imported?.total || 0;
  const unmapped = imported?.unresolved || 0;
  const mappedPct = total ? (total - unmapped) / total * 100 : 0;
  const locationResults = runtime.query.trim() ? points.filter((point) => `${point.location} ${point.state}`.toLowerCase().includes(runtime.query.trim().toLowerCase())).slice(0, 8) : [];
  const searchItems = projectReady && runtime.search.key === searchKey ? runtime.search.items : [];
  const detailsLoading = Boolean(detailKey && (runtime.details.key !== detailKey || runtime.details.loading));
  const details = projectReady && runtime.details.key === detailKey ? runtime.details.data : null;
  const detailError = runtime.details.key === detailKey ? runtime.details.error : null;
  const record = projectReady && runtime.record.key === recordKey && belongsToProject(runtime.record.data, filters.projectId) ? runtime.record.data : null;
  const recordError = runtime.record.key === recordKey ? runtime.record.error : null;
  const base = BASE_LAYERS[snapshot.baseKey];
  const activeFilterCount = ['channel', 'state', 'city', 'campaign', 'status', 'marketingStage', 'department'].filter((key) => filters[key] !== ALL).length;

  const renderRecords = () => <>
    {snapshot.recordId && <div className="map-content-change" key={snapshot.recordId}>{recordError ? <div className="map-error" role="alert">{recordError}<button type="button" onClick={() => dispatch({ recordReload: runtime.recordReload + 1 })}>Retry</button></div> : record ? <RecordDetails record={record} showHeader={snapshot.panel === 'unmapped'} stages={stages} canUpdate={runtime.journey.canUpdate} onReload={() => dispatch({ recordReload: runtime.recordReload + 1 })} onUpdate={async (change) => {
        const updated = scopedPayload(unwrap(await api.updateMarketingStatus(token, filters.projectId, record.id, change)), filters.projectId);
        dispatch({ record: { key: recordKey, data: updated, error: null }, recordReload: runtime.recordReload + 1, reload: runtime.reload + 1 });
      }} sections={snapshot.sections} onSection={(key, open) => { if ((snapshot.sections?.[key] ?? (key !== 'source')) !== open) commit({ sections: { ...snapshot.sections, [key]: open } }, { replace: true }); }} onClose={() => commit({ recordId: null })} /> : <div className="map-skeleton" role="status" aria-label="Loading record" />}</div>}
    <h3 className="map-section-title">Records</h3>
    <div className="map-record-controls">
      <input aria-label="Search records" placeholder="Search records" value={snapshot.recordQuery} onChange={(event) => { commit({ recordQuery: event.target.value, detailPage: 1 }, { replace: true }); }} />
      <select aria-label="Sort records" value={snapshot.recordSort} onChange={(event) => commit({ recordSort: event.target.value, detailPage: 1 })}>{['name', 'newest', 'oldest', 'status'].map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select>
      <select aria-label="Filter record marketing status" value={snapshot.recordStatus} onChange={(event) => { commit({ recordStatus: event.target.value, detailPage: 1 }); }}><option value={ALL}>All marketing stages</option>{stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}<option value="NOT_RECORDED">Not recorded</option></select>
      <input aria-label="Filter record department" placeholder="Department" value={snapshot.recordDepartment} onChange={(event) => { commit({ recordDepartment: event.target.value, detailPage: 1 }, { replace: true }); }} />
    </div>
    {detailsLoading ? <div className="map-skeleton-list" role="status" aria-label="Loading records">{[0, 1, 2].map((index) => <div key={index} className="map-skeleton" />)}</div> : detailError ? <div className="map-error" role="alert">{detailError}<button type="button" onClick={() => dispatch({ recordReload: runtime.recordReload + 1 })}>Retry</button></div> : details?.items?.length ? <RecordRows stages={stages} rows={details.items} selectedId={snapshot.recordId} onRecord={selectRecord} /> : <p className="map-empty">No records found for this location.</p>}
    <Pagination page={snapshot.detailPage} totalPages={details?.pagination?.totalPages || 1} loading={detailsLoading} onChange={(detailPage) => commit({ detailPage, recordId: null })} />
  </>;

  return <div ref={root} className="marketing-map map-experience" data-history-index={navigation.entryIndex} data-interaction={loading ? 'loading' : runtime.dataset.error ? 'error' : snapshot.panel ? runtime.moving ? 'focusing' : 'selected' : points.length ? 'idle' : 'empty'} onKeyDown={(event) => {
    if ((event.key === ' ' || event.key === 'Enter') && event.target.matches('.marketing-pin-wrap, .marketing-cluster-wrap')) { event.preventDefault(); event.target.click(); }
  }}>
    <style>{PIN_STYLES}</style>
    <MapContainer center={[22.5937, 78.9629]} zoom={5} minZoom={4} maxZoom={18} zoomControl={false} style={{ height: '100%', width: '100%' }} aria-label="Marketing activity map">
      <TileLayer key={snapshot.baseKey} {...base} maxZoom={19} />
      <MapCamera viewport={snapshot.viewport} points={points} selected={selected} loading={loading} onMap={onMap} onSettled={rememberViewport} onMoving={onMoving} />
      <MarkerLayers stages={stages} points={visiblePoints} selected={snapshot.panel === 'location' ? selected : null} layers={layers} loading={loading} onLocation={selectLocation} onCluster={selectCluster} onError={onMapError} />
      <MapBoundary selected={selected} visible={layers.boundaries && snapshot.panel === 'location'} />
    </MapContainer>

    <header className="map-header map-surface">
      <MapButton icon="arrow_back" label="Back to Marketing Analytics" onClick={() => navigate('/ceo/marketing-analytics')} />
      <div className="map-header-content"><h1>Marketing Map</h1><ProjectPicker options={projectOptions} placeholder={projectName} value={filters.projectId} onChange={changeProject} loading={loading} /></div>
    </header>
    <div className="map-toolbar-area">
      <nav className="map-toolbar map-surface" aria-label="Map controls">
        <MapButton icon="arrow_back" label="Back" disabled={!navigation.canBack} onClick={navigation.back} />
        <MapButton icon="arrow_forward" label="Forward" disabled={!navigation.canForward} onClick={navigation.forward} />
        <span className="map-toolbar-divider" />
        <MapButton icon="search" label="Search" active={runtime.popover === 'search'} data-popover-trigger aria-expanded={runtime.popover === 'search'} onClick={() => dispatch({ popover: runtime.popover === 'search' ? null : 'search' })} />
        <MapButton icon="tune" label={`Filters${activeFilterCount ? ` (${activeFilterCount})` : ''}`} active={runtime.popover === 'filters' || activeFilterCount > 0} data-popover-trigger aria-expanded={runtime.popover === 'filters'} onClick={() => dispatch({ popover: runtime.popover === 'filters' ? null : 'filters', draftFilters: { ...filters } })} />
        <MapButton icon="fit_screen" label="Fit all locations" disabled={!points.length} onClick={() => commit({ viewport: null, selection: null, panel: null, recordId: null })} />
        <span className="map-toolbar-divider" /><MapButton icon="fullscreen" label="Fullscreen" onClick={async () => {
          try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.current.requestFullscreen(); }
          catch { dispatch({ notice: 'Fullscreen is unavailable in this browser.' }); }
        }} />
        <MapButton icon="layers" label="Map layers" active={runtime.popover === 'layers'} data-popover-trigger aria-expanded={runtime.popover === 'layers'} onClick={() => dispatch({ popover: runtime.popover === 'layers' ? null : 'layers' })} />
      </nav>
      <MapPopover open={runtime.popover === 'search'} title="Search" onClose={closePopover} className="map-search-popover">
        <div className="map-search-field"><MapIcon name="search" /><input autoFocus aria-label="Search location, school, record" placeholder="Search location, school, record..." value={runtime.query} onChange={(event) => dispatch({ query: event.target.value })} /></div>
        <ul className="map-search-results">{locationResults.map((point) => <li key={pointKey(point)}><button type="button" onClick={() => selectLocation(point)}><MapIcon name="location_on" /><span><strong>{point.location}</strong><small>{point.state}</small></span><small>{fmt(point.records)}</small></button></li>)}
          {searchItems.map((row) => <li key={row.id}><button type="button" onClick={() => {
            const point = points.find((item) => item.location === row.city && (!row.state || item.state === row.state));
            if (point && row.mapped) selectLocation(point, row.id);
            else commit({ panel: 'unmapped', recordId: row.id, selection: null, detailPage: 1 });
            closePopover();
          }}><MapIcon name="school" /><span><strong>{row.school}</strong><small>{row.location || 'Without location'}</small></span><MapIcon name="chevron_right" /></button></li>)}
        </ul>
        {runtime.query.trim().length >= 2 && (runtime.search.key !== searchKey || runtime.search.loading) && <p role="status" className="map-muted">Searching records...</p>}
        {runtime.search.key === searchKey && runtime.search.error && <p className="map-error">{runtime.search.error}</p>}
        {runtime.query.trim() && !locationResults.length && runtime.search.key === searchKey && !runtime.search.loading && !searchItems.length && !runtime.search.error && <p className="map-empty">No matching locations or records.</p>}
      </MapPopover>
      <MapPopover open={runtime.popover === 'filters'} title="Filters" onClose={closePopover}>
        {runtime.draftFilters && <><div className="map-filter-fields"><Select label="Project" value={runtime.draftFilters.projectId} options={projectOptions} onChange={(event) => dispatch({ draftFilters: { ...runtime.draftFilters, projectId: event.target.value } })} />
          {[
            ['state', 'State', [...new Set(points.map((point) => point.state).filter(Boolean))]],
            ['city', 'Location', [...new Set(allPoints.map((point) => point.location))]],
            ['channel', 'Channel', platform?.facets?.channels || []], ['campaign', 'Campaign', platform?.facets?.campaigns || []], ['status', 'Campaign status', platform?.facets?.statuses || []],
          ].map(([key, label, values]) => <Select key={key} label={label} value={runtime.draftFilters[key]} options={[{ value: ALL, label: 'All' }, ...values.map((value) => ({ value, label: value }))]} onChange={(event) => dispatch({ draftFilters: { ...runtime.draftFilters, [key]: event.target.value } })} />)}
          <Input label="Department" value={runtime.draftFilters.department === ALL ? '' : runtime.draftFilters.department} onChange={(event) => dispatch({ draftFilters: { ...runtime.draftFilters, department: event.target.value || ALL } })} /><Input label="From" type="date" value={runtime.draftFilters.startDate} max={runtime.draftFilters.endDate} onChange={(event) => dispatch({ draftFilters: { ...runtime.draftFilters, startDate: event.target.value } })} />
          <Input label="To" type="date" value={runtime.draftFilters.endDate} min={runtime.draftFilters.startDate} onChange={(event) => dispatch({ draftFilters: { ...runtime.draftFilters, endDate: event.target.value } })} /></div>
          <fieldset className="map-stage-filters"><legend>Marketing status</legend>{stages.map(stage => {
            const chosen = runtime.draftFilters.marketingStage === ALL ? [] : runtime.draftFilters.marketingStage.split(',');
            return <label key={stage.id}><input type="checkbox" checked={chosen.includes(stage.id)} onChange={event => {
              const next = event.target.checked ? [...chosen, stage.id] : chosen.filter(id => id !== stage.id);
              dispatch({ draftFilters: { ...runtime.draftFilters, marketingStage: stages.filter(item => next.includes(item.id)).map(item => item.id).join(',') || ALL } });
            }} /><span>{stage.label}</span></label>;
          })}</fieldset>
          <div className="map-popover-actions"><button type="button" onClick={() => dispatch({ draftFilters: { ...DEFAULT_FILTERS, projectId: filters.projectId } })}>Reset</button><button type="button" className="map-primary" onClick={() => { commit({ filters: runtime.draftFilters, selection: null, recordId: null, panel: null, viewport: null, detailPage: 1 }); closePopover(); }}>Apply</button></div></>}
      </MapPopover>
      <MapPopover open={runtime.popover === 'layers'} title="Map layers" onClose={closePopover}>
        <fieldset className="map-layer-list"><legend className="sr-only">Visible data</legend>{Object.keys(layers).map((key) => <label key={key}><input type="checkbox" checked={layers[key]} onChange={(event) => commit({ layers: { ...layers, [key]: event.target.checked } })} /><span>{key[0].toUpperCase() + key.slice(1)}</span></label>)}</fieldset>
        <fieldset className="map-base-list"><legend>Base map</legend>{Object.entries(BASE_LAYERS).map(([key, value]) => <label key={key}><input type="radio" name="base-map" checked={snapshot.baseKey === key} onChange={() => commit({ baseKey: key })} />{value.label}</label>)}</fieldset>
      </MapPopover>
    </div>

    {loading && <div className="map-loading map-surface" role="status"><MapIcon name="progress_activity" />Updating {projectName} map...</div>}
    {runtime.journeyError && <div className="map-notice map-surface" role="alert">{runtime.journeyError}<button type="button" onClick={() => dispatch({ reload: runtime.reload + 1 })}>Retry</button></div>}
    {runtime.projectsError && <div className="map-notice map-surface" role="alert">{runtime.projectsError}<button type="button" onClick={() => dispatch({ reload: runtime.reload + 1 })}>Retry</button></div>}
    {runtime.notice && <div className="map-notice map-surface" role="status">{runtime.notice}<MapButton icon="close" label="Dismiss message" onClick={() => dispatch({ notice: null })} /></div>}
    {!loading && (runtime.dataset.error || runtime.mapError) && <div className="map-status map-surface" role="alert"><MapIcon name="error" /><h2>Unable to load locations.</h2><p>{runtime.dataset.error || runtime.mapError}</p><button type="button" className="map-primary" onClick={() => dispatch({ reload: runtime.reload + 1 })}>Retry</button></div>}
    {!loading && !runtime.dataset.error && !points.length && <div className="map-status map-surface"><MapIcon name="location_off" /><h2>No mapped locations found.</h2>{activeFilterCount > 0 && <button type="button" onClick={() => commit({ filters: { ...DEFAULT_FILTERS, projectId: filters.projectId }, viewport: null })}>Clear filters</button>}</div>}

    <section className={`map-summary map-surface ${snapshot.panel === 'location' ? 'has-details' : ''}`} aria-label="Marketing activity">
      <button type="button" className="map-summary-heading" aria-expanded={snapshot.summaryOpen} onClick={() => commit({ summaryOpen: !snapshot.summaryOpen })}><span>Marketing activity</span><MapIcon name={snapshot.summaryOpen ? 'expand_more' : 'expand_less'} /></button>
      <div className={`map-summary-collapse ${snapshot.summaryOpen ? 'is-open' : ''}`}><div className="map-summary-inner"><dl>{[
        ['Locations', points.length], ['Records', total], ['Schools', imported?.schools || 0], ['Mapped', mappedPct],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><AnimatedNumber value={value} suffix={label === 'Mapped' ? '%' : ''} /></dd></div>)}</dl>
        <details className="map-pipeline"><summary>Pipeline (records)</summary><ul>{stages.map(stage => {
          const count = imported?.pipeline?.find(item => item.stage === stage.id)?.records || 0;
          return <li key={stage.id}><button type="button" aria-pressed={filters.marketingStage.split(',').includes(stage.id)} onClick={() => commit({ filters: { ...filters, marketingStage: stage.id }, selection: null, recordId: null, panel: null, detailPage: 1, viewport: null })}><span>{stage.label}</span><strong><AnimatedNumber value={count} /></strong></button></li>;
        })}<li><button type="button" aria-pressed={filters.marketingStage === 'NOT_RECORDED'} onClick={() => commit({ filters: { ...filters, marketingStage: 'NOT_RECORDED' }, selection: null, recordId: null, panel: null, viewport: null })}><span>Not recorded</span><strong><AnimatedNumber value={imported?.pipeline?.find(item => item.stage === 'NOT_RECORDED')?.records || 0} /></strong></button></li></ul></details>
        <ul className="map-legend">{PIN_BANDS.map((band) => <li key={band.label}><span style={{ background: band.fill }} />{band.label}</li>)}</ul>
        {unmapped > 0 && <button type="button" className="map-unmapped-button" onClick={() => commit({ panel: 'unmapped', recordId: null, selection: null, detailPage: 1 })}><MapIcon name="warning" /><span>{fmt(unmapped)} without a location</span><MapIcon name="chevron_right" /></button>}
      </div></div>
    </section>

    <MapPresence open={snapshot.panel === 'location'} className="map-detail-panel" role="region" aria-label="Location details">
      <div className="map-breadcrumbs"><button type="button" onClick={() => commit({ recordId: null })}>{selected?.kind === 'cluster' ? 'Area / Reach' : 'Location'}</button>{record && <span> / School / Record</span>}</div><div className="map-detail-header"><div className="map-content-change" key={selection?.key || selection?.bounds?.flat().join(',')}><span className="map-eyebrow">{record ? 'School' : selected?.kind === 'cluster' ? 'Area' : 'Location'}</span><h2>{record?.school || selected?.location || 'Location unavailable'}</h2><p>{record?.location || selected?.state || (loading ? 'Loading...' : 'No longer present in this dataset')}</p>{selected?.outsideFilters && <span className="map-outside-filter">This record is outside the current filters</span>}</div><MapButton icon="close" label="Close location details" onClick={closePanel} /></div>
      {selected && <>{!record && <dl className="map-location-stats" key={selection?.key || selection?.bounds?.flat().join(',')}>{[['Records', selected.records], ['Schools', selected.schools], ['Campaigns', selected.campaigns]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><AnimatedNumber value={value} /></dd></div>)}</dl>}
        <div className="map-detail-body map-content-change" key={`${selection?.key || 'area'}:${snapshot.detailPage}:${snapshot.clusterPage}`}>
          {selected.kind === 'cluster' ? <><h3 className="map-section-title">Top locations</h3><p className="map-school-address">Aggregated reach across {selected.locations.length} locations</p><ul className="map-area-locations">{selected.locations.slice((snapshot.clusterPage - 1) * 25, snapshot.clusterPage * 25).map((point, index) => <li key={pointKey(point)} className="map-stagger" style={{ '--row-delay': `${Math.min(index, 12) * 60}ms` }}><button type="button" onClick={() => selectLocation(point)}><span>{point.location}</span><small>{fmt(point.records)}</small><MapIcon name="chevron_right" /></button></li>)}</ul><Pagination page={snapshot.clusterPage} totalPages={Math.ceil(selected.locations.length / 25)} onChange={(clusterPage) => commit({ clusterPage })} /></> : <>{!snapshot.recordId && <button type="button" className="map-records-toggle" aria-expanded={snapshot.recordsOpen} onClick={() => commit({ recordsOpen: !snapshot.recordsOpen, recordId: null })}><MapIcon name={snapshot.recordsOpen ? 'expand_less' : 'table_rows'} />{snapshot.recordsOpen ? 'Hide records' : `View ${fmt(selected.records)} records`}</button>}{snapshot.recordsOpen && renderRecords()}</>}
        </div><footer className="map-detail-footer"><span>{projectName}</span><MapButton icon="my_location" label="Focus selected location" onClick={() => selected.kind === 'cluster' ? selectCluster(selected.locations, selected.bounds) : selectLocation(selected)} /></footer></>}
    </MapPresence>

    <MapPresence open={snapshot.panel === 'unmapped'} className="map-unmapped-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Records without location" className="map-unmapped-drawer map-surface"><div className="map-unmapped-heading"><div><h2>Records without location</h2><p><AnimatedNumber value={details?.pagination?.total ?? unmapped} /> records</p></div><MapButton icon="close" label="Close records without location" onClick={closePanel} /></div>
        <div className="map-unmapped-content">{renderRecords()}</div>
      </div>
    </MapPresence>
    <div className="map-zoom map-surface"><MapButton icon="add" label="Zoom in" disabled={snapshot.viewport?.zoom >= 18} onClick={() => { const viewport = navigation.viewportNow(); if (viewport) commit({ viewport: { ...viewport, zoom: Math.min(18, viewport.zoom + 1) } }); }} /><MapButton icon="remove" label="Zoom out" disabled={snapshot.viewport?.zoom <= 4} onClick={() => { const viewport = navigation.viewportNow(); if (viewport) commit({ viewport: { ...viewport, zoom: Math.max(4, viewport.zoom - 1) } }); }} /></div>
  </div>;
};

export default MarketingMapExperience;
