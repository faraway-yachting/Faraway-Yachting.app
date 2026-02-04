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

// BroadcastChannel name for cross-tab coordination
const NOTIFICATION_CHANNEL = 'faraway_notifications';

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
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isLeaderRef = useRef(false);
  const tabIdRef = useRef<string>('');
  // Use ref for currentRole inside effect to avoid dependency cycle
  const currentRoleRef = useRef(currentRole);
  // Track if initial fetch has been done
  const initialFetchDoneRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    currentRoleRef.current = currentRole;
  }, [currentRole]);

  const refreshNotifications = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Load notifications from Supabase - uses ref to avoid dependency on currentRole
  const fetchFromDb = useCallback(async (broadcast = true) => {
    try {
      const role = currentRoleRef.current;
      const dbNotifs = await notificationsApi.getForRole(role);
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

      // Broadcast to other tabs if we're the leader
      if (broadcast && isLeaderRef.current && channelRef.current) {
        channelRef.current.postMessage({
          type: 'notifications_update',
          data: mapped,
          role: role,
        });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []); // No dependencies - uses refs

  // Setup effect - runs once on mount
  useEffect(() => {
    // Generate unique tab ID
    tabIdRef.current = Math.random().toString(36).substring(2);

    const tryBecomeLeader = () => {
      // Announce we want to be leader
      channelRef.current?.postMessage({ type: 'leader_ping', tabId: tabIdRef.current });

      // Wait a bit to see if anyone responds
      setTimeout(() => {
        // If no one responded, we become leader
        if (!isLeaderRef.current) {
          isLeaderRef.current = true;
          startPolling();
        }
      }, 50);
    };

    // Start polling (only if we're leader)
    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (isLeaderRef.current) {
        pollRef.current = setInterval(() => {
          if (isLeaderRef.current && !document.hidden) {
            fetchFromDb(true);
          }
        }, 30000);
      }
    };

    // Setup BroadcastChannel for cross-tab coordination
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channelRef.current = new BroadcastChannel(NOTIFICATION_CHANNEL);

      channelRef.current.onmessage = (event) => {
        const { type, data, role } = event.data;

        if (type === 'notifications_update' && role === currentRoleRef.current) {
          // Another tab fetched notifications - update our local state
          setNotificationsFromDb(data);
          setRefreshKey((prev) => prev + 1);
        } else if (type === 'leader_ping') {
          // Another tab is asking who's the leader
          if (isLeaderRef.current) {
            channelRef.current?.postMessage({ type: 'leader_pong', tabId: tabIdRef.current });
          }
        } else if (type === 'leader_pong') {
          // Another tab claimed leadership - we're not the leader
          isLeaderRef.current = false;
        } else if (type === 'leader_resign') {
          // Leader resigned - try to become leader
          setTimeout(() => tryBecomeLeader(), Math.random() * 100);
        }
      };
    }

    // Stop polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // If we're leader and going hidden, resign leadership
        if (isLeaderRef.current) {
          isLeaderRef.current = false;
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          channelRef.current?.postMessage({ type: 'leader_resign' });
        }
      } else {
        // Tab became visible - try to become leader if there isn't one
        setTimeout(() => tryBecomeLeader(), Math.random() * 100);
        // Always fetch fresh data when becoming visible
        fetchFromDb(false);
      }
    };

    // Initial fetch (don't wait for leadership) - only once
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      fetchFromDb(false);
    }

    // Try to become leader
    tryBecomeLeader();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Resign leadership on unmount
      if (isLeaderRef.current) {
        channelRef.current?.postMessage({ type: 'leader_resign' });
      }
      channelRef.current?.close();
    };
  }, [fetchFromDb]); // Only depends on fetchFromDb which is now stable

  // Refetch when role changes
  useEffect(() => {
    if (initialFetchDoneRef.current) {
      fetchFromDb(false);
    }
  }, [currentRole, fetchFromDb]);

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
