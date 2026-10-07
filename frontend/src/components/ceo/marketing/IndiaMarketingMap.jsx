import React, { useEffect, useMemo, useRef } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// The hero visualisation: where marketing is happening across India.
//
// Three decisions worth stating. (1) Markers are CircleMarkers sized by volume rather than
// image pins, so no icon assets are needed and radius can carry meaning. (2) Clustering is
// done by rounding coordinates to a zoom-dependent grid instead of pulling in
// leaflet.markercluster's DOM-heavy layer — the backend already aggregates to one point per
// city, so the remaining job is small and this keeps the React tree declarative. (3) The
// backend sends aggregates only, so nothing here can leak a contact's details.

// Continental India, used to frame the initial view.
const INDIA_CENTER = [22.5937, 78.9629];
const INDIA_BOUNDS = [[6.5, 68.0], [35.7, 97.5]];

// Marker colour by share of the busiest location, so the map reads as a heat scale even
// before the radius is compared. Chosen to stay legible in both themes.
const HEAT = [
  { at: 0.66, fill: '#dc2626', stroke: '#991b1b', label: 'High' },
  { at: 0.33, fill: '#f59e0b', stroke: '#b45309', label: 'Medium' },
  { at: 0, fill: '#2563eb', stroke: '#1d4ed8', label: 'Low' },
];
const heatFor = (value, max) => {
  const ratio = max > 0 ? value / max : 0;
  return HEAT.find((band) => ratio >= band.at) || HEAT[HEAT.length - 1];
};

// Radius from volume. Square root rather than linear: a city with 100x the leads should
// read as clearly bigger, not swallow the map.
const radiusFor = (value, max) => {
  if (!max) return 6;
  return 6 + Math.sqrt(value / max) * 22;
};

const fmt = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0);

// Frames the view on the data actually returned, so a project active only in Maharashtra
// zooms to Maharashtra while a national campaign shows the whole country (§14). Re-fits
// whenever the point set changes identity — a new project or new filters — but not on every
// render, so the user's own panning is left alone in between.
const FitToData = ({ points }) => {
  const map = useMap();
  const signature = points.map((p) => `${p.latitude},${p.longitude}`).sort().join('|');
  const lastSignature = useRef(null);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    if (points.length === 1) {
      // A single location has no meaningful bounds; centre it at city level instead.
      map.setView([points[0].latitude, points[0].longitude], 8);
    } else if (points.length > 1) {
      map.fitBounds(points.map((p) => [p.latitude, p.longitude]), { padding: [48, 48], maxZoom: 8 });
    } else {
      map.fitBounds(INDIA_BOUNDS);
    }
  }, [map, signature, points]);
  return null;
};

// Grid-based clustering: at low zoom nearby cities merge into one bubble carrying their
// combined total, which is what stops a thousand markers rendering at once (§8C).
const clusterPoints = (points, zoom) => {
  if (zoom >= 7) return points.map((p) => ({ ...p, cluster: 1 }));
  const precision = zoom >= 6 ? 1 : zoom >= 5 ? 0.5 : 0.25;
  const cells = new Map();
  for (const point of points) {
    const key = `${Math.round(point.latitude * precision)}|${Math.round(point.longitude * precision)}`;
    const cell = cells.get(key);
    if (!cell) {
      cells.set(key, { ...point, cluster: 1, members: [point.location] });
    } else {
      // Weighted centroid, so a merged bubble sits where the activity actually is.
      const total = cell.leads + point.leads;
      cell.latitude = (cell.latitude * cell.leads + point.latitude * point.leads) / total;
      cell.longitude = (cell.longitude * cell.leads + point.longitude * point.leads) / total;
      cell.leads = total;
      cell.engagement += point.engagement;
      cell.conversions += point.conversions;
      cell.cluster += 1;
      cell.members.push(point.location);
      // The bubble is labelled by its largest member.
      if (point.leads > (cell.topLeads || 0)) { cell.location = point.location; cell.topLeads = point.leads; }
    }
  }
  return [...cells.values()];
};

// Heatmap mode (§13). Built from layered translucent circles with a real radius in metres
// rather than pulling in leaflet.heat: the backend already aggregates to one point per
// city, so a true per-pixel heat kernel would add a dependency for a few dozen points. The
// layering — a wide faint halo under a tighter brighter core — reads as concentration and,
// unlike a canvas heat layer, scales correctly as the user zooms.
const HeatLayer = ({ points, max }) => (
  <>
    {points.map((point) => {
      const intensity = max > 0 ? (point.activities || point.leads) / max : 0;
      // Radius in metres, so the blur grows with real distance, not screen pixels.
      const base = 60000 + Math.sqrt(intensity) * 220000;
      return [
        { r: base * 1.6, o: 0.10 },
        { r: base, o: 0.18 },
        { r: base * 0.55, o: 0.28 },
      ].map((ring, i) => (
        <Circle
          key={`${point.location}-${i}`}
          center={[point.latitude, point.longitude]}
          radius={ring.r}
          pathOptions={{
            stroke: false,
            fillColor: intensity > 0.66 ? '#dc2626' : intensity > 0.33 ? '#f59e0b' : '#2563eb',
            fillOpacity: ring.o,
          }}
        />
      ));
    })}
  </>
);

const ZoomWatcher = ({ onZoom }) => {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map, onZoom]);
  return null;
};

