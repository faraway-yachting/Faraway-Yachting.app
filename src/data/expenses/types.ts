/**
 * Expense Module Types
 *
 * Comprehensive type definitions for the Expenses module including:
 * - Expense Records (bills/invoices from suppliers)
 * - Purchase Inventory
 * - Purchase Assets
 * - Received Credit Notes
 * - Received Debit Notes
 * - WHT Certificates (Thai 50 ทวิ)
 */

import { Currency } from '@/data/company/types';
import { Attachment } from '@/data/accounting/journalEntryTypes';
import { FxRateSource } from '@/data/exchangeRate/types';

// ============================================================================
// Common Types
// ============================================================================

export type ExpensePricingType = 'exclude_vat' | 'include_vat' | 'no_vat';

export type ExpenseStatus = 'draft' | 'approved' | 'void';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export type ReceiptStatus = 'pending' | 'received' | 'not_required';

// WHT calculation base for expenses
export type WhtBaseCalculation = 'pre_vat' | 'total' | 'manual';

// WHT rate options (same as income module)
export type WhtRate = 0 | 0.75 | 1 | 1.5 | 2 | 3 | 5 | 10 | 15 | 'custom';

// ============================================================================
// Expense Line Item
// ============================================================================

export interface ExpenseLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // VAT percentage (e.g., 7 for 7%)

  // WHT fields
  whtRate: WhtRate;
  whtBaseCalculation: WhtBaseCalculation; // How to calculate WHT base
  customWhtAmount?: number; // For manual/custom WHT

  // Calculated amounts
  amount: number; // Line total (based on pricing type)
  preVatAmount: number; // Pre-VAT amount for WHT calculation
  whtAmount: number; // Calculated or manual WHT amount

  // MANDATORY: Project for investor profit allocation
  projectId: string; // Required per line for P&L calculation

  // Account code for GL
  accountCode?: string;

  // Line-level attachments
  attachments?: Attachment[];
}

// ============================================================================
// Expense Payment Record
// ============================================================================

export interface ExpensePayment {
  id: string;
  paymentDate: string; // ISO date
  amount: number;
  paidFrom: 'cash' | string; // 'cash' or bankAccountId
  reference?: string; // Check number, transfer reference, etc.
  remark?: string;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at payment time
  thbAmount?: number; // amount × fxRate
}

// ============================================================================
// Expense Record (Tab 2: Expense Record)
// ============================================================================

export interface ExpenseRecord {
  id: string;
  expenseNumber: string; // Format: EXP-YYMMXXXX

  // Document reference
  supplierInvoiceNumber?: string; // Supplier's invoice/bill number
  supplierInvoiceDate?: string; // Date on supplier's invoice

  // Company & Vendor
  companyId: string; // Our company making the payment
  vendorId?: string; // Supplier contact (optional)
  vendorName?: string;

  // Dates
  expenseDate: string; // ISO date - date expense is recorded
  dueDate?: string; // Payment due date

  // Pricing
  pricingType: ExpensePricingType;
  currency: Currency;

  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at transaction time (locked on save)
  fxRateSource?: FxRateSource; // 'bot' | 'fallback' | 'manual' | 'api' (legacy)
  fxBaseCurrency?: string; // Source currency (e.g., 'USD')
  fxTargetCurrency?: string; // Target currency (always 'THB')
  fxRateDate?: string; // Actual date the rate is from (may differ if weekend/holiday)
  thbSubtotal?: number; // subtotal × fxRate
  thbVatAmount?: number; // vatAmount × fxRate
  thbWhtAmount?: number; // whtAmount × fxRate
  thbNetPayable?: number; // netPayable × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate

  // Line items
  lineItems: ExpenseLineItem[];

  // Calculated totals
  subtotal: number; // Pre-VAT total
  vatAmount: number; // Total VAT
  totalAmount: number; // Subtotal + VAT
  whtAmount: number; // Total WHT deducted
  netPayable: number; // totalAmount - whtAmount

