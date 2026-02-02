/**
 * Petty Cash Top-up Event Handler
 *
 * Generates journal entry when a petty cash wallet is replenished.
 *
 * Entry pattern:
 *   Debit: Petty Cash Asset (wallet balance increased)
 *   Credit: Bank Account (cash outflow from bank)
 */

import type {
  AccountingEventRow,
  EventHandler,
  JournalSpec,
  JournalLineSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Event data structure for petty cash top-up
 */
export interface PettyCashTopupEventData {
  topupId: string;
  walletId: string;
  walletName: string;
  companyId: string;
  topupDate: string;
  amount: number;
  bankAccountId?: string;
  bankAccountCode?: string;
  bankAccountName?: string;
  reference?: string;
  currency: string;
}

/**
 * Validate petty cash top-up event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as PettyCashTopupEventData;

  if (!data.topupId) {
    return { valid: false, error: 'Missing topupId' };
  }

  if (!data.walletId) {
    return { valid: false, error: 'Missing walletId' };
  }

  if (!data.amount || data.amount <= 0) {
    return { valid: false, error: 'Invalid top-up amount' };
  }

  if (!data.topupDate) {
    return { valid: false, error: 'Missing top-up date' };
  }

  if (!data.companyId) {
    return { valid: false, error: 'Missing company ID' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for petty cash top-up
 *
 * Debit: Petty Cash Asset (1000 - Petty Cash THB)
 * Credit: Bank Account (1010 - Bank Account THB)
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as PettyCashTopupEventData;
  const companyId = event.affected_companies[0];

  // Use the bank account GL code if provided, otherwise default
  const bankAccountCode = data.bankAccountCode || DEFAULT_ACCOUNTS.DEFAULT_BANK;

  const lines: JournalLineSpec[] = [
    // Debit: Petty Cash Asset
    {
      accountCode: DEFAULT_ACCOUNTS.CASH, // 1000
      entryType: 'debit',
      amount: data.amount,
      description: `Top-up: ${data.walletName}`,
    },
    // Credit: Bank Account
    {
      accountCode: bankAccountCode, // 1010 or specified
      entryType: 'credit',
      amount: data.amount,
      description: data.bankAccountName || 'Bank Transfer',
    },
  ];

  return [
    {
      companyId,
      entryDate: data.topupDate,
      description: `Petty Cash Top-up - ${data.walletName}${data.reference ? ` - Ref: ${data.reference}` : ''}`,
      lines,
    },
  ];
}

export const pettyCashTopupHandler: EventHandler = {
  eventType: 'PETTYCASH_TOPUP_COMPLETED',
  validate,
  generateJournals,
};
