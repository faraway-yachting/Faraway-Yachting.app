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
import { pettyCashApi } from '@/lib/supabase/api/pettyCash';
import { chartOfAccountsApi } from '@/lib/supabase/api/chartOfAccounts';

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

export interface AttachmentDetail {
  id: string;
  name: string;
  url: string;
  type?: string;
}

export interface TransactionDetail {
  id: string;
  date: string;
  description: string;
  category: string;      // Account code
  categoryName: string;  // Account name from CoA (e.g., "5000 - Fuel")
  amount: number; // THB
  documentNumber: string;
  documentType: string;
  hasAttachment: boolean;
  attachmentUrl?: string;
  attachments?: AttachmentDetail[]; // All attachments for this transaction
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
  attachments?: AttachmentDetail[]; // All attachments
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

// Constant for FA project code (Faraway Yachting management company)
const FA_PROJECT_CODE = 'FA';

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

/**
 * Fetch management fee income for the FA (Faraway Yachting) project
 * This calculates management fees earned from all other projects
 */
async function fetchManagementFeeIncome(
  faProjectId: string,
  startDate: string,
  endDate: string
): Promise<ProjectTransaction[]> {
  const transactions: ProjectTransaction[] = [];

  try {
    // Get all projects except FA that have management fee percentage
    const allProjects = await projectsApi.getAll();
    const managedProjects = allProjects.filter(
      (p) =>
        p.id !== faProjectId &&
        p.management_fee_percentage &&
        p.management_fee_percentage > 0
    );

    // Get all paid receipts in date range
    const receipts = await receiptsApi.getWithLineItemsByDateRange(startDate, endDate);

    // For each managed project, calculate their recognized income and management fee
    for (const project of managedProjects) {
      let projectIncome = 0;
      let latestCharterDate: string | null = null;

      // Sum up recognized income for this project
      for (const receipt of receipts) {
        const charterDateTo = (receipt as ReceiptWithDetails & { charter_date_to?: string | null })
          .charter_date_to;

        // Only include if revenue is recognized (charter completed)
        if (!isCharterCompleted(charterDateTo)) continue;

        for (const item of receipt.line_items) {
          if (item.project_id === project.id) {
            const currency = (receipt as ReceiptWithDetails & { currency?: string }).currency || 'THB';
            const storedFxRate = (receipt as ReceiptWithDetails & { fx_rate?: number | null }).fx_rate;
            const fxRate = storedFxRate ?? CURRENCY_TO_THB[currency] ?? 1;
            projectIncome += item.amount * fxRate;

            // Track latest charter date for the transaction date
            if (!latestCharterDate || (charterDateTo && charterDateTo > latestCharterDate)) {
              latestCharterDate = charterDateTo || null;
            }
          }
        }
      }

      // Calculate management fee if there's income
      if (projectIncome > 0) {
        const managementFee = (projectIncome * project.management_fee_percentage) / 100;

        transactions.push({
          id: `mgmt-fee-${project.id}`,
          date: latestCharterDate || endDate,
          description: `Management Fee - ${project.name} (${project.management_fee_percentage}%)`,
          category: '4300', // Yacht Management Fees
          amount: managementFee,
          thbAmount: managementFee, // Already in THB
          documentNumber: `MGT-${project.code}`,
          documentType: 'Management Fee',
          hasAttachment: false,
          projectId: faProjectId,
        });
      }
    }
  } catch (error) {
    console.error('Error fetching management fee income:', error);
  }

  return transactions;
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

      // Extract all attachments from receipt attachments (JSONB array)
      let attachmentUrl: string | undefined;
      let allAttachments: AttachmentDetail[] = [];
      const receiptAttachments = (receipt as ReceiptWithDetails & { attachments?: unknown }).attachments;
      if (receiptAttachments) {
        try {
          const attachments = Array.isArray(receiptAttachments)
            ? receiptAttachments
            : JSON.parse(receiptAttachments as string);
          if (attachments.length > 0) {
            // Get first URL for backwards compatibility
            if (attachments[0]?.url) {
              attachmentUrl = attachments[0].url;
            }
            // Map all attachments
            allAttachments = attachments
              .filter((a: { url?: string }) => a?.url)
              .map((a: { id?: string; name?: string; url: string; type?: string }, index: number) => ({
                id: a.id || `att-${index}`,
                name: a.name || `Attachment ${index + 1}`,
                url: a.url,
                type: a.type,
              }));
          }
        } catch {
          // Ignore parsing errors
        }
      }
      const hasAttachment = allAttachments.length > 0;

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
            hasAttachment,
            attachmentUrl,
            attachments: allAttachments,
            projectId: item.project_id,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching project income:', error);
  }

