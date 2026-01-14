/**
 * Expense Paid Event Handler
 *
 * Generates journal entry when an expense payment is made.
 *
 * Entry pattern:
 *   Debit: Accounts Payable (clear liability)
 *   Credit: Bank/Cash account (cash outflow)
 */

import type {
  AccountingEventRow,
  EventHandler,
  ExpensePaidEventData,
  JournalSpec,
  JournalLineSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate expense paid event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as ExpensePaidEventData;

  if (!data.expenseId) {
    return { valid: false, error: 'Missing expenseId' };
  }

  if (!data.paymentId) {
    return { valid: false, error: 'Missing paymentId' };
  }

  if (!data.paymentAmount || data.paymentAmount <= 0) {
    return { valid: false, error: 'Invalid payment amount' };
  }

  if (!data.bankAccountId) {
    return { valid: false, error: 'Missing bank account' };
  }

  if (!data.bankAccountGlCode) {
    return { valid: false, error: 'Missing bank account GL code' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for expense payment
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as ExpensePaidEventData;
  const companyId = event.affected_companies[0];

  const lines: JournalLineSpec[] = [
    // Debit: Accounts Payable (clear liability)
    {
      accountCode: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
      entryType: 'debit',
      amount: data.paymentAmount,
      description: `Payment to ${data.vendorName}`,
    },
    // Credit: Bank/Cash (cash outflow)
    {
      accountCode: data.bankAccountGlCode || DEFAULT_ACCOUNTS.DEFAULT_BANK,
      entryType: 'credit',
      amount: data.paymentAmount,
      description: `Payment for ${data.expenseNumber}`,
    },
  ];

  return [
    {
      companyId,
      entryDate: data.paymentDate,
      description: `Expense payment - ${data.expenseNumber} - ${data.vendorName}`,
      lines,
    },
  ];
}

export const expensePaidHandler: EventHandler = {
  eventType: 'EXPENSE_PAID',
  validate,
  generateJournals,
};
