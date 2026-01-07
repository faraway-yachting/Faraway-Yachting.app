import type {
  PettyCashExpenseLineItem,
  VatType,
  WhtRate,
  PettyCashTransaction,
  PettyCashExpense,
  PettyCashTopUp,
  PettyCashReimbursement,
} from '@/data/petty-cash/types';
import type { Currency } from '@/data/company/types';

// ============================================
// ID GENERATION
// ============================================
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateLineItemId(): string {
  return `line-${generateId()}`;
}

// ============================================
// DATE UTILITIES
// ============================================
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMonthYear(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

export function getCurrentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getCurrentMonthEnd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
}

// ============================================
// CURRENCY FORMATTING
// ============================================
export function formatCurrency(
  amount: number,
  currency: Currency = 'THB'
): string {
  const formatter = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

export function formatNumber(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// ============================================
// LINE ITEM CALCULATIONS
// ============================================
export function calculateLineItemAmounts(
  amount: number,
  vatType: VatType,
  vatRate: number,
  whtApplicable: boolean,
  whtRate: WhtRate,
  customWhtAmount?: number
): {
  preVatAmount: number;
  vatAmount: number;
  whtAmount: number;
} {
  let preVatAmount: number;
  let vatAmount: number;

  // Calculate VAT
  switch (vatType) {
    case 'include':
      // Amount includes VAT, extract it
      preVatAmount = amount / (1 + vatRate / 100);
      vatAmount = amount - preVatAmount;
      break;
    case 'exclude':
      // Amount excludes VAT, add it
      preVatAmount = amount;
      vatAmount = amount * (vatRate / 100);
      break;
    case 'no_vat':
    default:
      preVatAmount = amount;
      vatAmount = 0;
      break;
  }

  // Calculate WHT
  let whtAmount = 0;
  if (whtApplicable && whtRate !== 0) {
    if (whtRate === 'custom') {
      whtAmount = customWhtAmount || 0;
    } else {
      // WHT is calculated on pre-VAT amount
      whtAmount = (preVatAmount * whtRate) / 100;
    }
  }

  return {
    preVatAmount: Math.round(preVatAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    whtAmount: Math.round(whtAmount * 100) / 100,
  };
}

export function calculateExpenseTotals(
  lineItems: PettyCashExpenseLineItem[]
): {
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  whtAmount: number;
  netAmount: number;
} {
  const subtotal = lineItems.reduce((sum, item) => sum + item.preVatAmount, 0);
  const vatAmount = lineItems.reduce((sum, item) => sum + item.vatAmount, 0);
  const totalAmount = subtotal + vatAmount;
  const whtAmount = lineItems.reduce((sum, item) => sum + item.whtAmount, 0);
  const netAmount = totalAmount - whtAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    whtAmount: Math.round(whtAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
  };
}

// ============================================
// EMPTY LINE ITEM
// ============================================
export function createEmptyLineItem(): PettyCashExpenseLineItem {
  return {
    id: generateLineItemId(),
    projectId: '',
    projectName: '',
    categoryId: '',
    categoryName: '',
    description: '',
    amount: 0,
    vatType: 'include',
    vatRate: 7,
    vatAmount: 0,
    preVatAmount: 0,
    whtApplicable: false,
    whtRate: 0,
    whtAmount: 0,
  };
}

// ============================================
// WHT RATE OPTIONS
// ============================================
export const WHT_RATE_OPTIONS: { value: WhtRate; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 0.75, label: '0.75%' },
  { value: 1, label: '1%' },
  { value: 1.5, label: '1.5%' },
  { value: 2, label: '2%' },
  { value: 3, label: '3%' },
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
  { value: 'custom', label: 'Custom' },
];

// ============================================
// VAT TYPE OPTIONS
// ============================================
export const VAT_TYPE_OPTIONS: { value: VatType; label: string }[] = [
  { value: 'include', label: 'VAT Included' },
  { value: 'exclude', label: 'VAT Excluded' },
  { value: 'no_vat', label: 'No VAT' },
];

// ============================================
// TRANSACTION HISTORY
// ============================================
export function buildTransactionHistory(
  expenses: PettyCashExpense[],
  topUps: PettyCashTopUp[],
  reimbursements: PettyCashReimbursement[]
): PettyCashTransaction[] {
  const transactions: PettyCashTransaction[] = [];

  // Add expenses (negative amounts)
  expenses.forEach((exp) => {
    transactions.push({
      id: exp.id,
      type: 'expense',
      date: exp.expenseDate,
      description: exp.description,
      amount: -exp.netAmount,
      category: exp.lineItems[0]?.categoryName || 'Unknown',
      companyName: exp.companyName,
      walletId: exp.walletId,
      walletHolderName: exp.walletHolderName,
      projectName: exp.projectName,
      status: exp.status,
      referenceNumber: exp.expenseNumber,
    });
  });

  // Add top-ups (positive amounts)
  topUps
    .filter((t) => t.status === 'completed')
    .forEach((top) => {
      transactions.push({
        id: top.id,
        type: 'topup',
        date: top.topUpDate,
        description: top.notes || 'Wallet top-up',
        amount: top.amount,
        companyName: top.companyName,
        walletId: top.walletId,
        walletHolderName: top.walletHolderName,
        status: top.status,
        referenceNumber: top.topUpNumber,
      });
    });

  // Add paid reimbursements (positive amounts - wallet refunded)
  reimbursements
    .filter((r) => r.status === 'paid')
    .forEach((rmb) => {
      transactions.push({
        id: rmb.id,
        type: 'reimbursement_paid',
        date: rmb.paymentDate || rmb.updatedAt.split('T')[0],
        description: `Reimbursement for ${rmb.expenseNumber}`,
        amount: rmb.finalAmount,
        companyName: rmb.companyName,
        walletId: rmb.walletId,
        walletHolderName: rmb.walletHolderName,
        status: rmb.status,
        referenceNumber: rmb.reimbursementNumber,
      });
    });

  // Sort by date descending
  return transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// ============================================
// STATUS HELPERS
// ============================================
export function getStatusColor(
  status: string
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'completed':
    case 'paid':
    case 'approved':
    case 'original_received':
    case 'active':
      return 'success';
    case 'pending':
    case 'draft':
      return 'warning';
    case 'rejected':
    case 'closed':
      return 'danger';
    case 'submitted':
      return 'info';
    default:
      return 'default';
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',
    rejected: 'Rejected',
    completed: 'Completed',
    draft: 'Draft',
    submitted: 'Submitted',
    original_received: 'Received',
    active: 'Active',
    closed: 'Closed',
  };
  return labels[status] || status;
}

// ============================================
// VALIDATION
// ============================================
export function validateLineItems(
  lineItems: PettyCashExpenseLineItem[]
): string[] {
  const errors: string[] = [];

  if (lineItems.length === 0) {
    errors.push('At least one line item is required');
    return errors;
  }

  lineItems.forEach((item, index) => {
    if (!item.projectId) {
      errors.push(`Line ${index + 1}: Project is required`);
    }
    if (!item.categoryId) {
      errors.push(`Line ${index + 1}: Category is required`);
    }
    if (item.amount <= 0) {
      errors.push(`Line ${index + 1}: Amount must be greater than 0`);
    }
  });

  return errors;
}

export function validateExpenseForm(data: {
  companyId: string;
  expenseDate: string;
  description: string;
  lineItems: PettyCashExpenseLineItem[];
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.companyId) {
    errors.companyId = 'Company is required';
  }
  if (!data.expenseDate) {
    errors.expenseDate = 'Expense date is required';
  }
  if (!data.description.trim()) {
    errors.description = 'Description is required';
  }

  const lineErrors = validateLineItems(data.lineItems);
  if (lineErrors.length > 0) {
    errors.lineItems = lineErrors.join('; ');
  }

  return errors;
}

// Simplified expense form validation (for petty cash holder)
export function validateSimplifiedExpenseForm(data: {
  companyId: string;
  projectId: string;
  expenseDate: string;
  amount: number;
  attachments: { id: string }[];
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.companyId) {
    errors.companyId = 'Company is required';
  }
  if (!data.projectId) {
    errors.projectId = 'Project is required';
  }
  if (!data.expenseDate) {
    errors.expenseDate = 'Expense date is required';
  }
  if (!data.amount || data.amount <= 0) {
    errors.amount = 'Amount must be greater than 0';
  }
  if (!data.attachments || data.attachments.length === 0) {
    errors.attachments = 'At least one receipt photo is required';
  }

  return errors;
}
