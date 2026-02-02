/**
 * Petty Cash Reimbursement Event Handler
 *
 * Generates journal entry when a petty cash reimbursement is paid.
 * This restores the wallet holder's personal funds from company bank account.
 *
 * Entry pattern:
 *   Debit: Petty Cash Asset (wallet balance increased - funds restored)
 *   Credit: Bank Account (cash outflow to reimburse holder)
 */

import type {
  AccountingEventRow,
  EventHandler,
  JournalSpec,
  JournalLineSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Event data structure for petty cash reimbursement
 */
export interface PettyCashReimbursementEventData {
  reimbursementId: string;
  reimbursementNumber: string;
  walletId: string;
  walletName: string;
  companyId: string;
  paymentDate: string;
  finalAmount: number;
  bankAccountId?: string;
  bankAccountCode?: string;
  bankAccountName?: string;
  paymentReference?: string;
  currency: string;
}

/**
 * Validate petty cash reimbursement event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as PettyCashReimbursementEventData;

  if (!data.reimbursementId) {
    return { valid: false, error: 'Missing reimbursementId' };
  }

  if (!data.walletId) {
    return { valid: false, error: 'Missing walletId' };
  }

  if (!data.finalAmount || data.finalAmount <= 0) {
    return { valid: false, error: 'Invalid reimbursement amount' };
  }

  if (!data.paymentDate) {
    return { valid: false, error: 'Missing payment date' };
  }

  if (!data.companyId) {
    return { valid: false, error: 'Missing company ID' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for petty cash reimbursement
 *
 * Debit: Petty Cash Asset (1000 - Petty Cash THB)
 * Credit: Bank Account (1010 - Bank Account THB)
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as PettyCashReimbursementEventData;
  const companyId = event.affected_companies[0];

  // Use the bank account GL code if provided, otherwise default
  const bankAccountCode = data.bankAccountCode || DEFAULT_ACCOUNTS.DEFAULT_BANK;

  const lines: JournalLineSpec[] = [
    // Debit: Petty Cash Asset
    {
      accountCode: DEFAULT_ACCOUNTS.CASH, // 1000
      entryType: 'debit',
      amount: data.finalAmount,
      description: `Reimbursement: ${data.walletName}`,
    },
    // Credit: Bank Account
    {
      accountCode: bankAccountCode, // 1010 or specified
      entryType: 'credit',
      amount: data.finalAmount,
      description: data.paymentReference || 'Bank Transfer',
    },
  ];

  return [
    {
      companyId,
      entryDate: data.paymentDate,
      description: `Petty Cash Reimbursement - ${data.reimbursementNumber} - ${data.walletName}`,
      lines,
    },
  ];
}

export const pettyCashReimbursementHandler: EventHandler = {
  eventType: 'PETTYCASH_REIMBURSEMENT_PAID',
  validate,
  generateJournals,
};
