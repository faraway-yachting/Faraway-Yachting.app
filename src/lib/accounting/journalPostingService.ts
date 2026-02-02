/**
 * Journal Posting Service
 *
 * Automatically generates journal entries for document events:
 * - Expense approval (accrual recognition)
 * - Expense payment (cash recognition)
 * - Receipt creation (revenue recognition with cash)
 *
 * All entries are created as 'draft' for accountant review before posting.
 */

import { journalEntriesApi } from '@/lib/supabase/api/journalEntries';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { journalEventSettingsApi } from '@/lib/supabase/api/journalEventSettings';
import { financialPeriodsApi } from '@/lib/supabase/api/financialPeriods';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

// ============================================================================
// Types
// ============================================================================

export type SourceDocumentType = 'expense' | 'expense_payment' | 'receipt' | 'beam_settlement';

export interface JournalPostingResult {
  success: boolean;
  journalEntryId?: string;
  referenceNumber?: string;
  error?: string;
}

type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
// Omit journal_entry_id since it's added by the create function
type JournalEntryLineInsert = Omit<Database['public']['Tables']['journal_entry_lines']['Insert'], 'journal_entry_id'>;

// Input types for journal creation
export interface ExpenseApprovalData {
  expenseId: string;
  companyId: string;
  expenseNumber: string;
  expenseDate: string;
  vendorName: string;
  lineItems: {
    description: string;
    accountCode: string | null;
    amount: number;
  }[];
  totalSubtotal: number;
  totalVatAmount: number;
  totalAmount: number;
  currency: string;
}

export interface ExpensePaymentData {
  expenseId: string;
  paymentId: string;
  companyId: string;
  expenseNumber: string;
  paymentDate: string;
  vendorName: string;
  paymentAmount: number;
  bankAccountId: string;
  currency: string;
}

export interface ReceiptCreationData {
  receiptId: string;
  companyId: string;
  receiptNumber: string;
  receiptDate: string;
  clientName: string;
  lineItems: {
    description: string;
    accountCode?: string | null;
    amount: number;
  }[];
  totalSubtotal: number;
  totalVatAmount: number;
  totalAmount: number;
  payments: {
    amount: number;
    bankAccountId: string | null;
    paymentMethod?: string;
  }[];
  currency: string;
}

// ============================================================================
// Default Account Codes
// ============================================================================

