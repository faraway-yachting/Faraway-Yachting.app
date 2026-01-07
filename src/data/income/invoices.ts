import type { Invoice, InvoiceStatus, PaymentTerms } from './types';
import { mockInvoices } from './mockData';
import { generateInvoiceNumber, generateId, getTodayISO, calculateDueDate } from '@/lib/income/utils';
import { getQuotationById, updateQuotation } from './quotations';

/**
 * Get all invoices
 */
export function getAllInvoices(): Invoice[] {
  return mockInvoices;
}

/**
 * Get invoice by ID
 */
export function getInvoiceById(id: string): Invoice | undefined {
  return mockInvoices.find((i) => i.id === id);
}

/**
 * Get invoices by company
 */
export function getInvoicesByCompany(companyId: string): Invoice[] {
  return mockInvoices.filter((i) => i.companyId === companyId);
}

/**
 * Get invoices by status
 */
export function getInvoicesByStatus(status: InvoiceStatus): Invoice[] {
  return mockInvoices.filter((i) => i.status === status);
}

/**
 * Get invoices by quotation
 */
export function getInvoiceByQuotationId(quotationId: string): Invoice | undefined {
  return mockInvoices.find((i) => i.quotationId === quotationId);
}

/**
 * Create new invoice
 */
export function createInvoice(data: Partial<Invoice>): Invoice {
  // Count existing invoices for this company to generate number
  const companyInvoices = getInvoicesByCompany(data.companyId || '');
  const invoiceNumber = data.invoiceNumber || generateInvoiceNumber(
    data.companyId || '',
    companyInvoices.length
  );

  const now = new Date().toISOString();
  const invoiceDate = data.invoiceDate || getTodayISO();
  const paymentTerms = data.paymentTerms || 'due_on_receipt';
  const dueDate = data.dueDate || calculateDueDate(invoiceDate, paymentTerms);

  const newInvoice: Invoice = {
    id: generateId(),
    invoiceNumber,
    companyId: data.companyId || '',
    clientId: data.clientId || '',
    clientName: data.clientName || '',
    quotationId: data.quotationId,
    charterPeriodFrom: data.charterPeriodFrom,
    charterPeriodTo: data.charterPeriodTo,
    invoiceDate,
    dueDate,
    paymentTerms,
    pricingType: data.pricingType || 'exclude_vat',
    lineItems: data.lineItems || [],
    subtotal: data.subtotal || 0,
    taxAmount: data.taxAmount || 0,
    totalAmount: data.totalAmount || 0,
    amountPaid: data.amountPaid || 0,
    amountOutstanding: data.totalAmount || 0,
    currency: data.currency || 'USD',
    status: data.status || 'draft',
    reference: data.reference,
    notes: data.notes,
    internalNotes: data.internalNotes,
    createdBy: data.createdBy || 'current-user',
    createdAt: now,
    updatedAt: now,
  };

  mockInvoices.push(newInvoice);
  return newInvoice;
}

/**
 * Create invoice from quotation
 */
export function createInvoiceFromQuotation(quotationId: string): Invoice | null {
  const quotation = getQuotationById(quotationId);
  if (!quotation) return null;

  // Check if already converted
  if (quotation.convertedToInvoiceId) {
    return getInvoiceById(quotation.convertedToInvoiceId) || null;
  }

  // Create new invoice from quotation data
  const invoice = createInvoice({
    companyId: quotation.companyId,
    clientId: quotation.clientId,
    clientName: quotation.clientName,
    quotationId: quotation.id,
    charterPeriodFrom: quotation.charterPeriodFrom,
    charterPeriodTo: quotation.charterPeriodTo,
    pricingType: quotation.pricingType,
    lineItems: quotation.lineItems.map(item => ({ ...item, id: generateId() })),
    subtotal: quotation.subtotal,
    taxAmount: quotation.taxAmount,
    totalAmount: quotation.totalAmount,
    currency: quotation.currency,
    notes: quotation.termsAndConditions,
    createdBy: quotation.createdBy,
  });

  // Update quotation with link to invoice
  updateQuotation(quotationId, { convertedToInvoiceId: invoice.id });

  return invoice;
}

