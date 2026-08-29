import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { portfolioHierarchyApi } from '../../../services/portfolioHierarchy';
import { QK } from '../../../utils/queryKeys';
import { useDebounce } from '../../../hooks/useDebounce';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const Avatar = ({ user, size = 20 }) =>
  user?.profileImage ? (
    <img src={user.profileImage} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-600 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials(user?.name)}
    </span>
  );

const PANEL_HEIGHT_ESTIMATE = 260; // search bar + up to ~5 rows before its own internal scroll

// Searchable owner/reviewer/assignee combobox backed by GET /assignees. Renders
// avatar + name + role so it doubles as the display for an already-set value —
// callers don't need a separate read-only avatar component (spec §19).
//
// The dropdown panel is portaled to <body> and positioned from the trigger's
// live bounding rect (flipping above when there isn't room below) instead of
// `position: absolute` inside the trigger — this component is used inside
// scrollable Modals/Drawers, and an absolutely-positioned descendant gets
// clipped by its scroll-container ancestor's `overflow`, not just floated
// above the page like it visually should be.
const UserPicker = ({ value, user: valueUser, onChange, label, placeholder = 'Unassigned', allowClear = true, disabled = false }) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [placement, setPlacement] = useState(null); // { top, left, width, openUp }

  const { data } = useQuery({
    queryKey: QK.portfolioHierarchy.assignees(debouncedQuery),
    queryFn: () => portfolioHierarchyApi.getAssignees(token, debouncedQuery),
    enabled: Boolean(token) && open,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  const options = data?.data || [];

  const updatePlacement = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < PANEL_HEIGHT_ESTIMATE && rect.top > spaceBelow;
    setPlacement({
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePlacement();
    const onReposition = () => updatePlacement();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const select = (u) => { onChange(u?._id || null, u || null); setOpen(false); setQuery(''); };

  return (
    <div ref={rootRef} className="relative">
      {label && <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-sm text-neutral-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      >
        {value && valueUser ? (
          <>
            <Avatar user={valueUser} />
            <span className="min-w-0 flex-1 truncate">{valueUser.name}</span>
          </>
        ) : (
          <span className="flex-1 text-neutral-400">{placeholder}</span>
        )}
        <span className="material-symbols-outlined text-[16px] text-neutral-400">expand_more</span>
      </button>

      {open && placement && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom }}
          className="z-70 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="border-b border-neutral-100 p-2 dark:border-neutral-800">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {allowClear && (
              <button type="button" onClick={() => select(null)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-[16px]">block</span>
                Unassigned
              </button>
            )}
            {options.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-neutral-400">No people found</p>
            ) : (
              options.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => select(u)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <Avatar user={u} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-neutral-800 dark:text-neutral-100">{u.name}</span>
                    <span className="block truncate text-xs text-neutral-400">{u.role || u.email}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default UserPicker;
export { Avatar as UserAvatar };
