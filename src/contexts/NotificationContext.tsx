'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Notification, NotificationInput, NotificationTargetRole } from '@/data/notifications/types';
import {
  getNotificationsForRole,
  getUnreadCount,
  addNotification as addNotificationToStore,
  markNotificationAsRead,
  markAllAsReadForRole,
  clearNotification as clearNotificationFromStore,
  setNotificationsFromDb,
} from '@/data/notifications/notifications';
import { notificationsApi } from '@/lib/supabase/api/notifications';

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshNotifications = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Load notifications from Supabase on mount and poll every 30s
  const fetchFromDb = useCallback(async () => {
    try {
      const dbNotifs = await notificationsApi.getForRole(currentRole);
      const mapped: Notification[] = dbNotifs.map((n) => ({
        id: n.id,
        type: n.type as Notification['type'],
        title: n.title,
        message: n.message,
        link: n.link,
        referenceId: n.referenceId,
        referenceNumber: n.referenceNumber || '',
        targetRole: n.targetRole as NotificationTargetRole,
        targetUserId: n.targetUserId,
        read: n.read,
        createdAt: n.createdAt,
      }));
      setNotificationsFromDb(mapped);
      refreshNotifications();
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [currentRole, refreshNotifications]);

  useEffect(() => {
    fetchFromDb();
    pollRef.current = setInterval(fetchFromDb, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchFromDb]);

  // Get notifications for current role
  const notifications = useMemo(() => {
    void refreshKey;
    return getNotificationsForRole(currentRole);
  }, [currentRole, refreshKey]);

  const unreadCount = useMemo(() => {
    void refreshKey;
    return getUnreadCount(currentRole);
  }, [currentRole, refreshKey]);

  const addNotification = useCallback(
    (input: NotificationInput): Notification => {
      const notification = addNotificationToStore(input);
      refreshNotifications();
      return notification;
    },
    [refreshNotifications]
  );

  const markAsRead = useCallback(
    (id: string) => {
      markNotificationAsRead(id);
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const markAllAsRead = useCallback(() => {
    markAllAsReadForRole(currentRole);
    refreshNotifications();
  }, [currentRole, refreshNotifications]);

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
