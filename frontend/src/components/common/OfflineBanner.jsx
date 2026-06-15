import { useEffect, useRef, useState } from 'react';
import { useOffline } from '../../hooks/useOffline';

const BACK_ONLINE_LINGER_MS = 3_500;

const OfflineBanner = () => {
  const { isOffline, wasOffline, clearWasOffline } = useOffline();
  const [showReconnected, setShowReconnected] = useState(false);
  const timer = useRef(null);

  // When coming back online, show "reconnected" banner briefly
  useEffect(() => {
    if (!isOffline && wasOffline) {
      setShowReconnected(true);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setShowReconnected(false);
        clearWasOffline();
      }, BACK_ONLINE_LINGER_MS);
    }
    return () => clearTimeout(timer.current);
  }, [isOffline, wasOffline, clearWasOffline]);

  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="assertive"
        className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-2 bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"
      >
        <span className="material-symbols-outlined text-base">wifi_off</span>
        You&apos;re offline — some features may be unavailable
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"
      >
        <span className="material-symbols-outlined text-base">wifi</span>
        Back online — refreshing data
      </div>
    );
  }

  return null;
};

export default OfflineBanner;
