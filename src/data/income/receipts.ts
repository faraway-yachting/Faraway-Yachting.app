import type { Receipt, ReceiptStatus, PaymentRecord, AdjustmentType, PricingType, LineItem } from './types';
import { mockReceipts } from './mockData';
import { generateReceiptNumber, generateId, getTodayISO } from '@/lib/income/utils';
import { getInvoiceById, updateInvoice } from './invoices';

/**
 * Get all receipts
 */
export function getAllReceipts(): Receipt[] {
  return mockReceipts;
}

/**
 * Get receipt by ID
 */
export function getReceiptById(id: string): Receipt | undefined {
  return mockReceipts.find((r) => r.id === id);
}

/**
 * Get receipts by company
 */
export function getReceiptsByCompany(companyId: string): Receipt[] {
  return mockReceipts.filter((r) => r.companyId === companyId);
}

/**
 * Get receipts by status
 */
export function getReceiptsByStatus(status: ReceiptStatus): Receipt[] {
  return mockReceipts.filter((r) => r.status === status);
}

/**
 * Get receipts by reference (e.g., invoice number)
 */
export function getReceiptsByReference(reference: string): Receipt[] {
  return mockReceipts.filter((r) => r.reference === reference);
}

/**
 * Calculate receipt totals from payments and adjustment
 */
export function calculateReceiptTotals(
  payments: PaymentRecord[],
  adjustmentType: AdjustmentType,
  adjustmentAmount: number,
  netAmountToPay: number
): { totalPayments: number; totalReceived: number; remainingAmount: number } {
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  let totalReceived = totalPayments;
  if (adjustmentType === 'add') {
    totalReceived += adjustmentAmount;
  } else if (adjustmentType === 'deduct') {
    totalReceived -= adjustmentAmount;
  }

  const remainingAmount = netAmountToPay - totalReceived;

  return {
    totalPayments: Math.round(totalPayments * 100) / 100,
    totalReceived: Math.round(totalReceived * 100) / 100,
    remainingAmount: Math.round(remainingAmount * 100) / 100,
  };
}

/**
 * Calculate line item totals based on pricing type
 */
