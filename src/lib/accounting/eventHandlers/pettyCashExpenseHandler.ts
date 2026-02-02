/**
 * Petty Cash Expense Event Handler
 *
 * Generates journal entry when a petty cash expense is recorded.
 *
 * Entry pattern:
 *   Debit: Operating Expenses (cash outflow recorded)
 *   Credit: Petty Cash Asset (wallet balance reduced)
 */

import type {
  AccountingEventRow,
  EventHandler,
  JournalSpec,
  JournalLineSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Event data structure for petty cash expense
 */
export interface PettyCashExpenseEventData {
  expenseId: string;
  expenseNumber: string;
  walletId: string;
  walletName: string;
  companyId: string;
  projectId?: string;
  expenseDate: string;
  description: string;
  amount: number;
  category?: string;
  currency: string;
}

/**
 * Validate petty cash expense event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as PettyCashExpenseEventData;

  if (!data.expenseId) {
    return { valid: false, error: 'Missing expenseId' };
  }

  if (!data.walletId) {
    return { valid: false, error: 'Missing walletId' };
  }

  if (!data.amount || data.amount <= 0) {
    return { valid: false, error: 'Invalid expense amount' };
  }

  if (!data.expenseDate) {
    return { valid: false, error: 'Missing expense date' };
  }

  if (!data.companyId) {
    return { valid: false, error: 'Missing company ID' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for petty cash expense
 *
 * Debit: Operating Expenses (6790 - Other Operating Expenses)
 * Credit: Petty Cash Asset (1000 - Petty Cash THB)
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as PettyCashExpenseEventData;
  const companyId = event.affected_companies[0];

  const lines: JournalLineSpec[] = [
    // Debit: Operating Expenses
    {
      accountCode: DEFAULT_ACCOUNTS.DEFAULT_EXPENSE, // 6790
      entryType: 'debit',
      amount: data.amount,
      description: data.description || `Petty cash expense: ${data.expenseNumber}`,
    },
    // Credit: Petty Cash Asset
    {
      accountCode: DEFAULT_ACCOUNTS.CASH, // 1000
      entryType: 'credit',
      amount: data.amount,
      description: `Wallet: ${data.walletName}`,
    },
  ];

  return [
    {
      companyId,
      entryDate: data.expenseDate,
      description: `Petty Cash Expense - ${data.expenseNumber} - ${data.description || 'Expense'}`,
      lines,
    },
  ];
}

export const pettyCashExpenseHandler: EventHandler = {
  eventType: 'PETTYCASH_EXPENSE_CREATED',
  validate,
  generateJournals,
};
