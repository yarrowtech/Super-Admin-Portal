import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { outsourcingApi } from '../services/outsourcing';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

/**
 * Connects to the outsourcing socket room and calls `onUpdate(event)` whenever
 * the server emits `outsourcing:update` for this user.
 * Also invalidates the client-side cache so the next API call fetches fresh data.
 *
 * @param {string} token  - JWT auth token
 * @param {object} user   - current user object (needs _id)
 * @param {function} onUpdate - called with the event payload; use it to trigger re-fetches
 */
export function useOutsourcingSocket(token, user, onUpdate) {
  const socketRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!token || !user?._id) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('outsourcing:subscribe', { userId: user._id });
    });

    socket.on('outsourcing:update', (payload) => {
      outsourcingApi.clearClientCache();
      onUpdateRef.current?.(payload);
    });

    socket.on('disconnect', () => {});

    return () => {
      socket.emit('outsourcing:unsubscribe', { userId: user._id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?._id]);
}
