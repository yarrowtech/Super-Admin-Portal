import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { managerApi } from '../api/manager';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

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

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    console.log('NotificationContext: checking if should fetch notifications', { 
      hasToken: !!token, 
      userRole: user?.role,
      shouldFetch: token && user?.role === 'manager' 
    });
    
    if (token && user?.role === 'manager') {
      fetchNotifications();
    }
  }, [token, user?.role, fetchNotifications]);

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