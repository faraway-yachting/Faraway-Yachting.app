/**
 * Event-Driven Journal Entry System - Type Definitions
 *
 * Core principle: Users never create journal entries directly.
 * Users create business events, and the system generates balanced journal entries.
 */

import type { Database } from '@/lib/supabase/database.types';

// ============================================================================
// Event Types
// ============================================================================

export type AccountingEventType =
  | 'OPENING_BALANCE'
  | 'RECEIPT_RECEIVED'
  | 'RECEIPT_RECEIVED_INTERCOMPANY'
  | 'PROJECT_SERVICE_COMPLETED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_PAID'
  | 'EXPENSE_PAID_INTERCOMPANY'
  | 'CAPEX_INCURRED'
  | 'MANAGEMENT_FEE_RECOGNIZED'
  | 'INTERCOMPANY_SETTLEMENT'
  | 'PARTNER_PROFIT_ALLOCATION'
  | 'PARTNER_PAYMENT'
  | 'PETTYCASH_EXPENSE_CREATED'
  | 'PETTYCASH_TOPUP_COMPLETED'
  | 'PETTYCASH_REIMBURSEMENT_PAID';

export type EventStatus = 'pending' | 'processed' | 'failed' | 'cancelled';

// ============================================================================
// Database Row Types
// ============================================================================

export type AccountingEventRow = Database['public']['Tables']['accounting_events']['Row'];
export type AccountingEventInsert = Database['public']['Tables']['accounting_events']['Insert'];
export type AccountingEventUpdate = Database['public']['Tables']['accounting_events']['Update'];

export type EventJournalEntryRow = Database['public']['Tables']['event_journal_entries']['Row'];
export type EventJournalEntryInsert = Database['public']['Tables']['event_journal_entries']['Insert'];

// ============================================================================
// Event Data Interfaces (varies by event type)
// ============================================================================

export interface ExpenseApprovedEventData {
  expenseId: string;
  expenseNumber: string;
  vendorName: string;
  expenseDate: string;
  lineItems: {
    description: string;
    accountCode: string | null;
    amount: number;
  }[];
  totalSubtotal: number;
  totalVatAmount: number;
  totalAmount: number;
  currency: string;
}

export interface ExpensePaidEventData {
  expenseId: string;
  paymentId: string;
  expenseNumber: string;
  vendorName: string;
  paymentDate: string;
  paymentAmount: number;
  bankAccountId: string;
  bankAccountGlCode: string;
  currency: string;
}

export interface ReceiptReceivedEventData {
  receiptId: string;
  receiptNumber: string;
  clientName: string;
  receiptDate: string;
  // Charter dates for revenue recognition
  charterDateFrom?: string;
  charterDateTo?: string;
  charterType?: string;
  lineItems: {
    id?: string;
    description: string;
    accountCode?: string | null;
    amount: number;
    projectId?: string;
  }[];
  payments: {
    amount: number;
    bankAccountId: string | null;
    bankAccountGlCode: string | null;
    paymentMethod?: string;
  }[];
  totalSubtotal: number;
  totalVatAmount: number;
  totalAmount: number;
  currency: string;
  // Company and project for revenue recognition records
  companyId?: string;
  projectId?: string;
  // FX rate info
  fxRate?: number;
  thbTotalAmount?: number;
}

export interface ManagementFeeEventData {
  periodFrom: string;
  periodTo: string;
  projectId: string;
  projectName: string;
  projectCompanyId: string;
  managementCompanyId: string;
  feePercentage: number;
  grossIncome: number;
  feeAmount: number;
  currency: string;
}

export interface PartnerProfitAllocationEventData {
  periodFrom: string;
  periodTo: string;
  projectId: string;
  projectName: string;
  allocations: {
    participantId: string;
    participantName: string;
    ownershipPercentage: number;
    allocatedAmount: number;
  }[];
  totalProfit: number;
  currency: string;
}

export interface PartnerPaymentEventData {
  projectId: string;
  participantId: string;
  participantName: string;
  paymentDate: string;
  paymentAmount: number;
  bankAccountId: string;
  bankAccountGlCode: string;
  currency: string;
}

export interface OpeningBalanceEventData {
  fiscalYear: string;
  balances: {
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
  }[];
  currency: string;
}

export interface IntercompanySettlementEventData {
  fromCompanyId: string;
  toCompanyId: string;
  settlementDate: string;
  settlementAmount: number;
  fromBankAccountId: string;
  toBankAccountId: string;
  fromBankGlCode: string;
  toBankGlCode: string;
  reference: string;
  currency: string;
}

