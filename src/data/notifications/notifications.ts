import type { Notification, NotificationInput, NotificationTargetRole } from './types';

// In-memory notification storage (mock data layer)
let notifications: Notification[] = [];

// Generate unique ID
function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get all notifications
export function getAllNotifications(): Notification[] {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get notifications for a specific role
export function getNotificationsForRole(role: NotificationTargetRole): Notification[] {
  return getAllNotifications().filter(
    (n) => n.targetRole === role || n.targetRole === 'all'
  );
}

// Get unread notifications for a specific role
export function getUnreadNotificationsForRole(role: NotificationTargetRole): Notification[] {
  return getNotificationsForRole(role).filter((n) => !n.read);
}

// Get unread count for badge
export function getUnreadCount(role: NotificationTargetRole): number {
  return getUnreadNotificationsForRole(role).length;
}

// Add a new notification
export function addNotification(input: NotificationInput): Notification {
  const notification: Notification = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
    read: false,
  };

  notifications.push(notification);
  return notification;
}

// Mark a notification as read
export function markNotificationAsRead(id: string): void {
  const notification = notifications.find((n) => n.id === id);
  if (notification) {
    notification.read = true;
  }
}

// Mark all notifications as read for a role
export function markAllAsReadForRole(role: NotificationTargetRole): void {
  notifications.forEach((n) => {
    if (n.targetRole === role || n.targetRole === 'all') {
      n.read = true;
    }
  });
}

// Clear/delete a notification
export function clearNotification(id: string): void {
  notifications = notifications.filter((n) => n.id !== id);
}

// Clear all notifications for a role
export function clearAllForRole(role: NotificationTargetRole): void {
  notifications = notifications.filter(
    (n) => n.targetRole !== role && n.targetRole !== 'all'
  );
}

// Helper: Create reimbursement notification for accountants
export function notifyAccountantNewReimbursement(
  reimbursementId: string,
  reimbursementNumber: string,
  walletHolderName: string,
  amount: number
): Notification {
  return addNotification({
    type: 'reimbursement_created',
    title: 'New Reimbursement Request',
    message: `${walletHolderName} submitted a reimbursement request for ${amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`,
    link: '/accounting/accountant/petty-cash-management/reimbursements',
    referenceId: reimbursementId,
    referenceNumber: reimbursementNumber,
    targetRole: 'accountant',
  });
}
