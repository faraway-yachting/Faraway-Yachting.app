/**
 * Partner Profit Allocation Event Handler
 *
 * Generates journal entries for allocating profits to partners based on ownership %.
 *
 * Entry pattern:
 *   Debit: Retained Earnings (3200) - total allocated profit
 *   Credit: Partner Payable (2750) - per partner allocation
 */

import type {
  AccountingEventRow,
  EventHandler,
  PartnerProfitAllocationEventData,
  JournalSpec,
  JournalLineSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate partner profit allocation event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as PartnerProfitAllocationEventData;

  if (!data.projectId) {
    return { valid: false, error: 'Missing projectId' };
  }

  if (!data.projectName) {
    return { valid: false, error: 'Missing projectName' };
  }

  if (!data.allocations || data.allocations.length === 0) {
    return { valid: false, error: 'No allocations provided' };
  }

  if (data.totalProfit === undefined || data.totalProfit <= 0) {
    return { valid: false, error: 'Invalid total profit' };
  }

  // Validate allocations
  let totalAllocated = 0;
  for (const allocation of data.allocations) {
    if (!allocation.participantId || !allocation.participantName) {
      return { valid: false, error: 'Invalid participant in allocation' };
    }
    if (allocation.allocatedAmount === undefined || allocation.allocatedAmount < 0) {
      return { valid: false, error: 'Invalid allocated amount' };
    }
    totalAllocated += allocation.allocatedAmount;
  }

  // Check that allocations sum to total profit (with small tolerance)
  if (Math.abs(totalAllocated - data.totalProfit) > 0.01) {
    return { valid: false, error: 'Allocations do not sum to total profit' };
  }

  if (!data.periodFrom || !data.periodTo) {
    return { valid: false, error: 'Missing period dates' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for partner profit allocation
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as PartnerProfitAllocationEventData;
  const companyId = event.affected_companies[0];
  const periodDescription = `${data.periodFrom} to ${data.periodTo}`;

  const lines: JournalLineSpec[] = [];

  // Debit: Retained Earnings (total profit being allocated)
  lines.push({
    accountCode: DEFAULT_ACCOUNTS.RETAINED_EARNINGS,
    entryType: 'debit',
    amount: data.totalProfit,
    description: `Profit allocation - ${data.projectName}`,
  });

  // Credit: Partner Payable for each partner
  for (const allocation of data.allocations) {
    if (allocation.allocatedAmount > 0) {
      lines.push({
        accountCode: DEFAULT_ACCOUNTS.PARTNER_PAYABLES,
        entryType: 'credit',
        amount: allocation.allocatedAmount,
        description: `${allocation.participantName} (${allocation.ownershipPercentage}%)`,
      });
    }
  }

  return [
    {
      companyId,
      entryDate: event.event_date,
      description: `Profit allocation - ${data.projectName} (${periodDescription})`,
      lines,
    },
  ];
}

export const partnerProfitAllocationHandler: EventHandler = {
  eventType: 'PARTNER_PROFIT_ALLOCATION',
  validate,
  generateJournals,
};
