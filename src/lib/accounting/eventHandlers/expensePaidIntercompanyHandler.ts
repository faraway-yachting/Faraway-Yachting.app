/**
 * Intercompany Expense Payment Handler
 *
 * Generates dual journal entries when an expense is paid from a different
 * company's bank account than the company that owns the expense.
 *
 * Example: Mozart project (Lisa Sailing) expense paid from Faraway's bank
 *
 * Entry pattern:
 *   In PAYING company (Faraway):
 *     Debit: Intercompany Receivable (1180) - owed by Lisa
 *     Credit: Bank Account - cash outflow
 *
 *   In RECEIVING company (Lisa Sailing):
 *     Debit: Accounts Payable (2050) - settle vendor debt
 *     Credit: Intercompany Payable (2700) - owed to Faraway
 */

import type {
  AccountingEventRow,
  EventHandler,
  JournalSpec,
  JournalLineSpec,
  ExpensePaidIntercompanyEventData,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate intercompany expense payment event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as ExpensePaidIntercompanyEventData;

  if (!data.expenseId) {
    return { valid: false, error: 'Missing expenseId' };
  }

  if (!data.paymentAmount || data.paymentAmount <= 0) {
    return { valid: false, error: 'Invalid payment amount' };
  }

  if (!data.paymentDate) {
    return { valid: false, error: 'Missing payment date' };
  }

  if (!data.payingCompanyId) {
    return { valid: false, error: 'Missing paying company ID' };
  }

  if (!data.receivingCompanyId) {
    return { valid: false, error: 'Missing receiving company ID' };
  }

  if (data.payingCompanyId === data.receivingCompanyId) {
    return { valid: false, error: 'Paying and receiving company must be different for intercompany transactions' };
  }

  if (!data.bankAccountGlCode) {
    return { valid: false, error: 'Missing bank account GL code' };
  }

  return { valid: true };
}

/**
 * Generate dual journal entries for intercompany expense payment
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as ExpensePaidIntercompanyEventData;

  const journals: JournalSpec[] = [];

  // Journal 1: In PAYING company (e.g., Faraway Yachting)
  // Records that Faraway paid cash and is now owed by the receiving company
  const payingCompanyLines: JournalLineSpec[] = [
    {
      accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_RECEIVABLE, // 1180
      entryType: 'debit',
      amount: data.paymentAmount,
      description: `Intercompany receivable from ${data.receivingCompanyName} - ${data.expenseNumber}`,
    },
    {
      accountCode: data.bankAccountGlCode,
      entryType: 'credit',
      amount: data.paymentAmount,
      description: `Payment to ${data.vendorName} for ${data.receivingCompanyName}`,
    },
  ];

  journals.push({
    companyId: data.payingCompanyId,
    entryDate: data.paymentDate,
    description: `Intercompany payment: ${data.expenseNumber} - ${data.vendorName} (paid for ${data.receivingCompanyName}${data.projectName ? ` / ${data.projectName}` : ''})`,
    lines: payingCompanyLines,
  });

  // Journal 2: In RECEIVING company (e.g., Lisa Sailing)
  // Records that the expense is paid (clear AP) but now owes the paying company
  const receivingCompanyLines: JournalLineSpec[] = [
    {
      accountCode: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE, // 2050
      entryType: 'debit',
      amount: data.paymentAmount,
      description: `Payment to ${data.vendorName} - ${data.expenseNumber}`,
    },
    {
      accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_PAYABLE, // 2700
      entryType: 'credit',
      amount: data.paymentAmount,
      description: `Intercompany payable to ${data.payingCompanyName}`,
    },
  ];

  journals.push({
    companyId: data.receivingCompanyId,
    entryDate: data.paymentDate,
    description: `Expense paid by ${data.payingCompanyName}: ${data.expenseNumber} - ${data.vendorName}${data.projectName ? ` (${data.projectName})` : ''}`,
    lines: receivingCompanyLines,
  });

  return journals;
}

export const expensePaidIntercompanyHandler: EventHandler = {
  eventType: 'EXPENSE_PAID_INTERCOMPANY',
  validate,
  generateJournals,
};
