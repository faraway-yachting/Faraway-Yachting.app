/**
 * Utility functions for accounting operations
 */

import { ChartOfAccount, AccountType } from '@/data/accounting/chartOfAccounts';

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format currency with symbol only (no currency code)
 */
export function formatCurrencySimple(amount: number): string {
  if (amount === 0) return '$0';

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 1000000) {
    return `${sign}$${(absAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 1000) {
    return `${sign}$${(absAmount / 1000).toFixed(1)}K`;
  }

  return `${sign}$${absAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Group accounts by category
 */
export function groupAccountsByCategory(accounts: ChartOfAccount[]): Map<string, ChartOfAccount[]> {
  const grouped = new Map<string, ChartOfAccount[]>();

  accounts.forEach(account => {
    const existing = grouped.get(account.category) || [];
    existing.push(account);
    grouped.set(account.category, existing);
  });

  return grouped;
}

/**
 * Group accounts by sub-type
 */
export function groupAccountsBySubType(accounts: ChartOfAccount[]): Map<string, ChartOfAccount[]> {
  const grouped = new Map<string, ChartOfAccount[]>();

  accounts.forEach(account => {
    const existing = grouped.get(account.subType) || [];
    existing.push(account);
    grouped.set(account.subType, existing);
  });

  return grouped;
}

/**
 * Filter accounts by search query (matches code or name)
 */
export function filterAccounts(accounts: ChartOfAccount[], query: string): ChartOfAccount[] {
  if (!query.trim()) return accounts;

  const lowerQuery = query.toLowerCase();
  return accounts.filter(account =>
    account.code.toLowerCase().includes(lowerQuery) ||
    account.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Calculate total balance for a set of accounts
 */
export function calculateTotalBalance(accounts: ChartOfAccount[]): number {
  return accounts.reduce((total, account) => {
    if (!account.balance) return total;

    // For credit normal balance accounts in contra positions, negate
    if (account.normalBalance === 'Credit') {
      return total + account.balance;
    }
    return total + account.balance;
  }, 0);
}

/**
 * Get balance color class based on account type and balance
 */
export function getBalanceColorClass(account: ChartOfAccount): string {
  if (!account.balance) return 'text-gray-900';

  // Revenue accounts - green for positive
  if (account.accountType === 'Revenue') {
    return 'text-green-600';
  }

  // Expense accounts - red for positive
  if (account.accountType === 'Expense') {
    return 'text-red-600';
  }

  // Asset accounts - default
  if (account.accountType === 'Asset') {
    return 'text-gray-900';
  }

  // Liability accounts - default
  if (account.accountType === 'Liability') {
    return 'text-gray-900';
  }

  // Equity accounts - default
  if (account.accountType === 'Equity') {
    return 'text-gray-900';
  }

  return 'text-gray-900';
}

/**
 * Sort accounts by code
 */
export function sortAccountsByCode(accounts: ChartOfAccount[]): ChartOfAccount[] {
  return [...accounts].sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get account type icon color
 */
export function getAccountTypeColor(type: AccountType): string {
  switch (type) {
    case 'Asset':
      return 'text-blue-600';
    case 'Liability':
      return 'text-orange-600';
    case 'Equity':
      return 'text-purple-600';
    case 'Revenue':
      return 'text-green-600';
    case 'Expense':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Validate account code format
 */
export function isValidAccountCode(code: string): boolean {
  // Account codes should be 4 digits
  return /^\d{4}$/.test(code);
}

/**
 * Get account type range
 */
export function getAccountTypeRange(type: AccountType): { min: number; max: number } {
  switch (type) {
    case 'Asset':
      return { min: 1000, max: 1999 };
    case 'Liability':
      return { min: 2000, max: 2999 };
    case 'Equity':
      return { min: 3000, max: 3999 };
    case 'Revenue':
      return { min: 4000, max: 4999 };
    case 'Expense':
      return { min: 5000, max: 8999 };
    default:
      return { min: 0, max: 9999 };
  }
}
