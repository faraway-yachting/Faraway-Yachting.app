/**
 * Trial Balance Calculation Engine
 *
 * Generates a Trial Balance report listing all GL accounts with
 * their debit or credit balances from posted journal entries.
 * Total Debits must equal Total Credits.
 */

import {
  journalEntriesApi,
  chartOfAccountsApi,
  JournalEntryWithLines,
} from '@/lib/supabase/api/journalEntries';
import type { Database } from '@/lib/supabase/database.types';

type ChartOfAccountRow = Database['public']['Tables']['chart_of_accounts']['Row'];
type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface TrialBalanceOptions {
  companyId?: string;
  asOfDate: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: 'Debit' | 'Credit';
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  options: TrialBalanceOptions;
  generatedAt: string;
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

function processEntries(
  entries: JournalEntryWithLines[],
  chartOfAccounts: ChartOfAccountRow[]
): TrialBalanceRow[] {
  // Build account lookup
  const accountMap = new Map<string, ChartOfAccountRow>();
  for (const acct of chartOfAccounts) {
    accountMap.set(acct.code, acct);
  }

  // Accumulate debits and credits per account
  const balances = new Map<string, { debit: number; credit: number }>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const existing = balances.get(line.account_code) || { debit: 0, credit: 0 };
      if (line.entry_type === 'debit') {
        existing.debit += line.amount;
      } else {
        existing.credit += line.amount;
      }
      balances.set(line.account_code, existing);
    }
  }

  // Build rows
  const rows: TrialBalanceRow[] = [];

  for (const [code, totals] of balances) {
    const account = accountMap.get(code);
    if (!account) continue;

    const normalBalance = account.normal_balance as 'Debit' | 'Credit';
    let debitBalance = 0;
    let creditBalance = 0;

    if (normalBalance === 'Debit') {
      const net = totals.debit - totals.credit;
      if (net >= 0) debitBalance = net;
      else creditBalance = Math.abs(net);
    } else {
      const net = totals.credit - totals.debit;
      if (net >= 0) creditBalance = net;
      else debitBalance = Math.abs(net);
    }

    // Skip zero balances
    if (Math.abs(debitBalance) < 0.01 && Math.abs(creditBalance) < 0.01) continue;

    rows.push({
      accountCode: code,
      accountName: account.name,
      accountType: account.account_type,
      normalBalance,
      debitBalance: Math.round(debitBalance * 100) / 100,
      creditBalance: Math.round(creditBalance * 100) / 100,
    });
  }

  // Sort by account code
  rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  return rows;
}

export async function generateTrialBalance(options: TrialBalanceOptions): Promise<TrialBalance> {
  const { companyId, asOfDate } = options;

  const [entries, chartOfAccounts] = await Promise.all([
    journalEntriesApi.getPostedEntriesWithLinesUpToDate(asOfDate, companyId),
    chartOfAccountsApi.getAll(),
  ]);

  const rows = processEntries(entries, chartOfAccounts);

  const totalDebits = rows.reduce((sum, r) => sum + r.debitBalance, 0);
  const totalCredits = rows.reduce((sum, r) => sum + r.creditBalance, 0);
  const difference = Math.round((totalDebits - totalCredits) * 100) / 100;

  return {
    options,
    generatedAt: new Date().toISOString(),
    rows,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    isBalanced: Math.abs(difference) < 0.01,
    difference,
  };
}
