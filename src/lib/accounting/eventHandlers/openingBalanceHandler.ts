/**
 * Opening Balance Event Handler
 *
 * Generates journal entries for opening balances at the start of a fiscal year.
 * Each balance entry creates a debit or credit as appropriate for the account type.
 *
 * Entry pattern:
 *   For each account balance:
 *     Debit: If debitAmount > 0
 *     Credit: If creditAmount > 0
 */

import type {
  AccountingEventRow,
  EventHandler,
  OpeningBalanceEventData,
  JournalSpec,
  JournalLineSpec,
} from '../eventTypes';

/**
 * Validate opening balance event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as OpeningBalanceEventData;

  if (!data.fiscalYear) {
    return { valid: false, error: 'Missing fiscal year' };
  }

  if (!data.balances || data.balances.length === 0) {
    return { valid: false, error: 'No balances provided' };
  }

  // Validate each balance
  let totalDebits = 0;
  let totalCredits = 0;
  for (const balance of data.balances) {
    if (!balance.accountCode) {
      return { valid: false, error: 'Missing account code in balance' };
    }
    if (balance.debitAmount === undefined && balance.creditAmount === undefined) {
      return { valid: false, error: `No amount specified for account ${balance.accountCode}` };
    }
    if (balance.debitAmount < 0 || balance.creditAmount < 0) {
      return { valid: false, error: `Negative amount for account ${balance.accountCode}` };
    }
    totalDebits += balance.debitAmount || 0;
    totalCredits += balance.creditAmount || 0;
  }

  // Opening balances must be balanced
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return {
      valid: false,
      error: `Opening balances not balanced: Debits=${totalDebits.toFixed(2)}, Credits=${totalCredits.toFixed(2)}`
    };
  }

  return { valid: true };
}

/**
 * Generate journal entries for opening balances
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as OpeningBalanceEventData;
  const companyId = event.affected_companies[0];

  const lines: JournalLineSpec[] = [];

  for (const balance of data.balances) {
    // Add debit line if there's a debit amount
    if (balance.debitAmount && balance.debitAmount > 0) {
      lines.push({
        accountCode: balance.accountCode,
        entryType: 'debit',
        amount: balance.debitAmount,
        description: balance.accountName || `Opening balance - ${balance.accountCode}`,
      });
    }

    // Add credit line if there's a credit amount
    if (balance.creditAmount && balance.creditAmount > 0) {
      lines.push({
        accountCode: balance.accountCode,
        entryType: 'credit',
        amount: balance.creditAmount,
        description: balance.accountName || `Opening balance - ${balance.accountCode}`,
      });
    }
  }

  return [
    {
      companyId,
      entryDate: event.event_date,
      description: `Opening balances - FY ${data.fiscalYear}`,
      lines,
    },
  ];
}

export const openingBalanceHandler: EventHandler = {
  eventType: 'OPENING_BALANCE',
  validate,
  generateJournals,
};
