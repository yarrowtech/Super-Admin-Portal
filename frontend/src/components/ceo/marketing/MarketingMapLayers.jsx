import { useEffect, useLayoutEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { bandFor, createPinIcon } from './LocationPin';
import { focusViewport, mapMotion, pointKey } from './useMarketingMapState';

const INDIA_BOUNDS = [[6.5, 68], [35.7, 97.5]];
export const MapCamera = ({ viewport, points, selected, loading, onMap, onSettled, onMoving }) => {
  const map = useMap();
  const callbacks = useRef({ onSettled, onMoving });
  const suppress = useRef(false);
  const requestedViewport = useRef(viewport);
  useLayoutEffect(() => { callbacks.current = { onSettled, onMoving }; }, [onSettled, onMoving]);
  useLayoutEffect(() => { requestedViewport.current = viewport; }, [viewport]);
  useEffect(() => {
    onMap(map);
    const start = () => { if (!suppress.current) callbacks.current.onMoving(true); };
    const end = () => {
      if (suppress.current) return;
      const target = requestedViewport.current;
      if (target && (!map.getCenter().equals([target.latitude, target.longitude], .00001) || Math.abs(map.getZoom() - target.zoom) > .01)) return;
      requestedViewport.current = null;
      callbacks.current.onMoving(false);
      callbacks.current.onSettled();
    };
    const userMove = () => { requestedViewport.current = null; };
    const resize = () => requestAnimationFrame(() => map.invalidateSize());
    map.on('movestart', start).on('moveend', end);
    map.getContainer().addEventListener('wheel', userMove, { passive: true });
    map.on('dragstart', userMove);
    document.addEventListener('fullscreenchange', resize);
    return () => { map.off('movestart', start).off('moveend', end).off('dragstart', userMove); map.getContainer().removeEventListener('wheel', userMove); document.removeEventListener('fullscreenchange', resize); };
  }, [map, onMap]);
  const signature = viewport ? `${viewport.latitude},${viewport.longitude},${viewport.zoom}` : points.map((point) => pointKey(point)).join('|');
  useEffect(() => {
    if (loading) return;
    suppress.current = true;
    map.stop();
    suppress.current = false;
    if (viewport) {
      if (!map.getCenter().equals([viewport.latitude, viewport.longitude], .000001) || map.getZoom() !== viewport.zoom) map.flyTo([viewport.latitude, viewport.longitude], viewport.zoom, mapMotion());
      else callbacks.current.onMoving(false);
    } else if (selected?.kind !== 'cluster' && selected) {
      const target = focusViewport(map, selected);
      map.flyTo([target.latitude, target.longitude], target.zoom, mapMotion());
    } else {
      const bounds = selected?.bounds || (points.length ? points.map((point) => [point.latitude, point.longitude]) : INDIA_BOUNDS);
      map.flyToBounds(bounds, { padding: [70, 70], maxZoom: selected?.bounds ? 12 : 9, ...mapMotion() });
    }
    // Camera requests are serialized by the route snapshot; unrelated UI updates cannot move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature, loading, selected?.location]);
  return null;
};

export const MapBoundary = ({ selected, visible }) => {
  const map = useMap();
  useEffect(() => {
    if (!selected || !visible) return undefined;
    const options = { color: '#15803d', weight: 1.5, fillOpacity: .035, interactive: false };
    const area = selected.bounds ? L.rectangle(selected.bounds, options) : L.circle([selected.latitude, selected.longitude], { ...options, radius: 350 });
    area.addTo(map);
    return () => map.removeLayer(area);
  }, [map, selected, visible]);
  return null;
};

const badgeFor = (point, layers) => layers.campaigns && point.campaigns ? point.campaigns : layers.schools && point.schools ? point.schools : layers.records ? point.records : '';

const MarkerLayers = ({ points, selected, layers, loading, onLocation, onCluster, onError }) => {
  const map = useMap();
  const groupRef = useRef(null);
  const markers = useRef(new Map());
  const previousSelection = useRef(null);
  const callbacks = useRef({ onLocation, onCluster, onError, selected, layers });
  const budget = useRef(0);
  useLayoutEffect(() => { callbacks.current = { onLocation, onCluster, onError, selected, layers }; }, [onLocation, onCluster, onError, selected, layers]);
  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle('marketing-has-selection', Boolean(selected && selected.kind !== 'cluster'));
    container.classList.toggle('marketing-data-loading', loading);
  }, [map, loading, selected]);

  useEffect(() => {
    let cancelled = false;
    const markerEntries = markers.current;
    const max = points.reduce((value, point) => Math.max(value, point.records), 0);
    const decorate = (marker) => {
      const element = marker.getElement();
      const pin = element?.querySelector('.marketing-pin');
      if (!element || !pin) return;
      element.setAttribute('aria-label', `Select ${marker.marketingPoint.location}`);
      element.dataset.location = pointKey(marker.marketingPoint);
      if (budget.current < 48 && map.getBounds().contains(marker.getLatLng())) {
        pin.classList.add('is-revealing');
        pin.style.setProperty('--pin-delay', `${budget.current++ % 10 * 45}ms`);
        pin.addEventListener('animationend', () => pin.classList.remove('is-revealing'), { once: true });
      }
    };
    const resetBudget = () => { budget.current = 0; };
    map.on('movestart', resetBudget);
    (async () => {
      try {
        await import('leaflet.markercluster');
        if (cancelled) return;
        const group = L.markerClusterGroup({
          // Plugin split animations conflict with flyTo; CSS reveals only visible pins.
          animate: false, disableClusteringAtZoom: 11, maxClusterRadius: 48,
          zoomToBoundsOnClick: false, spiderfyOnMaxZoom: true, showCoverageOnHover: false,
          iconCreateFunction: (cluster) => L.divIcon({ className: 'marketing-cluster-wrap', iconSize: [44, 44], html: `<div class="marketing-cluster">${cluster.getChildCount()}</div>` }),
        });
        groupRef.current = group;
        group.on('clusterclick', ({ layer }) => {
          layer.getElement()?.querySelector('.marketing-cluster')?.classList.add('is-expanding');
          const bounds = layer.getBounds();
          callbacks.current.onCluster(layer.getAllChildMarkers().map((marker) => marker.marketingPoint), [[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]]);
        });
        map.addLayer(group);
        group.addLayers(points.map((point) => {
          const isSelected = callbacks.current.selected?.kind !== 'cluster' && callbacks.current.selected && pointKey(callbacks.current.selected) === pointKey(point);
          const marker = L.marker([point.latitude, point.longitude], { icon: createPinIcon({ band: bandFor(point.records, max), selected: isSelected, badge: badgeFor(point, callbacks.current.layers) }), title: point.location, keyboard: true });
          marker.marketingPoint = point;
          const tip = document.createElement('div');
          const title = document.createElement('strong');
          title.textContent = point.location;
          tip.append(title, document.createTextNode(point.state || ''));
          marker.bindTooltip(tip, { direction: 'top', className: 'marketing-pin-tip', opacity: 1, permanent: Boolean(isSelected) });
          marker.on('click', () => callbacks.current.onLocation(point));
          marker.on('add', () => {
            decorate(marker);
            const currentSelection = callbacks.current.selected;
            if (currentSelection && currentSelection.kind !== 'cluster' && pointKey(currentSelection) === pointKey(point)) marker.openTooltip();
          });
          markers.current.set(pointKey(point), { marker, point, max });
          return marker;
        }));
      } catch (error) { if (!cancelled) callbacks.current.onError(error.message || 'Unable to render map locations.'); }
    })();
    return () => {
      cancelled = true;
      map.off('movestart', resetBudget);
      if (groupRef.current) { map.removeLayer(groupRef.current); groupRef.current = null; }
      markerEntries.clear();
    };
  }, [map, points]);

  useEffect(() => {
    const key = selected && selected.kind !== 'cluster' ? pointKey(selected) : null;
    for (const locationKey of new Set([previousSelection.current, key])) {
      const entry = markers.current.get(locationKey);
      if (!entry) continue;
      const { marker, point, max } = entry;
      marker.setIcon(createPinIcon({ band: bandFor(point.records, max), selected: locationKey === key, badge: badgeFor(point, layers) }));
      marker.getElement()?.setAttribute('aria-label', `Select ${point.location}`);
      if (marker.getElement()) marker.getElement().dataset.location = pointKey(point);
      marker.getTooltip().options.permanent = locationKey === key;
      if (locationKey === key) marker.openTooltip(); else marker.closeTooltip();
    }
    previousSelection.current = key;
  }, [selected, layers]);

  useEffect(() => {
    for (const { marker, point, max } of markers.current.values()) {
      const isSelected = callbacks.current.selected?.kind !== 'cluster' && callbacks.current.selected && pointKey(callbacks.current.selected) === pointKey(point);
      marker.setIcon(createPinIcon({ band: bandFor(point.records, max), selected: isSelected, badge: badgeFor(point, layers) }));
      marker.getElement()?.setAttribute('aria-label', `Select ${point.location}`);
      if (marker.getElement()) marker.getElement().dataset.location = pointKey(point);
    }
  }, [layers]);
  return null;
};

export default MarkerLayers;
