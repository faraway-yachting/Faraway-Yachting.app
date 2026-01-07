import type { CreditNote, CreditNoteStatus, PricingType, LineItem } from './types';
import { mockCreditNotes } from './mockData';
import { generateCreditNoteNumber, generateId, getTodayISO } from '@/lib/income/utils';
import { getReceiptById } from './receipts';

/**
 * Get all credit notes
 */
export function getAllCreditNotes(): CreditNote[] {
  return mockCreditNotes;
}

/**
 * Get credit note by ID
 */
export function getCreditNoteById(id: string): CreditNote | undefined {
  return mockCreditNotes.find((cn) => cn.id === id);
}

/**
 * Get credit notes by company
 */
export function getCreditNotesByCompany(companyId: string): CreditNote[] {
  return mockCreditNotes.filter((cn) => cn.companyId === companyId);
}

/**
 * Get credit notes by status
 */
export function getCreditNotesByStatus(status: CreditNoteStatus): CreditNote[] {
  return mockCreditNotes.filter((cn) => cn.status === status);
}

/**
 * Get credit notes by reference (e.g., receipt number)
 */
export function getCreditNotesByReference(reference: string): CreditNote[] {
  return mockCreditNotes.filter((cn) => cn.reference === reference);
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
 * Create new credit note
 */
export function createCreditNote(data: Partial<CreditNote>): CreditNote {
  const companyCreditNotes = getCreditNotesByCompany(data.companyId || '');
  const creditNoteNumber = data.creditNoteNumber || generateCreditNoteNumber(
    data.companyId || '',
    companyCreditNotes.length
  );

  const now = new Date().toISOString();
  const creditNoteDate = data.creditNoteDate || getTodayISO();
  const lineItems = data.lineItems || [];
  const pricingType = data.pricingType || 'exclude_vat';

  const lineTotals = calculateLineItemTotals(lineItems, pricingType);

  const newCreditNote: CreditNote = {
    id: generateId(),
    creditNoteNumber,
    companyId: data.companyId || '',
    clientId: data.clientId || '',
    clientName: data.clientName || '',
    creditNoteDate,
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

  mockCreditNotes.push(newCreditNote);
  return newCreditNote;
}

/**
 * Create credit note from receipt - auto-fill receipt data
 */
export function createCreditNoteFromReceipt(receiptId: string): CreditNote | null {
  const receipt = getReceiptById(receiptId);
  if (!receipt) return null;

  // Copy line items from receipt with new IDs
  const lineItems: LineItem[] = receipt.lineItems.map((item) => ({
    ...item,
    id: generateId(),
  }));

  const creditNote = createCreditNote({
    companyId: receipt.companyId,
    clientId: receipt.clientId,
    clientName: receipt.clientName,
    reference: receipt.receiptNumber,
    lineItems,
    pricingType: receipt.pricingType,
    currency: receipt.currency,
    createdBy: receipt.createdBy,
  });

  return creditNote;
}

/**
 * Update credit note
 */
export function updateCreditNote(id: string, updates: Partial<CreditNote>): CreditNote | null {
  const index = mockCreditNotes.findIndex((cn) => cn.id === id);
  if (index === -1) return null;

  const currentCreditNote = mockCreditNotes[index];

  // Recalculate line item totals if line items or pricing type changed
  const lineItems = updates.lineItems ?? currentCreditNote.lineItems;
  const pricingType = updates.pricingType ?? currentCreditNote.pricingType;
  const lineTotals = calculateLineItemTotals(lineItems, pricingType);

  mockCreditNotes[index] = {
    ...mockCreditNotes[index],
    ...updates,
    lineItems,
    pricingType,
    subtotal: lineTotals.subtotal,
    taxAmount: lineTotals.taxAmount,
    whtAmount: lineTotals.whtAmount,
    totalAmount: lineTotals.totalAmount,
    updatedAt: new Date().toISOString(),
  };

  return mockCreditNotes[index];
}

/**
 * Delete credit note
 */
export function deleteCreditNote(id: string): boolean {
  const index = mockCreditNotes.findIndex((cn) => cn.id === id);
  if (index === -1) return false;

  mockCreditNotes.splice(index, 1);
  return true;
}

/**
 * Filter credit notes based on criteria
 */
export interface CreditNoteFilters {
  companyId?: string;
  projectId?: string;
  clientId?: string;
  reference?: string;
  status?: CreditNoteStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  searchQuery?: string;
}

export function filterCreditNotes(filters: CreditNoteFilters): CreditNote[] {
  return mockCreditNotes.filter((creditNote) => {
    if (filters.companyId && creditNote.companyId !== filters.companyId) return false;
    if (filters.projectId && !creditNote.lineItems.some(li => li.projectId === filters.projectId)) return false;
    if (filters.clientId && creditNote.clientId !== filters.clientId) return false;
    if (filters.reference && creditNote.reference !== filters.reference) return false;

    if (filters.status && filters.status !== 'all') {
      if (creditNote.status !== filters.status) return false;
    }

    if (filters.dateFrom && creditNote.creditNoteDate < filters.dateFrom) return false;
    if (filters.dateTo && creditNote.creditNoteDate > filters.dateTo) return false;
    if (filters.currency && creditNote.currency !== filters.currency) return false;

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesNumber = creditNote.creditNoteNumber.toLowerCase().includes(query);
      const matchesClient = creditNote.clientName.toLowerCase().includes(query);
      const matchesReference = (creditNote.reference || '').toLowerCase().includes(query);
      if (!matchesNumber && !matchesClient && !matchesReference) return false;
    }

    return true;
  });
}
