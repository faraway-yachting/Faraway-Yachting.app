/**
 * Balance Sheet Calculation Engine
 *
 * Generates Balance Sheet reports by calculating account balances
 * from posted journal entries up to a specific date.
 * Supports multi-currency with THB conversion.
 */

import { Currency } from '@/data/company/types';
import { chartOfAccounts, AccountType, ChartOfAccount } from '@/data/accounting/chartOfAccounts';
import { getAllJournalEntries } from '@/data/accounting/journalEntries';
import { JournalEntry, JournalEntryLine } from '@/data/accounting/journalEntryTypes';

// ============================================================================
// Types
// ============================================================================

export interface BalanceSheetOptions {
  companyId?: string; // undefined = all companies (consolidated)
  projectId?: string; // undefined = all projects
  asOfDate: string; // ISO date - point in time
  showInTHB: boolean;
}

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  category: string;
  subType: string;
  normalBalance: 'Debit' | 'Credit';
  debitTotal: number;
  creditTotal: number;
  balance: number; // Net balance (positive for debit-normal, negative for credit-normal accounts)
  balanceTHB: number;
  currency?: Currency;
}

export interface BalanceSheetSubType {
  name: string;
  accounts: AccountBalance[];
  total: number;
  totalTHB: number;
}

export interface BalanceSheetSection {
  name: string;
  accountType: AccountType;
  subTypes: BalanceSheetSubType[];
  total: number;
  totalTHB: number;
}

export interface BalanceSheet {
  options: BalanceSheetOptions;
  generatedAt: string;
  asOfDate: string;

  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;

  totalAssets: number;
  totalAssetsTHB: number;
  totalLiabilities: number;
  totalLiabilitiesTHB: number;
  totalEquity: number;
  totalEquityTHB: number;
  totalLiabilitiesAndEquity: number;
  totalLiabilitiesAndEquityTHB: number;

  isBalanced: boolean; // Assets = Liabilities + Equity
  difference: number; // Should be 0 or near 0
  differenceTHB: number;

