import type { Currency } from '@/data/company/types';
import type { LineItem, PricingType, PaymentTerms } from '@/data/income/types';

/**
 * Calculate document totals based on line items and pricing type
 */
export function calculateDocumentTotals(
  lineItems: LineItem[],
  pricingType: PricingType
): { subtotal: number; taxAmount: number; totalAmount: number } {
  if (!lineItems || lineItems.length === 0) {
    return { subtotal: 0, taxAmount: 0, totalAmount: 0 };
  }

  let subtotal = 0;
  let taxAmount = 0;

  lineItems.forEach((item) => {
    const lineSubtotal = item.quantity * item.unitPrice;

    if (pricingType === 'exclude_vat') {
      // Prices are net, VAT added on top
      subtotal += lineSubtotal;
      taxAmount += lineSubtotal * (item.taxRate / 100);
    } else if (pricingType === 'include_vat') {
      // Prices are gross, VAT extracted
      const grossAmount = lineSubtotal;
      const netAmount = grossAmount / (1 + item.taxRate / 100);
      subtotal += netAmount;
      taxAmount += grossAmount - netAmount;
    } else {
      // no_vat - no tax applied
      subtotal += lineSubtotal;
      // taxAmount stays 0
    }
  });

  const totalAmount = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Calculate line item total based on pricing type
 */
export function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number,
  pricingType: PricingType
): number {
  const lineSubtotal = quantity * unitPrice;

  if (pricingType === 'exclude_vat') {
    // Prices are net, VAT added on top
    return lineSubtotal * (1 + taxRate / 100);
  } else if (pricingType === 'include_vat') {
    // Prices are gross, VAT already included
    return lineSubtotal;
  } else {
    // no_vat - no tax applied
    return lineSubtotal;
  }
}

import { getNumberFormat, generateDocumentNumber } from '@/data/settings/numberFormats';

/**
 * Generate quotation number (per company)
 * Default format: QO-YYMMXXXX (e.g., QO-25010001)
 * Can be customized via Settings > Document Numbering
 */
export function generateQuotationNumber(companyId: string, existingCount: number = 0): string {
  const config = getNumberFormat(companyId, 'quotation');
  return generateDocumentNumber(config, existingCount + 1);
}

/**
 * Generate invoice number (per company)
 * Default format: INV-YYMMXXXX (e.g., INV-25010001)
 * Can be customized via Settings > Document Numbering
 */
export function generateInvoiceNumber(companyId: string, existingCount: number = 0): string {
  const config = getNumberFormat(companyId, 'invoice');
  return generateDocumentNumber(config, existingCount + 1);
}

/**
 * Generate receipt number (per company)
 * Default format: RE-YYMMXXXX (e.g., RE-25020001)
 * Can be customized via Settings > Document Numbering
 */
export function generateReceiptNumber(companyId: string, existingCount: number = 0): string {
  const config = getNumberFormat(companyId, 'receipt');
  return generateDocumentNumber(config, existingCount + 1);
}

/**
 * Generate credit note number (per company)
 * Default format: CN-YYMMXXXX (e.g., CN-26010001)
 * Can be customized via Settings > Document Numbering
 */
export function generateCreditNoteNumber(companyId: string, existingCount: number = 0): string {
  const config = getNumberFormat(companyId, 'creditNote');
  return generateDocumentNumber(config, existingCount + 1);
}

/**
 * Generate debit note number (per company)
 * Default format: DN-YYMMXXXX (e.g., DN-26010001)
 * Can be customized via Settings > Document Numbering
 */
export function generateDebitNoteNumber(companyId: string, existingCount: number = 0): string {
  const config = getNumberFormat(companyId, 'debitNote');
  return generateDocumentNumber(config, existingCount + 1);
}

/**
 * Calculate due date from invoice date and payment terms
 */
export function calculateDueDate(invoiceDate: string, paymentTerms: PaymentTerms): string {
  const date = new Date(invoiceDate);

  switch (paymentTerms) {
    case 'due_on_receipt':
      return invoiceDate;
    case 'net_15':
      date.setDate(date.getDate() + 15);
      break;
    case 'net_30':
      date.setDate(date.getDate() + 30);
      break;
    case 'net_60':
      date.setDate(date.getDate() + 60);
      break;
    case 'custom':
      // For custom terms, return invoice date and let user override
      return invoiceDate;
  }

  return date.toISOString().split('T')[0];
}

/**
 * Calculate days outstanding from invoice date to today
 */
export function calculateDaysOutstanding(invoiceDate: string): number {
  const invoice = new Date(invoiceDate);
  const today = new Date();
  const diff = today.getTime() - invoice.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date to display format (e.g., "Jan 15, 2025")
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Add days to a date and return ISO format
 */
export function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate WHT (Withholding Tax) amount for a single line item
 * WHT is calculated from the pre-VAT amount
 */
export function calculateLineWhtAmount(
  item: LineItem,
  pricingType: PricingType
): number {
  if (item.whtRate === 0) return 0;
  if (item.whtRate === 'custom') return item.customWhtAmount || 0;

  const lineSubtotal = item.quantity * item.unitPrice;
  let preVatAmount: number;

  if (pricingType === 'include_vat') {
    preVatAmount = lineSubtotal / (1 + item.taxRate / 100);
  } else {
    preVatAmount = lineSubtotal;
  }

  return preVatAmount * (item.whtRate / 100);
}

/**
 * Calculate total WHT amount for all line items
 */
export function calculateTotalWhtAmount(
  lineItems: LineItem[],
  pricingType: PricingType
): number {
  return lineItems.reduce((sum, item) => {
    return sum + calculateLineWhtAmount(item, pricingType);
  }, 0);
}
