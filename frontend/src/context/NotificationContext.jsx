import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { managerApi } from '../services/manager';
import { ceoApi } from '../services/ceo';
import { useAuth } from './AuthContext';
import { shouldDeliverToManager } from '../utils/notificationRouting';
import { createLogger } from '../utils/logger';

const NotificationContext = createContext();
const LEGACY_PENDING_KEY = 'pendingManagerNotification';
const PENDING_QUEUE_KEY = 'pendingManagerNotifications';
const notificationLogger = createLogger({ module: 'notifications' });

const getDateKey = (dateInput = new Date()) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

const isSameDayKey = (dateInput, key) => {
  if (!key) return false;
  const valueKey = getDateKey(dateInput);
  return Boolean(valueKey && valueKey === key);
};

const filterNotificationsByDay = (items = [], key) =>
  items.filter((item) => isSameDayKey(item?.createdAt, key));

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dayKey, setDayKey] = useState(() => getDateKey());
  const userRole = user?.role;
  const isManager = userRole === 'manager';
  const isCEO = userRole === 'ceo';
  const roleApi = useMemo(() => {
    if (isManager) return managerApi;
    if (isCEO) return ceoApi;
    return null;
  }, [isManager, isCEO]);
  const supportsNotifications = Boolean(token && roleApi);

  const normalizeNotification = useCallback((notification) => {
    if (!notification) return null;
    const fallbackId = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      read: Boolean(notification.read),
      createdAt: notification.createdAt || new Date().toISOString(),
      ...notification,
      id: notification.id || fallbackId,
      type: notification.type || 'task_completed',
      title: notification.title || 'Task update',
      message: notification.message || 'An employee task was updated.',
    };
  }, []);

  const addNotification = useCallback((notification) => {
    const normalized = normalizeNotification(notification);
    if (!normalized) return;
    if (!isSameDayKey(normalized.createdAt, dayKey)) return;
    setNotifications((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === normalized.id);
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const next = [...prev];
        next[existingIndex] = { ...existing, ...normalized };
        if (existing.read && !normalized.read) {
          setUnreadCount((count) => count + 1);
        } else if (!existing.read && normalized.read) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return next;
      }
      if (!normalized.read) {
        setUnreadCount((count) => count + 1);
      }
      return [normalized, ...prev];
    });
  }, [normalizeNotification, dayKey]);

  const fetchNotifications = useCallback(async () => {
    if (!token || !roleApi) return;
    
    setLoading(true);
    try {
      const response = await roleApi.getNotifications(token);
      const data = response?.data || response || [];
      const todaysNotifications = filterNotificationsByDay(data, dayKey);
      setNotifications(todaysNotifications);
      setUnreadCount(todaysNotifications.filter(n => !n.read).length);
    } catch (error) {
      notificationLogger.warn({ err: error }, 'Failed to fetch notifications');
      // No mock data - only show real notifications from employee actions
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [token, roleApi, dayKey]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!token || !roleApi) return;
    
    try {
      await roleApi.markNotificationRead(token, notificationId);
    } catch (error) {
      notificationLogger.warn({ err: error }, 'Failed to mark notification as read');
    }
    
    // Update local state regardless of API success
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [token, roleApi]);

  const markAllAsRead = useCallback(async () => {
    if (!token || !roleApi) return;
    
    try {
      await roleApi.markAllNotificationsRead(token);
    } catch (error) {
      notificationLogger.warn({ err: error }, 'Failed to mark all notifications as read');
    }
    
    // Update local state regardless of API success
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [token, roleApi]);

  const flushPendingNotifications = useCallback(() => {
    if (!user || user.role !== 'manager') return;

    const deliverIfAllowed = (payload) => {
      if (payload && shouldDeliverToManager(user, payload)) {
        addNotification(payload);
      }
    };

    const legacyValue = localStorage.getItem(LEGACY_PENDING_KEY);
    if (legacyValue) {
      try {
        deliverIfAllowed(JSON.parse(legacyValue));
      } catch (err) {
        notificationLogger.warn({ err }, 'Failed to parse legacy pending notification');
      } finally {
        localStorage.removeItem(LEGACY_PENDING_KEY);
      }
    }

    const queueValue = localStorage.getItem(PENDING_QUEUE_KEY);
    if (queueValue) {
      try {
        const queue = JSON.parse(queueValue);
        if (Array.isArray(queue)) {
          queue.forEach(deliverIfAllowed);
        }
      } catch (err) {
        notificationLogger.warn({ err }, 'Failed to parse pending notification queue');
      } finally {
        localStorage.removeItem(PENDING_QUEUE_KEY);
      }
    }
  }, [user, addNotification]);

  useEffect(() => {
    if (!supportsNotifications) return;
    fetchNotifications();
    if (isManager) {
      flushPendingNotifications();
    }
  }, [supportsNotifications, fetchNotifications, isManager, flushPendingNotifications, dayKey]);

  useEffect(() => {
    if (!token || !isManager) return undefined;

    const handleManagerNotification = (event) => {
      const detail = event?.detail;
      if (!detail) return;
      if (!shouldDeliverToManager(user, detail)) return;
      addNotification(detail);
    };

    const handleStorage = (event) => {
      if (
        event.key === PENDING_QUEUE_KEY ||
        event.key === LEGACY_PENDING_KEY
      ) {
        flushPendingNotifications();
      }
    };

    window.addEventListener('managerNotification', handleManagerNotification);
    window.addEventListener('storage', handleStorage);

    flushPendingNotifications();
    return () => {
      window.removeEventListener('managerNotification', handleManagerNotification);
      window.removeEventListener('storage', handleStorage);
    };
  }, [token, user, isManager, addNotification, flushPendingNotifications]);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const timeout = nextMidnight.getTime() - now.getTime();
    const timer = setTimeout(() => {
      setNotifications([]);
      setUnreadCount(0);
      setDayKey(getDateKey());
    }, timeout);
    return () => clearTimeout(timer);
  }, [dayKey]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
