/**
 * Project P&L Calculation Engine
 *
 * Generates Project-level Profit & Loss reports for investors.
 * Uses fiscal year from November 1 to October 31.
 * All amounts in THB.
 */

import { projectsApi } from '@/lib/supabase/api/projects';
import { receiptsApi, type ReceiptWithDetails } from '@/lib/supabase/api/receipts';
import { expensesApi, type ExpenseWithDetails } from '@/lib/supabase/api/expenses';

// ============================================================================
// Types
// ============================================================================

export interface ProjectPLMonth {
  month: string; // Format: "YYYY-MM"
  monthLabel: string; // Display label: "Nov 2024"
  income: number; // THB
  expense: number; // THB
  managementFee: number; // income × managementFeePercent / 100
  profit: number; // (income - managementFee) - expense
}

export interface ProjectPLReport {
  projectId: string;
  projectName: string;
  fiscalYear: string; // Format: "2024-2025"
  fiscalYearLabel: string; // "FY 2024-2025 (Nov 2024 - Oct 2025)"
  managementFeePercent: number;
  managementCompanyName: string;
  months: ProjectPLMonth[];
  totals: Omit<ProjectPLMonth, 'month' | 'monthLabel'> & {
    month: 'TOTAL';
    monthLabel: 'Total';
  };
  generatedAt: string;
}

export interface TransactionDetail {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number; // THB
  documentNumber: string;
  documentType: string;
  hasAttachment: boolean;
  attachmentUrl?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  managementFeePercent: number;
  managementCompanyId: string;
  managementCompanyName: string;
}

// ============================================================================
// Fiscal Year Utilities
// ============================================================================

/**
 * Get fiscal year string from a date
 * Fiscal year runs Nov 1 → Oct 31
 * Nov 2024 and Dec 2024 belong to FY 2024-2025
 * Jan 2025 through Oct 2025 also belong to FY 2024-2025
 */
export function getFiscalYear(date: Date): string {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  // Nov (10) and Dec (11) belong to next fiscal year
  if (month >= 10) {
    return `${year}-${year + 1}`;
  }
  // Jan (0) through Oct (9) belong to current fiscal year starting previous Nov
  return `${year - 1}-${year}`;
}

/**
 * Get fiscal year from ISO date string
 */
export function getFiscalYearFromISO(dateStr: string): string {
  return getFiscalYear(new Date(dateStr));
}

/**
 * Get all months in a fiscal year
 * Returns array of "YYYY-MM" strings from Nov to Oct
 */
export function getFiscalMonths(fiscalYear: string): string[] {
  const [startYear] = fiscalYear.split('-').map(Number);

  return [
    `${startYear}-11`, // November
    `${startYear}-12`, // December
    `${startYear + 1}-01`, // January
    `${startYear + 1}-02`, // February
    `${startYear + 1}-03`, // March
    `${startYear + 1}-04`, // April
    `${startYear + 1}-05`, // May
    `${startYear + 1}-06`, // June
    `${startYear + 1}-07`, // July
    `${startYear + 1}-08`, // August
    `${startYear + 1}-09`, // September
    `${startYear + 1}-10`, // October
  ];
}

/**
 * Get fiscal year date range
 */
export function getFiscalYearDateRange(fiscalYear: string): {
  startDate: string;
  endDate: string;
} {
  const [startYear, endYear] = fiscalYear.split('-').map(Number);

  return {
    startDate: `${startYear}-11-01`,
    endDate: `${endYear}-10-31`,
  };
}

/**
 * Format month for display
 * "2024-11" → "Nov 2024"
 */
