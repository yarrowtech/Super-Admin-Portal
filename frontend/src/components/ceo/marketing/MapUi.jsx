import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useMarketingMapState';

export const MapIcon = ({ name }) => <span aria-hidden="true" className="material-symbols-outlined">{name}</span>;

export const MapButton = ({ icon, label, active, className = '', ...props }) => <button type="button" className={`map-icon-button ${active ? 'is-active' : ''} ${className}`} title={label} aria-label={label} {...props}><MapIcon name={icon} /></button>;

export const AnimatedNumber = ({ value, suffix = '' }) => {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const from = current.current;
    const to = Number(value) || 0;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = prefersReducedMotion() ? 1 : Math.min((now - start) / 500, 1);
      current.current = from + (to - from) * (1 - (1 - progress) ** 3);
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{suffix === '%' ? display.toFixed(1) : new Intl.NumberFormat('en-IN').format(Math.round(display))}{suffix}</>;
};

export const MapPresence = ({ open, children, className = '', ...props }) => {
  const [shown, setShown] = useState(open);
  const [content, setContent] = useState(children);
  if (open && content !== children) setContent(children);
  useEffect(() => {
    const timer = setTimeout(() => setShown(open), open || prefersReducedMotion() ? 0 : 350);
    return () => clearTimeout(timer);
  }, [open]);
  if (!open && !shown) return null;
  return <div className={`${className} ${open ? '' : 'is-closing'}`} {...props}>{open ? children : content}</div>;
};

export const MapPopover = ({ open, title, onClose, children, className = '' }) => {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const handle = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.type === 'pointerdown' && !ref.current?.contains(event.target) && !event.target.closest('[data-popover-trigger]')) closeRef.current();
    };
    document.addEventListener('pointerdown', handle);
    document.addEventListener('keydown', handle);
    return () => { document.removeEventListener('pointerdown', handle); document.removeEventListener('keydown', handle); };
  }, [open]);
  return <div ref={ref}><MapPresence open={open} className={`map-popover map-surface ${className}`} role="dialog" aria-label={title}>
    <div className="map-popover-heading"><h2>{title}</h2><MapButton icon="close" label={`Close ${title.toLowerCase()}`} onClick={onClose} /></div>
    {children}
  </MapPresence></div>;
};

export const ProjectPicker = ({ options, value, onChange, loading }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const trigger = useRef(null);
  const matches = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));
  const close = () => { setOpen(false); setQuery(''); setActive(0); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const choose = (option) => { onChange(option.value); close(); };
  return <div ref={root} className="map-project-picker">
    <button ref={trigger} type="button" aria-label="Select project" aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen((old) => !old); setQuery(''); }} className="map-project-trigger">
      <span>{options.find((option) => option.value === value)?.label || 'All Projects'}</span><MapIcon name={loading ? 'progress_activity' : 'expand_more'} />
    </button>
    <MapPresence open={open} className="map-project-menu map-surface">
      <input autoFocus aria-label="Search projects" value={query} placeholder="Search projects" onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={(event) => {
        if (event.key === 'Escape') close();
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(index + 1, matches.length - 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
        if (event.key === 'Enter' && matches[active]) { event.preventDefault(); choose(matches[active]); }
      }} role="combobox" aria-expanded="true" aria-controls="map-project-list" aria-activedescendant={matches[active] ? `map-project-${active}` : undefined} />
      <div id="map-project-list" role="listbox" aria-label="Projects" className="map-project-options">
        {matches.map((option, index) => <button id={`map-project-${index}`} type="button" key={option.value} role="option" aria-selected={option.value === value} className={`${index === active ? 'is-focused' : ''} ${value === option.value ? 'is-selected' : ''}`} onClick={() => choose(option)}><span>{option.label}</span>{value === option.value && <MapIcon name="check" />}</button>)}
        {!matches.length && <p className="map-muted">No projects found.</p>}
      </div>
    </MapPresence>
  </div>;
};

export const RecordDetails = ({ record, onClose }) => <section className="map-record-detail">
  <div className="map-record-heading"><h3>{record.school || 'Record'}</h3><MapButton icon="arrow_back" label="Back to records" onClick={onClose} /></div>
  <dl>{[
    ['Location', record.location], ['Project', record.projectName], ['Department', record.department || 'Not supplied'],
    ['Status', record.status || (record.mapped ? 'Mapped' : 'Unmapped')],
    ['Email', record.email], ['Pincode', record.pincode], ['Source', record.sourceFile],
    !record.mapped && ['Reason', record.missingLocationReason],
  ].filter((item) => item && item[1]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
</section>;
