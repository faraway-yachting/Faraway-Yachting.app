/**
 * Project Service Completed Event Handler
 *
 * Generates journal entries when a service is completed and revenue is recognized.
 * This handles revenue recognition from deferred to realized.
 *
 * Entry pattern:
 *   Debit: Deferred Revenue (2300)
 *   Credit: Revenue (4xxx)
 */

import type {
  AccountingEventRow,
  EventHandler,
  ProjectServiceCompletedEventData,
  JournalSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate project service completed event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as ProjectServiceCompletedEventData;

  if (!data.projectId) {
    return { valid: false, error: 'Missing projectId' };
  }

  if (!data.projectName) {
    return { valid: false, error: 'Missing projectName' };
  }

  if (data.amount === undefined || data.amount <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  if (!data.completionDate) {
    return { valid: false, error: 'Missing completion date' };
  }

  if (!data.description) {
    return { valid: false, error: 'Missing description' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for service completion revenue recognition
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as ProjectServiceCompletedEventData;
  const companyId = event.affected_companies[0];

  // Use provided account codes or fall back to defaults
  const deferredRevenueAccount = data.deferredRevenueAccountCode || DEFAULT_ACCOUNTS.DEFERRED_REVENUE;
  const revenueAccount = data.revenueAccountCode || DEFAULT_ACCOUNTS.DEFAULT_REVENUE;

  return [
    {
      companyId,
      entryDate: data.completionDate,
      description: `Revenue recognition - ${data.projectName}: ${data.description}`,
      lines: [
        {
          accountCode: deferredRevenueAccount,
          entryType: 'debit',
          amount: data.amount,
          description: 'Release deferred revenue',
        },
        {
          accountCode: revenueAccount,
          entryType: 'credit',
          amount: data.amount,
          description: data.description,
        },
      ],
    },
  ];
}

export const projectServiceCompletedHandler: EventHandler = {
  eventType: 'PROJECT_SERVICE_COMPLETED',
  validate,
  generateJournals,
};
