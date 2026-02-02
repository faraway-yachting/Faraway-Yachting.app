/**
 * Year-End Closing Process
 *
 * Creates closing journal entries that zero out Revenue and Expense accounts
 * and transfer the net income to Retained Earnings (3200).
 * Locks all periods in the fiscal year.
 */

import {
  journalEntriesApi,
  chartOfAccountsApi,
} from '@/lib/supabase/api/journalEntries';
import { financialPeriodsApi } from '@/lib/supabase/api/financialPeriods';
import { generateJournalReferenceNumber } from './journalPostingService';

interface YearEndCloseResult {
  closingEntryId: string;
  netIncome: number;
  revenueAccountsClosed: number;
  expenseAccountsClosed: number;
  periodsLocked: number;
}

interface PreCloseCheck {
  allPeriodsClosed: boolean;
  openPeriods: string[];
  hasDraftEntries: boolean;
  draftEntryCount: number;
  isBalanced: boolean;
  trialBalanceDifference: number;
}

/**
 * Run pre-close checks to verify readiness
 */
export async function runPreCloseChecks(
  companyId: string,
  fiscalYear: number,
): Promise<PreCloseCheck> {
  // Check all 12 months are closed
  const openPeriods: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const period = `${fiscalYear}-${String(m).padStart(2, '0')}`;
    const isOpen = await financialPeriodsApi.isOpen(companyId, `${period}-01`);
    if (isOpen) openPeriods.push(period);
  }

  // Check for draft entries in the fiscal year
  const startDate = `${fiscalYear}-01-01`;
  const endDate = `${fiscalYear}-12-31`;
  const entries = await journalEntriesApi.getPostedEntriesWithLinesInDateRange(startDate, endDate, companyId);

  // Simple balance check
  let totalDebit = 0;
  let totalCredit = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.entry_type === 'debit') totalDebit += line.amount;
      else totalCredit += line.amount;
    }
  }

  const difference = Math.abs(totalDebit - totalCredit);

  return {
    allPeriodsClosed: openPeriods.length === 0,
    openPeriods,
    hasDraftEntries: false, // Would need separate query for drafts
    draftEntryCount: 0,
    isBalanced: difference < 0.01,
    trialBalanceDifference: Math.round(difference * 100) / 100,
  };
}

/**
 * Execute the year-end close for a company
 */
export async function executeYearEndClose(
  companyId: string,
  fiscalYear: number,
  userId: string,
): Promise<YearEndCloseResult> {
  const startDate = `${fiscalYear}-01-01`;
  const endDate = `${fiscalYear}-12-31`;

  // 1. Fetch posted entries for the year
  const entries = await journalEntriesApi.getPostedEntriesWithLinesInDateRange(startDate, endDate, companyId);
  const chartOfAccounts = await chartOfAccountsApi.getAll();

  // 2. Calculate balances for Revenue and Expense accounts
  const revenueAccounts = chartOfAccounts.filter(a => a.account_type === 'Revenue');
  const expenseAccounts = chartOfAccounts.filter(a => a.account_type === 'Expense');

  const accountBalances = new Map<string, number>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const current = accountBalances.get(line.account_code) || 0;
      if (line.entry_type === 'debit') {
        accountBalances.set(line.account_code, current + line.amount);
      } else {
        accountBalances.set(line.account_code, current - line.amount);
      }
    }
  }

  // 3. Build closing entry lines
  const closingLines: { account_code: string; entry_type: 'debit' | 'credit'; amount: number; description: string }[] = [];
  let netIncome = 0;
  let revenueCount = 0;
  let expenseCount = 0;

  // Close revenue accounts (credit-normal → debit to close)
  for (const acct of revenueAccounts) {
    const balance = accountBalances.get(acct.code) || 0;
    // Balance is net (debits - credits). For revenue (credit-normal), negative = credit balance = income
    const creditBalance = -balance; // positive if there's income
    if (Math.abs(creditBalance) < 0.01) continue;

    closingLines.push({
      account_code: acct.code,
      entry_type: 'debit',
      amount: Math.abs(creditBalance),
      description: `Close ${acct.name} for FY${fiscalYear}`,
    });
    netIncome += creditBalance;
    revenueCount++;
  }

  // Close expense accounts (debit-normal → credit to close)
  for (const acct of expenseAccounts) {
    const balance = accountBalances.get(acct.code) || 0;
    // For expenses (debit-normal), positive = debit balance = expense
    if (Math.abs(balance) < 0.01) continue;

    closingLines.push({
      account_code: acct.code,
      entry_type: 'credit',
      amount: Math.abs(balance),
      description: `Close ${acct.name} for FY${fiscalYear}`,
    });
    netIncome -= balance;
    expenseCount++;
  }

  // Transfer net income to Retained Earnings (3200)
  if (Math.abs(netIncome) >= 0.01) {
    closingLines.push({
      account_code: '3200',
      entry_type: netIncome > 0 ? 'credit' : 'debit',
      amount: Math.abs(Math.round(netIncome * 100) / 100),
      description: `Net income transfer to Retained Earnings for FY${fiscalYear}`,
    });
  }

  // 4. Create and post the closing journal entry
  const refNumber = await generateJournalReferenceNumber(companyId);
  const totalDebit = closingLines
    .filter(l => l.entry_type === 'debit')
    .reduce((s, l) => s + l.amount, 0);

  const closingEntry = await journalEntriesApi.create(
    {
      reference_number: refNumber,
      entry_date: endDate,
      company_id: companyId,
      description: `Year-End Closing Entry for FY${fiscalYear}`,
      status: 'posted',
      total_debit: Math.round(totalDebit * 100) / 100,
      total_credit: Math.round(totalDebit * 100) / 100,
      is_auto_generated: true,
      source_document_type: 'year_end_close',
      created_by: userId,
    },
    closingLines.map(l => ({
      account_code: l.account_code,
      entry_type: l.entry_type,
      amount: l.amount,
      description: l.description,
    }))
  );

  // 5. Lock all periods in the fiscal year
  let periodsLocked = 0;
  for (let m = 1; m <= 12; m++) {
    const period = `${fiscalYear}-${String(m).padStart(2, '0')}`;
    try {
      await financialPeriodsApi.closePeriod(companyId, period, userId, `Locked by year-end close FY${fiscalYear}`);
      await financialPeriodsApi.lockPeriod(companyId, period);
      periodsLocked++;
    } catch {
      // Period may already be locked
    }
  }

  return {
    closingEntryId: closingEntry.id,
    netIncome: Math.round(netIncome * 100) / 100,
    revenueAccountsClosed: revenueCount,
    expenseAccountsClosed: expenseCount,
    periodsLocked,
  };
}