const DEFAULT_ACCOUNTS = {
  ACCOUNTS_PAYABLE: '2050',      // AP - Professional Services
  VAT_RECEIVABLE: '1170',        // VAT/GST Receivable (Input VAT)
  VAT_PAYABLE: '2200',           // VAT/GST Payable (Output VAT)
  DEFAULT_EXPENSE: '6790',       // Other Operating Expenses
  DEFAULT_REVENUE: '4490',       // Other Operating Revenue
  DEFAULT_BANK: '1010',          // Bank Account THB
  CASH: '1000',                  // Petty Cash THB
  CREDIT_CARD_RECEIVABLE: '1140', // Credit Card Receivables (Beam/gateway)
  CC_PROCESSING_FEE: '6710',     // Credit Card Processing Fees
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique reference number for journal entry
 * Format: JE-YYYY-NNNN (e.g., JE-2024-0001)
 */
export async function generateJournalReferenceNumber(companyId: string): Promise<string> {
  const supabase = createClient();
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;

  // Get the highest reference number for this year
  const { data } = await supabase
    .from('journal_entries')
    .select('reference_number')
    .eq('company_id', companyId)
    .like('reference_number', `${prefix}%`)
    .order('reference_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastRef = data[0].reference_number;
    const lastNumber = parseInt(lastRef.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

/**
 * Get GL account code for a bank account
 */
export async function getBankAccountGLCode(bankAccountId: string): Promise<string | null> {
  try {
    const bankAccount = await bankAccountsApi.getById(bankAccountId);
    return bankAccount?.gl_account_code || null;
  } catch (error) {
    console.error('Failed to get bank account GL code:', error);
    return null;
  }
}

/**
 * Check if a journal entry already exists for a source document
 * Prevents duplicate entries
 */
export async function checkDuplicateEntry(
  sourceType: SourceDocumentType,
  sourceId: string
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('source_document_type', sourceType)
    .eq('source_document_id', sourceId)
    .limit(1);

  if (error) {
    console.error('Failed to check for duplicate entry:', error);
    return false;
  }

  return data !== null && data.length > 0;
}

/**
 * Validate that debits equal credits
 */
function validateBalance(lines: JournalEntryLineInsert[]): boolean {
  const totalDebit = lines
    .filter(l => l.entry_type === 'debit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalCredit = lines
    .filter(l => l.entry_type === 'credit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  // Allow small floating point differences
  return Math.abs(totalDebit - totalCredit) < 0.01;
}

/**
 * Calculate totals from lines
 */
function calculateTotals(lines: JournalEntryLineInsert[]): { totalDebit: number; totalCredit: number } {
  const totalDebit = lines
    .filter(l => l.entry_type === 'debit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalCredit = lines
    .filter(l => l.entry_type === 'credit')
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  return { totalDebit, totalCredit };
}

// ============================================================================
// Journal Entry Creation Functions
// ============================================================================

/**
 * Create journal entry for expense approval (accrual recognition)
 *
 * Entry pattern:
 *   Debit: Expense accounts (from line items)
 *   Debit: VAT Receivable (if applicable)
 *   Credit: Accounts Payable
 */
export async function createExpenseApprovalJournalEntry(
  data: ExpenseApprovalData,
  createdBy: string
): Promise<JournalPostingResult> {
  try {
    // Check for duplicate
    const isDuplicate = await checkDuplicateEntry('expense', data.expenseId);
    if (isDuplicate) {
      console.log(`Journal entry already exists for expense ${data.expenseId}`);
      return {
        success: true,
        error: 'Journal entry already exists for this expense',
      };
    }

    // Check period is open
    await financialPeriodsApi.assertOpen(data.companyId, data.expenseDate);

    // Build journal entry lines
    const lines: JournalEntryLineInsert[] = [];

    // Debit: Expense accounts (one per line item)
    for (const lineItem of data.lineItems) {
      if (lineItem.amount > 0) {
        lines.push({
          account_code: lineItem.accountCode || DEFAULT_ACCOUNTS.DEFAULT_EXPENSE,
          entry_type: 'debit',
          amount: lineItem.amount,
          description: lineItem.description,
        });
      }
    }

    // Debit: VAT Receivable (if applicable)
    if (data.totalVatAmount > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.VAT_RECEIVABLE,
        entry_type: 'debit',
        amount: data.totalVatAmount,
        description: 'Input VAT',
      });
    }

    // Credit: Accounts Payable (total amount)
    lines.push({
      account_code: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
      entry_type: 'credit',
      amount: data.totalAmount,
      description: `Payable to ${data.vendorName}`,
    });

    // Validate balance
    if (!validateBalance(lines)) {
      return {
        success: false,
        error: 'Journal entry is not balanced (debits != credits)',
      };
    }

    // Generate reference number
    const referenceNumber = await generateJournalReferenceNumber(data.companyId);

    // Calculate totals
    const { totalDebit, totalCredit } = calculateTotals(lines);

    // Check auto-post setting
    const shouldAutoPost = await journalEventSettingsApi.shouldAutoPost(data.companyId, 'EXPENSE_APPROVED');

    // Create journal entry
    const entry: JournalEntryInsert = {
      reference_number: referenceNumber,
      entry_date: data.expenseDate,
      company_id: data.companyId,
      description: `Expense approval - ${data.expenseNumber} - ${data.vendorName}`,
      status: shouldAutoPost ? 'posted' : 'draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: createdBy,
      source_document_type: 'expense',
      source_document_id: data.expenseId,
      is_auto_generated: true,
    };

    const createdEntry = await journalEntriesApi.create(entry, lines);

    return {
      success: true,
      journalEntryId: createdEntry.id,
      referenceNumber: createdEntry.reference_number,
    };
  } catch (error) {
    console.error('Failed to create expense approval journal entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create journal entry for expense payment
 *
 * Entry pattern:
 *   Debit: Accounts Payable (clear liability)
 *   Credit: Bank/Cash account (cash outflow)
 */
export async function createExpensePaymentJournalEntry(
  data: ExpensePaymentData,
  createdBy: string
): Promise<JournalPostingResult> {
  try {
    // Check for duplicate using payment ID
    const isDuplicate = await checkDuplicateEntry('expense_payment', data.paymentId);
    if (isDuplicate) {
      console.log(`Journal entry already exists for payment ${data.paymentId}`);
      return {
        success: true,
        error: 'Journal entry already exists for this payment',
      };
    }

    // Check period is open
    await financialPeriodsApi.assertOpen(data.companyId, data.paymentDate);

    // Get bank account GL code
    const bankGLCode = await getBankAccountGLCode(data.bankAccountId);
    const cashAccount = bankGLCode || DEFAULT_ACCOUNTS.DEFAULT_BANK;

    // Build journal entry lines
    const lines: JournalEntryLineInsert[] = [
      // Debit: Accounts Payable (clear liability)
      {
        account_code: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
        entry_type: 'debit',
        amount: data.paymentAmount,
        description: `Payment to ${data.vendorName}`,
      },
      // Credit: Bank/Cash (cash outflow)
      {
        account_code: cashAccount,
        entry_type: 'credit',
        amount: data.paymentAmount,
        description: `Payment for ${data.expenseNumber}`,
      },
    ];

    // Validate balance
    if (!validateBalance(lines)) {
      return {
        success: false,
        error: 'Journal entry is not balanced (debits != credits)',
      };
    }

    // Generate reference number
    const referenceNumber = await generateJournalReferenceNumber(data.companyId);

    // Calculate totals
    const { totalDebit, totalCredit } = calculateTotals(lines);

    // Check auto-post setting
    const shouldAutoPost = await journalEventSettingsApi.shouldAutoPost(data.companyId, 'EXPENSE_PAID');

    // Create journal entry
    const entry: JournalEntryInsert = {
      reference_number: referenceNumber,
      entry_date: data.paymentDate,
      company_id: data.companyId,
      description: `Expense payment - ${data.expenseNumber} - ${data.vendorName}`,
      status: shouldAutoPost ? 'posted' : 'draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: createdBy,
      source_document_type: 'expense_payment',
      source_document_id: data.paymentId,
      is_auto_generated: true,
    };

    const createdEntry = await journalEntriesApi.create(entry, lines);

    return {
      success: true,
      journalEntryId: createdEntry.id,
      referenceNumber: createdEntry.reference_number,
    };
  } catch (error) {
    console.error('Failed to create expense payment journal entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create journal entry for receipt (revenue recognition with cash)
 *
 * Entry pattern:
 *   Debit: Bank/Cash account (cash inflow)
 *   Credit: Revenue accounts (from line items)
 *   Credit: VAT Payable (if applicable)
 */
export async function createReceiptJournalEntry(
  data: ReceiptCreationData,
  createdBy: string
): Promise<JournalPostingResult> {
  console.log('[JournalPosting] Starting createReceiptJournalEntry', {
    receiptId: data.receiptId,
    receiptNumber: data.receiptNumber,
    companyId: data.companyId,
    createdBy: createdBy || '(empty)',
    totalAmount: data.totalAmount,
    paymentsCount: data.payments.length,
    lineItemsCount: data.lineItems.length,
  });

  try {
    // Check for duplicate
    const isDuplicate = await checkDuplicateEntry('receipt', data.receiptId);
    if (isDuplicate) {
      console.log(`[JournalPosting] Journal entry already exists for receipt ${data.receiptId}`);
      return {
        success: true,
        error: 'Journal entry already exists for this receipt',
      };
    }

    // Check period is open
    await financialPeriodsApi.assertOpen(data.companyId, data.receiptDate);

    // Build journal entry lines
    const lines: JournalEntryLineInsert[] = [];

    // Debit: Bank/Cash/Receivable accounts (one per payment)
    for (const payment of data.payments) {
      if (payment.amount > 0) {
        let debitAccount = DEFAULT_ACCOUNTS.CASH;

        if (payment.paymentMethod === 'beam') {
          // Beam payment: debit Credit Card Receivables (money not yet in bank)
          debitAccount = DEFAULT_ACCOUNTS.CREDIT_CARD_RECEIVABLE;
          console.log(`[JournalPosting] Beam payment -> GL code ${debitAccount} (Credit Card Receivables)`);
        } else if (payment.bankAccountId) {
          const bankGLCode = await getBankAccountGLCode(payment.bankAccountId);
          debitAccount = bankGLCode || DEFAULT_ACCOUNTS.DEFAULT_BANK;
          console.log(`[JournalPosting] Payment bank account ${payment.bankAccountId} -> GL code ${debitAccount}`);
        }

        lines.push({
          account_code: debitAccount,
          entry_type: 'debit',
          amount: payment.amount,
          description: payment.paymentMethod === 'beam'
            ? `Beam payment from ${data.clientName}`
            : `Received from ${data.clientName}`,
        });
      }
    }

    // Credit: Revenue accounts (one per line item)
    // When VAT is included in prices, line item amounts contain VAT.
    // Credit the ex-VAT amount to revenue, and separate VAT to its own line.
    const lineItemTotal = data.lineItems.reduce((sum, li) => sum + (li.amount || 0), 0);
    const hasVatInclusive = data.totalVatAmount > 0 && lineItemTotal > 0
      && Math.abs(lineItemTotal - data.totalSubtotal) > 0.01;

    for (const lineItem of data.lineItems) {
      if (lineItem.amount > 0) {
        const revenueAmount = hasVatInclusive
          ? Math.round((lineItem.amount / lineItemTotal) * data.totalSubtotal * 100) / 100
          : lineItem.amount;

        lines.push({
          account_code: lineItem.accountCode || DEFAULT_ACCOUNTS.DEFAULT_REVENUE,
          entry_type: 'credit',
          amount: revenueAmount,
          description: lineItem.description,
        });
      }
    }

    // Fix rounding: ensure revenue credits sum exactly to totalSubtotal when VAT-inclusive
    if (hasVatInclusive) {
      const revenueLines = lines.filter(l => l.entry_type === 'credit');
      const revenueSum = revenueLines.reduce((sum, l) => sum + (l.amount || 0), 0);
      const roundingDiff = Math.round((data.totalSubtotal - revenueSum) * 100) / 100;
      if (Math.abs(roundingDiff) > 0 && Math.abs(roundingDiff) < 0.05 && revenueLines.length > 0) {
        revenueLines[revenueLines.length - 1].amount =
          Math.round(((revenueLines[revenueLines.length - 1].amount || 0) + roundingDiff) * 100) / 100;
      }
    }

    // Credit: VAT Payable (if applicable)
    if (data.totalVatAmount > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.VAT_PAYABLE,
        entry_type: 'credit',
        amount: data.totalVatAmount,
        description: 'Output VAT',
      });
    }

    console.log('[JournalPosting] Journal lines prepared:', lines.length, 'lines');

    // Validate balance
    const totalDebitCheck = lines
      .filter(l => l.entry_type === 'debit')
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalCreditCheck = lines
      .filter(l => l.entry_type === 'credit')
      .reduce((sum, l) => sum + (l.amount || 0), 0);

    console.log('[JournalPosting] Balance check:', {
      totalDebit: totalDebitCheck,
      totalCredit: totalCreditCheck,
      difference: Math.abs(totalDebitCheck - totalCreditCheck),
      isBalanced: Math.abs(totalDebitCheck - totalCreditCheck) < 0.01,
    });

    if (!validateBalance(lines)) {
      console.error('[JournalPosting] Journal entry is not balanced!', {
        totalDebit: totalDebitCheck,
        totalCredit: totalCreditCheck,
      });
      return {
        success: false,
        error: `Journal entry is not balanced: Debit=${totalDebitCheck.toFixed(2)}, Credit=${totalCreditCheck.toFixed(2)}`,
      };
    }

    // Generate reference number
    const referenceNumber = await generateJournalReferenceNumber(data.companyId);
    console.log('[JournalPosting] Generated reference number:', referenceNumber);

    // Calculate totals
    const { totalDebit, totalCredit } = calculateTotals(lines);

    // Check auto-post setting
    const shouldAutoPost = await journalEventSettingsApi.shouldAutoPost(data.companyId, 'RECEIPT_RECEIVED');

    // Create journal entry
    const entry: JournalEntryInsert = {
      reference_number: referenceNumber,
      entry_date: data.receiptDate,
      company_id: data.companyId,
      description: `Receipt - ${data.receiptNumber} - ${data.clientName}`,
      status: shouldAutoPost ? 'posted' : 'draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: createdBy,
      source_document_type: 'receipt',
      source_document_id: data.receiptId,
      is_auto_generated: true,
    };

    console.log('[JournalPosting] Attempting to create journal entry:', entry);

    const createdEntry = await journalEntriesApi.create(entry, lines);

    console.log('[JournalPosting] Successfully created journal entry:', createdEntry.id, createdEntry.reference_number);

    return {
      success: true,
      journalEntryId: createdEntry.id,
      referenceNumber: createdEntry.reference_number,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[JournalPosting] Failed to create receipt journal entry:', errMsg, error);
    return {
      success: false,
      error: errMsg || 'Unknown error',
    };
  }
}

/**
 * Create journal entry for Beam settlement (when money arrives in bank)
 *
 * Entry pattern:
 *   Debit: Bank account (net amount received)
 *   Debit: CC Processing Fee expense (fee ex-VAT)
 *   Debit: VAT Receivable (input VAT on fee)
 *   Credit: Credit Card Receivables (gross amount - clears the receivable)
 */
export interface BeamSettlementData {
  beamTransactionId: string;
  companyId: string;
  grossAmount: number;
  feeAmount: number;
  vatOnFee: number;
  netAmount: number;
  settlementBankAccountId: string;
  settlementDate: string;
  beamInvoiceNo?: string;
  merchantName: string;
  currency: string;
}

export async function createBeamSettlementJournalEntry(
  data: BeamSettlementData,
  createdBy: string
): Promise<JournalPostingResult> {
  console.log('[JournalPosting] Starting createBeamSettlementJournalEntry', data);

  try {
    const isDuplicate = await checkDuplicateEntry('beam_settlement', data.beamTransactionId);
    if (isDuplicate) {
      return { success: true, error: 'Journal entry already exists for this Beam settlement' };
    }

    // Check period is open
    await financialPeriodsApi.assertOpen(data.companyId, data.settlementDate);

    const lines: JournalEntryLineInsert[] = [];

    // Debit: Bank account (net amount actually received)
    const bankGLCode = await getBankAccountGLCode(data.settlementBankAccountId);
    lines.push({
      account_code: bankGLCode || DEFAULT_ACCOUNTS.DEFAULT_BANK,
      entry_type: 'debit',
      amount: data.netAmount,
      description: `Beam settlement - ${data.merchantName}`,
    });

    // Debit: CC Processing Fee (fee amount excluding VAT)
    const feeExVat = Math.round((data.feeAmount - data.vatOnFee) * 100) / 100;
    if (feeExVat > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.CC_PROCESSING_FEE,
        entry_type: 'debit',
        amount: feeExVat,
        description: `Beam fee${data.beamInvoiceNo ? ` - Invoice ${data.beamInvoiceNo}` : ''}`,
      });
    }

    // Debit: Input VAT on fee
    if (data.vatOnFee > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.VAT_RECEIVABLE,
        entry_type: 'debit',
        amount: data.vatOnFee,
        description: `Input VAT on Beam fee${data.beamInvoiceNo ? ` - Invoice ${data.beamInvoiceNo}` : ''}`,
      });
    }

    // Credit: Credit Card Receivables (clears the gross amount receivable)
    lines.push({
      account_code: DEFAULT_ACCOUNTS.CREDIT_CARD_RECEIVABLE,
      entry_type: 'credit',
      amount: data.grossAmount,
      description: `Clear Beam receivable - ${data.merchantName}`,
    });

    if (!validateBalance(lines)) {
      const totalDebitCheck = lines.filter(l => l.entry_type === 'debit').reduce((s, l) => s + (l.amount || 0), 0);
      const totalCreditCheck = lines.filter(l => l.entry_type === 'credit').reduce((s, l) => s + (l.amount || 0), 0);
      return {
        success: false,
        error: `Beam settlement journal not balanced: Debit=${totalDebitCheck.toFixed(2)}, Credit=${totalCreditCheck.toFixed(2)}`,
      };
    }

    const referenceNumber = await generateJournalReferenceNumber(data.companyId);
    const { totalDebit, totalCredit } = calculateTotals(lines);

    // Check auto-post setting (beam settlement uses RECEIPT_RECEIVED setting)
    const shouldAutoPost = await journalEventSettingsApi.shouldAutoPost(data.companyId, 'RECEIPT_RECEIVED');

    const entry: JournalEntryInsert = {
      reference_number: referenceNumber,
      entry_date: data.settlementDate,
      company_id: data.companyId,
      description: `Beam Settlement - ${data.merchantName}${data.beamInvoiceNo ? ` - ${data.beamInvoiceNo}` : ''}`,
      status: shouldAutoPost ? 'posted' : 'draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: createdBy,
      source_document_type: 'beam_settlement',
      source_document_id: data.beamTransactionId,
      is_auto_generated: true,
    };

    const createdEntry = await journalEntriesApi.create(entry, lines);
    console.log('[JournalPosting] Beam settlement journal created:', createdEntry.id);

    return {
      success: true,
      journalEntryId: createdEntry.id,
      referenceNumber: createdEntry.reference_number,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[JournalPosting] Failed to create Beam settlement journal:', errMsg);
    return { success: false, error: errMsg || 'Unknown error' };
  }
}
