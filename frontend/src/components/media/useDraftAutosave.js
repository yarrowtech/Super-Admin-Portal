import { useEffect, useRef, useState } from 'react';

// Drafts live in sessionStorage (not localStorage) on purpose: they should survive an
// accidental refresh mid-fill, but disappear once the tab/window closes or the user
// navigates away and back, so a fresh visit always starts blank (like a Google Form).

export const loadDraft = (key) => {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.value ? parsed : null;
  } catch {
    return null;
  }
};

export const clearDraft = (key) => {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
};

export const clearDraftsByPrefix = (prefix) => {
  if (!prefix) return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
};

export const relativeSavedLabel = (timestamp) => {
  if (!timestamp) return '';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'Draft saved just now';
  if (seconds < 60) return `Draft saved ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Draft saved ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `Draft saved ${hours}h ago`;
};

export const useDraftAutosave = (key, value, enabled = true) => {
  const [savedAt, setSavedAt] = useState(null);
  const timerRef = useRef(null);
  const serialized = JSON.stringify(value);

  useEffect(() => {
    if (!enabled || !key) return undefined;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const now = Date.now();
        sessionStorage.setItem(key, JSON.stringify({ value: JSON.parse(serialized), savedAt: now }));
        setSavedAt(now);
      } catch {
        // ignore storage errors
      }
    }, 700);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, serialized]);

  return savedAt;
};
