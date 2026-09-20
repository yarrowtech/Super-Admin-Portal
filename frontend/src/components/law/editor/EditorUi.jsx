import React, { useCallback, useEffect, useRef, useState } from 'react';

// ── Shared look ───────────────────────────────────────────────────────────────
export const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]';
export const selectClass = `h-9 rounded-lg border border-neutral-300 bg-white px-2 text-xs text-neutral-700 outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 ${focusRing}`;
// Ribbon selects: 36px on touch, 28px with a mouse so two rows fit a compact ribbon.
export const ribbonSelectClass = `h-9 pointer-fine:h-7 rounded-md border border-neutral-300 bg-white px-1.5 text-xs text-neutral-700 outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 ${focusRing}`;
export const inputClass = `h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[var(--portal-accent)] dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 ${focusRing}`;
export const primaryBtnClass = `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const ghostBtnClass = `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700 ${focusRing}`;

export const Icon = ({ name, size = 18 }) => (
  <span className="material-symbols-outlined leading-none" style={{ fontSize: size }} aria-hidden="true">{name}</span>
);

/** Small square icon button (36px target). Keeps the text selection in the editor. */
export const Btn = ({ icon, title, active, disabled, onClick, children, className = '' }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active === undefined ? undefined : Boolean(active)}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex h-9 min-w-9 pointer-fine:h-7 pointer-fine:min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-md px-0.5 text-sm transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-700 ${focusRing} ${
      active ? 'bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]' : 'text-neutral-700 dark:text-neutral-200'
    } ${className}`}
  >
    {icon && <Icon name={icon} />}
    {children}
  </button>
);

/** Icon over a visible label, for the less obvious actions on the Insert / Layout tabs. */
export const LargeBtn = ({ icon, label, title, active, disabled, onClick, caret, ...aria }) => (
  <button
    type="button"
    title={title || label}
    aria-label={title || label}
    aria-pressed={active === undefined ? undefined : Boolean(active)}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex min-h-[52px] min-w-[54px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-semibold leading-tight transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-700 ${focusRing} ${
      active ? 'bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]' : 'text-neutral-700 dark:text-neutral-200'
    }`}
    {...aria}
  >
    <Icon name={icon} size={20} />
    <span className="flex items-center gap-0.5 text-center">
      {label}
      {caret && <Icon name="arrow_drop_down" size={14} />}
    </span>
  </button>
);

/** A ribbon group. `stack` lays its children (use <RibbonRow>) out as two compact rows. */
export const RibbonGroup = ({ label, children, grow, stack }) => (
  <div role="group" aria-label={label} className={`flex shrink-0 flex-col justify-between border-r border-neutral-200 px-1.5 last:border-r-0 dark:border-neutral-700 ${grow ? 'flex-1' : ''}`}>
    <div className={stack ? 'flex min-h-[56px] flex-col justify-center gap-0.5' : 'flex min-h-[56px] flex-nowrap items-center gap-0.5'}>{children}</div>
    <span aria-hidden="true" className="select-none whitespace-nowrap text-center text-[9px] font-semibold uppercase leading-3 tracking-wider text-neutral-400 dark:text-neutral-500">{label}</span>
  </div>
);

export const RibbonRow = ({ children }) => <div className="flex flex-nowrap items-center gap-0.5">{children}</div>;

export const MenuHeading = ({ children }) => (
  <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{children}</p>
);

export const MenuItem = ({ icon, label, hint, active, onClick, disabled, shortcut }) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-neutral-800 ${focusRing} ${active ? 'text-[var(--portal-accent)]' : 'text-neutral-800 dark:text-neutral-100'}`}
  >
    {icon ? <Icon name={icon} /> : <span className="w-[18px]" />}
    <span className="min-w-0 flex-1">
      {label}
      {hint && <span className="block text-[10px] font-normal text-neutral-500 dark:text-neutral-400">{hint}</span>}
    </span>
    {shortcut && <span className="text-[10px] font-normal text-neutral-400">{shortcut}</span>}
  </button>
);

/**
 * Drop-down panel that is positioned with `fixed`, so it is never clipped by the ribbon
 * or the editor frame. `renderTrigger({ open, toggle })` draws the button.
 */
export const Popover = ({ renderTrigger, children, width = 240 }) => {
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const close = useCallback(() => setPos(null), []);

  const toggle = (event) => {
    if (pos) { setPos(null); return; }
    const rect = event?.currentTarget?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPos({ top: rect.bottom + 4, left, maxHeight: Math.max(160, window.innerHeight - rect.bottom - 16) });
  };

  const isOpen = Boolean(pos);
  useEffect(() => {
    if (!isOpen) return undefined;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setPos(null);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setPos(null);
    };
    const onScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      setPos(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, close]);

  return (
    <div ref={wrapRef} className="relative inline-flex">
      {renderTrigger({ open: isOpen, toggle })}
      {pos && (
        <div
          ref={panelRef}
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width, maxHeight: pos.maxHeight }}
          className="z-[80] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
};

export const Dialog = ({ title, onClose, children, footer, width = 'w-[26rem]' }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div
      className="no-print fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90vh] max-w-full overflow-y-auto rounded-xl bg-white p-4 shadow-xl dark:bg-neutral-800 ${width}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <button type="button" onClick={onClose} title="Close" aria-label="Close" className={`flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${focusRing}`}>
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

// ── Colour picker ─────────────────────────────────────────────────────────────
export const ColorMenu = ({ colors, onPick, noneLabel, onNone, customLabel = 'More colours…' }) => (
  <div>
    <div className="grid grid-cols-6 gap-1 p-1">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          aria-label={`Colour ${c}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(c)}
          className={`h-8 w-8 rounded-md border border-neutral-300 hover:scale-105 dark:border-neutral-600 ${focusRing}`}
          style={{ background: c }}
        />
      ))}
    </div>
    <MenuItem icon="format_color_reset" label={noneLabel} onClick={onNone} />
    <label className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 focus-within:ring-2 focus-within:ring-[var(--portal-accent)] dark:text-neutral-100 dark:hover:bg-neutral-800`}>
      <Icon name="palette" />
      {customLabel}
      <input type="color" aria-label={customLabel} className="sr-only" onChange={(e) => onPick(e.target.value)} />
    </label>
  </div>
);