  // Payment tracking
  paymentStatus: PaymentStatus;
  amountPaid: number;
  amountOutstanding: number;
  payments?: ExpensePayment[];

  // Receipt tracking
  receiptStatus: ReceiptStatus;
  receiptReceivedDate?: string;
  receiptReceivedBy?: string;

  // Document-level attachments
  attachments?: Attachment[];

  // Status
  status: ExpenseStatus;
  approvedDate?: string;
  approvedBy?: string;
  voidedDate?: string;
  voidReason?: string;

  // Notes
  notes?: string; // Internal notes

  // WHT Certificate link
  whtCertificateIds?: string[]; // Links to generated WHT certificates

  // Journal entry link
  journalEntryId?: string;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WHT Certificate (Thai 50 ทวิ)
// ============================================================================

export type WhtFormType = 'pnd3' | 'pnd53'; // PND3 for individuals, PND53 for companies
export type WhtCertificateStatus = 'draft' | 'issued' | 'filed';

// Thai Revenue Department income type codes
export type ThaiIncomeType =
  | '40(1)' // Salary, wages
  | '40(2)' // Fees, honorariums
  | '40(3)' // Royalties
  | '40(4)a' // Interest
  | '40(4)b' // Dividends
  | '40(5)' // Rent - immovable property
  | '40(6)' // Professional services
  | '40(7)' // Contracting services
  | '40(8)' // Other income/services
  | 'other';

export const THAI_INCOME_TYPE_LABELS: Record<ThaiIncomeType, string> = {
  '40(1)': 'เงินเดือน ค่าจ้าง (Salary, Wages)',
  '40(2)': 'ค่านายหน้า (Fees, Honorariums)',
  '40(3)': 'ค่าลิขสิทธิ์ (Royalties)',
  '40(4)a': 'ดอกเบี้ย (Interest)',
  '40(4)b': 'เงินปันผล (Dividends)',
  '40(5)': 'ค่าเช่าทรัพย์สิน (Rent)',
  '40(6)': 'วิชาชีพอิสระ (Professional Services)',
  '40(7)': 'รับเหมา (Contracting Services)',
  '40(8)': 'อื่นๆ (Other Services)',
  'other': 'อื่นๆ (Other)',
};

export interface WhtCertificate {
  id: string;
  certificateNumber: string; // Format: WHT-{COMPANY_CODE}-YYYY-NNNN

  // Form type
  formType: WhtFormType; // PND3 or PND53

  // ผู้หักภาษี (Payer/Withholding Company)
  payerCompanyId: string;
  payerName: string;
  payerAddress: string;
  payerTaxId: string;

  // ผู้ถูกหักภาษี (Payee/Supplier)
  payeeVendorId: string;
  payeeName: string;
  payeeAddress: string;
  payeeTaxId: string;
  payeeIsCompany: boolean; // Determines PND3 vs PND53

  // Details
  paymentDate: string; // วันเดือนปีที่จ่าย
  incomeType: ThaiIncomeType; // ประเภทเงินได้
  incomeTypeDescription?: string; // Additional description for 'other'

  // Amounts
  amountPaid: number; // จำนวนเงินที่จ่าย (Amount paid before WHT)
  whtRate: number; // อัตราภาษี (Tax rate %)
  whtAmount: number; // ภาษีที่หัก (Tax withheld)

  // Period
  taxPeriod: string; // YYYY-MM (for filing)

  // Source documents
  expenseRecordIds: string[]; // Links to expense records that triggered this WHT

