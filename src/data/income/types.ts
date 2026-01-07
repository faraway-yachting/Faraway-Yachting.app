import { Currency } from '@/data/company/types';
import { FxRateSource } from '@/data/exchangeRate/types';

// ============= COMMON TYPES =============

export type PricingType = 'exclude_vat' | 'include_vat' | 'no_vat';

// WHT rate options (percentage values, 'custom' for manual input)
export type WhtRate = 0 | 0.75 | 1 | 1.5 | 2 | 3 | 5 | 10 | 15 | 'custom';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage (e.g., 7 for 7% VAT)
  whtRate: WhtRate; // WHT percentage (0 = none, percentage value, or 'custom')
  customWhtAmount?: number; // Custom WHT amount when whtRate is 'custom'
  amount: number; // calculated based on pricing type
  accountCode?: string; // Link to chart of accounts
  projectId: string; // MANDATORY: Project for P&L allocation (moved from document level)
}

// ============= QUOTATION =============

// Simplified status based on user requirements
export type QuotationStatus = 'draft' | 'accepted' | 'void';

export interface QuotationLineItem extends LineItem {}

export interface Quotation {
  id: string;
  quotationNumber: string; // Format: QO-YYMMXXXX (e.g., QO-20230001)
  companyId: string; // Issuing company - drives seller details, VAT, payment info, numbering
  // projectId moved to LineItem level for multi-project support
  clientId: string;
  clientName: string;
  charterPeriodFrom?: string; // ISO date
  charterPeriodTo?: string; // ISO date
  dateCreated: string; // ISO date
  validUntil: string; // ISO date
  pricingType: PricingType; // Exclude VAT / Include VAT / No VAT
  lineItems: QuotationLineItem[];
  subtotal: number; // Pre-VAT amount
  taxAmount: number; // VAT amount (0 if No VAT)
  totalAmount: number; // Subtotal + Tax
  currency: Currency; // Transactional currency (per document)
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at transaction time (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbSubtotal?: number; // subtotal × fxRate
  thbTaxAmount?: number; // taxAmount × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate
  status: QuotationStatus;
  termsAndConditions?: string;
  notes?: string; // Internal notes
  convertedToInvoiceId?: string; // If converted
  createdBy: string;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

// ============= INVOICE =============

// Simplified status based on user requirements
export type InvoiceStatus = 'draft' | 'issued' | 'void';
export type PaymentTerms = 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60' | 'custom';

export interface InvoiceLineItem extends LineItem {}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Format: INV-YYMMXXXX (e.g., INV-20230001)
  companyId: string; // Issuing company - drives seller details, VAT, payment info, numbering
  // projectId moved to LineItem level for multi-project support
  clientId: string;
  clientName: string;
  quotationId?: string; // If created from quotation
  charterPeriodFrom?: string; // ISO date - for P&L reports
  charterPeriodTo?: string; // ISO date - for P&L reports
  invoiceDate: string; // ISO date
  dueDate: string; // ISO date
  paymentTerms: PaymentTerms;
  pricingType: PricingType; // Exclude VAT / Include VAT / No VAT
  lineItems: InvoiceLineItem[];
  subtotal: number; // Pre-VAT amount
  taxAmount: number; // VAT amount (0 if No VAT)
  totalAmount: number; // Subtotal + Tax
  amountPaid: number; // Track payments (for internal use, not status)
  amountOutstanding: number; // calculated: totalAmount - amountPaid
  currency: Currency; // Transactional currency (per document)
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at transaction time (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbSubtotal?: number; // subtotal × fxRate
  thbTaxAmount?: number; // taxAmount × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate
  status: InvoiceStatus;
  reference?: string; // PO number, booking ref
  notes?: string; // Customer-visible (remark for customer)
  internalNotes?: string;
  issuedDate?: string; // When status changed to 'issued'
  voidedDate?: string;
  voidReason?: string;
  journalEntryId?: string; // Link to accounting entry
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============= RECEIPT =============

// Simplified status based on user requirements
export type ReceiptStatus = 'draft' | 'paid' | 'void';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'beam_wallet' | 'promptpay' | 'other';
export type ReceiptType = 'deposit' | 'invoice_payment' | 'other';
export type AdjustmentType = 'none' | 'add' | 'deduct';

// Payment record for tracking individual payments within a receipt
export interface PaymentRecord {
  id: string;
  paymentDate: string; // ISO date
  amount: number;
  receivedAt: 'cash' | string; // 'cash' or bankAccountId
  remark?: string;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at payment time
  thbAmount?: number; // amount × fxRate
}

export interface Receipt {
  id: string;
  receiptNumber: string; // Format: RE-YYMMXXXX (e.g., RE-20230001)
  companyId: string; // Receiving company - drives seller details, payment details
  // projectId moved to LineItem level for multi-project support
  clientId: string;
  clientName: string;
  receiptDate: string; // ISO date (receipt date)
  reference?: string; // Reference number (invoice number when created from invoice)

  // Line items (same as Invoice/Quotation)
  lineItems: LineItem[];
  pricingType: PricingType;
  subtotal: number;
  taxAmount: number;
  whtAmount: number;
  totalAmount: number;

  // Payment records (multiple payments)
  payments: PaymentRecord[];

  // Fee/Adjustment
  adjustmentType: AdjustmentType;
  adjustmentAmount: number;
  adjustmentAccountCode?: string; // Expense account for adjustment
  adjustmentRemark?: string;

  // Totals
  netAmountToPay: number; // totalAmount - whtAmount
  totalPayments: number; // Sum of all payment amounts
  totalReceived: number; // totalPayments +/- adjustment
  remainingAmount: number; // netAmountToPay - totalReceived

  currency: Currency; // Transactional currency (per document)
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at receipt time (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbSubtotal?: number; // subtotal × fxRate
  thbTaxAmount?: number; // taxAmount × fxRate
  thbWhtAmount?: number; // whtAmount × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate
  thbTotalReceived?: number; // totalReceived × fxRate
  status: ReceiptStatus;
  paidDate?: string; // When payment confirmed
  voidedDate?: string;
  voidReason?: string;
  notes?: string; // Customer-visible (remark for customer)
  internalNotes?: string;
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============= CREDIT NOTE =============

export type CreditNoteStatus = 'draft' | 'issued' | 'void';
export type CreditNoteReason = 'refund' | 'discount' | 'error_correction' | 'cancellation' | 'other';

export interface CreditNote {
  id: string;
  creditNoteNumber: string; // CN-YYMMXXXX (e.g., CN-26010001)
  companyId: string;
  // projectId moved to LineItem level for multi-project support
  clientId: string;
  clientName: string;
  creditNoteDate: string; // ISO date
  reference?: string; // Receipt number when created from receipt

  // Line items (same as Receipt)
  lineItems: LineItem[];
  pricingType: PricingType;
  subtotal: number;
  taxAmount: number;
  whtAmount: number;
  totalAmount: number;

  reason: CreditNoteReason;
  currency: Currency;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at credit note time (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbSubtotal?: number; // subtotal × fxRate
  thbTaxAmount?: number; // taxAmount × fxRate
  thbWhtAmount?: number; // whtAmount × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate
  status: CreditNoteStatus;
  issuedDate?: string;
  voidedDate?: string;
  voidReason?: string;
  notes?: string; // Customer-visible
  internalNotes?: string;
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============= DEBIT NOTE =============

export type DebitNoteStatus = 'draft' | 'issued' | 'void';
export type DebitNoteReason = 'late_fee' | 'additional_services' | 'price_adjustment' | 'other';

export interface DebitNote {
  id: string;
  debitNoteNumber: string; // DN-YYMMXXXX (e.g., DN-26010001)
  companyId: string;
  // projectId moved to LineItem level for multi-project support
  clientId: string;
  clientName: string;
  debitNoteDate: string; // ISO date
  reference?: string; // Receipt number when created from receipt

  // Line items (same as Receipt)
  lineItems: LineItem[];
  pricingType: PricingType;
  subtotal: number;
  taxAmount: number;
  whtAmount: number;
  totalAmount: number;

  reason: DebitNoteReason;
  currency: Currency;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at debit note time (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbSubtotal?: number; // subtotal × fxRate
  thbTaxAmount?: number; // taxAmount × fxRate
  thbWhtAmount?: number; // whtAmount × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate
  status: DebitNoteStatus;
  issuedDate?: string;
  voidedDate?: string;
  voidReason?: string;
  notes?: string; // Customer-visible
  internalNotes?: string;
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============= BILLING NOTE =============

export type BillingNoteStatus = 'draft' | 'sent' | 'acknowledged';
export type BillingNoteType = 'pro_forma' | 'estimate' | 'statement' | 'other';

export interface BillingNote {
  id: string;
  billingNoteNumber: string; // BN-2025-001
  companyId: string;
  // projectId moved to LineItem level for multi-project support
  clientId: string;
  clientName: string;
  documentType: BillingNoteType;
  issueDate: string; // ISO date
  amount: number;
  currency: Currency;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbAmount?: number; // amount × fxRate
  status: BillingNoteStatus;
  notes?: string;
  convertedToInvoiceId?: string; // If converted
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============= REVENUE RECOGNITION =============
// Separate tracking for actual revenue recognition (when charter completes)

export type RevenueRecognitionStatus = 'pending' | 'recognized' | 'deferred';

export interface RevenueRecognition {
  id: string;
  companyId: string;
  projectId: string; // Always linked to boat/charter
  invoiceId: string;
  receiptId?: string; // If deposit receipt involved
  charterCompletionDate: string; // Operational event date - REQUIRED
  recognitionDate: string; // Accounting date
  revenueAmount: number;
  currency: Currency;
  exchangeRate?: number; // If conversion needed
  functionalCurrencyAmount?: number; // Company's reporting currency
  revenueAccountCode: string; // 4010-4590
  status: RevenueRecognitionStatus;
  journalEntryId?: string; // Link to JE that recognized revenue
  bookingId?: string; // Future: link to operations system
  charterCompletionConfirmedBy?: string; // Operational manager
  charterCompletionConfirmedAt?: string; // Timestamp
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============= CLIENT =============
// Basic client interface for income module

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  contactPerson?: string;
  billingAddress?: string;
  taxId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