/**
 * Update invoice
 */
export function updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
  const index = mockInvoices.findIndex((i) => i.id === id);
  if (index === -1) return null;

  // Recalculate outstanding amount if amountPaid or totalAmount changed
  const currentInvoice = mockInvoices[index];
  const newTotalAmount = updates.totalAmount ?? currentInvoice.totalAmount;
  const newAmountPaid = updates.amountPaid ?? currentInvoice.amountPaid;
  const amountOutstanding = newTotalAmount - newAmountPaid;

  mockInvoices[index] = {
    ...mockInvoices[index],
    ...updates,
    amountOutstanding,
    updatedAt: new Date().toISOString(),
  };

  return mockInvoices[index];
}

/**
 * Delete invoice
 */
export function deleteInvoice(id: string): boolean {
  const index = mockInvoices.findIndex((i) => i.id === id);
  if (index === -1) return false;

  mockInvoices.splice(index, 1);
  return true;
}

/**
 * Filter invoices based on criteria
 */
export interface InvoiceFilters {
  companyId?: string;
  projectId?: string;
  clientId?: string;
  status?: InvoiceStatus | 'all' | 'overdue';
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  searchQuery?: string;
}

export function filterInvoices(filters: InvoiceFilters): Invoice[] {
  const today = getTodayISO();

  return mockInvoices.filter((invoice) => {
    // Company filter
    if (filters.companyId && invoice.companyId !== filters.companyId) return false;

    // Project filter (check line items)
    if (filters.projectId && !invoice.lineItems.some(li => li.projectId === filters.projectId)) return false;

    // Client filter
    if (filters.clientId && invoice.clientId !== filters.clientId) return false;

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'overdue') {
        // Check if overdue (past due date and still has outstanding amount)
        if (invoice.dueDate >= today || invoice.amountOutstanding <= 0) return false;
      } else {
        if (invoice.status !== filters.status) return false;
      }
    }

    // Date range filter (using invoice date)
    if (filters.dateFrom && invoice.invoiceDate < filters.dateFrom) return false;
    if (filters.dateTo && invoice.invoiceDate > filters.dateTo) return false;

    // Currency filter
    if (filters.currency && invoice.currency !== filters.currency) return false;

    // Search query (invoice number or client name)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesNumber = invoice.invoiceNumber.toLowerCase().includes(query);
      const matchesClient = invoice.clientName.toLowerCase().includes(query);
      if (!matchesNumber && !matchesClient) return false;
    }

    return true;
  });
}

/**
 * Check if invoice is overdue
 */
export function isInvoiceOverdue(invoice: Invoice): boolean {
  const today = new Date();
  const dueDate = new Date(invoice.dueDate);
  return today > dueDate && invoice.amountOutstanding > 0 && invoice.status === 'issued';
}

/**
 * Get invoices due soon (within N days)
 */
export function getInvoicesDueSoon(days: number = 7): Invoice[] {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return mockInvoices.filter((i) => {
    if (i.status !== 'issued' || i.amountOutstanding <= 0) return false;
    const dueDate = new Date(i.dueDate);
    return dueDate >= today && dueDate <= futureDate;
  });
}

/**
 * Get overdue invoices
 */
export function getOverdueInvoices(): Invoice[] {
  return mockInvoices.filter(isInvoiceOverdue);
}

/**
 * Get payment terms label
 */
export function getPaymentTermsLabel(terms: PaymentTerms): string {
  const labels: Record<PaymentTerms, string> = {
    due_on_receipt: 'Due on Receipt',
    net_15: 'Net 15 Days',
    net_30: 'Net 30 Days',
    net_60: 'Net 60 Days',
    custom: 'Custom',
  };
  return labels[terms];
}
