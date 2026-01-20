/**
 * P&L Calculation Engine
 *
 * Generates Profit & Loss reports with multi-currency support.
 * All amounts can be displayed in original currency or converted to THB.
 *
 * REVENUE RECOGNITION:
 * Income is only included in P&L when the service (charter) has been completed.
 * Payments received before the charter date are held in "Charter Deposits Received" (2300)
 * and are excluded from this P&L report until the service is delivered.
 */

import { Currency } from '@/data/company/types';

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
// Mock Data Fetching (Replace with real data layer)
// ============================================================================

// In a real implementation, these would fetch from your data stores
// For now, we'll create placeholder functions

interface MockIncome {
  id: string;
  documentNumber: string;
  documentType: 'invoice' | 'receipt' | 'credit_note' | 'debit_note';
  date: string;
  clientName: string;
  description: string;
  projectId?: string;
  projectName?: string;
  currency: Currency;
  totalAmount: number;
  fxRate?: number;
  thbTotalAmount?: number;
  companyId: string;
  status: string;
}

interface MockExpense {
  id: string;
  documentNumber: string;
  documentType: 'expense' | 'received_credit_note' | 'received_debit_note';
  date: string;
  vendorName: string;
  description: string;
  projectId?: string;
  projectName?: string;
  currency: Currency;
  totalAmount: number;
  fxRate?: number;
  thbTotalAmount?: number;
  companyId: string;
  status: string;
}

// Placeholder - replace with actual data fetching
async function fetchIncomeRecords(options: PLReportOptions): Promise<MockIncome[]> {
  // This would be replaced with actual data layer calls
  // e.g., getInvoices(), getReceipts(), getCreditNotes(), getDebitNotes()
  return [];
}

async function fetchExpenseRecords(options: PLReportOptions): Promise<MockExpense[]> {
  // This would be replaced with actual data layer calls
  // e.g., getExpenseRecords(), getReceivedCreditNotes(), getReceivedDebitNotes()
  return [];
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Generate a P&L report for the given options
 */
export async function generatePLReport(options: PLReportOptions): Promise<PLReport> {
  const incomeRecords = await fetchIncomeRecords(options);
  const expenseRecords = await fetchExpenseRecords(options);

  // Process income
  const incomeItems: PLLineItem[] = incomeRecords
    .filter((record) => record.status !== 'void' && record.status !== 'draft')
    .map((record) => ({
      id: record.id,
      date: record.date,
      documentNumber: record.documentNumber,
      documentType: record.documentType,
      description: record.description,
      clientOrVendor: record.clientName,
      projectId: record.projectId,
      projectName: record.projectName,
      currency: record.currency,
      originalAmount: record.totalAmount,
      fxRate: record.fxRate,
      thbAmount: record.thbTotalAmount || record.totalAmount * (record.fxRate || 1),
    }));

  // Process expenses
  const expenseItems: PLLineItem[] = expenseRecords
    .filter((record) => record.status !== 'void' && record.status !== 'draft')
    .map((record) => ({
      id: record.id,
      date: record.date,
      documentNumber: record.documentNumber,
      documentType: record.documentType,
      description: record.description,
      clientOrVendor: record.vendorName,
      projectId: record.projectId,
      projectName: record.projectName,
      currency: record.currency,
      originalAmount: record.totalAmount,
      fxRate: record.fxRate,
      thbAmount: record.thbTotalAmount || record.totalAmount * (record.fxRate || 1),
    }));

  // Calculate totals
  const incomeTotalOriginal = incomeItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const incomeTotalTHB = incomeItems.reduce((sum, item) => sum + item.thbAmount, 0);
  const expenseTotalOriginal = expenseItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const expenseTotalTHB = expenseItems.reduce((sum, item) => sum + item.thbAmount, 0);

  // Collect unique currencies
  const allCurrencies = new Set<Currency>();
  incomeItems.forEach((item) => allCurrencies.add(item.currency));
  expenseItems.forEach((item) => allCurrencies.add(item.currency));

  return {
    options,
    generatedAt: new Date().toISOString(),
    income: {
      categories: [
        {
          code: 'INCOME',
          name: 'Revenue',
          items: incomeItems,
          originalTotal: incomeTotalOriginal,
          thbTotal: incomeTotalTHB,
        },
      ],
      totalOriginal: incomeTotalOriginal,
      totalTHB: incomeTotalTHB,
    },
    expenses: {
      categories: [
        {
          code: 'EXPENSE',
          name: 'Expenses',
          items: expenseItems,
          originalTotal: expenseTotalOriginal,
          thbTotal: expenseTotalTHB,
        },
      ],
      totalOriginal: expenseTotalOriginal,
      totalTHB: expenseTotalTHB,
    },
    netProfitOriginal: incomeTotalOriginal - expenseTotalOriginal,
    netProfitTHB: incomeTotalTHB - expenseTotalTHB,
    hasMultipleCurrencies: allCurrencies.size > 1,
    currencies: Array.from(allCurrencies),
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
