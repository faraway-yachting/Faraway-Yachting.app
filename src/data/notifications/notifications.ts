import type { Notification, NotificationInput, NotificationTargetRole } from './types';
import { notificationsApi } from '@/lib/supabase/api/notifications';

// In-memory cache (synced from Supabase on load, updated locally for instant UI)
let notifications: Notification[] = [];

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

// Set notifications from Supabase fetch (used by context on load/poll)
export function setNotificationsFromDb(notifs: Notification[]): void {
  notifications = notifs;
}

// Add a new notification — writes to in-memory + Supabase
export function addNotification(input: NotificationInput): Notification {
  const notification: Notification = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
    read: false,
  };

  notifications.push(notification);

  // Persist to Supabase (fire-and-forget) + optional email
  notificationsApi.create({
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    referenceId: input.referenceId,
    referenceNumber: input.referenceNumber,
    targetRole: input.targetRole,
    targetUserId: input.targetUserId,
    sendEmail: input.sendEmail,
  }).catch((err) => {
    console.error('Failed to persist notification:', err);
  });

  return notification;
}

// Mark a notification as read
export function markNotificationAsRead(id: string): void {
  const notification = notifications.find((n) => n.id === id);
  if (notification) {
    notification.read = true;
  }
  notificationsApi.markAsRead(id).catch(() => {});
}

// Mark all notifications as read for a role
export function markAllAsReadForRole(role: NotificationTargetRole): void {
  notifications.forEach((n) => {
    if (n.targetRole === role || n.targetRole === 'all') {
      n.read = true;
    }
  });
  notificationsApi.markAllAsRead(role).catch(() => {});
}

// Clear/delete a notification
export function clearNotification(id: string): void {
  notifications = notifications.filter((n) => n.id !== id);
  notificationsApi.delete(id).catch(() => {});
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
    title: 'New Expense Claim',
    message: `${walletHolderName} submitted an expense claim for ${amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`,
    link: '/accounting/manager/petty-cash-management/reimbursements',
    referenceId: reimbursementId,
    referenceNumber: reimbursementNumber,
    targetRole: 'accountant',
  });
}

// Helper: Notify wallet holder when their claim has been paid
export function notifyWalletHolderClaimPaid(
  reimbursementId: string,
  reimbursementNumber: string,
  amount: number,
  walletHolderId?: string
): Notification {
  return addNotification({
    type: 'reimbursement_paid',
    title: 'Claim Processed',
    message: `Your expense claim ${reimbursementNumber} for ${amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })} has been processed. Wallet replenishment complete.`,
    link: '/accounting/petty-cash',
    referenceId: reimbursementId,
    referenceNumber: reimbursementNumber,
    targetRole: 'petty_cash_holder',
    targetUserId: walletHolderId,
  });
}

// Helper: Notify wallet holder when their claim has been rejected
export function notifyWalletHolderClaimRejected(
  reimbursementId: string,
  reimbursementNumber: string,
  amount: number,
  rejectionReason: string,
  walletHolderId?: string
): Notification {
  return addNotification({
    type: 'reimbursement_rejected',
    title: 'Claim Rejected',
    message: `Your expense claim ${reimbursementNumber} for ${amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })} was rejected. Reason: ${rejectionReason}`,
    link: '/accounting/petty-cash',
    referenceId: reimbursementId,
    referenceNumber: reimbursementNumber,
    targetRole: 'petty_cash_holder',
    targetUserId: walletHolderId,
  });
}

// Helper: Notify accountant about unlinked booking payment
export function notifyAccountantUnlinkedPayment(
  bookingId: string,
  bookingReference: string,
  amount: number,
  currency: string,
  paymentType: string,
): Notification {
  return addNotification({
    type: 'booking_payment_needs_action',
    title: 'Booking Payment Needs Action',
    message: `${paymentType} payment of ${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} recorded on booking ${bookingReference} — needs receipt linking`,
    link: '/accounting/manager/income/overview',
    referenceId: bookingId,
    referenceNumber: bookingReference,
    targetRole: 'accountant',
  });
}
