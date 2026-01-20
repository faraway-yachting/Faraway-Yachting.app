'use client';

import { useAuth } from '@/components/auth';

/**
 * Permission codes follow the pattern: {module}.{resource}.{action}
 *
 * Examples:
 * - 'accounting.expenses.view' - Can view expenses
 * - 'accounting.expenses.create' - Can create expenses
 * - 'accounting.reports.view_management' - Can view management reports
 * - 'bookings.calendar.view_status_only' - Can view calendar with status only
 */

// Accounting permissions
export const ACCOUNTING_PERMISSIONS = {
  DASHBOARD_VIEW: 'accounting.dashboard.view',
  EXPENSES_VIEW: 'accounting.expenses.view',
  EXPENSES_CREATE: 'accounting.expenses.create',
  EXPENSES_EDIT: 'accounting.expenses.edit',
  EXPENSES_DELETE: 'accounting.expenses.delete',
  INCOME_VIEW: 'accounting.income.view',
  INCOME_CREATE: 'accounting.income.create',
  INCOME_EDIT: 'accounting.income.edit',
  INVOICES_VIEW: 'accounting.invoices.view',
  INVOICES_CREATE: 'accounting.invoices.create',
  INVOICES_EDIT: 'accounting.invoices.edit',
  JOURNAL_VIEW: 'accounting.journal.view',
  JOURNAL_CREATE: 'accounting.journal.create',
  RECONCILIATION_VIEW: 'accounting.reconciliation.view',
  RECONCILIATION_PERFORM: 'accounting.reconciliation.perform',
  PETTYCASH_VIEW_OWN: 'accounting.pettycash.view_own',
  PETTYCASH_VIEW_ALL: 'accounting.pettycash.view_all',
  PETTYCASH_MANAGE: 'accounting.pettycash.manage',
  PETTYCASH_CREATE_EXPENSE: 'accounting.pettycash.create_expense',
  REPORTS_VIEW_BASIC: 'accounting.reports.view_basic',
  REPORTS_VIEW_MANAGEMENT: 'accounting.reports.view_management',
  REPORTS_VIEW_INVESTOR: 'accounting.reports.view_investor',
  CHARTOFACCOUNTS_VIEW: 'accounting.chartofaccounts.view',
  CHARTOFACCOUNTS_EDIT: 'accounting.chartofaccounts.edit',
  CONTACTS_VIEW: 'accounting.contacts.view',
  CONTACTS_EDIT: 'accounting.contacts.edit',
  CATEGORIZATION_VIEW: 'accounting.categorization.view',
  CATEGORIZATION_EDIT: 'accounting.categorization.edit',
  FINANCES_VIEW: 'accounting.finances.view',
  FINANCES_MANAGE: 'accounting.finances.manage',
  SETTINGS_VIEW: 'accounting.settings.view',
  SETTINGS_MANAGE: 'accounting.settings.manage',
} as const;

// Bookings permissions
export const BOOKINGS_PERMISSIONS = {
  CALENDAR_VIEW: 'bookings.calendar.view',
  CALENDAR_VIEW_STATUS_ONLY: 'bookings.calendar.view_status_only',
  BOOKING_VIEW: 'bookings.booking.view',
  BOOKING_VIEW_NO_FINANCIAL: 'bookings.booking.view_no_financial',
  BOOKING_CREATE: 'bookings.booking.create',
  BOOKING_EDIT: 'bookings.booking.edit',
  BOOKING_DELETE: 'bookings.booking.delete',
  REPORTS_VIEW: 'bookings.reports.view',
  GUESTS_VIEW: 'bookings.guests.view',
  GUESTS_EDIT: 'bookings.guests.edit',
} as const;

// Admin permissions
export const ADMIN_PERMISSIONS = {
  USERS_VIEW: 'admin.users.view',
  USERS_MANAGE: 'admin.users.manage',
} as const;

