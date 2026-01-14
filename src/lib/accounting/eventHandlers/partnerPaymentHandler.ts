/**
 * Partner Payment Event Handler
 *
 * Generates journal entries when a payment is made to a partner
 * for their allocated profit distribution.
 *
 * Entry pattern:
 *   Debit: Partner Payable (2750)
 *   Credit: Bank/Cash
 */

import type {
  AccountingEventRow,
  EventHandler,
  PartnerPaymentEventData,
  JournalSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate partner payment event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as PartnerPaymentEventData;

  if (!data.projectId) {
    return { valid: false, error: 'Missing projectId' };
  }

  if (!data.participantId) {
    return { valid: false, error: 'Missing participantId' };
  }

  if (!data.participantName) {
    return { valid: false, error: 'Missing participantName' };
  }

  if (data.paymentAmount === undefined || data.paymentAmount <= 0) {
    return { valid: false, error: 'Invalid payment amount' };
  }

  if (!data.paymentDate) {
    return { valid: false, error: 'Missing payment date' };
  }

  if (!data.bankAccountGlCode) {
    return { valid: false, error: 'Missing bank account GL code' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for partner payment
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as PartnerPaymentEventData;
  const companyId = event.affected_companies[0];

  return [
    {
      companyId,
      entryDate: data.paymentDate,
      description: `Partner distribution - ${data.participantName}`,
      lines: [
        {
          accountCode: DEFAULT_ACCOUNTS.PARTNER_PAYABLES,
          entryType: 'debit',
          amount: data.paymentAmount,
          description: `Distribution to ${data.participantName}`,
        },
        {
          accountCode: data.bankAccountGlCode,
          entryType: 'credit',
          amount: data.paymentAmount,
          description: `Payment to ${data.participantName}`,
        },
      ],
    },
  ];
}

export const partnerPaymentHandler: EventHandler = {
  eventType: 'PARTNER_PAYMENT',
  validate,
  generateJournals,
};