  // Status
  status: WhtCertificateStatus;
  issuedDate?: string;
  filedDate?: string;
  submissionReference?: string; // Revenue department submission reference

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Purchase Inventory (Tab 3)
// ============================================================================

export type InventoryPurchaseStatus = 'draft' | 'received' | 'void';

export type InventoryPaymentType = 'bank' | 'cash' | 'petty_cash';

export type InventoryUnit = 'pcs' | 'liters' | 'kg' | 'boxes' | 'sets' | 'meters' | 'other';

export interface InventoryPurchaseItem {
  id: string;
  description: string;
  sku?: string; // Stock keeping unit
  unit?: InventoryUnit; // Unit of measure
  quantity: number;
  quantityConsumed: number; // Running total consumed
  unitPrice: number;
  taxRate: number;
  amount: number;
  preVatAmount: number;
  projectId: string; // Required - original purchase project
  accountCode: string; // Always '1200' (Inventory Asset) for purchase journal
  expenseAccountCode?: string; // Default 5xxx account for consumption
  attachments?: Attachment[];
  consumptionRecords?: InventoryConsumptionRecord[];
}

export interface InventoryConsumptionRecord {
  id: string;
  lineItemId: string;
  quantity: number;
  projectId: string; // Can differ from purchase project (transfer)
  expenseAccountCode: string; // 5xxx account for this consumption
  consumedDate: string;
  consumedBy?: string;
  notes?: string;
}

export interface InventoryPurchasePayment {
  id: string;
  paymentDate: string;
  amount: number;
  paymentType: InventoryPaymentType;
  bankAccountId?: string;
  bankAccountGlCode?: string;
  pettyWalletId?: string;
  pettyWalletName?: string;
  pettyCashExpenseId?: string;
  reference?: string;
  remark?: string;
  fxRate?: number;
  thbAmount?: number;
}

export interface InventoryPurchase {
  id: string;
  purchaseNumber: string; // Format: PO-INV-YYMM-XXXX
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  companyId: string;
  vendorId?: string;
  vendorName?: string;
  purchaseDate: string;
  category?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  pricingType: ExpensePricingType;
  currency: Currency;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number;
  fxRateSource?: FxRateSource;
  fxRateDate?: string;
  thbSubtotal?: number;
  thbVatAmount?: number;
  thbNetPayable?: number;
  thbTotalAmount?: number;
  lineItems: InventoryPurchaseItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  netPayable: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  amountOutstanding: number;
  payments?: InventoryPurchasePayment[];
  receiptStatus: ReceiptStatus;
  receiptReceivedDate?: string;
  receiptReceivedBy?: string;
  attachments?: Attachment[];
  status: InventoryPurchaseStatus;
  receivedDate?: string;
  receivedBy?: string;
  notes?: string;
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Purchase Asset (Tab 4)
// ============================================================================

export type AssetPurchaseStatus = 'draft' | 'acquired' | 'void';

export interface AssetPurchaseItem {
  id: string;
  assetName: string;
  assetCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  whtRate: WhtRate;
  whtBaseCalculation: WhtBaseCalculation;
  customWhtAmount?: number;
  amount: number;
  preVatAmount: number;
  whtAmount: number;
  projectId: string; // Required
  assetAccountCode?: string; // Fixed asset account
  depreciationAccountCode?: string;
  usefulLifeYears?: number;
  attachments?: Attachment[];
}

export interface AssetPurchase {
  id: string;
  purchaseNumber: string; // Format: PO-AST-YYMMXXXX
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  companyId: string;
  vendorId: string;
  vendorName: string;
  purchaseDate: string;
  acquisitionDate?: string;
  pricingType: ExpensePricingType;
  currency: Currency;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at transaction time (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbSubtotal?: number; // subtotal × fxRate
  thbVatAmount?: number; // vatAmount × fxRate
  thbWhtAmount?: number; // whtAmount × fxRate
  thbNetPayable?: number; // netPayable × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate
  lineItems: AssetPurchaseItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  whtAmount: number;
  netPayable: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  amountOutstanding: number;
  payments?: ExpensePayment[];
  receiptStatus: ReceiptStatus;
  receiptReceivedDate?: string;
  receiptReceivedBy?: string;
  attachments?: Attachment[];
  status: AssetPurchaseStatus;
  notes?: string;
  whtCertificateIds?: string[];
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Received Credit Note (Tab 5)
// ============================================================================

export type ReceivedCreditNoteStatus = 'draft' | 'applied' | 'void';
export type ReceivedCreditNoteReason =
  | 'price_adjustment'
  | 'goods_return'
  | 'service_error'
  | 'discount'
  | 'other';

export const RECEIVED_CREDIT_NOTE_REASON_LABELS: Record<ReceivedCreditNoteReason, string> = {
  price_adjustment: 'Price Adjustment',
  goods_return: 'Goods Return',
  service_error: 'Service Error',
  discount: 'Discount',
  other: 'Other',
};

export interface ReceivedCreditNote {
  id: string;
  creditNoteNumber: string; // Format: RCN-YYMMXXXX
  supplierCreditNoteNumber?: string; // Supplier's reference
  companyId: string;
  vendorId: string;
  vendorName: string;
  creditNoteDate: string;
  reference?: string; // Original expense/purchase reference
  originalExpenseId?: string;
  pricingType: ExpensePricingType;
  currency: Currency;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at transaction time (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbSubtotal?: number; // subtotal × fxRate
  thbVatAmount?: number; // vatAmount × fxRate
  thbWhtAmount?: number; // whtAmount × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate
  lineItems: ExpenseLineItem[];
  subtotal: number;
  vatAmount: number;
  whtAmount: number;
  totalAmount: number;
  reason: ReceivedCreditNoteReason;
  status: ReceivedCreditNoteStatus;
  appliedDate?: string;
  appliedBy?: string;
  voidedDate?: string;
  voidReason?: string;
  attachments?: Attachment[];
  notes?: string;
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Received Debit Note (Tab 6)
// ============================================================================

export type ReceivedDebitNoteStatus = 'draft' | 'accepted' | 'void';
export type ReceivedDebitNoteReason =
  | 'price_increase'
  | 'additional_charges'
  | 'late_fee'
  | 'other';

export const RECEIVED_DEBIT_NOTE_REASON_LABELS: Record<ReceivedDebitNoteReason, string> = {
  price_increase: 'Price Increase',
  additional_charges: 'Additional Charges',
  late_fee: 'Late Fee',
  other: 'Other',
};

export interface ReceivedDebitNote {
  id: string;
  debitNoteNumber: string; // Format: RDN-YYMMXXXX
  supplierDebitNoteNumber?: string;
  companyId: string;
  vendorId: string;
  vendorName: string;
  debitNoteDate: string;
  reference?: string;
  originalExpenseId?: string;
  pricingType: ExpensePricingType;
  currency: Currency;
  // FX Rate fields (for THB P&L reporting)
  fxRate?: number; // Exchange rate to THB at transaction time (locked on save)
  fxRateSource?: FxRateSource; // 'api' or 'manual'
  thbSubtotal?: number; // subtotal × fxRate
  thbVatAmount?: number; // vatAmount × fxRate
  thbWhtAmount?: number; // whtAmount × fxRate
  thbTotalAmount?: number; // totalAmount × fxRate
  lineItems: ExpenseLineItem[];
  subtotal: number;
  vatAmount: number;
  whtAmount: number;
  totalAmount: number;
  reason: ReceivedDebitNoteReason;
  status: ReceivedDebitNoteStatus;
  acceptedDate?: string;
  acceptedBy?: string;
  voidedDate?: string;
  voidReason?: string;
  attachments?: Attachment[];
  notes?: string;
  whtCertificateIds?: string[];
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface ExpenseFilters {
  dataScope: string; // "all-companies" | "company-{id}"
  status?: ExpenseStatus;
  paymentStatus?: PaymentStatus;
  receiptStatus?: ReceiptStatus;
  vendorId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  currency?: Currency;
}

// ============================================================================
// Summary Types (for Overview Dashboard)
// ============================================================================

export interface ExpenseSummary {
  totalExpenses: number;
  totalVat: number;
  totalWht: number;
  pendingPayments: number;
  overduePayments: number;
  pendingReceipts: number;
  byCategory: { category: string; amount: number }[];
  byProject: { projectId: string; projectName: string; amount: number }[];
}
