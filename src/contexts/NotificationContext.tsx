'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { Notification, NotificationInput, NotificationTargetRole } from '@/data/notifications/types';
import {
  getAllNotifications,
  getNotificationsForRole,
  getUnreadCount,
  addNotification as addNotificationToStore,
  markNotificationAsRead,
  markAllAsReadForRole,
  clearNotification as clearNotificationFromStore,
} from '@/data/notifications/notifications';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  currentRole: NotificationTargetRole;
  setCurrentRole: (role: NotificationTargetRole) => void;
  addNotification: (input: NotificationInput) => Notification;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  initialRole?: NotificationTargetRole;
}

export function NotificationProvider({
  children,
  initialRole = 'accountant',
}: NotificationProviderProps) {
  const [currentRole, setCurrentRole] = useState<NotificationTargetRole>(initialRole);
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh of notifications
  const refreshNotifications = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Get notifications for current role
  const notifications = useMemo(() => {
    // refreshKey dependency ensures we re-fetch when state changes
    void refreshKey;
    return getNotificationsForRole(currentRole);
  }, [currentRole, refreshKey]);

  // Get unread count for current role
  const unreadCount = useMemo(() => {
    void refreshKey;
    return getUnreadCount(currentRole);
  }, [currentRole, refreshKey]);

  // Add notification
  const addNotification = useCallback(
    (input: NotificationInput): Notification => {
      const notification = addNotificationToStore(input);
      refreshNotifications();
      return notification;
    },
    [refreshNotifications]
  );

  // Mark single notification as read
  const markAsRead = useCallback(
    (id: string) => {
      markNotificationAsRead(id);
      refreshNotifications();
    },
    [refreshNotifications]
  );

  // Mark all as read for current role
  const markAllAsRead = useCallback(() => {
    markAllAsReadForRole(currentRole);
    refreshNotifications();
  }, [currentRole, refreshNotifications]);

  // Clear/delete notification
  const clearNotification = useCallback(
    (id: string) => {
      clearNotificationFromStore(id);
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      currentRole,
      setCurrentRole,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification,
      refreshNotifications,
    }),
    [
      notifications,
      unreadCount,
      currentRole,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification,
      refreshNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Optional hook that doesn't throw if outside provider
export function useNotificationsOptional() {
  return useContext(NotificationContext);
}
