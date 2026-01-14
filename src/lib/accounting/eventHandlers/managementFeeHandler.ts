/**
 * Management Fee Event Handler
 *
 * Generates intercompany journal entries for management fee recognition.
 * This is a multi-company event that creates symmetric entries in both companies.
 *
 * Entry pattern in Project Company (paying the fee):
 *   Debit: Management Fee Expense (6800)
 *   Credit: Intercompany Payable (2700)
 *
 * Entry pattern in Management Company (receiving the fee):
 *   Debit: Intercompany Receivable (1180)
 *   Credit: Management Fee Income (4800)
 */

import type {
  AccountingEventRow,
  EventHandler,
  ManagementFeeEventData,
  JournalSpec,
} from '../eventTypes';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

/**
 * Validate management fee event data
 */
function validate(eventData: unknown): { valid: boolean; error?: string } {
  const data = eventData as ManagementFeeEventData;

  if (!data.projectCompanyId) {
    return { valid: false, error: 'Missing projectCompanyId' };
  }

  if (!data.managementCompanyId) {
    return { valid: false, error: 'Missing managementCompanyId' };
  }

  if (data.projectCompanyId === data.managementCompanyId) {
    return { valid: false, error: 'Project company and management company cannot be the same' };
  }

  if (!data.projectId) {
    return { valid: false, error: 'Missing projectId' };
  }

  if (!data.projectName) {
    return { valid: false, error: 'Missing projectName' };
  }

  if (data.feeAmount === undefined || data.feeAmount <= 0) {
    return { valid: false, error: 'Invalid fee amount' };
  }

  if (!data.periodFrom || !data.periodTo) {
    return { valid: false, error: 'Missing period dates' };
  }

  return { valid: true };
}

/**
 * Generate journal entries for management fee recognition
 * Creates two journals: one in project company, one in management company
 */
async function generateJournals(event: AccountingEventRow): Promise<JournalSpec[]> {
  const data = event.event_data as unknown as ManagementFeeEventData;
  const periodDescription = `${data.periodFrom} to ${data.periodTo}`;

  const journals: JournalSpec[] = [];

  // Journal 1: Project Company (expense side)
  journals.push({
    companyId: data.projectCompanyId,
    entryDate: event.event_date,
    description: `Management Fee - ${data.projectName} (${periodDescription})`,
    lines: [
      {
        accountCode: DEFAULT_ACCOUNTS.MANAGEMENT_FEE_EXPENSE,
        entryType: 'debit',
        amount: data.feeAmount,
        description: `Management fee ${data.feePercentage}% on gross income ${data.grossIncome}`,
      },
      {
        accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_PAYABLE,
        entryType: 'credit',
        amount: data.feeAmount,
        description: 'Due to management company',
      },
    ],
  });

  // Journal 2: Management Company (income side)
  journals.push({
    companyId: data.managementCompanyId,
    entryDate: event.event_date,
    description: `Management Fee Income - ${data.projectName} (${periodDescription})`,
    lines: [
      {
        accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_RECEIVABLE,
        entryType: 'debit',
        amount: data.feeAmount,
        description: 'Due from project company',
      },
      {
        accountCode: DEFAULT_ACCOUNTS.MANAGEMENT_FEE_INCOME,
        entryType: 'credit',
        amount: data.feeAmount,
        description: `Management fee ${data.feePercentage}% on gross income ${data.grossIncome}`,
      },
    ],
  });

  return journals;
}

export const managementFeeHandler: EventHandler = {
  eventType: 'MANAGEMENT_FEE_RECOGNIZED',
  validate,
  generateJournals,
};