export function calculateLineItemTotals(
  lineItems: LineItem[],
  pricingType: PricingType
): { subtotal: number; taxAmount: number; whtAmount: number; totalAmount: number } {
  let subtotal = 0;
  let taxAmount = 0;
  let whtAmount = 0;

  lineItems.forEach((item) => {
    const lineTotal = item.quantity * item.unitPrice;

    if (pricingType === 'include_vat') {
      // Price includes VAT, so we need to extract it
      const preTaxAmount = lineTotal / (1 + item.taxRate / 100);
      subtotal += preTaxAmount;
      taxAmount += lineTotal - preTaxAmount;
    } else if (pricingType === 'exclude_vat') {
      // Price excludes VAT
      subtotal += lineTotal;
      taxAmount += lineTotal * (item.taxRate / 100);
    } else {
      // No VAT
      subtotal += lineTotal;
    }

    // Calculate WHT
    if (item.whtRate !== 0) {
      if (item.whtRate === 'custom') {
        whtAmount += item.customWhtAmount || 0;
      } else {
        // WHT is calculated on pre-VAT amount
        const preVatAmount = pricingType === 'include_vat'
          ? lineTotal / (1 + item.taxRate / 100)
          : lineTotal;
        whtAmount += preVatAmount * (item.whtRate / 100);
      }
    }
  });

  const totalAmount = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    whtAmount: Math.round(whtAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Create new receipt
 */
export function createReceipt(data: Partial<Receipt>): Receipt {
  // Count existing receipts for this company to generate number
  const companyReceipts = getReceiptsByCompany(data.companyId || '');
  const receiptNumber = data.receiptNumber || generateReceiptNumber(
    data.companyId || '',
    companyReceipts.length
  );

  const now = new Date().toISOString();
  const receiptDate = data.receiptDate || getTodayISO();
  const lineItems = data.lineItems || [];
  const pricingType = data.pricingType || 'exclude_vat';
  const payments = data.payments || [];
  const adjustmentType = data.adjustmentType || 'none';
  const adjustmentAmount = data.adjustmentAmount || 0;

  // Calculate line item totals
  const lineTotals = calculateLineItemTotals(lineItems, pricingType);
  const netAmountToPay = lineTotals.totalAmount - lineTotals.whtAmount;

  // Calculate payment totals
  const paymentTotals = calculateReceiptTotals(
    payments,
    adjustmentType,
    adjustmentAmount,
    netAmountToPay
  );

  const newReceipt: Receipt = {
    id: generateId(),
    receiptNumber,
    companyId: data.companyId || '',
    clientId: data.clientId || '',
    clientName: data.clientName || '',
    receiptDate,
    reference: data.reference,
    lineItems,
    pricingType,
    subtotal: lineTotals.subtotal,
    taxAmount: lineTotals.taxAmount,
    whtAmount: lineTotals.whtAmount,
    totalAmount: lineTotals.totalAmount,
    payments,
    adjustmentType,
    adjustmentAmount,
    adjustmentAccountCode: data.adjustmentAccountCode,
    adjustmentRemark: data.adjustmentRemark,
    netAmountToPay: Math.round(netAmountToPay * 100) / 100,
    totalPayments: paymentTotals.totalPayments,
    totalReceived: paymentTotals.totalReceived,
    remainingAmount: paymentTotals.remainingAmount,
    currency: data.currency || 'USD',
    status: data.status || 'draft',
    notes: data.notes,
    internalNotes: data.internalNotes,
    createdBy: data.createdBy || 'current-user',
    createdAt: now,
    updatedAt: now,
  };

  mockReceipts.push(newReceipt);
  return newReceipt;
}

/**
 * Create receipt from invoice - auto-fill invoice data
 */
export function createReceiptFromInvoice(invoiceId: string): Receipt | null {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return null;

  // Copy line items from invoice with new IDs
  const lineItems: LineItem[] = invoice.lineItems.map((item) => ({
    ...item,
    id: generateId(),
  }));

  // Calculate totals from line items
  const lineTotals = calculateLineItemTotals(lineItems, invoice.pricingType);
  const netAmountToPay = lineTotals.totalAmount - lineTotals.whtAmount;

  // Create receipt with invoice data pre-filled
  const receipt = createReceipt({
    companyId: invoice.companyId,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    reference: invoice.invoiceNumber,
    lineItems,
    pricingType: invoice.pricingType,
    currency: invoice.currency,
    payments: [
      {
        id: generateId(),
        paymentDate: getTodayISO(),
        amount: Math.round(netAmountToPay * 100) / 100,
        receivedAt: '',
        remark: '',
      },
    ],
    createdBy: invoice.createdBy,
  });

  return receipt;
}

/**
 * Update receipt
 */
export function updateReceipt(id: string, updates: Partial<Receipt>): Receipt | null {
  const index = mockReceipts.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const currentReceipt = mockReceipts[index];

  // Recalculate line item totals if line items or pricing type changed
  const lineItems = updates.lineItems ?? currentReceipt.lineItems;
  const pricingType = updates.pricingType ?? currentReceipt.pricingType;
  const lineTotals = calculateLineItemTotals(lineItems, pricingType);
  const netAmountToPay = lineTotals.totalAmount - lineTotals.whtAmount;

  // Recalculate payment totals
  const payments = updates.payments ?? currentReceipt.payments;
  const adjustmentType = updates.adjustmentType ?? currentReceipt.adjustmentType;
  const adjustmentAmount = updates.adjustmentAmount ?? currentReceipt.adjustmentAmount;

  const paymentTotals = calculateReceiptTotals(
    payments,
    adjustmentType,
    adjustmentAmount,
    netAmountToPay
  );

  mockReceipts[index] = {
    ...mockReceipts[index],
    ...updates,
    lineItems,
    pricingType,
    subtotal: lineTotals.subtotal,
    taxAmount: lineTotals.taxAmount,
    whtAmount: lineTotals.whtAmount,
    totalAmount: lineTotals.totalAmount,
    netAmountToPay: Math.round(netAmountToPay * 100) / 100,
    totalPayments: paymentTotals.totalPayments,
    totalReceived: paymentTotals.totalReceived,
    remainingAmount: paymentTotals.remainingAmount,
    updatedAt: new Date().toISOString(),
  };

  // If status changed to 'paid', find related invoice by reference and update amountPaid
  if (updates.status === 'paid' && currentReceipt.status !== 'paid' && currentReceipt.reference) {
    // Try to find the invoice by its number (reference)
    // Note: This is a simplified approach; in production, you might want to store invoiceId explicitly
  }

  return mockReceipts[index];
}

/**
 * Delete receipt
 */
export function deleteReceipt(id: string): boolean {
  const index = mockReceipts.findIndex((r) => r.id === id);
  if (index === -1) return false;

  mockReceipts.splice(index, 1);
  return true;
}

/**
 * Filter receipts based on criteria
 */
export interface ReceiptFilters {
  companyId?: string;
  projectId?: string;
  clientId?: string;
  reference?: string;
  status?: ReceiptStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  searchQuery?: string;
}

export function filterReceipts(filters: ReceiptFilters): Receipt[] {
  return mockReceipts.filter((receipt) => {
    // Company filter
    if (filters.companyId && receipt.companyId !== filters.companyId) return false;

    // Project filter (check line items)
    if (filters.projectId && !receipt.lineItems.some(li => li.projectId === filters.projectId)) return false;

    // Client filter
    if (filters.clientId && receipt.clientId !== filters.clientId) return false;

    // Reference filter
    if (filters.reference && receipt.reference !== filters.reference) return false;

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (receipt.status !== filters.status) return false;
    }

    // Date range filter (using receipt date)
    if (filters.dateFrom && receipt.receiptDate < filters.dateFrom) return false;
    if (filters.dateTo && receipt.receiptDate > filters.dateTo) return false;

    // Currency filter
    if (filters.currency && receipt.currency !== filters.currency) return false;

    // Search query (receipt number, client name, or reference)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesNumber = receipt.receiptNumber.toLowerCase().includes(query);
      const matchesClient = receipt.clientName.toLowerCase().includes(query);
      const matchesReference = (receipt.reference || '').toLowerCase().includes(query);
      if (!matchesNumber && !matchesClient && !matchesReference) return false;
    }

    return true;
  });
}

/**
 * Get total received amount for an invoice (from all receipts by reference)
 */
export function getTotalReceivedForInvoice(invoiceNumber: string): number {
  const receipts = getReceiptsByReference(invoiceNumber);
  return receipts
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.totalReceived, 0);
}
