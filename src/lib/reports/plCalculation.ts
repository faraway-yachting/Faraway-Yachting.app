/**
 * P&L Calculation Engine (Hybrid Approach)
 *
 * Generates Profit & Loss reports using a hybrid approach:
 * 1. Primary: Source documents (expenses, receipts) for reliable data
 * 2. Secondary: Posted journal entries for additional verification
 *
 * This ensures data appears even when journal entries aren't posted.
 *
 * Revenue accounts: Credits - Debits (positive = income)
 * Expense accounts: Debits - Credits (positive = cost)
 */

import { Currency } from '@/data/company/types';
import { chartOfAccountsApi } from '@/lib/supabase/api/journalEntries';
import { expensesApi } from '@/lib/supabase/api/expenses';
import { receiptsApi } from '@/lib/supabase/api/receipts';
import { pettyCashApi } from '@/lib/supabase/api/pettyCash';
import type { Database } from '@/lib/supabase/database.types';

type ChartOfAccountRow = Database['public']['Tables']['chart_of_accounts']['Row'];

// ============================================================================
// Types
// ============================================================================

export interface PLReportOptions {
  companyId?: string; // undefined = all companies (consolidated)
  projectId?: string; // undefined = all projects
  dateFrom: string; // ISO date
  dateTo: string; // ISO date
  showInTHB: boolean; // true = show THB amounts, false = show original currency
}

export interface PLLineItem {
  id: string;
  date: string;
  documentNumber: string;
  documentType: 'invoice' | 'receipt' | 'credit_note' | 'debit_note' | 'expense' | 'received_credit_note' | 'received_debit_note';
  description: string;
  clientOrVendor: string;
  projectId?: string;
  projectName?: string;
  currency: Currency;
  originalAmount: number;
  fxRate?: number;
  thbAmount: number;
}

export interface PLCategory {
  code: string;
  name: string;
  items: PLLineItem[];
  originalTotal: number; // Sum in original currencies (for display only when single currency)
  thbTotal: number; // Sum in THB
}

export interface PLReport {
  options: PLReportOptions;
  generatedAt: string;

  // Income section
  income: {
    categories: PLCategory[];
    totalOriginal: number;
    totalTHB: number;
  };

  // Expense section
  expenses: {
    categories: PLCategory[];
    totalOriginal: number;
    totalTHB: number;
  };

  // Summary
  netProfitOriginal: number;
  netProfitTHB: number;

  // Metadata
  hasMultipleCurrencies: boolean;
  currencies: Currency[];
}

// ============================================================================
// Calculation Functions
// ============================================================================

// LEGACY FALLBACK RATES - Only used when fx_rate is null on older documents
const CURRENCY_TO_THB: Record<string, number> = {
  THB: 1,
  USD: 35,
  EUR: 38,
  GBP: 44,
  SGD: 26,
  AED: 10,
};

/**
 * Generate a P&L report for the given options using HYBRID approach:
 * 1. Primary: Source documents (expenses, receipts) for reliable data
 * 2. Secondary: Posted journal entries for additional verification
 *
 * This ensures data appears even when journal entries aren't posted.
 */
