'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useNotificationsQuery } from '@/hooks/queries/useNotifications';

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
  const queryClient = useQueryClient();

  // Fetch notifications via React Query (cached, deduplicated)
  const { data: dbNotifs } = useNotificationsQuery(currentRole);

  // Sync React Query data into the in-memory notification store
  useEffect(() => {
    if (!dbNotifs) return;
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
    setRefreshKey((prev) => prev + 1);
  }, [dbNotifs]);

  // Notifications are now fetched via React Query with polling (refetchInterval: 30s)
  // This replaces the previous Supabase Realtime subscription which was consuming
  // significant compute via the WAL reader (94.9% of total query time).

  const refreshNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  // Get notifications for current role from in-memory store
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
      setRefreshKey((prev) => prev + 1);
      return notification;
    },
    []
  );

  const markAsRead = useCallback(
    (id: string) => {
      markNotificationAsRead(id);
      setRefreshKey((prev) => prev + 1);
    },
    []
  );

  const markAllAsRead = useCallback(() => {
    markAllAsReadForRole(currentRole);
    setRefreshKey((prev) => prev + 1);
  }, [currentRole]);

  const clearNotification = useCallback(
    (id: string) => {
      clearNotificationFromStore(id);
      setRefreshKey((prev) => prev + 1);
    },
    []
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
