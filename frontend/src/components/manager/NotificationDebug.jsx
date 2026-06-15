import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const NotificationDebug = () => {
  const { user, token } = useAuth();
  const { notifications, unreadCount, loading } = useNotifications();

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 max-w-xs sm:max-w-sm rounded-lg border border-gray-200 bg-white p-3 sm:p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900 z-40">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Notification Debug</h3>
      <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
        <div>User Role: {user?.role || 'Not logged in'}</div>
        <div>Has Token: {token ? 'Yes' : 'No'}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Notifications Count: {notifications.length}</div>
        <div>Unread Count: {unreadCount}</div>
        <div>Is Manager: {user?.role === 'manager' ? 'Yes' : 'No'}</div>
      </div>
      {notifications.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-semibold text-gray-900 dark:text-white">Latest:</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {notifications[0]?.title}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDebug;