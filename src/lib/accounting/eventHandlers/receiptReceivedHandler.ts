/**
 * Receipt Received Event Handler
 *
 * Generates journal entry when a receipt is created with payments (revenue recognition with cash).
 *
 * Entry pattern:
 *   Debit: Bank/Cash accounts (cash inflow)
 *   Credit: Revenue accounts (from line items)
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
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as ReceiptReceivedEventData;
  const companyId = event.affected_companies[0];

  const lines: JournalLineSpec[] = [];

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

  // Credit: Revenue accounts (one per line item with amount > 0)
  for (const lineItem of data.lineItems) {
    if (lineItem.amount > 0) {
      lines.push({
        accountCode: lineItem.accountCode || DEFAULT_ACCOUNTS.DEFAULT_REVENUE,
        entryType: 'credit',
        amount: lineItem.amount,
        description: lineItem.description,
      });
    }
  }

  // Credit: VAT Payable (if applicable)
  if (data.totalVatAmount > 0) {
    lines.push({
      accountCode: DEFAULT_ACCOUNTS.VAT_PAYABLE,
      entryType: 'credit',
      amount: data.totalVatAmount,
      description: 'Output VAT',
    });
  }

  return [
    {
      companyId,
      entryDate: data.receiptDate,
      description: `Receipt - ${data.receiptNumber} - ${data.clientName}`,
      lines,
    },
  ];
}

export const receiptReceivedHandler: EventHandler = {
  eventType: 'RECEIPT_RECEIVED',
  validate,
  generateJournals,
};