  // Check if this is the FA project - if so, add management fee income from all other projects
  try {
    const project = await projectsApi.getById(projectId);
    if (project?.code === FA_PROJECT_CODE) {
      const mgmtFeeIncome = await fetchManagementFeeIncome(projectId, startDate, endDate);
      transactions.push(...mgmtFeeIncome);
    }
  } catch (error) {
    console.error('Error fetching management fee income for FA:', error);
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
    // Fetch main expenses and petty cash expenses in parallel
    const [expenses, paidPettyCashExpenses] = await Promise.all([
      expensesApi.getWithLineItemsByDateRange(startDate, endDate),
      pettyCashApi.getPaidPettyCashExpensesByDateRange(startDate, endDate),
    ]);

    // Process main expenses
    for (const expense of expenses) {
      // Extract all attachments from expense attachments (JSONB array)
      let attachmentUrl: string | undefined;
      let allAttachments: AttachmentDetail[] = [];
      const expenseAttachments = (expense as ExpenseWithDetails & { attachments?: unknown }).attachments;
      if (expenseAttachments) {
        try {
          const attachments = Array.isArray(expenseAttachments)
            ? expenseAttachments
            : JSON.parse(expenseAttachments as string);
          if (attachments.length > 0) {
            // Get first URL for backwards compatibility
            if (attachments[0]?.url) {
              attachmentUrl = attachments[0].url;
            }
            // Map all attachments
            allAttachments = attachments
              .filter((a: { url?: string }) => a?.url)
              .map((a: { id?: string; name?: string; url: string; type?: string }, index: number) => ({
                id: a.id || `att-${index}`,
                name: a.name || `Attachment ${index + 1}`,
                url: a.url,
                type: a.type,
              }));
          }
        } catch {
          // Ignore parsing errors
        }
      }
      const hasAttachment = allAttachments.length > 0;

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
            hasAttachment,
            attachmentUrl,
            attachments: allAttachments,
            projectId: item.project_id,
          });
        }
      }
    }

    // Process petty cash expenses that are assigned to this project
    // Skip those already included via linked expense or already added transactions
    // Track added expense numbers to prevent duplicates
    const addedExpenseNumbers = new Set(transactions.map(t => t.documentNumber));

    for (const pcExpense of paidPettyCashExpenses) {
      // Filter by projectId
      if (pcExpense.projectId !== projectId) continue;

      // Skip if this expense number was already added
      if (addedExpenseNumbers.has(pcExpense.expenseNumber)) continue;

      // Check if already included via linked expense
      const alreadyIncluded = expenses.some(
        e => e.vendor_name?.includes(pcExpense.walletHolderName) &&
             e.vendor_name?.startsWith('Petty Cash -') &&
             Math.abs((e.total_amount || 0) - pcExpense.amount) < 0.01
      );
      if (alreadyIncluded) continue;

      // Petty cash is always in THB
      const amount = pcExpense.amount || 0;

      // Get all attachments
      const allAttachments: AttachmentDetail[] = (pcExpense.attachments || [])
        .filter((a: { url?: string }) => a?.url)
        .map((a: { id?: string; name?: string; url: string; type?: string }, index: number) => ({
          id: a.id || `att-${index}`,
          name: a.name || `Attachment ${index + 1}`,
          url: a.url,
          type: a.type,
        }));
      const hasAttachment = allAttachments.length > 0;
      const attachmentUrl = allAttachments[0]?.url;

      transactions.push({
        id: pcExpense.id,
        date: pcExpense.expenseDate,
        description: pcExpense.description || `Petty Cash: ${pcExpense.walletHolderName}`,
        category: pcExpense.accountingExpenseAccountCode || 'Petty Cash',
        amount: amount,
        thbAmount: amount, // THB = THB
        documentNumber: pcExpense.expenseNumber,
        documentType: 'Petty Cash',
        hasAttachment,
        attachmentUrl,
        attachments: allAttachments,
        projectId: pcExpense.projectId,
      });
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

  // Fetch transactions and Chart of Accounts in parallel
  const [transactions, accounts] = await Promise.all([
    type === 'income'
      ? fetchProjectIncome(projectId, startDate, endDate)
      : fetchProjectExpenses(projectId, startDate, endDate),
    chartOfAccountsApi.getAll(),
  ]);

  // Create account code → category lookup map (uses CoA category column)
  // e.g., "5000" -> "Vessel Operating Costs", "5130" -> "Vessel Operating Costs - Crew"
  const accountCategoryMap = new Map(accounts.map(a => [a.code, a.category || a.name]));

  // Map transactions with resolved category names from CoA
  return transactions.map((t) => {
    // Use the category column from CoA (e.g., "Vessel Operating Costs")
    // Fall back to account code if no category found
    const categoryName = accountCategoryMap.get(t.category) || t.category;

    return {
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      categoryName,
      amount: t.thbAmount,
      documentNumber: t.documentNumber,
      documentType: t.documentType,
      hasAttachment: t.hasAttachment,
      attachmentUrl: t.attachmentUrl,
      attachments: t.attachments,
    };
  });
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
