import { useEffect, useState } from 'react';

/**
 * Detects online/offline status using navigator.onLine + browser events.
 * Returns { isOnline, isOffline, wasOffline } where `wasOffline` stays true
 * until the component unmounts — useful for showing a "back online" banner.
 */
export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // wasOffline stays true so callers can show a brief "reconnected" message
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    clearWasOffline: () => setWasOffline(false),
  };
};