// All permissions combined
export const PERMISSIONS = {
  ...ACCOUNTING_PERMISSIONS,
  ...BOOKINGS_PERMISSIONS,
  ...ADMIN_PERMISSIONS,
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Hook for checking user permissions
 *
 * @example
 * const { hasPermission, can } = usePermissions();
 *
 * // Check specific permission
 * if (hasPermission('accounting.expenses.create')) {
 *   // Show create button
 * }
 *
 * // Use helper methods
 * if (can.viewExpenses()) {
 *   // Show expenses section
 * }
 */
export function usePermissions() {
  const {
    isSuperAdmin,
    permissions,
    companyAccess,
    projectAccess,
    hasPermission: authHasPermission,
    hasCompanyAccess,
    hasProjectAccess,
    getAccessibleCompanyIds,
    getAccessibleProjectIds,
  } = useAuth();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permissionCode: string): boolean => {
    return authHasPermission(permissionCode);
  };

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissionCodes.some(code => permissions.includes(code));
  };

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = (permissionCodes: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissionCodes.every(code => permissions.includes(code));
  };

  /**
   * Check if user is a manager/admin in any company
   */
  const isManagerInAnyCompany = (): boolean => {
    if (isSuperAdmin) return true;
    return companyAccess.some(ca => ca.access_type === 'admin' || ca.access_type === 'manager');
  };

  /**
   * Get the user's highest access level in a company
   */
  const getCompanyAccessLevel = (companyId: string): string | null => {
    if (isSuperAdmin) return 'admin';
    const access = companyAccess.find(ca => ca.company_id === companyId);
    return access?.access_type || null;
  };

  // Convenience methods for common permission checks
  const can = {
    // Accounting - Dashboard
    viewDashboard: () => hasPermission(ACCOUNTING_PERMISSIONS.DASHBOARD_VIEW),

    // Accounting - Expenses
    viewExpenses: () => hasPermission(ACCOUNTING_PERMISSIONS.EXPENSES_VIEW),
    createExpenses: () => hasPermission(ACCOUNTING_PERMISSIONS.EXPENSES_CREATE),
    editExpenses: () => hasPermission(ACCOUNTING_PERMISSIONS.EXPENSES_EDIT),
    deleteExpenses: () => hasPermission(ACCOUNTING_PERMISSIONS.EXPENSES_DELETE),

    // Accounting - Income
    viewIncome: () => hasPermission(ACCOUNTING_PERMISSIONS.INCOME_VIEW),
    createIncome: () => hasPermission(ACCOUNTING_PERMISSIONS.INCOME_CREATE),
    editIncome: () => hasPermission(ACCOUNTING_PERMISSIONS.INCOME_EDIT),

    // Accounting - Invoices
    viewInvoices: () => hasPermission(ACCOUNTING_PERMISSIONS.INVOICES_VIEW),
    createInvoices: () => hasPermission(ACCOUNTING_PERMISSIONS.INVOICES_CREATE),
    editInvoices: () => hasPermission(ACCOUNTING_PERMISSIONS.INVOICES_EDIT),

    // Accounting - Journal
    viewJournal: () => hasPermission(ACCOUNTING_PERMISSIONS.JOURNAL_VIEW),
    createJournal: () => hasPermission(ACCOUNTING_PERMISSIONS.JOURNAL_CREATE),

    // Accounting - Reconciliation
    viewReconciliation: () => hasPermission(ACCOUNTING_PERMISSIONS.RECONCILIATION_VIEW),
    performReconciliation: () => hasPermission(ACCOUNTING_PERMISSIONS.RECONCILIATION_PERFORM),

    // Accounting - Petty Cash
    viewOwnPettyCash: () => hasPermission(ACCOUNTING_PERMISSIONS.PETTYCASH_VIEW_OWN),
    viewAllPettyCash: () => hasPermission(ACCOUNTING_PERMISSIONS.PETTYCASH_VIEW_ALL),
    managePettyCash: () => hasPermission(ACCOUNTING_PERMISSIONS.PETTYCASH_MANAGE),
    createPettyCashExpense: () => hasPermission(ACCOUNTING_PERMISSIONS.PETTYCASH_CREATE_EXPENSE),

    // Accounting - Reports
    viewBasicReports: () => hasPermission(ACCOUNTING_PERMISSIONS.REPORTS_VIEW_BASIC),
    viewManagementReports: () => hasPermission(ACCOUNTING_PERMISSIONS.REPORTS_VIEW_MANAGEMENT),
    viewInvestorReports: () => hasPermission(ACCOUNTING_PERMISSIONS.REPORTS_VIEW_INVESTOR),

    // Accounting - Chart of Accounts
    viewChartOfAccounts: () => hasPermission(ACCOUNTING_PERMISSIONS.CHARTOFACCOUNTS_VIEW),
    editChartOfAccounts: () => hasPermission(ACCOUNTING_PERMISSIONS.CHARTOFACCOUNTS_EDIT),

    // Accounting - Contacts
    viewContacts: () => hasPermission(ACCOUNTING_PERMISSIONS.CONTACTS_VIEW),
    editContacts: () => hasPermission(ACCOUNTING_PERMISSIONS.CONTACTS_EDIT),

    // Accounting - GL Categorization
    viewCategorization: () => hasPermission(ACCOUNTING_PERMISSIONS.CATEGORIZATION_VIEW),
    editCategorization: () => hasPermission(ACCOUNTING_PERMISSIONS.CATEGORIZATION_EDIT),

    // Accounting - Finances
    viewFinances: () => hasPermission(ACCOUNTING_PERMISSIONS.FINANCES_VIEW),
    manageFinances: () => hasPermission(ACCOUNTING_PERMISSIONS.FINANCES_MANAGE),

    // Accounting - Settings
    viewSettings: () => hasPermission(ACCOUNTING_PERMISSIONS.SETTINGS_VIEW),
    manageSettings: () => hasPermission(ACCOUNTING_PERMISSIONS.SETTINGS_MANAGE),

    // Admin - Users
    viewUsers: () => hasPermission(ADMIN_PERMISSIONS.USERS_VIEW),
    manageUsers: () => hasPermission(ADMIN_PERMISSIONS.USERS_MANAGE),

    // Bookings - Calendar
    viewBookingCalendar: () => hasPermission(BOOKINGS_PERMISSIONS.CALENDAR_VIEW),
    viewBookingCalendarStatusOnly: () => hasPermission(BOOKINGS_PERMISSIONS.CALENDAR_VIEW_STATUS_ONLY),

    // Bookings - Booking
    viewBookings: () => hasPermission(BOOKINGS_PERMISSIONS.BOOKING_VIEW),
    viewBookingsNoFinancial: () => hasPermission(BOOKINGS_PERMISSIONS.BOOKING_VIEW_NO_FINANCIAL),
    createBookings: () => hasPermission(BOOKINGS_PERMISSIONS.BOOKING_CREATE),
    editBookings: () => hasPermission(BOOKINGS_PERMISSIONS.BOOKING_EDIT),
    deleteBookings: () => hasPermission(BOOKINGS_PERMISSIONS.BOOKING_DELETE),

    // Bookings - Reports
    viewBookingReports: () => hasPermission(BOOKINGS_PERMISSIONS.REPORTS_VIEW),

    // Bookings - Guests
    viewGuests: () => hasPermission(BOOKINGS_PERMISSIONS.GUESTS_VIEW),
    editGuests: () => hasPermission(BOOKINGS_PERMISSIONS.GUESTS_EDIT),
  };

  return {
    // Core permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Access control
    hasCompanyAccess,
    hasProjectAccess,
    getAccessibleCompanyIds,
    getAccessibleProjectIds,
    getCompanyAccessLevel,
    isManagerInAnyCompany,

    // Convenience helpers
    can,

    // Raw data
    isSuperAdmin,
    permissions,
    companyAccess,
    projectAccess,
  };
}
