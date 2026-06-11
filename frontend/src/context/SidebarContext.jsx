import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sap_sidebar_collapsed';

const SidebarContext = createContext(null);

export const useSidebar = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
};

export const SidebarProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const expand  = useCallback(() => { setCollapsed(false); try { localStorage.setItem(STORAGE_KEY, 'false'); } catch {} }, []);
  const collapse = useCallback(() => { setCollapsed(true);  try { localStorage.setItem(STORAGE_KEY, 'true');  } catch {} }, []);

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e) => { if (e.matches) collapse(); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [collapse]);

  const value = useMemo(() => ({ collapsed, toggle, expand, collapse }), [collapsed, toggle, expand, collapse]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};
