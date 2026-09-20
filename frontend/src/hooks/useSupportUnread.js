import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { portalSupportApi } from '../services/portalSupportApi';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export const SUPPORT_UNREAD_REFRESH_EVENT = 'support:unread-refresh';

/**
 * Number of the current user's support tickets with staff activity (reply / status
 * change) they have not opened yet. Refreshes over the existing support socket room
 * and whenever the support page dispatches SUPPORT_UNREAD_REFRESH_EVENT.
 */
const useSupportUnread = (enabled = true) => {
  const { token, user } = useAuth();
  const userId = user?.id || user?._id;
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const r = await portalSupportApi.getUnreadCount(token);
      setCount(Number(r?.data?.count) || 0);
    } catch { /* badge is best-effort */ }
  }, [token]);

  useEffect(() => {
    if (!enabled || !token || !userId) return undefined;
    refresh();
    const socket = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ['websocket'] });
    socket.emit('join_room', `support:user:${userId}`);
    socket.on('support:ticket_updated', refresh);
    window.addEventListener(SUPPORT_UNREAD_REFRESH_EVENT, refresh);
    return () => {
      socket.disconnect();
      window.removeEventListener(SUPPORT_UNREAD_REFRESH_EVENT, refresh);
    };
  }, [enabled, token, userId, refresh]);

  return enabled ? count : 0;
};

export default useSupportUnread;