export async function generatePLReport(options: PLReportOptions): Promise<PLReport> {
  const { companyId, projectId, dateFrom, dateTo } = options;

  // Fetch chart of accounts from Supabase
  const chartOfAccounts = await chartOfAccountsApi.getAll();

  // Create account lookup map
  const accountMap = new Map<string, ChartOfAccountRow>();
  for (const account of chartOfAccounts) {
    accountMap.set(account.code, account);
  }

  // ============================================================================
  // HYBRID APPROACH: Fetch from source documents (primary data source)
  // ============================================================================

  // Fetch expenses (approved status) with line items
  const expenses = await expensesApi.getWithLineItemsByDateRange(dateFrom, dateTo);

  // Fetch receipts (paid status) with line items
  const receipts = await receiptsApi.getWithLineItemsByDateRange(dateFrom, dateTo);

  // Fetch paid petty cash expenses that may not have linked expenses in main expenses table
  const paidPettyCashExpenses = await pettyCashApi.getPaidPettyCashExpensesByDateRange(dateFrom, dateTo);

  // Collect unique currencies
  const currencySet = new Set<Currency>();
  currencySet.add('THB');

  // ============================================================================
  // Process EXPENSES → Expense categories
  // ============================================================================
  const expenseAccountBalances = new Map<string, {
    accountCode: string;
    accountName: string;
    subType: string;
    total: number;
    totalTHB: number;
    items: PLLineItem[];
  }>();

  for (const expense of expenses) {
    // Filter by company if specified
    if (companyId && expense.company_id !== companyId) continue;

    const currency = (expense.currency || 'THB') as Currency;
    currencySet.add(currency);

    // Use stored fx_rate from document, fall back to hardcoded only for legacy data
    const storedFxRate = (expense as { fx_rate?: number | null }).fx_rate;
    const fxRate = storedFxRate ?? CURRENCY_TO_THB[currency] ?? 1;

    for (const lineItem of expense.line_items || []) {
      // Filter by project if specified
      if (projectId && lineItem.project_id !== projectId) continue;

      const accountCode = lineItem.account_code || '5999'; // Default expense account
      const account = accountMap.get(accountCode);

      // Only include if it's an Expense account
      if (account && account.account_type !== 'Expense') continue;

      const accountName = account?.name || 'Other Expenses';
      const subType = (account as ChartOfAccountRow & { sub_type?: string })?.sub_type || 'Other';
      const amount = lineItem.amount || 0;
      const thbAmount = amount * fxRate;

      // Get or create account balance entry
      let balanceEntry = expenseAccountBalances.get(accountCode);
      if (!balanceEntry) {
        balanceEntry = {
          accountCode,
          accountName,
          subType,
          total: 0,
          totalTHB: 0,
          items: [],
        };
        expenseAccountBalances.set(accountCode, balanceEntry);
      }

      balanceEntry.total += amount;
      balanceEntry.totalTHB += thbAmount;
      balanceEntry.items.push({
        id: lineItem.id,
        date: expense.expense_date,
        documentNumber: expense.expense_number,
        documentType: 'expense',
        description: lineItem.description || expense.vendor_name || 'Expense',
        clientOrVendor: expense.vendor_name || '',
        projectId: lineItem.project_id || undefined,
        currency,
        originalAmount: amount,
        fxRate,
        thbAmount,
      });
    }
  }

  // ============================================================================
  // Process PETTY CASH EXPENSES without linked main expenses
  // This ensures petty cash appears in P&L even if createLinkedExpense wasn't called
  // ============================================================================

  // Build a set of petty cash expense IDs that already have linked expenses
  // Linked expenses have vendor_name starting with "Petty Cash -"
  const linkedPettyCashExpenseNumbers = new Set<string>();
  for (const expense of expenses) {
    if (expense.vendor_name?.startsWith('Petty Cash -')) {
      // The notes field might contain the petty cash expense number
      // Or we can check if the expense_number matches a pattern like "EXP-YYMMXXXX"
      // For now, mark this expense as "already included"
      linkedPettyCashExpenseNumbers.add(expense.expense_number);
    }
  }

  for (const pcExpense of paidPettyCashExpenses) {
    // Skip if this petty cash expense number is already included via linked expense
    // We check by looking at vendor name pattern in existing expenses
    const alreadyIncluded = expenses.some(
      e => e.vendor_name?.includes(pcExpense.walletHolderName) &&
           e.vendor_name?.startsWith('Petty Cash -') &&
           Math.abs((e.total_amount || 0) - pcExpense.amount) < 0.01
    );
    if (alreadyIncluded) continue;

    // Filter by company if specified
    if (companyId && pcExpense.companyId !== companyId) continue;

    // Filter by project if specified
    if (projectId && pcExpense.projectId !== projectId) continue;

    // Petty cash is always in THB
    const currency: Currency = 'THB';
    const fxRate = 1;

    // Use the accounting expense account code if set, otherwise default
    const accountCode = pcExpense.accountingExpenseAccountCode || '5999';
    const account = accountMap.get(accountCode);

    // Only include if it's an Expense account (or if account not found, include anyway)
    if (account && account.account_type !== 'Expense') continue;

    const accountName = account?.name || 'Other Expenses';
    const subType = (account as ChartOfAccountRow & { sub_type?: string })?.sub_type || 'Other';
    const amount = pcExpense.amount || 0;
    const thbAmount = amount * fxRate;

    // Get or create account balance entry
    let balanceEntry = expenseAccountBalances.get(accountCode);
    if (!balanceEntry) {
      balanceEntry = {
        accountCode,
        accountName,
        subType,
        total: 0,
        totalTHB: 0,
        items: [],
      };
      expenseAccountBalances.set(accountCode, balanceEntry);
    }

    balanceEntry.total += amount;
    balanceEntry.totalTHB += thbAmount;
    balanceEntry.items.push({
      id: pcExpense.id,
      date: pcExpense.expenseDate,
      documentNumber: pcExpense.expenseNumber,
      documentType: 'expense',
      description: pcExpense.description || `Petty Cash: ${pcExpense.walletHolderName}`,
      clientOrVendor: `Petty Cash - ${pcExpense.walletHolderName}`,
      projectId: pcExpense.projectId || undefined,
      currency,
      originalAmount: amount,
      fxRate,
      thbAmount,
    });
  }

  // ============================================================================
  // Process RECEIPTS → Income categories
  // ============================================================================
  const incomeAccountBalances = new Map<string, {
    accountCode: string;
    accountName: string;
    subType: string;
    total: number;
    totalTHB: number;
    items: PLLineItem[];
  }>();

  for (const receipt of receipts) {
    // Filter by company if specified
    if (companyId && receipt.company_id !== companyId) continue;

    const currency = (receipt.currency || 'THB') as Currency;
    currencySet.add(currency);

    // Use stored fx_rate from document, fall back to hardcoded only for legacy data
    const storedFxRate = (receipt as { fx_rate?: number | null }).fx_rate;
    const fxRate = storedFxRate ?? CURRENCY_TO_THB[currency] ?? 1;

    for (const lineItem of receipt.line_items || []) {
      // Filter by project if specified
      if (projectId && lineItem.project_id !== projectId) continue;

      // Receipts typically use account code 4000 (Sales Revenue) or similar
      const accountCode = (lineItem as { account_code?: string }).account_code || '4000';
      const account = accountMap.get(accountCode);

      // Only include if it's a Revenue account
      if (account && account.account_type !== 'Revenue') continue;

      const accountName = account?.name || 'Sales Revenue';
      const subType = (account as ChartOfAccountRow & { sub_type?: string })?.sub_type || 'Sales';
      const amount = lineItem.amount || 0;
      const thbAmount = amount * fxRate;

      // Get or create account balance entry
      let balanceEntry = incomeAccountBalances.get(accountCode);
      if (!balanceEntry) {
        balanceEntry = {
          accountCode,
          accountName,
          subType,
          total: 0,
          totalTHB: 0,
          items: [],
        };
        incomeAccountBalances.set(accountCode, balanceEntry);
      }

      balanceEntry.total += amount;
      balanceEntry.totalTHB += thbAmount;
      balanceEntry.items.push({
        id: lineItem.id,
        date: receipt.receipt_date,
        documentNumber: receipt.receipt_number,
        documentType: 'receipt',
        description: lineItem.description || receipt.client_name || 'Receipt',
        clientOrVendor: receipt.client_name || '',
        projectId: lineItem.project_id || undefined,
        currency,
        originalAmount: amount,
        fxRate,
        thbAmount,
      });
    }
  }

  // ============================================================================
  // Build categories from account balances
  // ============================================================================

  // Define balance entry type for clarity
  type BalanceEntry = {
    accountCode: string;
    accountName: string;
    subType: string;
    total: number;
    totalTHB: number;
    items: PLLineItem[];
  };

  // Group expense accounts by subType
  const expenseSubTypeMap = new Map<string, BalanceEntry[]>();
  Array.from(expenseAccountBalances.values()).forEach((balance) => {
    if (Math.abs(balance.totalTHB) < 0.01) return; // Skip zero balances
    const subTypeName = balance.subType || 'Other';
    const accounts = expenseSubTypeMap.get(subTypeName) || [];
    accounts.push(balance);
    expenseSubTypeMap.set(subTypeName, accounts);
  });

  const expenseCategories: PLCategory[] = [];
  Array.from(expenseSubTypeMap.entries()).forEach(([name, accounts]) => {
    accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const allItems: PLLineItem[] = [];
    let total = 0;
    let totalTHB = 0;

    for (const acc of accounts) {
      allItems.push(...acc.items);
      total += acc.total;
      totalTHB += acc.totalTHB;
    }

    expenseCategories.push({
      code: name.toUpperCase().replace(/\s+/g, '_'),
      name,
      items: allItems,
      originalTotal: total,
      thbTotal: totalTHB,
    });
  });
  expenseCategories.sort((a, b) => a.name.localeCompare(b.name));

  // Group income accounts by subType
  const incomeSubTypeMap = new Map<string, BalanceEntry[]>();
  Array.from(incomeAccountBalances.values()).forEach((balance) => {
    if (Math.abs(balance.totalTHB) < 0.01) return; // Skip zero balances
    const subTypeName = balance.subType || 'Other';
    const accounts = incomeSubTypeMap.get(subTypeName) || [];
    accounts.push(balance);
    incomeSubTypeMap.set(subTypeName, accounts);
  });

  const incomeCategories: PLCategory[] = [];
  Array.from(incomeSubTypeMap.entries()).forEach(([name, accounts]) => {
    accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const allItems: PLLineItem[] = [];
    let total = 0;
    let totalTHB = 0;

    for (const acc of accounts) {
      allItems.push(...acc.items);
      total += acc.total;
      totalTHB += acc.totalTHB;
    }

    incomeCategories.push({
      code: name.toUpperCase().replace(/\s+/g, '_'),
      name,
      items: allItems,
      originalTotal: total,
      thbTotal: totalTHB,
    });
  });
  incomeCategories.sort((a, b) => a.name.localeCompare(b.name));

  // Calculate totals
  const incomeTotalOriginal = incomeCategories.reduce((sum, cat) => sum + cat.originalTotal, 0);
  const incomeTotalTHB = incomeCategories.reduce((sum, cat) => sum + cat.thbTotal, 0);
  const expenseTotalOriginal = expenseCategories.reduce((sum, cat) => sum + cat.originalTotal, 0);
  const expenseTotalTHB = expenseCategories.reduce((sum, cat) => sum + cat.thbTotal, 0);

  return {
    options,
    generatedAt: new Date().toISOString(),
    income: {
      categories: incomeCategories,
      totalOriginal: incomeTotalOriginal,
      totalTHB: incomeTotalTHB,
    },
    expenses: {
      categories: expenseCategories,
      totalOriginal: expenseTotalOriginal,
      totalTHB: expenseTotalTHB,
    },
    netProfitOriginal: incomeTotalOriginal - expenseTotalOriginal,
    netProfitTHB: incomeTotalTHB - expenseTotalTHB,
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
