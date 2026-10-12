import { divIcon } from 'leaflet';

export const PIN_BANDS = [
  { at: 0.66, label: 'High', fill: '#334155' },
  { at: 0.33, label: 'Medium', fill: '#64748b' },
  { at: 0, label: 'Low', fill: '#94a3b8' },
];
export const bandFor = (value, max) => PIN_BANDS.find((band) => (max > 0 ? value / max : 0) >= band.at) || PIN_BANDS[2];

export const createPinIcon = ({ band, selected = false, badge = '', stageTone = null }) => divIcon({
  className: 'marketing-pin-wrap', iconSize: [44, 48], iconAnchor: [22, 40], tooltipAnchor: [0, -36],
  html: `<div class="marketing-pin${selected ? ' is-selected' : ''}">
    ${selected ? '<span class="marketing-pin__halo"></span>' : ''}
    <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
      <path d="M14 34C11 29 2 21 2 14a12 12 0 1 1 24 0c0 7-9 15-12 20Z" fill="${selected ? '#15803d' : band.fill}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="4" fill="white"/>
    </svg>${stageTone ? `<span class="marketing-pin__stage" data-tone="${stageTone}"></span>` : ''}${badge ? `<span class="marketing-pin__badge">${badge}</span>` : ''}
  </div>`,
});

export const PIN_STYLES = `
.marketing-map .marketing-pin-wrap { background: none; border: 0; cursor: pointer; }
.marketing-map .marketing-pin { position: absolute; left: 8px; top: 5px; width: 28px; height: 36px; transform-origin: 50% 100%; transition: transform 200ms ease, opacity 250ms ease; filter: drop-shadow(0 2px 2px #0003); }
.marketing-map .marketing-pin:hover { transform: scale(1.1); }
.marketing-map .marketing-pin:active { transform: scale(.94); }
.marketing-map .marketing-pin.is-selected { transform: scale(1.15); }
.marketing-map .marketing-pin-wrap:has(.is-selected) { z-index: 1100 !important; }
.marketing-map .marketing-pin-wrap:focus-visible { outline: 2px solid #15803d; outline-offset: 2px; border-radius: 6px; }
.marketing-map .marketing-pin__halo { position: absolute; width: 36px; height: 36px; border: 2px solid #15803d; border-radius: 50%; left: -4px; top: -4px; opacity: .5; animation: marketing-pin-pulse 650ms ease 3; }
.marketing-map .marketing-pin__badge { position: absolute; right: -10px; top: -5px; font-size: 10px; line-height: 16px; min-width: 16px; text-align: center; padding: 0 3px; border-radius: 4px; background: #171717; color: #fff; border: 1px solid white; }
.marketing-map .marketing-pin-tip { max-width: 210px; border: 1px solid #d4d4d4; border-radius: 6px; background: #fff; color: #171717; padding: 6px 9px; font-size: 11px; line-height: 1.4; box-shadow: 0 3px 10px #0002; animation: marketing-tooltip 180ms ease; }
.marketing-map .marketing-pin-tip::before { border-top-color: #d4d4d4; }
.marketing-map .marketing-pin-tip strong { display: block; font-weight: 700; }
.marketing-map .marketing-cluster-wrap { background: none; border: 0; }
.marketing-map .marketing-cluster { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: #262626; color: white; border: 2px solid white; box-shadow: 0 3px 10px #0004; font-size: 13px; font-weight: 700; letter-spacing: 0; font-variant-numeric: tabular-nums; cursor: pointer; transition: transform 200ms ease; animation: marketing-cluster-in 250ms ease; }
.marketing-map .marketing-cluster:hover { transform: scale(1.08); }
.marketing-map .marketing-cluster:active { transform: scale(.94); }
.marketing-map .marketing-cluster.is-expanding { animation: marketing-cluster-expand 850ms ease both; }
.marketing-map .marketing-pin.is-revealing { animation: marketing-pin-drop 420ms cubic-bezier(.2,.7,.3,1) backwards; animation-delay: var(--pin-delay, 0ms); }
.marketing-map .marketing-has-selection .marketing-pin:not(.is-selected) { opacity: .55; }
.marketing-map .marketing-data-loading .leaflet-marker-pane { opacity: .65; }
.marketing-map .leaflet-marker-pane { transition: opacity 250ms ease; }
.marketing-map .leaflet-control-attribution { font-size: 10px; color: #525252; background: #fffffff0; padding: 1px 5px; }
@keyframes marketing-pin-drop { 0% { opacity: 0; transform: translateY(-16px) scale(.7); } 75% { opacity: 1; transform: scale(1.05); } 100% { transform: none; } }
@keyframes marketing-pin-pulse { 50% { transform: scale(1.15); opacity: .2; } }
@keyframes marketing-cluster-in { from { opacity: 0; scale: .8; } to { opacity: 1; scale: 1; } }
@keyframes marketing-cluster-expand { 25% { transform: scale(1.15); opacity: .8; } 100% { transform: scale(.7); opacity: 0; } }
@keyframes marketing-tooltip { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .marketing-map *, .marketing-map *::before, .marketing-map *::after { animation-duration: 1ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; } }
`;
