/**
 * Transform utilities for converting between Supabase (snake_case) and frontend (camelCase) data formats
 */

import type { Database, Json } from './database.types';
import type { Company, Address, ContactInformation, Currency } from '@/data/company/types';
import type { Contact, ContactType, ContactAddress } from '@/data/contact/types';
import type { Project, ProjectStatus, ProjectType, ProjectParticipant } from '@/data/project/types';
import type { BankAccount, BankInformation } from '@/data/banking/types';
import type {
  Invoice, InvoiceStatus, LineItem, PricingType, WhtRate,
  Quotation, QuotationStatus, CharterType,
  Receipt, ReceiptStatus, PaymentRecord,
  CreditNote, CreditNoteStatus, CreditNoteReason,
  DebitNote, DebitNoteStatus, DebitNoteReason
} from '@/data/income/types';
import type { FxRateSource } from '@/data/exchangeRate/types';
import type { Attachment } from '@/data/accounting/journalEntryTypes';

type DbCompany = Database['public']['Tables']['companies']['Row'];
type DbCompanyInsert = Database['public']['Tables']['companies']['Insert'];
type DbContact = Database['public']['Tables']['contacts']['Row'];
type DbContactInsert = Database['public']['Tables']['contacts']['Insert'];
type DbProject = Database['public']['Tables']['projects']['Row'];
type DbProjectInsert = Database['public']['Tables']['projects']['Insert'];
type DbBankAccount = Database['public']['Tables']['bank_accounts']['Row'];
type DbBankAccountInsert = Database['public']['Tables']['bank_accounts']['Insert'];

// Income types
type DbInvoice = Database['public']['Tables']['invoices']['Row'];
type DbInvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type DbInvoiceLineItem = Database['public']['Tables']['invoice_line_items']['Row'];
type DbInvoiceLineItemInsert = Database['public']['Tables']['invoice_line_items']['Insert'];
type DbQuotation = Database['public']['Tables']['quotations']['Row'];
type DbQuotationInsert = Database['public']['Tables']['quotations']['Insert'];
type DbQuotationLineItem = Database['public']['Tables']['quotation_line_items']['Row'];
type DbQuotationLineItemInsert = Database['public']['Tables']['quotation_line_items']['Insert'];
type DbReceipt = Database['public']['Tables']['receipts']['Row'];
type DbReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
type DbReceiptLineItem = Database['public']['Tables']['receipt_line_items']['Row'];
type DbReceiptLineItemInsert = Database['public']['Tables']['receipt_line_items']['Insert'];
type DbReceiptPaymentRecord = Database['public']['Tables']['receipt_payment_records']['Row'];
type DbReceiptPaymentRecordInsert = Database['public']['Tables']['receipt_payment_records']['Insert'];
type DbCreditNote = Database['public']['Tables']['credit_notes']['Row'];
type DbCreditNoteInsert = Database['public']['Tables']['credit_notes']['Insert'];
type DbCreditNoteLineItem = Database['public']['Tables']['credit_note_line_items']['Row'];
type DbCreditNoteLineItemInsert = Database['public']['Tables']['credit_note_line_items']['Insert'];
type DbDebitNote = Database['public']['Tables']['debit_notes']['Row'];
type DbDebitNoteInsert = Database['public']['Tables']['debit_notes']['Insert'];
type DbDebitNoteLineItem = Database['public']['Tables']['debit_note_line_items']['Row'];
type DbDebitNoteLineItemInsert = Database['public']['Tables']['debit_note_line_items']['Insert'];

// Helper to safely parse JSON fields
function parseJson<T>(json: Json | null, defaultValue: T): T {
  if (json === null || json === undefined) return defaultValue;
  if (typeof json === 'object') return json as T;
  try {
    return JSON.parse(json as string) as T;
  } catch {
    return defaultValue;
  }
}