  hasMultipleCurrencies: boolean;
  currencies: Currency[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all posted journal entries up to the specified date
 */
function getPostedEntriesUpToDate(
  asOfDate: string,
  companyId?: string
): JournalEntry[] {
  const allEntries = getAllJournalEntries();

  return allEntries.filter(entry => {
    // Only posted entries
    if (entry.status !== 'posted') return false;

    // Up to and including the as-of date
    if (entry.date > asOfDate) return false;

    // Company filter if specified
    if (companyId && entry.companyId !== companyId) return false;

    return true;
  });
}

/**
 * Calculate account balances from journal entry lines
 */
function calculateAccountBalances(
  entries: JournalEntry[],
  accountType: AccountType
): Map<string, AccountBalance> {
  const balanceMap = new Map<string, AccountBalance>();

  // Get all accounts of this type from chart of accounts
  const accountsOfType = chartOfAccounts.filter(a => a.accountType === accountType);

  // Initialize all accounts with zero balances
  for (const account of accountsOfType) {
    balanceMap.set(account.code, {
      accountCode: account.code,
      accountName: account.name,
      category: account.category,
      subType: account.subType,
      normalBalance: account.normalBalance,
      debitTotal: 0,
      creditTotal: 0,
      balance: 0,
      balanceTHB: 0,
      currency: account.currency,
    });
  }

  // Process all journal entry lines
  for (const entry of entries) {
    for (const line of entry.lines) {
      const accountBalance = balanceMap.get(line.accountCode);
      if (!accountBalance) continue; // Skip if not in our account type

      if (line.type === 'debit') {
        accountBalance.debitTotal += line.amount;
      } else {
        accountBalance.creditTotal += line.amount;
      }
    }
  }

  // Calculate net balances
  for (const balance of balanceMap.values()) {
    // For debit-normal accounts (Assets): balance = debits - credits
    // For credit-normal accounts (Liabilities, Equity): balance = credits - debits
    if (balance.normalBalance === 'Debit') {
      balance.balance = balance.debitTotal - balance.creditTotal;
    } else {
      balance.balance = balance.creditTotal - balance.debitTotal;
    }

    // For now, assume THB = original (would use FX rates in production)
    balance.balanceTHB = balance.balance;
  }

  return balanceMap;
}

/**
 * Group account balances by subType
 */
function groupBySubType(
  balances: Map<string, AccountBalance>
): BalanceSheetSubType[] {
  const subTypeMap = new Map<string, AccountBalance[]>();

  // Group accounts by subType
  for (const balance of balances.values()) {
    // Only include accounts with non-zero balances
    if (Math.abs(balance.balance) < 0.01) continue;

    const accounts = subTypeMap.get(balance.subType) || [];
    accounts.push(balance);
    subTypeMap.set(balance.subType, accounts);
  }

  // Convert to array and calculate totals
  const subTypes: BalanceSheetSubType[] = [];

  for (const [name, accounts] of subTypeMap) {
    // Sort accounts by code
    accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalTHB = accounts.reduce((sum, acc) => sum + acc.balanceTHB, 0);

    subTypes.push({
      name,
      accounts,
      total,
      totalTHB,
    });
  }

  // Sort subTypes (Current before Non-Current)
  subTypes.sort((a, b) => {
    const order = ['Current Asset', 'Non-Current Asset', 'Current Liability', 'Non-Current Liability', 'Share Capital', 'Reserves', 'Retained Earnings', 'Other Equity'];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  return subTypes;
}

/**
 * Build a section (Assets, Liabilities, or Equity)
 */
function buildSection(
  entries: JournalEntry[],
  accountType: AccountType,
  sectionName: string
): BalanceSheetSection {
  const balances = calculateAccountBalances(entries, accountType);
  const subTypes = groupBySubType(balances);

  const total = subTypes.reduce((sum, st) => sum + st.total, 0);
  const totalTHB = subTypes.reduce((sum, st) => sum + st.totalTHB, 0);

  return {
    name: sectionName,
    accountType,
    subTypes,
    total,
    totalTHB,
  };
}

// ============================================================================
// Main Calculation Function
// ============================================================================

/**
 * Generate a Balance Sheet report for the given options
 */
export async function generateBalanceSheet(options: BalanceSheetOptions): Promise<BalanceSheet> {
  const { companyId, asOfDate } = options;

  // Get all posted entries up to the as-of date
  const entries = getPostedEntriesUpToDate(asOfDate, companyId);

  // Build each section
  const assets = buildSection(entries, 'Asset', 'Assets');
  const liabilities = buildSection(entries, 'Liability', 'Liabilities');
  const equity = buildSection(entries, 'Equity', 'Equity');

  // Calculate totals
  const totalAssets = assets.total;
  const totalAssetsTHB = assets.totalTHB;
  const totalLiabilities = liabilities.total;
  const totalLiabilitiesTHB = liabilities.totalTHB;
  const totalEquity = equity.total;
  const totalEquityTHB = equity.totalTHB;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const totalLiabilitiesAndEquityTHB = totalLiabilitiesTHB + totalEquityTHB;

  // Check if balanced (within rounding tolerance)
  const difference = totalAssets - totalLiabilitiesAndEquity;
  const differenceTHB = totalAssetsTHB - totalLiabilitiesAndEquityTHB;
  const isBalanced = Math.abs(differenceTHB) < 0.01;

  // Collect unique currencies from all entries
  const currencySet = new Set<Currency>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      currencySet.add(line.currency);
    }
  }

  return {
    options,
    generatedAt: new Date().toISOString(),
    asOfDate,

    assets,
    liabilities,
    equity,

    totalAssets,
    totalAssetsTHB,
    totalLiabilities,
    totalLiabilitiesTHB,
    totalEquity,
    totalEquityTHB,
    totalLiabilitiesAndEquity,
    totalLiabilitiesAndEquityTHB,

    isBalanced,
    difference,
    differenceTHB,

    hasMultipleCurrencies: currencySet.size > 1,
    currencies: Array.from(currencySet),
  };
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency: Currency = 'THB'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const currencySymbols: Record<Currency, string> = {
    THB: '฿',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SGD: 'S$',
    AED: 'AED ',
  };

  return `${currencySymbols[currency]}${formatter.format(amount)}`;
}

/**
 * Format THB amount
 */
export function formatTHB(amount: number): string {
  return formatAmount(amount, 'THB');
}
