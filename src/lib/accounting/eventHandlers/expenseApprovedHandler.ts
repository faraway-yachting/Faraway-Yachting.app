/**
 * Expense Approved Event Handler
 *
 * Generates journal entry when an expense is approved (accrual recognition).
 *
 * Entry pattern:
 *   Debit: Expense accounts (from line items)
 *   Debit: VAT Receivable (if applicable)
 *   Credit: Accounts Payable
 */

import type {
  AccountingEventRow,
  EventHandler,
  ExpenseApprovedEventData,
  JournalSpec,
  JournalLineSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate expense approved event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as ExpenseApprovedEventData;

  if (!data.expenseId) {
    return { valid: false, error: 'Missing expenseId' };
  }

  if (!data.expenseNumber) {
    return { valid: false, error: 'Missing expenseNumber' };
  }

  if (!data.lineItems || data.lineItems.length === 0) {
    return { valid: false, error: 'No line items provided' };
  }

  if (data.totalAmount === undefined || data.totalAmount <= 0) {
    return { valid: false, error: 'Invalid total amount' };
  }

  // Validate line items have amounts
  for (const line of data.lineItems) {
    if (line.amount === undefined || line.amount < 0) {
      return { valid: false, error: 'Invalid line item amount' };
    }
  }

  return { valid: true };
}

/**
 * Generate journal entries for expense approval
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as ExpenseApprovedEventData;
  const companyId = event.affected_companies[0];

  const lines: JournalLineSpec[] = [];

  // Debit: Expense accounts (one per line item with amount > 0)
  // Note: Leave accountCode as empty string if not specified, so settings defaults can apply
  for (const lineItem of data.lineItems) {
    if (lineItem.amount > 0) {
      lines.push({
        accountCode: lineItem.accountCode || '', // Empty allows settings default to apply
        entryType: 'debit',
        amount: lineItem.amount,
        description: lineItem.description,
      });
    }
  }

  // Debit: VAT Receivable (if applicable)
  if (data.totalVatAmount > 0) {
    lines.push({
      accountCode: DEFAULT_ACCOUNTS.VAT_RECEIVABLE,
      entryType: 'debit',
      amount: data.totalVatAmount,
      description: 'Input VAT',
    });
  }

  // Credit: Accounts Payable (total amount)
  lines.push({
    accountCode: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
    entryType: 'credit',
    amount: data.totalAmount,
    description: `Payable to ${data.vendorName}`,
  });

  return [
    {
      companyId,
      entryDate: data.expenseDate,
      description: `Expense approval - ${data.expenseNumber} - ${data.vendorName}`,
      lines,
    },
  ];
}

export const expenseApprovedHandler: EventHandler = {
  eventType: 'EXPENSE_APPROVED',
  validate,
  generateJournals,
};
