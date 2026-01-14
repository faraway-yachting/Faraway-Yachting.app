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
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

// ============================================================================
// Types
// ============================================================================

export type SourceDocumentType = 'expense' | 'expense_payment' | 'receipt';

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

    // Create journal entry
    const entry: JournalEntryInsert = {
      reference_number: referenceNumber,
      entry_date: data.expenseDate,
      company_id: data.companyId,
      description: `Expense approval - ${data.expenseNumber} - ${data.vendorName}`,
      status: 'draft',
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

    // Create journal entry
    const entry: JournalEntryInsert = {
      reference_number: referenceNumber,
      entry_date: data.paymentDate,
      company_id: data.companyId,
      description: `Expense payment - ${data.expenseNumber} - ${data.vendorName}`,
      status: 'draft',
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
  try {
    // Check for duplicate
    const isDuplicate = await checkDuplicateEntry('receipt', data.receiptId);
    if (isDuplicate) {
      console.log(`Journal entry already exists for receipt ${data.receiptId}`);
      return {
        success: true,
        error: 'Journal entry already exists for this receipt',
      };
    }

    // Build journal entry lines
    const lines: JournalEntryLineInsert[] = [];

    // Debit: Bank/Cash accounts (one per payment)
    for (const payment of data.payments) {
      if (payment.amount > 0) {
        let cashAccount = DEFAULT_ACCOUNTS.CASH;

        if (payment.bankAccountId) {
          const bankGLCode = await getBankAccountGLCode(payment.bankAccountId);
          cashAccount = bankGLCode || DEFAULT_ACCOUNTS.DEFAULT_BANK;
        }

        lines.push({
          account_code: cashAccount,
          entry_type: 'debit',
          amount: payment.amount,
          description: `Received from ${data.clientName}`,
        });
      }
    }

    // Credit: Revenue accounts (one per line item)
    for (const lineItem of data.lineItems) {
      if (lineItem.amount > 0) {
        lines.push({
          account_code: lineItem.accountCode || DEFAULT_ACCOUNTS.DEFAULT_REVENUE,
          entry_type: 'credit',
          amount: lineItem.amount,
          description: lineItem.description,
        });
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

    // Create journal entry
    const entry: JournalEntryInsert = {
      reference_number: referenceNumber,
      entry_date: data.receiptDate,
      company_id: data.companyId,
      description: `Receipt - ${data.receiptNumber} - ${data.clientName}`,
      status: 'draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: createdBy,
      source_document_type: 'receipt',
      source_document_id: data.receiptId,
      is_auto_generated: true,
    };

    const createdEntry = await journalEntriesApi.create(entry, lines);

    return {
      success: true,
      journalEntryId: createdEntry.id,
      referenceNumber: createdEntry.reference_number,
    };
  } catch (error) {
    console.error('Failed to create receipt journal entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