const IndiaMarketingMap = ({ points = [], unplaced = 0, onSelectLocation, selectedState = '', selectedLocation = '', height = 520 }) => {
  const [zoom, setZoom] = React.useState(5);
  // 'points' | 'heatmap' (§13). Points answer "which cities", heatmap answers "where is it
  // concentrated" — both are useful, so the user chooses.
  const [mode, setMode] = React.useState('points');

  // A state filter dims rather than removes other markers, so the user keeps the national
  // context while focusing one state.
  const visible = useMemo(() => points.filter((p) => p.latitude !== null && p.longitude !== null), [points]);
  const weightOf = (p) => p.activities || p.leads;
  const max = useMemo(() => visible.reduce((n, p) => Math.max(n, weightOf(p)), 0), [visible]);
  const clustered = useMemo(() => clusterPoints(visible, zoom), [visible, zoom]);

  // Leaflet needs a measured container; without an explicit height it collapses to 0.
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <MapContainer
        center={INDIA_CENTER}
        zoom={5}
        minZoom={4}
        maxZoom={11}
        scrollWheelZoom={false}
        style={{ height, width: '100%', background: '#eef2f7' }}
        aria-label="Marketing activity across India"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitToData points={visible} />
        <ZoomWatcher onZoom={setZoom} />

        {mode === 'heatmap' && <HeatLayer points={visible} max={max} />}

        {mode === 'points' && clustered.map((point) => {
          const heat = heatFor(weightOf(point), max);
          const dimmed = selectedState && point.state && point.state !== selectedState;
          const isSelected = selectedLocation && point.location === selectedLocation;
          return (
            <CircleMarker
              key={`${point.location}-${point.latitude}-${point.longitude}`}
              center={[point.latitude, point.longitude]}
              radius={radiusFor(weightOf(point), max)}
              pathOptions={{
                color: isSelected ? '#111827' : heat.stroke,
                fillColor: heat.fill,
                fillOpacity: dimmed ? 0.18 : isSelected ? 0.8 : 0.62,
                opacity: dimmed ? 0.3 : 1,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelectLocation?.(point) }}
            >
              {/* Hover card — §9 */}
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="min-w-37.5 text-xs">
                  <p className="mb-1 text-sm font-bold">
                    {point.location}
                    {point.cluster > 1 && <span className="font-normal"> +{point.cluster - 1} more</span>}
                  </p>
                  {point.state && <p className="mb-1 text-neutral-500">{point.state}</p>}
                  <dl className="space-y-0.5">
                    <div className="flex justify-between gap-4"><dt>Activities</dt><dd className="font-semibold">{fmt(point.activities || point.leads)}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Leads</dt><dd className="font-semibold">{fmt(point.leads)}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Engaged</dt><dd className="font-semibold">{fmt(point.engagement)}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Conversions</dt><dd className="font-semibold">{fmt(point.conversions)}</dd></div>
                  </dl>
                  <p className="mt-1 text-[10px] text-neutral-500">Click for the breakdown</p>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map view control (§13) */}
      <div className="absolute left-3 top-3 z-500 flex overflow-hidden rounded-lg border border-neutral-200 bg-white/95 text-[11px] font-semibold shadow-md dark:border-neutral-700 dark:bg-neutral-900/95">
        {[
          { id: 'points', label: 'Points', icon: 'scatter_plot' },
          { id: 'heatmap', label: 'Heatmap', icon: 'local_fire_department' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            aria-pressed={mode === option.id}
            className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
              mode === option.id
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {/* Legend. Carries a text label per band, so the scale does not depend on colour
          perception alone. */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-500 rounded-xl bg-white/95 px-3 py-2 text-[11px] shadow-md dark:bg-neutral-900/95">
        <p className="mb-1 font-bold text-neutral-700 dark:text-neutral-200">Marketing activity</p>
        {/* §12: the legend describes whichever visualisation is actually showing. */}
        {mode === 'heatmap' ? (
          <>
            <div
              className="h-2 w-28 rounded-full"
              style={{ background: 'linear-gradient(90deg, #2563eb 0%, #f59e0b 55%, #dc2626 100%)' }}
              aria-hidden="true"
            />
            <div className="mt-1 flex w-28 justify-between text-neutral-500">
              <span>Low</span><span>High</span>
            </div>
            <p className="mt-1 text-neutral-500">Glow = concentration</p>
          </>
        ) : (
          <>
            <ul className="space-y-1">
              {HEAT.map((band) => (
                <li key={band.label} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: band.fill }} aria-hidden="true" />
                  {band.label}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-neutral-500">Bubble size = activity volume</p>
          </>
        )}
      </div>

      {mode === 'points' && zoom < 7 && visible.length > clustered.length && (
        <div className="pointer-events-none absolute right-3 top-3 z-500 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 shadow-md dark:bg-neutral-900/95 dark:text-neutral-300">
          {clustered.length} of {visible.length} locations — zoom in to separate
        </div>
      )}

      {/* Honesty about what the map cannot show: records with no resolvable location are
          still in the totals and the table, but cannot be plotted. */}
      {unplaced > 0 && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-500 rounded-lg bg-amber-50/95 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-md dark:bg-amber-900/80 dark:text-amber-100">
          {fmt(unplaced)} record{unplaced === 1 ? '' : 's'} without a mappable location
        </div>
      )}
    </div>
  );
};

export default IndiaMarketingMap;
