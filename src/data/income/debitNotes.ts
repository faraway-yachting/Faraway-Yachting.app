import type { DebitNote, DebitNoteStatus, PricingType, LineItem } from './types';
import { mockDebitNotes } from './mockData';
import { generateDebitNoteNumber, generateId, getTodayISO } from '@/lib/income/utils';
import { getReceiptById } from './receipts';

/**
 * Get all debit notes
 */
export function getAllDebitNotes(): DebitNote[] {
  return mockDebitNotes;
}

/**
 * Get debit note by ID
 */
export function getDebitNoteById(id: string): DebitNote | undefined {
  return mockDebitNotes.find((dn) => dn.id === id);
}

/**
 * Get debit notes by company
 */
export function getDebitNotesByCompany(companyId: string): DebitNote[] {
  return mockDebitNotes.filter((dn) => dn.companyId === companyId);
}

/**
 * Get debit notes by status
 */
export function getDebitNotesByStatus(status: DebitNoteStatus): DebitNote[] {
  return mockDebitNotes.filter((dn) => dn.status === status);
}

/**
 * Get debit notes by reference (e.g., receipt number)
 */
export function getDebitNotesByReference(reference: string): DebitNote[] {
  return mockDebitNotes.filter((dn) => dn.reference === reference);
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
      const preTaxAmount = lineTotal / (1 + item.taxRate / 100);
      subtotal += preTaxAmount;
      taxAmount += lineTotal - preTaxAmount;
    } else if (pricingType === 'exclude_vat') {
      subtotal += lineTotal;
      taxAmount += lineTotal * (item.taxRate / 100);
    } else {
      subtotal += lineTotal;
    }

    // Calculate WHT
    if (item.whtRate !== 0) {
      if (item.whtRate === 'custom') {
        whtAmount += item.customWhtAmount || 0;
      } else {
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
 * Create new debit note
 */
export function createDebitNote(data: Partial<DebitNote>): DebitNote {
  const companyDebitNotes = getDebitNotesByCompany(data.companyId || '');
  const debitNoteNumber = data.debitNoteNumber || generateDebitNoteNumber(
    data.companyId || '',
    companyDebitNotes.length
  );

  const now = new Date().toISOString();
  const debitNoteDate = data.debitNoteDate || getTodayISO();
  const lineItems = data.lineItems || [];
  const pricingType = data.pricingType || 'exclude_vat';

  const lineTotals = calculateLineItemTotals(lineItems, pricingType);

  const newDebitNote: DebitNote = {
    id: generateId(),
    debitNoteNumber,
    companyId: data.companyId || '',
    clientId: data.clientId || '',
    clientName: data.clientName || '',
    debitNoteDate,
    reference: data.reference,
    lineItems,
    pricingType,
    subtotal: lineTotals.subtotal,
    taxAmount: lineTotals.taxAmount,
    whtAmount: lineTotals.whtAmount,
    totalAmount: lineTotals.totalAmount,
    reason: data.reason || 'other',
    currency: data.currency || 'USD',
    status: data.status || 'draft',
    notes: data.notes,
    internalNotes: data.internalNotes,
    createdBy: data.createdBy || 'current-user',
    createdAt: now,
    updatedAt: now,
  };

  mockDebitNotes.push(newDebitNote);
  return newDebitNote;
}

/**
 * Create debit note from receipt - auto-fill receipt data
 */
export function createDebitNoteFromReceipt(receiptId: string): DebitNote | null {
  const receipt = getReceiptById(receiptId);
  if (!receipt) return null;

  // Copy line items from receipt with new IDs
  const lineItems: LineItem[] = receipt.lineItems.map((item) => ({
    ...item,
    id: generateId(),
  }));

  const debitNote = createDebitNote({
    companyId: receipt.companyId,
    clientId: receipt.clientId,
    clientName: receipt.clientName,
    reference: receipt.receiptNumber,
    lineItems,
    pricingType: receipt.pricingType,
    currency: receipt.currency,
    createdBy: receipt.createdBy,
  });

  return debitNote;
}

/**
 * Update debit note
 */
export function updateDebitNote(id: string, updates: Partial<DebitNote>): DebitNote | null {
  const index = mockDebitNotes.findIndex((dn) => dn.id === id);
  if (index === -1) return null;

  const currentDebitNote = mockDebitNotes[index];

  // Recalculate line item totals if line items or pricing type changed
  const lineItems = updates.lineItems ?? currentDebitNote.lineItems;
  const pricingType = updates.pricingType ?? currentDebitNote.pricingType;
  const lineTotals = calculateLineItemTotals(lineItems, pricingType);

  mockDebitNotes[index] = {
    ...mockDebitNotes[index],
    ...updates,
    lineItems,
    pricingType,
    subtotal: lineTotals.subtotal,
    taxAmount: lineTotals.taxAmount,
    whtAmount: lineTotals.whtAmount,
    totalAmount: lineTotals.totalAmount,
    updatedAt: new Date().toISOString(),
  };

  return mockDebitNotes[index];
}

/**
 * Delete debit note
 */
export function deleteDebitNote(id: string): boolean {
  const index = mockDebitNotes.findIndex((dn) => dn.id === id);
  if (index === -1) return false;

  mockDebitNotes.splice(index, 1);
  return true;
}

/**
 * Filter debit notes based on criteria
 */
export interface DebitNoteFilters {
  companyId?: string;
  projectId?: string;
  clientId?: string;
  reference?: string;
  status?: DebitNoteStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  searchQuery?: string;
}

export function filterDebitNotes(filters: DebitNoteFilters): DebitNote[] {
  return mockDebitNotes.filter((debitNote) => {
    if (filters.companyId && debitNote.companyId !== filters.companyId) return false;
    if (filters.projectId && !debitNote.lineItems.some(li => li.projectId === filters.projectId)) return false;
    if (filters.clientId && debitNote.clientId !== filters.clientId) return false;
    if (filters.reference && debitNote.reference !== filters.reference) return false;

    if (filters.status && filters.status !== 'all') {
      if (debitNote.status !== filters.status) return false;
    }

    if (filters.dateFrom && debitNote.debitNoteDate < filters.dateFrom) return false;
    if (filters.dateTo && debitNote.debitNoteDate > filters.dateTo) return false;
    if (filters.currency && debitNote.currency !== filters.currency) return false;

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesNumber = debitNote.debitNoteNumber.toLowerCase().includes(query);
      const matchesClient = debitNote.clientName.toLowerCase().includes(query);
      const matchesReference = (debitNote.reference || '').toLowerCase().includes(query);
      if (!matchesNumber && !matchesClient && !matchesReference) return false;
    }

    return true;
  });
}
