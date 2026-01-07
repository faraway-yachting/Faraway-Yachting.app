import type { Quotation, QuotationStatus } from './types';
import { mockQuotations } from './mockData';
import { generateQuotationNumber, generateId, getTodayISO } from '@/lib/income/utils';

/**
 * Get all quotations
 */
export function getAllQuotations(): Quotation[] {
  return mockQuotations;
}

/**
 * Get quotation by ID
 */
export function getQuotationById(id: string): Quotation | undefined {
  return mockQuotations.find((q) => q.id === id);
}

/**
 * Get quotations by company
 */
export function getQuotationsByCompany(companyId: string): Quotation[] {
  return mockQuotations.filter((q) => q.companyId === companyId);
}

/**
 * Get quotations by status
 */
export function getQuotationsByStatus(status: QuotationStatus): Quotation[] {
  return mockQuotations.filter((q) => q.status === status);
}

/**
 * Create new quotation
 */
export function createQuotation(data: Partial<Quotation>): Quotation {
  // Count existing quotations for this company to generate number
  const companyQuotations = getQuotationsByCompany(data.companyId || '');
  const quotationNumber = data.quotationNumber || generateQuotationNumber(
    data.companyId || '',
    companyQuotations.length
  );

  const now = new Date().toISOString();

  const newQuotation: Quotation = {
    id: generateId(),
    quotationNumber,
    companyId: data.companyId || '',
    clientId: data.clientId || '',
    clientName: data.clientName || '',
    charterPeriodFrom: data.charterPeriodFrom,
    charterPeriodTo: data.charterPeriodTo,
    dateCreated: data.dateCreated || getTodayISO(),
    validUntil: data.validUntil || getTodayISO(),
    pricingType: data.pricingType || 'exclude_vat',
    lineItems: data.lineItems || [],
    subtotal: data.subtotal || 0,
    taxAmount: data.taxAmount || 0,
    totalAmount: data.totalAmount || 0,
    currency: data.currency || 'USD',
    status: data.status || 'draft',
    termsAndConditions: data.termsAndConditions,
    notes: data.notes,
    convertedToInvoiceId: data.convertedToInvoiceId,
    createdBy: data.createdBy || 'current-user',
    createdAt: now,
    updatedAt: now,
  };

  mockQuotations.push(newQuotation);
  return newQuotation;
}

/**
 * Update quotation
 */
export function updateQuotation(id: string, updates: Partial<Quotation>): Quotation | null {
  const index = mockQuotations.findIndex((q) => q.id === id);
  if (index === -1) return null;

  mockQuotations[index] = {
    ...mockQuotations[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return mockQuotations[index];
}

/**
 * Delete quotation
 */
export function deleteQuotation(id: string): boolean {
  const index = mockQuotations.findIndex((q) => q.id === id);
  if (index === -1) return false;

  mockQuotations.splice(index, 1);
  return true;
}

/**
 * Filter quotations based on criteria
 */
export interface QuotationFilters {
  companyId?: string;
  projectId?: string;
  clientId?: string;
  status?: QuotationStatus | 'all' | 'recent';
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  searchQuery?: string;
}

export function filterQuotations(filters: QuotationFilters): Quotation[] {
  return mockQuotations.filter((quotation) => {
    // Company filter
    if (filters.companyId && quotation.companyId !== filters.companyId) return false;

    // Project filter (check line items)
    if (filters.projectId && !quotation.lineItems.some(li => li.projectId === filters.projectId)) return false;

    // Client filter
    if (filters.clientId && quotation.clientId !== filters.clientId) return false;

    // Status filter
    if (filters.status && filters.status !== 'all' && filters.status !== 'recent') {
      if (quotation.status !== filters.status) return false;
    }

    // Date range filter
    if (filters.dateFrom && quotation.dateCreated < filters.dateFrom) return false;
    if (filters.dateTo && quotation.dateCreated > filters.dateTo) return false;

    // Currency filter
    if (filters.currency && quotation.currency !== filters.currency) return false;

    // Search query (quotation number or client name)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesNumber = quotation.quotationNumber.toLowerCase().includes(query);
      const matchesClient = quotation.clientName.toLowerCase().includes(query);
      if (!matchesNumber && !matchesClient) return false;
    }

    return true;
  });
}

/**
 * Check if quotation is expired
 */
export function isQuotationExpired(quotation: Quotation): boolean {
  const today = new Date();
  const validUntil = new Date(quotation.validUntil);
  return today > validUntil && quotation.status === 'draft';
}

/**
 * Get quotations expiring soon (within N days)
 */
export function getQuotationsExpiringSoon(days: number = 7): Quotation[] {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return mockQuotations.filter((q) => {
    if (q.status !== 'draft') return false;
    const validUntil = new Date(q.validUntil);
    return validUntil >= today && validUntil <= futureDate;
  });
}
