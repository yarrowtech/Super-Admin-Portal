import React, { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';

const NotificationPanel = ({ onTaskClick }) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    const actionableTypes = ['task_review', 'task_completed', 'task_update'];
    if (actionableTypes.includes(notification.type) && notification.metadata?.taskId) {
      onTaskClick(notification.metadata.taskId, notification.metadata);
    }
    
    setIsOpen(false);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_review':
        return 'rate_review';
      case 'task_completed':
        return 'task_alt';
      case 'project_update':
        return 'update';
      default:
        return 'notifications';
    }
  };

  return (
    <div ref={panelRef} className="relative flex items-center gap-1 sm:gap-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-1.5 sm:gap-2 rounded-lg border border-gray-200 bg-white px-2 sm:px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <span className="material-symbols-outlined text-base">notifications</span>
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile: full screen overlay */}
          <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setIsOpen(false)} />
          
          {/* Desktop: dropdown, Mobile: modal */}
          <div className="fixed inset-x-4 top-20 sm:absolute sm:right-0 sm:top-full sm:inset-x-auto sm:mt-2 w-auto sm:w-80 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 z-50">
            <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                <span className="ml-2">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <span className="material-symbols-outlined text-3xl opacity-50">notifications_off</span>
                <p className="mt-2 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`cursor-pointer border-b border-gray-100 p-4 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      !notification.read 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        !notification.read 
                          ? 'font-semibold text-gray-900 dark:text-white' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationPanel;
