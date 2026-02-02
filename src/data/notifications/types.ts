// Notification types for in-app notifications

export type NotificationType =
  | 'reimbursement_created'
  | 'reimbursement_approved'
  | 'reimbursement_paid'
  | 'reimbursement_rejected'
  | 'booking_payment_needs_action';

export type NotificationTargetRole = 'accountant' | 'manager' | 'petty_cash_holder' | 'all';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  referenceId: string; // e.g., reimbursementId or expenseId
  referenceNumber: string; // e.g., PC-RMB-2501-0001
  createdAt: string;
  read: boolean;
  targetRole: NotificationTargetRole;
  targetUserId?: string; // Specific user to notify (optional)
}

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  referenceId: string;
  referenceNumber: string;
  targetRole: NotificationTargetRole;
  targetUserId?: string; // Specific user to notify (optional)
}
