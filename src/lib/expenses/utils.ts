/**
 * Expense Utility Functions
 *
 * Calculation and formatting utilities for the Expenses module.
 */

import { Currency } from '@/data/company/types';
import {
  ExpenseLineItem,
  ExpensePricingType,
  WhtRate,
  WhtBaseCalculation,
} from '@/data/expenses/types';

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Add days to a date string
 */
export function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate days until due date
 */
export function getDaysUntilDue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is overdue
 */
export function isOverdue(dueDate: string): boolean {
  return getDaysUntilDue(dueDate) < 0;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// Currency Formatting
// ============================================================================

const currencyFormats: Record<Currency, { symbol: string; locale: string }> = {
  THB: { symbol: '฿', locale: 'th-TH' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  SGD: { symbol: 'S$', locale: 'en-SG' },
  AED: { symbol: 'AED', locale: 'ar-AE' },
};

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const format = currencyFormats[currency] || currencyFormats.THB;
  const formatted = new Intl.NumberFormat(format.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${format.symbol}${formatted}`;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// ============================================================================
// Line Item Calculations
// ============================================================================

/**
 * Calculate line item amount based on pricing type
 */
export function calculateLineItemAmount(
  quantity: number,
  unitPrice: number,
  pricingType: ExpensePricingType
): number {
  // For all pricing types, the line amount is qty * price
  // The difference is how VAT is handled at the document level
  return quantity * unitPrice;
}

/**
 * Calculate pre-VAT amount for WHT calculation
 */
export function calculatePreVatAmount(
  amount: number,
  taxRate: number,
  pricingType: ExpensePricingType
): number {
  if (pricingType === 'include_vat' && taxRate > 0) {
    // Extract pre-VAT from gross amount
    return amount / (1 + taxRate / 100);
  }
  // For exclude_vat and no_vat, amount is already pre-VAT
  return amount;
}

/**
 * Calculate WHT amount based on settings
 */
export function calculateWhtAmount(
  preVatAmount: number,
  totalAmount: number,
  whtRate: WhtRate,
  whtBaseCalculation: WhtBaseCalculation,
  customWhtAmount?: number
): number {
  if (whtRate === 0) return 0;

  if (whtBaseCalculation === 'manual' || whtRate === 'custom') {
    return customWhtAmount || 0;
  }

  const rate = typeof whtRate === 'number' ? whtRate : 0;

  if (whtBaseCalculation === 'total') {
    // Calculate WHT from total amount (including VAT)
    return (totalAmount * rate) / 100;
  }

  // Default: calculate from pre-VAT amount
  return (preVatAmount * rate) / 100;
}

/**
 * Calculate line item totals
 */
export function calculateLineItem(
  quantity: number,
  unitPrice: number,
  taxRate: number,
  whtRate: WhtRate,
  whtBaseCalculation: WhtBaseCalculation,
  pricingType: ExpensePricingType,
  customWhtAmount?: number
): {
  amount: number;
  preVatAmount: number;
  whtAmount: number;
  vatAmount: number;
} {
  const amount = calculateLineItemAmount(quantity, unitPrice, pricingType);
  const preVatAmount = calculatePreVatAmount(amount, taxRate, pricingType);

  let vatAmount = 0;
  if (pricingType === 'exclude_vat') {
    vatAmount = preVatAmount * (taxRate / 100);
  } else if (pricingType === 'include_vat') {
    vatAmount = amount - preVatAmount;
  }

  const totalWithVat = pricingType === 'exclude_vat' ? amount + vatAmount : amount;

  const whtAmount = calculateWhtAmount(
    preVatAmount,
    totalWithVat,
    whtRate,
    whtBaseCalculation,
    customWhtAmount
  );

  return {
    amount,
    preVatAmount,
    whtAmount,
    vatAmount,
  };
}

// ============================================================================
// Document Totals Calculation
// ============================================================================

/**
 * Calculate document totals from line items
 */
export function calculateDocumentTotals(
  lineItems: ExpenseLineItem[],
  pricingType: ExpensePricingType
): {
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  whtAmount: number;
  netPayable: number;
} {
  let subtotal = 0;
  let vatAmount = 0;
  let whtAmount = 0;

  for (const item of lineItems) {
    const preVat = calculatePreVatAmount(item.amount, item.taxRate, pricingType);

    if (pricingType === 'exclude_vat') {
      subtotal += item.amount;
      vatAmount += item.amount * (item.taxRate / 100);
    } else if (pricingType === 'include_vat') {
      subtotal += preVat;
      vatAmount += item.amount - preVat;
    } else {
      // no_vat
      subtotal += item.amount;
    }

    whtAmount += item.whtAmount;
  }

  const totalAmount = subtotal + vatAmount;
  const netPayable = totalAmount - whtAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    whtAmount: Math.round(whtAmount * 100) / 100,
    netPayable: Math.round(netPayable * 100) / 100,
  };
}

// ============================================================================
// WHT Certificate Helpers
// ============================================================================

/**
 * Get WHT rate options
 */
export function getWhtRateOptions(): { value: WhtRate; label: string }[] {
  return [
    { value: 0, label: 'No WHT (0%)' },
    { value: 0.75, label: '0.75%' },
    { value: 1, label: '1%' },
    { value: 1.5, label: '1.5%' },
    { value: 2, label: '2%' },
    { value: 3, label: '3%' },
    { value: 5, label: '5%' },
    { value: 10, label: '10%' },
    { value: 15, label: '15%' },
    { value: 'custom', label: 'Custom Amount' },
  ];
}

/**
 * Determine WHT form type based on vendor
 */
export function determineWhtFormType(isCompany: boolean): 'pnd3' | 'pnd53' {
  return isCompany ? 'pnd53' : 'pnd3';
}

/**
 * Get tax period from date
 */
export function getTaxPeriod(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate expense line item
 */
export function validateLineItem(item: Partial<ExpenseLineItem>): string[] {
  const errors: string[] = [];

  if (!item.description?.trim()) {
    errors.push('Description is required');
  }

  if (!item.quantity || item.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (item.unitPrice === undefined || item.unitPrice < 0) {
    errors.push('Unit price must be 0 or greater');
  }

  if (!item.projectId) {
    errors.push('Project is required for each line item');
  }

  if (item.whtRate === 'custom' && !item.customWhtAmount) {
    errors.push('Custom WHT amount is required when WHT rate is "custom"');
  }

  return errors;
}

/**
 * Validate expense record for approval
 */
export function validateExpenseForApproval(expense: {
  vendorId?: string;
  companyId?: string;
  lineItems?: ExpenseLineItem[];
  expenseDate?: string;
}): string[] {
  const errors: string[] = [];

  if (!expense.companyId) {
    errors.push('Company is required');
  }

  if (!expense.vendorId) {
    errors.push('Vendor is required');
  }

  if (!expense.expenseDate) {
    errors.push('Expense date is required');
  }

  if (!expense.lineItems || expense.lineItems.length === 0) {
    errors.push('At least one line item is required');
  } else {
    expense.lineItems.forEach((item, index) => {
      const itemErrors = validateLineItem(item);
      itemErrors.forEach((err) => {
        errors.push(`Line ${index + 1}: ${err}`);
      });
    });
  }

  return errors;
}

// ============================================================================
// Payment Status Helpers
// ============================================================================

/**
 * Calculate payment status
 */
export function calculatePaymentStatus(
  netPayable: number,
  amountPaid: number
): 'unpaid' | 'partially_paid' | 'paid' {
  if (amountPaid >= netPayable) {
    return 'paid';
  }
  if (amountPaid > 0) {
    return 'partially_paid';
  }
  return 'unpaid';
}

/**
 * Get payment status label
 */
export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    unpaid: 'Unpaid',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
  };
  return labels[status] || status;
}

/**
 * Get receipt status label
 */
export function getReceiptStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    received: 'Received',
    not_required: 'Not Required',
  };
  return labels[status] || status;
}

/**
 * Get expense status label
 */
export function getExpenseStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    approved: 'Approved',
    void: 'Void',
  };
  return labels[status] || status;
}

// ============================================================================
// File Size Helpers
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}