export interface CapexIncurredEventData {
  expenseId?: string;
  assetDescription: string;
  assetAccountCode: string;
  acquisitionDate: string;
  acquisitionCost: number;
  vendorName?: string;
  paymentMethod: 'cash' | 'bank' | 'payable';
  bankAccountId?: string;
  bankAccountGlCode?: string;
  currency: string;
}

export interface ProjectServiceCompletedEventData {
  projectId: string;
  projectName: string;
  invoiceId?: string;
  completionDate: string;
  revenueAccountCode: string;
  deferredRevenueAccountCode: string;
  amount: number;
  description: string;
  currency: string;
}

// Petty Cash Event Data Interfaces
export interface PettyCashExpenseEventData {
  expenseId: string;
  expenseNumber: string;
  walletId: string;
  walletName: string;
  companyId: string;
  projectId?: string;
  expenseDate: string;
  description: string;
  amount: number;
  category?: string;
  currency: string;
}

export interface PettyCashTopupEventData {
  topupId: string;
  walletId: string;
  walletName: string;
  companyId: string;
  topupDate: string;
  amount: number;
  bankAccountId?: string;
  bankAccountCode?: string;
  bankAccountName?: string;
  reference?: string;
  currency: string;
}

export interface PettyCashReimbursementEventData {
  reimbursementId: string;
  reimbursementNumber: string;
  walletId: string;
  walletName: string;
  companyId: string;
  paymentDate: string;
  finalAmount: number;
  bankAccountId?: string;
  bankAccountCode?: string;
  bankAccountName?: string;
  paymentReference?: string;
  currency: string;
}

// Intercompany Event Data Interfaces
export interface ExpensePaidIntercompanyEventData {
  expenseId: string;
  paymentId: string;
  expenseNumber: string;
  vendorName: string;
  paymentDate: string;
  paymentAmount: number;
  // Paying company info (bank account owner)
  payingCompanyId: string;
  payingCompanyName: string;
  bankAccountId: string;
  bankAccountGlCode: string;
  // Receiving company info (expense owner)
  receivingCompanyId: string;
  receivingCompanyName: string;
  projectId?: string;
  projectName?: string;
  currency: string;
}

export interface ReceiptReceivedIntercompanyEventData {
  receiptId: string;
  receiptNumber: string;
  clientName: string;
  receiptDate: string;
  // Bank receiving company info (where money goes)
  bankCompanyId: string;
  bankCompanyName: string;
  bankAccountId: string;
  bankAccountGlCode: string;
  // Charter/Receipt owner company info
  charterCompanyId: string;
  charterCompanyName: string;
  projectId?: string;
  projectName?: string;
  // Charter dates for revenue recognition
  charterDateFrom?: string;
  charterDateTo?: string;
  charterType?: string;
  // Amounts
  totalAmount: number;
  currency: string;
  // Whether to use deferred revenue or direct income
  usesDeferredRevenue: boolean;
}

// Union type for all event data
export type EventData =
  | ExpenseApprovedEventData
  | ExpensePaidEventData
  | ExpensePaidIntercompanyEventData
  | ReceiptReceivedEventData
  | ReceiptReceivedIntercompanyEventData
  | ManagementFeeEventData
  | PartnerProfitAllocationEventData
  | PartnerPaymentEventData
  | OpeningBalanceEventData
  | IntercompanySettlementEventData
  | CapexIncurredEventData
  | ProjectServiceCompletedEventData
  | PettyCashExpenseEventData
  | PettyCashTopupEventData
  | PettyCashReimbursementEventData;

// ============================================================================
// Processing Types
// ============================================================================

export interface JournalLineSpec {
  accountCode: string;
  entryType: 'debit' | 'credit';
  amount: number;
  description: string;
}

export interface JournalSpec {
  companyId: string;
  entryDate: string;
  description: string;
  lines: JournalLineSpec[];
}

export interface EventProcessResult {
  success: boolean;
  eventId: string;
  journalEntryIds: string[];
  error?: string;
}

export interface EventHandler {
  eventType: AccountingEventType;
  validate(eventData: unknown): { valid: boolean; error?: string };
  generateJournals(event: AccountingEventRow): Promise<JournalSpec[]>;
}

// ============================================================================
// Default Account Codes
// ============================================================================

