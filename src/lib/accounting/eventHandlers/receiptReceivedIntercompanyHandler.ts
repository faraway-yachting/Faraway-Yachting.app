/**
 * Intercompany Receipt Handler
 *
 * Generates dual journal entries when payment is received into a different
 * company's bank account than the company that owns the charter/project.
 *
 * Example: Guest pays into Faraway's bank for Mozart charter (Lisa Sailing boat)
 *
 * Entry pattern:
 *   In BANK RECEIVING company (Faraway):
 *     Debit: Bank Account - cash inflow
 *     Credit: Intercompany Payable (2700) - owes Lisa
 *
 *   In CHARTER OWNER company (Lisa Sailing):
 *     Debit: Intercompany Receivable (1180) - owed by Faraway
 *     Credit: Deferred Revenue (2300) or Income (4xxx)
 */

import type {
  AccountingEventRow,
  EventHandler,
  JournalSpec,
  JournalLineSpec,
  ReceiptReceivedIntercompanyEventData,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate intercompany receipt event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as ReceiptReceivedIntercompanyEventData;

  if (!data.receiptId) {
    return { valid: false, error: 'Missing receiptId' };
  }

  if (!data.totalAmount || data.totalAmount <= 0) {
    return { valid: false, error: 'Invalid receipt amount' };
  }

  if (!data.receiptDate) {
    return { valid: false, error: 'Missing receipt date' };
  }

  if (!data.bankCompanyId) {
    return { valid: false, error: 'Missing bank company ID' };
  }

  if (!data.charterCompanyId) {
    return { valid: false, error: 'Missing charter company ID' };
  }

  if (data.bankCompanyId === data.charterCompanyId) {
    return { valid: false, error: 'Bank and charter company must be different for intercompany transactions' };
  }

  if (!data.bankAccountGlCode) {
    return { valid: false, error: 'Missing bank account GL code' };
  }

  return { valid: true };
}

/**
 * Generate dual journal entries for intercompany receipt
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as ReceiptReceivedIntercompanyEventData;

  const journals: JournalSpec[] = [];

  // Journal 1: In BANK RECEIVING company (e.g., Faraway Yachting)
  // Records cash received and liability to the charter owner
  const bankCompanyLines: JournalLineSpec[] = [
    {
      accountCode: data.bankAccountGlCode,
      entryType: 'debit',
      amount: data.totalAmount,
      description: `Payment from ${data.clientName} for ${data.charterCompanyName}`,
    },
    {
      accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_PAYABLE, // 2700
      entryType: 'credit',
      amount: data.totalAmount,
      description: `Intercompany payable to ${data.charterCompanyName} - ${data.receiptNumber}`,
    },
  ];

  journals.push({
    companyId: data.bankCompanyId,
    entryDate: data.receiptDate,
    description: `Intercompany receipt: ${data.receiptNumber} - ${data.clientName} (for ${data.charterCompanyName}${data.projectName ? ` / ${data.projectName}` : ''})`,
    lines: bankCompanyLines,
  });

  // Journal 2: In CHARTER OWNER company (e.g., Lisa Sailing)
  // Records the receivable from bank company and either deferred revenue or income
  const revenueAccountCode = data.usesDeferredRevenue
    ? DEFAULT_ACCOUNTS.DEFERRED_REVENUE // 2300 - liability until charter date
    : DEFAULT_ACCOUNTS.DEFAULT_REVENUE;  // 4490 - immediate income

  const charterCompanyLines: JournalLineSpec[] = [
    {
      accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_RECEIVABLE, // 1180
      entryType: 'debit',
      amount: data.totalAmount,
      description: `Intercompany receivable from ${data.bankCompanyName} - ${data.receiptNumber}`,
    },
    {
      accountCode: revenueAccountCode,
      entryType: 'credit',
      amount: data.totalAmount,
      description: data.usesDeferredRevenue
        ? `Deferred revenue - ${data.clientName}${data.charterDateFrom ? ` (Charter: ${data.charterDateFrom})` : ''}`
        : `Charter income - ${data.clientName}`,
    },
  ];

  journals.push({
    companyId: data.charterCompanyId,
    entryDate: data.receiptDate,
    description: `Payment received by ${data.bankCompanyName}: ${data.receiptNumber} - ${data.clientName}${data.projectName ? ` (${data.projectName})` : ''}`,
    lines: charterCompanyLines,
  });

  return journals;
}

export const receiptReceivedIntercompanyHandler: EventHandler = {
  eventType: 'RECEIPT_RECEIVED_INTERCOMPANY',
  validate,
  generateJournals,
};
