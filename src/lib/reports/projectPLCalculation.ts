/**
 * Project P&L Calculation Engine
 *
 * Generates Project-level Profit & Loss reports for investors.
 * Uses fiscal year from November 1 to October 31.
 * All amounts in THB.
 */

import { mockReceipts } from '@/data/income/mockData';

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
// Project Data
// ============================================================================

// Project info map - maps project IDs to their details
const projectInfoMap: Record<string, ProjectInfo> = {
  'project-ocean-star': {
    id: 'project-ocean-star',
    name: 'Ocean Star',
    managementFeePercent: 15,
    managementCompanyId: 'company-001',
    managementCompanyName: 'Faraway Yachting Co., Ltd.',
  },
  'project-wave-rider': {
    id: 'project-wave-rider',
    name: 'Wave Rider',
    managementFeePercent: 15,
    managementCompanyId: 'company-001',
    managementCompanyName: 'Faraway Yachting Co., Ltd.',
  },
  'project-sea-breeze': {
    id: 'project-sea-breeze',
    name: 'Sea Breeze',
    managementFeePercent: 15,
    managementCompanyId: 'company-001',
    managementCompanyName: 'Faraway Yachting Co., Ltd.',
  },
};

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchProjectInfo(projectId: string): Promise<ProjectInfo | null> {
  return projectInfoMap[projectId] || null;
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

// Currency conversion rate (simplified - in production, use actual exchange rates)
const USD_TO_THB = 35;

async function fetchProjectIncome(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<ProjectTransaction[]> {
  const transactions: ProjectTransaction[] = [];

  for (const receipt of mockReceipts) {
    // Only include paid receipts (exclude void, draft, etc.)
    if (receipt.status !== 'paid') continue;

    // Check if receipt date is within the date range
    if (receipt.receiptDate < startDate || receipt.receiptDate > endDate) continue;

    // Process each line item
    for (const item of receipt.lineItems) {
      // Filter by projectId
      if (item.projectId === projectId) {
        transactions.push({
          id: item.id,
          date: receipt.receiptDate,
          description: item.description,
          category: 'Charter Income',
          amount: item.amount,
          thbAmount: item.amount * USD_TO_THB, // Convert to THB
          documentNumber: receipt.receiptNumber,
          documentType: 'Receipt',
          hasAttachment: false,
          projectId: item.projectId,
        });
      }
    }
  }

  return transactions;
}

async function fetchProjectExpenses(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<ProjectTransaction[]> {
  // TODO: Implement when expense module is built
  // This will fetch expense transactions for the project from:
  // - Purchase orders
  // - Bills/invoices from vendors
  // - Other expense documents
  return [];
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
