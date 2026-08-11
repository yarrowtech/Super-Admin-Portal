import React, { useRef } from 'react';

/**
 * Shared tab bar. `items`: [{ key, label, icon?, badge? }].
 * Keyboard: Left/Right arrows move focus + selection between tabs (roving tabindex).
 */
const Tabs = ({ items, activeKey, onChange, className = '' }) => {
  const refs = useRef({});

  const handleKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const nextIndex = e.key === 'ArrowRight'
      ? (index + 1) % items.length
      : (index - 1 + items.length) % items.length;
    const nextItem = items[nextIndex];
    onChange(nextItem.key);
    refs.current[nextItem.key]?.focus();
  };

  return (
    <div role="tablist" className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item, index) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            ref={(el) => { refs.current[item.key] = el; }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              active
                ? 'bg-primary text-white'
                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {item.icon && <span className="material-symbols-outlined text-sm">{item.icon}</span>}
            {item.label}
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'}`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
