/**
 * CAPEX Incurred Event Handler
 *
 * Generates journal entries for capital expenditure (asset acquisition).
 *
 * Entry patterns depend on payment method:
 *
 * For cash/bank payment:
 *   Debit: Fixed Asset account
 *   Credit: Bank/Cash
 *
 * For payable (on credit):
 *   Debit: Fixed Asset account
 *   Credit: Accounts Payable (2050)
 */

import type {
  AccountingEventRow,
  EventHandler,
  CapexIncurredEventData,
  JournalSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate CAPEX incurred event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as CapexIncurredEventData;

  if (!data.assetDescription) {
    return { valid: false, error: 'Missing asset description' };
  }

  if (!data.assetAccountCode) {
    return { valid: false, error: 'Missing asset account code' };
  }

  if (!data.acquisitionDate) {
    return { valid: false, error: 'Missing acquisition date' };
  }

  if (data.acquisitionCost === undefined || data.acquisitionCost <= 0) {
    return { valid: false, error: 'Invalid acquisition cost' };
  }

  if (!data.paymentMethod) {
    return { valid: false, error: 'Missing payment method' };
  }

  // If paid by bank, require bank account GL code
  if (data.paymentMethod === 'bank' && !data.bankAccountGlCode) {
    return { valid: false, error: 'Missing bank account GL code for bank payment' };
  }

  return { valid: true };
}

/**
 * Determine the credit account based on payment method
 */
function getCreditAccount(data: CapexIncurredEventData): string {
  switch (data.paymentMethod) {
    case 'cash':
      return DEFAULT_ACCOUNTS.CASH;
    case 'bank':
      return data.bankAccountGlCode || DEFAULT_ACCOUNTS.DEFAULT_BANK;
    case 'payable':
    default:
      return DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE;
  }
}

/**
 * Generate journal entries for CAPEX
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as CapexIncurredEventData;
  const companyId = event.affected_companies[0];

  const creditAccount = getCreditAccount(data);
  const creditDescription = data.paymentMethod === 'payable'
    ? `Payable${data.vendorName ? ` to ${data.vendorName}` : ''}`
    : `Payment for ${data.assetDescription}`;

  return [
    {
      companyId,
      entryDate: data.acquisitionDate,
      description: `CAPEX - ${data.assetDescription}`,
      lines: [
        {
          accountCode: data.assetAccountCode,
          entryType: 'debit',
          amount: data.acquisitionCost,
          description: data.assetDescription,
        },
        {
          accountCode: creditAccount,
          entryType: 'credit',
          amount: data.acquisitionCost,
          description: creditDescription,
        },
      ],
    },
  ];
}

export const capexIncurredHandler: EventHandler = {
  eventType: 'CAPEX_INCURRED',
  validate,
  generateJournals,
};
