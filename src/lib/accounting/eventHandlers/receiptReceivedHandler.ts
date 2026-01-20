/**
 * Receipt Received Event Handler
 *
 * Generates journal entry when a receipt is created with payments.
 *
 * Revenue Recognition Logic:
 * - If charter date has passed (charterDateTo <= today): Credit Revenue directly
 * - If charter date is in future: Credit "Charter Deposits Received" (2300) - deferred revenue
 * - If no charter date: Credit "Charter Deposits Received" (2300) and flag for review
 *
 * Entry patterns:
 *
 * Charter completed (immediate revenue):
 *   Debit: Bank/Cash accounts
 *   Credit: Revenue accounts (4010-4070)
 *   Credit: VAT Payable (if applicable)
 *
 * Charter not yet completed (deferred revenue):
 *   Debit: Bank/Cash accounts
 *   Credit: Charter Deposits Received (2300)
 *   Credit: VAT Payable (if applicable)
 */

import type {
  AccountingEventRow,
  EventHandler,
  ReceiptReceivedEventData,
  JournalSpec,
  JournalLineSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Check if charter service has been completed
 */
function isCharterCompleted(charterDateTo?: string): boolean {
  if (!charterDateTo) {
    return false; // No date = not completed
  }

  const charterEnd = new Date(charterDateTo);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  charterEnd.setHours(0, 0, 0, 0);

  return charterEnd <= today;
}

/**
 * Validate receipt received event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as ReceiptReceivedEventData;

  if (!data.receiptId) {
    return { valid: false, error: 'Missing receiptId' };
  }

  if (!data.receiptNumber) {
    return { valid: false, error: 'Missing receiptNumber' };
  }

  if (!data.payments || data.payments.length === 0) {
    return { valid: false, error: 'No payment records provided' };
  }

  if (!data.lineItems || data.lineItems.length === 0) {
    return { valid: false, error: 'No line items provided' };
  }

  if (data.totalAmount === undefined || data.totalAmount <= 0) {
    return { valid: false, error: 'Invalid total amount' };
  }

  // Validate payments have amounts
  for (const payment of data.payments) {
    if (payment.amount === undefined || payment.amount <= 0) {
      return { valid: false, error: 'Invalid payment amount' };
    }
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
 * Generate journal entries for receipt
 *
 * Uses deferred revenue (account 2300) when charter service hasn't been completed yet.
 * Revenue is only credited directly when charterDateTo has passed.
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as ReceiptReceivedEventData;
  const companyId = event.affected_companies[0];

  const lines: JournalLineSpec[] = [];

  // Check if charter service has been completed
  const charterCompleted = isCharterCompleted(data.charterDateTo);

  // Debit: Bank/Cash accounts (one per payment)
  for (const payment of data.payments) {
    if (payment.amount > 0) {
      const cashAccount = payment.bankAccountGlCode || DEFAULT_ACCOUNTS.CASH;
      lines.push({
        accountCode: cashAccount,
        entryType: 'debit',
        amount: payment.amount,
        description: `Received from ${data.clientName}`,
      });
    }
  }

  // Credit: Revenue or Deferred Revenue based on charter completion
  for (const lineItem of data.lineItems) {
    if (lineItem.amount > 0) {
      if (charterCompleted) {
        // Charter completed - credit revenue directly
        lines.push({
          accountCode: lineItem.accountCode || DEFAULT_ACCOUNTS.DEFAULT_REVENUE,
          entryType: 'credit',
          amount: lineItem.amount,
          description: lineItem.description,
        });
      } else {
        // Charter not completed - credit deferred revenue (Charter Deposits Received)
        lines.push({
          accountCode: DEFAULT_ACCOUNTS.DEFERRED_REVENUE, // 2300
          entryType: 'credit',
          amount: lineItem.amount,
          description: `${lineItem.description} (Deferred - Charter: ${data.charterDateTo || 'TBD'})`,
        });
      }
    }
  }

  // Credit: VAT Payable (if applicable)
  // VAT is always recognized at the time of receipt, not deferred
  if (data.totalVatAmount > 0) {
    lines.push({
      accountCode: DEFAULT_ACCOUNTS.VAT_PAYABLE,
      entryType: 'credit',
      amount: data.totalVatAmount,
      description: 'Output VAT',
    });
  }

  const entryDescription = charterCompleted
    ? `Receipt - ${data.receiptNumber} - ${data.clientName}`
    : `Receipt (Deferred) - ${data.receiptNumber} - ${data.clientName}`;

  return [
    {
      companyId,
      entryDate: data.receiptDate,
      description: entryDescription,
      lines,
    },
  ];
}

export const receiptReceivedHandler: EventHandler = {
  eventType: 'RECEIPT_RECEIVED',
  validate,
  generateJournals,
};
