/**
 * Intercompany Settlement Event Handler
 *
 * Generates journal entries when intercompany balances are settled.
 * This is a multi-company event that creates symmetric entries in both companies.
 *
 * Entry pattern in Paying Company:
 *   Debit: Intercompany Payable (2700)
 *   Credit: Bank/Cash
 *
 * Entry pattern in Receiving Company:
 *   Debit: Bank/Cash
 *   Credit: Intercompany Receivable (1180)
 */

import type {
  AccountingEventRow,
  EventHandler,
  IntercompanySettlementEventData,
  JournalSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate intercompany settlement event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as IntercompanySettlementEventData;

  if (!data.fromCompanyId) {
    return { valid: false, error: 'Missing fromCompanyId (paying company)' };
  }

  if (!data.toCompanyId) {
    return { valid: false, error: 'Missing toCompanyId (receiving company)' };
  }

  if (data.fromCompanyId === data.toCompanyId) {
    return { valid: false, error: 'From and To companies cannot be the same' };
  }

  if (data.settlementAmount === undefined || data.settlementAmount <= 0) {
    return { valid: false, error: 'Invalid settlement amount' };
  }

  if (!data.settlementDate) {
    return { valid: false, error: 'Missing settlement date' };
  }

  if (!data.fromBankGlCode) {
    return { valid: false, error: 'Missing bank GL code for paying company' };
  }

  if (!data.toBankGlCode) {
    return { valid: false, error: 'Missing bank GL code for receiving company' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for intercompany settlement
 * Creates two journals: one in paying company, one in receiving company
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as IntercompanySettlementEventData;
  const referenceNote = data.reference ? ` - Ref: ${data.reference}` : '';

  const journals: JournalSpec[] = [];

  // Journal 1: Paying Company (clearing payable)
  journals.push({
    companyId: data.fromCompanyId,
    entryDate: data.settlementDate,
    description: `Intercompany settlement${referenceNote}`,
    lines: [
      {
        accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_PAYABLE,
        entryType: 'debit',
        amount: data.settlementAmount,
        description: 'Clear intercompany payable',
      },
      {
        accountCode: data.fromBankGlCode,
        entryType: 'credit',
        amount: data.settlementAmount,
        description: 'Payment to related company',
      },
    ],
  });

  // Journal 2: Receiving Company (clearing receivable)
  journals.push({
    companyId: data.toCompanyId,
    entryDate: data.settlementDate,
    description: `Intercompany settlement received${referenceNote}`,
    lines: [
      {
        accountCode: data.toBankGlCode,
        entryType: 'debit',
        amount: data.settlementAmount,
        description: 'Receipt from related company',
      },
      {
        accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_RECEIVABLE,
        entryType: 'credit',
        amount: data.settlementAmount,
        description: 'Clear intercompany receivable',
      },
    ],
  });

  return journals;
}

export const intercompanySettlementHandler: EventHandler = {
  eventType: 'INTERCOMPANY_SETTLEMENT',
  validate,
  generateJournals,
};