export const DEFAULT_ACCOUNTS = {
  // Assets
  CASH: '1000',
  DEFAULT_BANK: '1010',
  VAT_RECEIVABLE: '1170',
  INTERCOMPANY_RECEIVABLE: '1180',

  // Liabilities
  ACCOUNTS_PAYABLE: '2050',
  VAT_PAYABLE: '2200',
  DEFERRED_REVENUE: '2300',
  INTERCOMPANY_PAYABLE: '2700',
  PARTNER_PAYABLES: '2750',

  // Equity
  RETAINED_EARNINGS: '3200',

  // Revenue
  DEFAULT_REVENUE: '4490',
  MANAGEMENT_FEE_INCOME: '4300',  // Yacht Management Fees

  // Expenses
  DEFAULT_EXPENSE: '6790',
  MANAGEMENT_FEE_EXPENSE: '6800',
} as const;

// ============================================================================
// Event Type Metadata
// ============================================================================

export const EVENT_TYPE_METADATA: Record<
  AccountingEventType,
  {
    label: string;
    description: string;
    sourceDocumentTypes: string[];
    isMultiCompany: boolean;
  }
> = {
  OPENING_BALANCE: {
    label: 'Opening Balance',
    description: 'Initial balances for a new fiscal year',
    sourceDocumentTypes: [],
    isMultiCompany: false,
  },
  RECEIPT_RECEIVED: {
    label: 'Receipt Received',
    description: 'Cash/bank inflow from customer payment',
    sourceDocumentTypes: ['receipt'],
    isMultiCompany: false,
  },
  RECEIPT_RECEIVED_INTERCOMPANY: {
    label: 'Intercompany Receipt',
    description: 'Payment received by different company than charter owner',
    sourceDocumentTypes: ['receipt'],
    isMultiCompany: true,
  },
  PROJECT_SERVICE_COMPLETED: {
    label: 'Service Completed',
    description: 'Revenue recognition when service is delivered',
    sourceDocumentTypes: ['invoice', 'project'],
    isMultiCompany: false,
  },
  EXPENSE_APPROVED: {
    label: 'Expense Approved',
    description: 'Accrual recognition when expense is approved',
    sourceDocumentTypes: ['expense'],
    isMultiCompany: false,
  },
  EXPENSE_PAID: {
    label: 'Expense Paid',
    description: 'Cash outflow when expense is paid',
    sourceDocumentTypes: ['expense_payment'],
    isMultiCompany: false,
  },
  EXPENSE_PAID_INTERCOMPANY: {
    label: 'Intercompany Expense Payment',
    description: 'Expense paid by different company than expense owner',
    sourceDocumentTypes: ['expense_payment'],
    isMultiCompany: true,
  },
  CAPEX_INCURRED: {
    label: 'Capital Expenditure',
    description: 'Asset acquisition and capitalization',
    sourceDocumentTypes: ['expense'],
    isMultiCompany: false,
  },
  MANAGEMENT_FEE_RECOGNIZED: {
    label: 'Management Fee',
    description: 'Intercompany management fee recognition',
    sourceDocumentTypes: [],
    isMultiCompany: true,
  },
  INTERCOMPANY_SETTLEMENT: {
    label: 'Intercompany Settlement',
    description: 'Settlement of intercompany balances',
    sourceDocumentTypes: [],
    isMultiCompany: true,
  },
  PARTNER_PROFIT_ALLOCATION: {
    label: 'Profit Allocation',
    description: 'Allocation of profits to partners by ownership percentage',
    sourceDocumentTypes: [],
    isMultiCompany: false,
  },
  PARTNER_PAYMENT: {
    label: 'Partner Payment',
    description: 'Distribution of allocated profits to partners',
    sourceDocumentTypes: [],
    isMultiCompany: false,
  },
  PETTYCASH_EXPENSE_CREATED: {
    label: 'Petty Cash Expense',
    description: 'Expense recorded from petty cash wallet',
    sourceDocumentTypes: ['petty_cash_expense'],
    isMultiCompany: false,
  },
  PETTYCASH_TOPUP_COMPLETED: {
    label: 'Petty Cash Top-up',
    description: 'Wallet replenished from bank account',
    sourceDocumentTypes: ['petty_cash_topup'],
    isMultiCompany: false,
  },
  PETTYCASH_REIMBURSEMENT_PAID: {
    label: 'Petty Cash Reimbursement',
    description: 'Wallet holder reimbursed from bank account',
    sourceDocumentTypes: ['petty_cash_reimbursement'],
    isMultiCompany: false,
  },
};
