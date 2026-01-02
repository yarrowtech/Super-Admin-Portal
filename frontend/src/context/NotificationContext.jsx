import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { managerApi } from '../api/manager';
import { useAuth } from './AuthContext';
import { shouldDeliverToManager } from '../utils/notificationRouting';

const NotificationContext = createContext();
const LEGACY_PENDING_KEY = 'pendingManagerNotification';
const PENDING_QUEUE_KEY = 'pendingManagerNotifications';

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
  }, [normalizeNotification]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await managerApi.getNotifications(token);
      const data = response?.data || response || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.warn('Failed to fetch notifications - backend not available:', error);
      // No mock data - only show real notifications from employee actions
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!token) return;
    
    try {
      await managerApi.markNotificationRead(token, notificationId);
    } catch (error) {
      console.warn('Failed to mark notification as read (backend not implemented):', error);
    }
    
    // Update local state regardless of API success
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    
    try {
      await managerApi.markAllNotificationsRead(token);
    } catch (error) {
      console.warn('Failed to mark all notifications as read (backend not implemented):', error);
    }
    
    // Update local state regardless of API success
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [token]);

  const flushPendingNotifications = useCallback(() => {
    if (!user) return;

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
        console.warn('Failed to parse legacy pending notification', err);
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
        console.warn('Failed to parse pending notification queue', err);
      } finally {
        localStorage.removeItem(PENDING_QUEUE_KEY);
      }
    }
  }, [user, addNotification]);

  useEffect(() => {
    console.log('NotificationContext: checking if should fetch notifications', { 
      hasToken: !!token, 
      userRole: user?.role,
      shouldFetch: token && user?.role === 'manager' 
    });
    
    if (token && user?.role === 'manager') {
      fetchNotifications();
      flushPendingNotifications();
    }
  }, [token, user?.role, fetchNotifications, flushPendingNotifications]);

  useEffect(() => {
    if (!token || user?.role !== 'manager') return undefined;

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
  }, [token, user, addNotification, flushPendingNotifications]);

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
