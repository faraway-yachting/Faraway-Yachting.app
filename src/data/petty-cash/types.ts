import type { Currency } from '@/data/company/types';

// WHT rate options (matching existing expense module)
export type WhtRate = 0 | 0.75 | 1 | 1.5 | 2 | 3 | 5 | 10 | 15 | 'custom';

// VAT type for line items
export type VatType = 'include' | 'exclude' | 'no_vat';

// Attachment type (matching existing pattern)
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

// ============================================
// WALLET
// ============================================
export type WalletStatus = 'active' | 'closed';

export interface PettyCashWallet {
  id: string;
  walletName: string; // Display name for the wallet
  userId: string;
  userName: string; // Holder name
  userEmail?: string;
  userRole?: string; // e.g., "Captain - Ocean Star"
  companyId: string;
  companyName: string;
  balance: number;
  beginningBalance?: number;
  currency: Currency;
  status: WalletStatus;
  balanceLimit?: number;
  lowBalanceThreshold?: number;
  reimbursementBankAccountId?: string;
  reimbursementBankAccountName?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// EXPENSE CATEGORY
// ============================================
export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  glAccountCode: string;
  isActive: boolean;
}

// ============================================
// EXPENSE LINE ITEM
// ============================================
export interface PettyCashExpenseLineItem {
  id: string;
  projectId: string;
  projectName: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  vatType: VatType;
  vatRate: number;
  vatAmount: number;
  preVatAmount: number;
  whtApplicable: boolean;
  whtRate: WhtRate;
  whtAmount: number;
}

// ============================================
// EXPENSE
// ============================================
export type ReceiptStatus = 'pending' | 'original_received';
export type ExpenseStatus = 'draft' | 'submitted';

export interface PettyCashExpense {
  id: string;
  expenseNumber: string; // PC-EXP-YYMMXXXX
  walletId: string;
  walletHolderName: string;
  companyId: string;
  companyName: string;

  // Expense details
  expenseDate: string;
  description: string;

  // Simplified expense fields (for petty cash holder input)
  amount: number; // Simple amount input by user
  projectId: string;
  projectName: string;

  // Receipt
  receiptStatus: ReceiptStatus;
  receiptReceivedDate?: string;
  attachments: Attachment[];

  // Line items (optional - empty for simplified expenses)
  lineItems: PettyCashExpenseLineItem[];

  // Accounting details (filled by accountant, optional)
  expenseAccountCode?: string; // CoA expense account code (5000-8999)
  expenseAccountName?: string; // CoA expense account name
  accountingVatType?: VatType;
  accountingVatRate?: number;
  accountingCompletedBy?: string;
  accountingCompletedAt?: string;

  // Totals (for simplified: subtotal=totalAmount=netAmount=amount, vatAmount=whtAmount=0)
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  whtAmount: number;
  netAmount: number; // Amount deducted from wallet (totalAmount - whtAmount)

  // Status
  status: ExpenseStatus;
  submittedAt?: string;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REIMBURSEMENT
// ============================================
export type ReimbursementStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export interface PettyCashReimbursement {
  id: string;
  reimbursementNumber: string; // PC-RMB-YYMMXXXX
  expenseId: string;
  expenseNumber: string;
  walletId: string;
  walletHolderName: string;

  // Company that will pay
  companyId: string;
  companyName: string;

  // Amounts
  amount: number;
  adjustmentAmount?: number;
  adjustmentReason?: string;
  finalAmount: number;

  // Payment details
  status: ReimbursementStatus;
  bankAccountId?: string;
  bankAccountName?: string;
  paymentDate?: string;
  paymentReference?: string;

  // Approval
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // Audit
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TOP-UP
// ============================================
export type TopUpStatus = 'pending' | 'approved' | 'completed';

export interface PettyCashTopUp {
  id: string;
  topUpNumber: string; // PC-TOP-YYMMXXXX
  walletId: string;
  walletHolderName: string;
  amount: number;

  // Source
  companyId: string;
  companyName: string;
  bankAccountId: string;
  bankAccountName: string;

  // Details
  topUpDate: string;
  reference?: string;
  notes?: string;

  // Status
  status: TopUpStatus;
  approvedBy?: string;
  approvedAt?: string;
  completedBy?: string;
  completedAt?: string;

  // Audit
  createdBy: string;
  createdAt: string;
}

// ============================================
// TRANSACTION (for unified history view)
// ============================================
export type TransactionType = 'expense' | 'topup' | 'reimbursement_paid';

export interface PettyCashTransaction {
  id: string;
  type: TransactionType;
  date: string;
  description: string;
  amount: number; // Positive for top-up/reimbursement, negative for expense
  category?: string;
  companyName?: string;
  walletId: string;
  walletHolderName: string;
  projectName?: string;
  status: string;
  referenceNumber: string;
  receiptStatus?: ReceiptStatus; // Only for expense type
}

// ============================================
// SUMMARY TYPES (for dashboard)
// ============================================
export interface WalletSummary {
  totalBalance: number;
  totalPendingReimbursement: number;
  monthlyExpenses: number;
  lowBalanceWallets: number;
  activeWallets: number;
}

export interface CompanyExpenseSummary {
  companyId: string;
  companyName: string;
  totalExpenses: number;
  pendingReimbursements: number;
  transactionCount: number;
}