export function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} ${year}`;
}

/**
 * Get current fiscal year
 */
export function getCurrentFiscalYear(): string {
  return getFiscalYear(new Date());
}

/**
 * Get list of recent fiscal years for dropdown
 */
export function getRecentFiscalYears(count: number = 5): string[] {
  const current = getCurrentFiscalYear();
  const [startYear] = current.split('-').map(Number);

  const years: string[] = [];
  for (let i = 0; i < count; i++) {
    const year = startYear - i;
    years.push(`${year}-${year + 1}`);
  }

  return years;
}

/**
 * Format fiscal year for display
 * "2024-2025" → "FY 2024-2025 (Nov 2024 - Oct 2025)"
 */
export function formatFiscalYearLabel(fiscalYear: string): string {
  const [startYear, endYear] = fiscalYear.split('-');
  return `FY ${fiscalYear} (Nov ${startYear} - Oct ${endYear})`;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchProjectInfo(projectId: string): Promise<ProjectInfo | null> {
  try {
    const project = await projectsApi.getById(projectId);
    if (!project) return null;

    return {
      id: project.id,
      name: project.name,
      managementFeePercent: project.management_fee_percentage,
      managementCompanyId: project.company_id,
      managementCompanyName: 'Faraway Yachting Co., Ltd.', // Could be fetched from companies table if needed
    };
  } catch (error) {
    console.error('Error fetching project info:', error);
    return null;
  }
}

interface ProjectTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number; // Original amount
  thbAmount: number; // THB amount
  documentNumber: string;
  documentType: string;
  hasAttachment: boolean;
  attachmentUrl?: string;
  projectId: string;
}

// LEGACY FALLBACK RATES - Only used when fx_rate is null on older documents
// New documents should always have fx_rate populated from the exchange rate API
const CURRENCY_TO_THB: Record<string, number> = {
  THB: 1,
  USD: 35,
  EUR: 38,
  GBP: 44,
};

/**
 * Check if a charter service has been completed based on charter end date
 * Revenue should only be recognized when the service has been delivered
 */
function isCharterCompleted(charterDateTo?: string | null): boolean {
  if (!charterDateTo) {
    return false; // No charter date = not recognized (needs review)
  }

  const charterEnd = new Date(charterDateTo);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  charterEnd.setHours(0, 0, 0, 0);

  return charterEnd <= today;
}

async function fetchProjectIncome(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<ProjectTransaction[]> {
  const transactions: ProjectTransaction[] = [];

  try {
    const receipts = await receiptsApi.getWithLineItemsByDateRange(startDate, endDate);

    for (const receipt of receipts) {
      // Get charter dates from receipt
      const charterDateTo = (receipt as ReceiptWithDetails & { charter_date_to?: string | null }).charter_date_to;

      // REVENUE RECOGNITION: Only include revenue if charter service has been completed
      // This implements proper accrual accounting where revenue is recognized when service is delivered
      if (!isCharterCompleted(charterDateTo)) {
        // Charter not yet completed - skip this receipt (revenue is deferred)
        continue;
      }

      // Process each line item
      for (const item of receipt.line_items) {
        // Filter by projectId
        if (item.project_id === projectId) {
          const currency = (receipt as ReceiptWithDetails & { currency?: string }).currency || 'THB';
          // Use stored fx_rate from document, fall back to hardcoded only for legacy data
          const storedFxRate = (receipt as ReceiptWithDetails & { fx_rate?: number | null }).fx_rate;
          const fxRate = storedFxRate ?? CURRENCY_TO_THB[currency] ?? 1;

          transactions.push({
            id: item.id,
            date: receipt.receipt_date,
            description: item.description,
            category: 'Charter Income',
            amount: item.amount,
            thbAmount: item.amount * fxRate,
            documentNumber: receipt.receipt_number,
            documentType: 'Receipt',
            hasAttachment: false,
            projectId: item.project_id,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching project income:', error);
  }

  return transactions;
}

async function fetchProjectExpenses(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<ProjectTransaction[]> {
  const transactions: ProjectTransaction[] = [];

  try {
    const expenses = await expensesApi.getWithLineItemsByDateRange(startDate, endDate);

    for (const expense of expenses) {
      // Process each line item
      for (const item of expense.line_items) {
        // Filter by projectId
        if (item.project_id === projectId) {
          const currency = (expense as ExpenseWithDetails & { currency?: string }).currency || 'THB';
          // Use stored fx_rate from document, fall back to hardcoded only for legacy data
          const storedFxRate = (expense as ExpenseWithDetails & { fx_rate?: number | null }).fx_rate;
          const fxRate = storedFxRate ?? CURRENCY_TO_THB[currency] ?? 1;
          const amount = item.amount || 0;

          transactions.push({
            id: item.id,
            date: expense.expense_date,
            description: item.description,
            category: item.account_code || 'Operating Expense',
            amount: amount,
            thbAmount: amount * fxRate,
            documentNumber: expense.expense_number,
            documentType: 'Expense',
            hasAttachment: false,
            projectId: item.project_id,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching project expenses:', error);
  }

  return transactions;
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Generate Project P&L report for a fiscal year
 */
export async function generateProjectPL(
  projectId: string,
  fiscalYear: string
): Promise<ProjectPLReport | null> {
  // Fetch project info
  const project = await fetchProjectInfo(projectId);
  if (!project) {
    return null;
  }

  const { startDate, endDate } = getFiscalYearDateRange(fiscalYear);

  // Fetch transactions
  const incomeTransactions = await fetchProjectIncome(projectId, startDate, endDate);
  const expenseTransactions = await fetchProjectExpenses(projectId, startDate, endDate);

  // Group by month
  const months = getFiscalMonths(fiscalYear);

  const monthlyData: ProjectPLMonth[] = months.map((monthStr) => {
    // Filter transactions for this month
    const monthIncome = incomeTransactions
      .filter((t) => t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + t.thbAmount, 0);

    const monthExpense = expenseTransactions
      .filter((t) => t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + t.thbAmount, 0);

    const managementFee = (monthIncome * project.managementFeePercent) / 100;
    const profit = monthIncome - managementFee - monthExpense;

    return {
      month: monthStr,
      monthLabel: formatMonthLabel(monthStr),
      income: monthIncome,
      expense: monthExpense,
      managementFee,
      profit,
    };
  });

  // Calculate totals
  const totals = {
    month: 'TOTAL' as const,
    monthLabel: 'Total' as const,
    income: monthlyData.reduce((sum, m) => sum + m.income, 0),
    expense: monthlyData.reduce((sum, m) => sum + m.expense, 0),
    managementFee: monthlyData.reduce((sum, m) => sum + m.managementFee, 0),
    profit: monthlyData.reduce((sum, m) => sum + m.profit, 0),
  };

  return {
    projectId: project.id,
    projectName: project.name,
    fiscalYear,
    fiscalYearLabel: formatFiscalYearLabel(fiscalYear),
    managementFeePercent: project.managementFeePercent,
    managementCompanyName: project.managementCompanyName,
    months: monthlyData,
    totals,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get transaction details for a specific month and type (drill-down)
 */
export async function getProjectTransactions(
  projectId: string,
  month: string,
  type: 'income' | 'expense'
): Promise<TransactionDetail[]> {
  // Calculate date range for the month
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;

  // Get last day of month
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;

  let transactions: ProjectTransaction[];

  if (type === 'income') {
    transactions = await fetchProjectIncome(projectId, startDate, endDate);
  } else {
    transactions = await fetchProjectExpenses(projectId, startDate, endDate);
  }

  return transactions.map((t) => ({
    id: t.id,
    date: t.date,
    description: t.description,
    category: t.category,
    amount: t.thbAmount,
    documentNumber: t.documentNumber,
    documentType: t.documentType,
    hasAttachment: t.hasAttachment,
    attachmentUrl: t.attachmentUrl,
  }));
}

/**
 * Format THB amount for display
 */
export function formatTHBAmount(amount: number): string {
  const formatter = new Intl.NumberFormat('th-TH', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `฿${formatter.format(amount)}`;
}