// Company transformations
export function dbCompanyToFrontend(db: DbCompany): Company {
  const registeredAddress = parseJson<Address>(db.registered_address, {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  const billingAddress = parseJson<Address>(db.billing_address, {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  const contactInformation = parseJson<ContactInformation>(db.contact_information, {
    primaryContactName: '',
    phoneNumber: '',
    email: '',
  });

  return {
    id: db.id,
    name: db.name,
    taxId: db.tax_id,
    registeredAddress,
    billingAddress,
    sameAsBillingAddress: db.same_as_billing_address,
    contactInformation,
    currency: (db.currency || 'THB') as Currency,
    isActive: db.is_active,
    isVatRegistered: db.is_vat_registered,
    vatRate: db.vat_rate ?? undefined,
    logoUrl: db.logo_url ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendCompanyToDb(company: Partial<Company>): DbCompanyInsert {
  return {
    name: company.name!,
    tax_id: company.taxId!,
    registered_address: company.registeredAddress as unknown as Json,
    billing_address: company.billingAddress as unknown as Json,
    same_as_billing_address: company.sameAsBillingAddress,
    contact_information: company.contactInformation as unknown as Json,
    currency: company.currency || 'THB',
    is_active: company.isActive ?? true,
    is_vat_registered: company.isVatRegistered ?? false,
    vat_rate: company.vatRate ?? null,
    logo_url: company.logoUrl ?? null,
  };
}

// Contact transformations
export function dbContactToFrontend(db: DbContact): Contact {
  const billingAddress = parseJson<ContactAddress | undefined>(db.billing_address, undefined);

  return {
    id: db.id,
    name: db.name,
    type: db.type as ContactType,
    contactPerson: db.contact_person ?? undefined,
    email: db.email ?? undefined,
    phone: db.phone ?? undefined,
    taxId: db.tax_id ?? undefined,
    billingAddress,
    defaultCurrency: (db.default_currency || 'THB') as Currency,
    paymentTerms: db.payment_terms ?? undefined,
    notes: db.notes ?? undefined,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendContactToDb(contact: Partial<Contact>): DbContactInsert {
  return {
    name: contact.name!,
    type: contact.type!,
    contact_person: contact.contactPerson ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    tax_id: contact.taxId ?? null,
    billing_address: contact.billingAddress ? (contact.billingAddress as unknown as Json) : null,
    default_currency: contact.defaultCurrency || 'THB',
    payment_terms: contact.paymentTerms ?? null,
    notes: contact.notes ?? null,
    is_active: contact.isActive ?? true,
  };
}

// Project transformations
export function dbProjectToFrontend(db: DbProject): Project {
  const participants = parseJson<ProjectParticipant[]>(db.participants, []);

  return {
    id: db.id,
    name: db.name,
    code: db.code,
    companyId: db.company_id,
    type: (db.type || 'other') as ProjectType,
    description: db.description ?? undefined,
    participants,
    status: (db.status || 'active') as ProjectStatus,
    managementFeePercentage: db.management_fee_percentage ?? 15,
    createdBy: db.created_by ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendProjectToDb(project: Partial<Project>): DbProjectInsert {
  return {
    name: project.name!,
    code: project.code!,
    company_id: project.companyId!,
    type: project.type || 'other',
    description: project.description ?? null,
    participants: project.participants ? (project.participants as unknown as Json) : [],
    status: project.status || 'active',
    management_fee_percentage: project.managementFeePercentage ?? 15,
    created_by: project.createdBy ?? null,
  };
}

// Bank Account transformations
export function dbBankAccountToFrontend(db: DbBankAccount): BankAccount {
  const bankInformation = parseJson<BankInformation>(db.bank_information, {
    bankName: '',
    bankCountry: '',
  });

  return {
    id: db.id,
    bankInformation,
    accountName: db.account_name,
    accountNumber: db.account_number,
    currency: (db.currency || 'THB') as Currency,
    companyId: db.company_id,
    glAccountCode: db.gl_account_code,
    openingBalance: db.opening_balance ?? 0,
    openingBalanceDate: db.opening_balance_date ?? new Date().toISOString().split('T')[0],
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendBankAccountToDb(bankAccount: Partial<BankAccount>): DbBankAccountInsert {
  return {
    bank_information: bankAccount.bankInformation as unknown as Json,
    account_name: bankAccount.accountName!,
    account_number: bankAccount.accountNumber!,
    currency: bankAccount.currency || 'THB',
    company_id: bankAccount.companyId!,
    gl_account_code: bankAccount.glAccountCode!,
    opening_balance: bankAccount.openingBalance ?? 0,
    opening_balance_date: bankAccount.openingBalanceDate ?? null,
    is_active: bankAccount.isActive ?? true,
  };
}

// ============= INCOME DOCUMENT TRANSFORMATIONS =============

// Helper to parse WHT rate from string to WhtRate type
function parseWhtRate(whtRate: string | null): WhtRate {
  if (!whtRate || whtRate === '0') return 0;
  if (whtRate === 'custom') return 'custom';
  const parsed = parseFloat(whtRate);
  if ([0, 0.75, 1, 1.5, 2, 3, 5, 10, 15].includes(parsed)) {
    return parsed as WhtRate;
  }
  return 0;
}

// Invoice Line Item transformations
export function dbInvoiceLineItemToFrontend(db: DbInvoiceLineItem): LineItem {
  return {
    id: db.id,
    description: db.description,
    quantity: db.quantity,
    unitPrice: db.unit_price,
    taxRate: db.tax_rate,
    whtRate: parseWhtRate(db.wht_rate),
    amount: db.amount,
    projectId: db.project_id,
  };
}

export function frontendLineItemToDbInvoice(item: LineItem, invoiceId: string): DbInvoiceLineItemInsert {
  return {
    invoice_id: invoiceId,
    project_id: item.projectId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    tax_rate: item.taxRate,
    wht_rate: String(item.whtRate),
    amount: item.amount,
  };
}

// Invoice transformations
export function dbInvoiceToFrontend(db: DbInvoice, lineItems?: DbInvoiceLineItem[]): Invoice {
  return {
    id: db.id,
    invoiceNumber: db.invoice_number,
    companyId: db.company_id,
    clientId: db.client_id || '',
    clientName: db.client_name,
    quotationId: db.quotation_id ?? undefined,
    charterPeriodFrom: db.charter_period_from ?? undefined,
    charterPeriodTo: db.charter_period_to ?? undefined,
    boatId: db.boat_id ?? undefined,
    charterType: (db.charter_type as CharterType) ?? undefined,
    charterDateFrom: db.charter_date_from ?? undefined,
    charterDateTo: db.charter_date_to ?? undefined,
    charterTime: db.charter_time ?? undefined,
    invoiceDate: db.invoice_date,
    dueDate: db.due_date,
    paymentTerms: (db.payment_terms || 'due_on_receipt') as Invoice['paymentTerms'],
    pricingType: (db.pricing_type || 'exclude_vat') as PricingType,
    lineItems: lineItems?.map(dbInvoiceLineItemToFrontend) || [],
    subtotal: db.subtotal,
    taxAmount: db.tax_amount,
    totalAmount: db.total_amount,
    amountPaid: db.amount_paid,
    amountOutstanding: db.amount_outstanding,
    currency: (db.currency || 'USD') as Currency,
    fxRate: db.fx_rate ?? undefined,
    status: (db.status || 'draft') as InvoiceStatus,
    notes: db.notes ?? undefined,
    createdBy: db.created_by || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendInvoiceToDb(invoice: Partial<Invoice>): DbInvoiceInsert {
  return {
    company_id: invoice.companyId!,
    invoice_number: invoice.invoiceNumber!,
    client_id: invoice.clientId || null,
    client_name: invoice.clientName!,
    quotation_id: invoice.quotationId ?? null,
    charter_period_from: invoice.charterPeriodFrom ?? null,
    charter_period_to: invoice.charterPeriodTo ?? null,
    boat_id: invoice.boatId ?? null,
    charter_type: invoice.charterType ?? null,
    charter_date_from: invoice.charterDateFrom ?? null,
    charter_date_to: invoice.charterDateTo ?? null,
    charter_time: invoice.charterTime ?? null,
    invoice_date: invoice.invoiceDate!,
    due_date: invoice.dueDate!,
    payment_terms: invoice.paymentTerms ?? null,
    pricing_type: invoice.pricingType || 'exclude_vat',
    subtotal: invoice.subtotal ?? 0,
    tax_amount: invoice.taxAmount ?? 0,
    total_amount: invoice.totalAmount ?? 0,
    amount_paid: invoice.amountPaid ?? 0,
    amount_outstanding: invoice.amountOutstanding ?? 0,
    currency: invoice.currency || 'USD',
    fx_rate: invoice.fxRate ?? null,
    status: invoice.status || 'draft',
    notes: invoice.notes ?? null,
    created_by: invoice.createdBy ?? null,
  };
}

// Quotation Line Item transformations
export function dbQuotationLineItemToFrontend(db: DbQuotationLineItem): LineItem {
  return {
    id: db.id,
    description: db.description,
    quantity: db.quantity,
    unitPrice: db.unit_price,
    taxRate: db.tax_rate,
    whtRate: 0, // Quotations don't have WHT
    amount: db.amount,
    projectId: db.project_id,
  };
}

export function frontendLineItemToDbQuotation(item: LineItem, quotationId: string): DbQuotationLineItemInsert {
  return {
    quotation_id: quotationId,
    project_id: item.projectId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    tax_rate: item.taxRate,
    amount: item.amount,
  };
}

// Quotation transformations
export function dbQuotationToFrontend(db: DbQuotation, lineItems?: DbQuotationLineItem[]): Quotation {
  return {
    id: db.id,
    quotationNumber: db.quotation_number,
    companyId: db.company_id,
    clientId: db.client_id || '',
    clientName: db.client_name,
    charterPeriodFrom: db.charter_period_from ?? undefined,
    charterPeriodTo: db.charter_period_to ?? undefined,
    boatId: db.boat_id ?? undefined,
    charterType: (db.charter_type as CharterType) ?? undefined,
    charterDateFrom: db.charter_date_from ?? undefined,
    charterDateTo: db.charter_date_to ?? undefined,
    charterTime: db.charter_time ?? undefined,
    dateCreated: db.date_created,
    validUntil: db.valid_until,
    pricingType: (db.pricing_type || 'exclude_vat') as PricingType,
    lineItems: lineItems?.map(dbQuotationLineItemToFrontend) || [],
    subtotal: db.subtotal,
    taxAmount: db.tax_amount,
    totalAmount: db.total_amount,
    currency: (db.currency || 'USD') as Currency,
    fxRate: db.fx_rate ?? undefined,
    status: (db.status || 'draft') as QuotationStatus,
    termsAndConditions: db.terms_and_conditions ?? undefined,
    notes: db.notes ?? undefined,
    createdBy: db.created_by || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendQuotationToDb(quotation: Partial<Quotation>): DbQuotationInsert {
  return {
    company_id: quotation.companyId!,
    quotation_number: quotation.quotationNumber!,
    client_id: quotation.clientId || null,
    client_name: quotation.clientName!,
    charter_period_from: quotation.charterPeriodFrom ?? null,
    charter_period_to: quotation.charterPeriodTo ?? null,
    boat_id: quotation.boatId ?? null,
    charter_type: quotation.charterType ?? null,
    charter_date_from: quotation.charterDateFrom ?? null,
    charter_date_to: quotation.charterDateTo ?? null,
    charter_time: quotation.charterTime ?? null,
    date_created: quotation.dateCreated!,
    valid_until: quotation.validUntil!,
    pricing_type: quotation.pricingType || 'exclude_vat',
    subtotal: quotation.subtotal ?? 0,
    tax_amount: quotation.taxAmount ?? 0,
    total_amount: quotation.totalAmount ?? 0,
    currency: quotation.currency || 'USD',
    fx_rate: quotation.fxRate ?? null,
    status: quotation.status || 'draft',
    terms_and_conditions: quotation.termsAndConditions ?? null,
    notes: quotation.notes ?? null,
    created_by: quotation.createdBy ?? null,
  };
}

// Receipt Line Item transformations
export function dbReceiptLineItemToFrontend(db: DbReceiptLineItem): LineItem {
  // Parse WHT rate - it's stored as string in DB ('0', '1', '2', '3', '5', 'custom')
  const whtRateStr = db.wht_rate || '0';
  const whtRate = whtRateStr === 'custom' ? 'custom' : (parseInt(whtRateStr, 10) || 0);

  return {
    id: db.id,
    description: db.description,
    quantity: db.quantity,
    unitPrice: db.unit_price,
    taxRate: db.tax_rate,
    whtRate: whtRate as 0 | 1 | 2 | 3 | 5 | 'custom',
    customWhtAmount: db.custom_wht_amount ?? undefined,
    amount: db.amount,
    projectId: db.project_id,
  };
}

export function frontendLineItemToDbReceipt(item: LineItem, receiptId: string): DbReceiptLineItemInsert {
  return {
    receipt_id: receiptId,
    project_id: item.projectId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    tax_rate: item.taxRate,
    wht_rate: String(item.whtRate ?? '0'),
    custom_wht_amount: item.whtRate === 'custom' ? (item.customWhtAmount ?? null) : null,
    amount: item.amount,
  };
}

// Receipt Payment Record transformations
export function dbPaymentRecordToFrontend(db: DbReceiptPaymentRecord): PaymentRecord {
  return {
    id: db.id,
    paymentDate: db.payment_date,
    amount: db.amount,
    receivedAt: db.received_at || 'cash', // 'cash' or bank_account_id
    remark: db.remark ?? undefined,
  };
}

export function frontendPaymentRecordToDb(record: PaymentRecord, receiptId: string): DbReceiptPaymentRecordInsert {
  return {
    receipt_id: receiptId,
    payment_date: record.paymentDate,
    amount: record.amount,
    received_at: record.receivedAt || 'cash', // 'cash' or bank_account_id
    remark: record.remark ?? null,
  };
}

// Receipt transformations
export function dbReceiptToFrontend(
  db: DbReceipt,
  lineItems?: DbReceiptLineItem[],
  paymentRecords?: DbReceiptPaymentRecord[]
): Receipt {
  // Calculate totals from payment records
  const payments = paymentRecords?.map(dbPaymentRecordToFrontend) || [];
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    id: db.id,
    receiptNumber: db.receipt_number,
    companyId: db.company_id,
    clientId: db.client_id || '',
    clientName: db.client_name,
    invoiceId: db.invoice_id ?? undefined,
    charterPeriodFrom: db.charter_period_from ?? undefined,
    charterPeriodTo: db.charter_period_to ?? undefined,
    boatId: db.boat_id ?? undefined,
    charterType: (db.charter_type as CharterType) ?? undefined,
    charterDateFrom: db.charter_date_from ?? undefined,
    charterDateTo: db.charter_date_to ?? undefined,
    charterTime: db.charter_time ?? undefined,
    receiptDate: db.receipt_date,
    reference: db.reference ?? undefined,
    pricingType: (db.pricing_type || 'exclude_vat') as PricingType,
    lineItems: lineItems?.map(dbReceiptLineItemToFrontend) || [],
    subtotal: db.subtotal,
    taxAmount: db.tax_amount,
    whtAmount: 0, // Receipts don't have WHT on the header
    totalAmount: db.total_amount,
    payments, // Use correct field name to match Receipt type
    adjustmentType: 'none', // Default value
    adjustmentAmount: 0,
    netAmountToPay: db.total_amount,
    totalPayments,
    totalReceived: db.total_received ?? totalPayments ?? db.total_amount,
    remainingAmount: db.total_amount - (db.total_received ?? totalPayments ?? db.total_amount),
    currency: (db.currency || 'USD') as Currency,
    fxRate: db.fx_rate ?? undefined,
    fxRateSource: (db.fx_rate_source as FxRateSource) ?? undefined,
    fxBaseCurrency: db.fx_base_currency ?? undefined,
    fxTargetCurrency: db.fx_target_currency ?? undefined,
    fxRateDate: db.fx_rate_date ?? undefined,
    status: (db.status || 'draft') as ReceiptStatus,
    notes: db.notes ?? undefined,
    createdBy: db.created_by || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendReceiptToDb(receipt: Partial<Receipt>): DbReceiptInsert {
  return {
    company_id: receipt.companyId!,
    receipt_number: receipt.receiptNumber!,
    client_id: receipt.clientId || null,
    client_name: receipt.clientName!,
    invoice_id: receipt.invoiceId ?? null,
    charter_period_from: receipt.charterPeriodFrom ?? null,
    charter_period_to: receipt.charterPeriodTo ?? null,
    boat_id: receipt.boatId ?? null,
    charter_type: receipt.charterType ?? null,
    charter_date_from: receipt.charterDateFrom ?? null,
    charter_date_to: receipt.charterDateTo ?? null,
    charter_time: receipt.charterTime ?? null,
    receipt_date: receipt.receiptDate!,
    reference: receipt.reference ?? null,
    pricing_type: receipt.pricingType || 'exclude_vat',
    subtotal: receipt.subtotal ?? 0,
    tax_amount: receipt.taxAmount ?? 0,
    total_amount: receipt.totalAmount ?? 0,
    total_received: receipt.totalReceived ?? 0,
    currency: receipt.currency || 'USD',
    fx_rate: receipt.fxRate ?? null,
    fx_rate_source: receipt.fxRateSource ?? null,
    fx_base_currency: receipt.fxBaseCurrency ?? null,
    fx_target_currency: receipt.fxTargetCurrency ?? null,
    fx_rate_date: receipt.fxRateDate ?? null,
    status: receipt.status || 'draft',
    notes: receipt.notes ?? null,
    created_by: receipt.createdBy ?? null,
  };
}

// Credit Note Line Item transformations
export function dbCreditNoteLineItemToFrontend(db: DbCreditNoteLineItem): LineItem {
  return {
    id: db.id,
    description: db.description,
    quantity: db.quantity,
    unitPrice: db.unit_price,
    taxRate: db.tax_rate,
    whtRate: 0,
    amount: db.amount,
    projectId: db.project_id,
  };
}

export function frontendLineItemToDbCreditNote(item: LineItem, creditNoteId: string): DbCreditNoteLineItemInsert {
  return {
    credit_note_id: creditNoteId,
    project_id: item.projectId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    tax_rate: item.taxRate,
    amount: item.amount,
  };
}

// Debit Note Line Item transformations
export function dbDebitNoteLineItemToFrontend(db: DbDebitNoteLineItem): LineItem {
  return {
    id: db.id,
    description: db.description,
    quantity: db.quantity,
    unitPrice: db.unit_price,
    taxRate: db.tax_rate,
    whtRate: 0,
    amount: db.amount,
    projectId: db.project_id,
  };
}

export function frontendLineItemToDbDebitNote(item: LineItem, debitNoteId: string): DbDebitNoteLineItemInsert {
  return {
    debit_note_id: debitNoteId,
    project_id: item.projectId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    tax_rate: item.taxRate,
    amount: item.amount,
  };
}

// ============= EXPENSE DOCUMENT TRANSFORMATIONS =============

import type {
  ExpenseRecord,
  ExpenseLineItem,
  ExpenseStatus,
  ExpensePricingType,
  PaymentStatus,
  ReceiptStatus as ExpenseReceiptStatus,
  WhtRate as ExpenseWhtRate,
  WhtBaseCalculation,
} from '@/data/expenses/types';

type DbExpense = Database['public']['Tables']['expenses']['Row'];
type DbExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type DbExpenseLineItem = Database['public']['Tables']['expense_line_items']['Row'];
type DbExpenseLineItemInsert = Database['public']['Tables']['expense_line_items']['Insert'];

// Helper to parse expense WHT rate
function parseExpenseWhtRate(whtRate: string | null): ExpenseWhtRate {
  if (!whtRate || whtRate === '0') return 0;
  if (whtRate === 'custom') return 'custom';
  const parsed = parseFloat(whtRate);
  if ([0, 0.75, 1, 1.5, 2, 3, 5, 10, 15].includes(parsed)) {
    return parsed as ExpenseWhtRate;
  }
  return 0;
}

// Expense Line Item transformations
export function dbExpenseLineItemToFrontend(db: DbExpenseLineItem): ExpenseLineItem {
  const amount = db.amount ?? 0;
  const taxRate = db.tax_rate ?? 0;
  const whtRate = parseExpenseWhtRate(db.wht_rate);

  // Calculate pre-VAT amount (assuming exclude_vat pricing type as default)
  // For include_vat, the amount would be gross and preVatAmount = amount / (1 + taxRate/100)
  // Since we don't store pricing type per line, we use the amount as pre-VAT
  const preVatAmount = amount;

  // Calculate WHT amount from pre-VAT amount (default calculation method is 'pre_vat')
  let whtAmount = 0;
  if (typeof whtRate === 'number' && whtRate > 0) {
    whtAmount = (preVatAmount * whtRate) / 100;
  }

  return {
    id: db.id,
    description: db.description,
    quantity: db.quantity ?? 1,
    unitPrice: db.unit_price ?? 0,
    taxRate,
    whtRate,
    whtBaseCalculation: 'pre_vat' as WhtBaseCalculation,
    customWhtAmount: undefined,
    amount,
    preVatAmount,
    whtAmount,
    projectId: db.project_id,
    accountCode: db.account_code ?? undefined,
  };
}

export function frontendExpenseLineItemToDb(item: ExpenseLineItem, expenseId: string): DbExpenseLineItemInsert {
  return {
    expense_id: expenseId,
    project_id: item.projectId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    tax_rate: item.taxRate,
    wht_rate: String(item.whtRate),
    amount: item.amount,
    account_code: item.accountCode ?? null,
  };
}

// Expense transformations
export function dbExpenseToFrontend(db: DbExpense, lineItems?: DbExpenseLineItem[]): ExpenseRecord {
  // Parse attachments from JSONB
  let attachments: Attachment[] | undefined;
  if (db.attachments) {
    try {
      attachments = Array.isArray(db.attachments)
        ? db.attachments as Attachment[]
        : JSON.parse(db.attachments as string) as Attachment[];
    } catch {
      attachments = undefined;
    }
  }

  return {
    id: db.id,
    expenseNumber: db.expense_number,
    companyId: db.company_id,
    vendorId: db.vendor_id ?? undefined,
    vendorName: db.vendor_name || undefined,
    supplierInvoiceNumber: db.supplier_invoice_number ?? undefined,
    expenseDate: db.expense_date,
    dueDate: db.due_date ?? undefined,
    pricingType: 'exclude_vat' as ExpensePricingType,
    currency: (db.currency || 'THB') as Currency,
    fxRate: db.fx_rate ?? undefined,
    fxRateSource: (db.fx_rate_source as FxRateSource) ?? undefined,
    fxBaseCurrency: db.fx_base_currency ?? undefined,
    fxTargetCurrency: db.fx_target_currency ?? undefined,
    fxRateDate: db.fx_rate_date ?? undefined,
    lineItems: lineItems?.map(dbExpenseLineItemToFrontend) || [],
    subtotal: db.subtotal ?? 0,
    vatAmount: db.vat_amount ?? 0,
    totalAmount: db.total_amount ?? 0,
    whtAmount: db.wht_amount ?? 0,
    netPayable: db.net_payable ?? 0,
    paymentStatus: (db.payment_status || 'unpaid') as PaymentStatus,
    amountPaid: 0,
    amountOutstanding: db.net_payable ?? 0,
    receiptStatus: 'pending' as ExpenseReceiptStatus,
    status: (db.status || 'draft') as ExpenseStatus,
    notes: db.notes ?? undefined,
    attachments,
    createdBy: db.created_by || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function frontendExpenseToDb(expense: Partial<ExpenseRecord>): DbExpenseInsert {
  return {
    company_id: expense.companyId!,
    expense_number: expense.expenseNumber!,
    vendor_id: expense.vendorId || null,
    vendor_name: expense.vendorName || '',
    supplier_invoice_number: expense.supplierInvoiceNumber ?? null,
    expense_date: expense.expenseDate!,
    due_date: expense.dueDate ?? null,
    subtotal: expense.subtotal ?? 0,
    vat_amount: expense.vatAmount ?? 0,
    total_amount: expense.totalAmount ?? 0,
    wht_amount: expense.whtAmount ?? 0,
    net_payable: expense.netPayable ?? 0,
    payment_status: expense.paymentStatus || 'unpaid',
    status: expense.status || 'draft',
    currency: expense.currency || 'THB',
    fx_rate: expense.fxRate ?? null,
    fx_rate_source: expense.fxRateSource ?? null,
    fx_base_currency: expense.fxBaseCurrency ?? null,
    fx_target_currency: expense.fxTargetCurrency ?? null,
    fx_rate_date: expense.fxRateDate ?? null,
    notes: expense.notes ?? null,
    created_by: expense.createdBy ?? null,
    attachments: expense.attachments ? JSON.stringify(expense.attachments) : null,
  };
}

// ============= WHT CERTIFICATE TRANSFORMATIONS =============

import type {
  WhtCertificate,
  WhtFormType,
  WhtCertificateStatus,
  ThaiIncomeType,
} from '@/data/expenses/types';

type DbWhtCertificate = Database['public']['Tables']['wht_certificates']['Row'];
type DbWhtCertificateInsert = Database['public']['Tables']['wht_certificates']['Insert'];

/**
 * Convert database WHT certificate row to frontend WhtCertificate type
 */
export function dbWhtCertificateToFrontend(db: DbWhtCertificate): WhtCertificate {
  return {
    id: db.id,
    certificateNumber: db.certificate_number,
    formType: db.form_type as WhtFormType,
    payerCompanyId: db.company_id,
    payerName: db.payer_name,
    payerAddress: db.payer_address || '',
    payerTaxId: db.payer_tax_id,
    payeeVendorId: db.payee_vendor_id || '',
    payeeName: db.payee_name,
    payeeAddress: db.payee_address || '',
    payeeTaxId: db.payee_tax_id || '',
    payeeIsCompany: db.payee_is_company,
    paymentDate: db.payment_date,
    incomeType: (db.income_type || '40(8)') as ThaiIncomeType,
    incomeTypeDescription: db.income_type_description ?? undefined,
    amountPaid: db.amount_paid,
    whtRate: db.wht_rate,
    whtAmount: db.wht_amount,
    taxPeriod: db.tax_period,
    expenseRecordIds: [], // Will be populated separately from junction table
    status: db.status as WhtCertificateStatus,
    issuedDate: db.issued_date ?? undefined,
    filedDate: db.filed_date ?? undefined,
    submissionReference: db.submission_reference ?? undefined,
    createdBy: db.created_by || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Convert frontend WhtCertificate to database insert format
 */
export function frontendWhtCertificateToDb(cert: Partial<WhtCertificate>): DbWhtCertificateInsert {
  return {
    company_id: cert.payerCompanyId!,
    certificate_number: cert.certificateNumber!,
    form_type: cert.formType!,
    payer_name: cert.payerName!,
    payer_address: cert.payerAddress ?? null,
    payer_tax_id: cert.payerTaxId!,
    payee_vendor_id: cert.payeeVendorId || null,
    payee_name: cert.payeeName!,
    payee_address: cert.payeeAddress ?? null,
    payee_tax_id: cert.payeeTaxId ?? null,
    payee_is_company: cert.payeeIsCompany ?? false,
    payment_date: cert.paymentDate!,
    income_type: cert.incomeType || '40(8)',
    income_type_description: cert.incomeTypeDescription ?? null,
    amount_paid: cert.amountPaid!,
    wht_rate: cert.whtRate!,
    wht_amount: cert.whtAmount!,
    tax_period: cert.taxPeriod!,
    status: cert.status || 'draft',
    issued_date: cert.issuedDate ?? null,
    filed_date: cert.filedDate ?? null,
    submission_reference: cert.submissionReference ?? null,
    created_by: cert.createdBy ?? null,
  };
}

// ============= BOOKING TRANSFORMATIONS =============
// NOTE: Booking transforms are temporarily in /src/lib/supabase/api/bookings.ts
// until the database migration is run and database.types.ts is regenerated.
// After running the migration and regenerating types, move transforms here.
