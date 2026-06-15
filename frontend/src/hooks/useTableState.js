import { useCallback, useEffect, useRef, useState } from 'react';

const SS_PREFIX = 'sap_table_v1:';
const FLUSH_DEBOUNCE_MS = 500;

const ssRead = (key) => {
  try {
    const raw = sessionStorage.getItem(`${SS_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const ssWrite = (key, value) => {
  try {
    sessionStorage.setItem(`${SS_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // quota exceeded — silently degrade
  }
};

/**
 * Persist table filter/sort/pagination/search state in sessionStorage.
 * Survives page refreshes within the same tab; cleared when tab closes.
 *
 * @param {string} tableId    - Unique key (e.g. 'admin-users', 'hr-employees')
 * @param {object} defaults   - Initial state shape
 *
 * Usage:
 *   const [state, setState, resetState] = useTableState('admin-users', {
 *     page: 1, limit: 10, search: '', role: 'all', sortBy: 'createdAt', sortDir: 'desc'
 *   });
 */
export const useTableState = (tableId, defaults = {}) => {
  const [state, setStateRaw] = useState(() => {
    const saved = ssRead(tableId);
    return saved ? { ...defaults, ...saved } : { ...defaults };
  });

  const timer = useRef(null);

  // Debounced sessionStorage flush
  const flush = useCallback(
    (next) => {
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        ssWrite(tableId, next);
      }, FLUSH_DEBOUNCE_MS);
    },
    [tableId]
  );

  const setState = useCallback(
    (updater) => {
      setStateRaw((prev) => {
        const next =
          typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        flush(next);
        return next;
      });
    },
    [flush]
  );

  const resetState = useCallback(() => {
    try { sessionStorage.removeItem(`${SS_PREFIX}${tableId}`); } catch { /* ignore */ }
    clearTimeout(timer.current);
    setStateRaw({ ...defaults });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(timer.current), []);

  return [state, setState, resetState];
};
