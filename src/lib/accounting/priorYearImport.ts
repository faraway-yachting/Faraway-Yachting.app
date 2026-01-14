/**
 * Prior Year Import Utility
 *
 * Creates journal entries for importing prior year P&L summary data.
 * Used by Super Admins to migrate historical financial data.
 * Supports project-level P&L import with batch processing.
 */

import { addJournalEntry } from '@/data/accounting/journalEntries';
import { JournalEntry, JournalEntryLine } from '@/data/accounting/journalEntryTypes';

// ============================================================================
// Types
// ============================================================================

export interface ProjectPLData {
  projectId: string;
  projectName: string;
  totalIncome: number;
  totalExpenses: number;
  managementFees: number;
}

export interface PriorYearImportData {
  fiscalYear: number;
  companyId: string;
  effectiveDate: string;
  projects: ProjectPLData[];
  notes?: string;
}

// Legacy interface for backwards compatibility
export interface LegacyPriorYearImportData {
  fiscalYear: number;
  companyId: string;
  totalIncome: number;
  totalExpenses: number;
  managementFees: number;
  effectiveDate: string;
  notes?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for journal entry lines
 */
function generateLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate net profit for a project
 */
export function calculateProjectNetProfit(project: ProjectPLData): number {
  return project.totalIncome - project.totalExpenses - project.managementFees;
}

/**
 * Calculate net profit from legacy import data
 */
export function calculateNetProfit(data: Partial<LegacyPriorYearImportData>): number {
  const income = data.totalIncome || 0;
  const expenses = data.totalExpenses || 0;
  const managementFees = data.managementFees || 0;
  return income - expenses - managementFees;
}

/**
 * Get default effective date for a fiscal year (Dec 31)
 */
export function getDefaultEffectiveDate(fiscalYear: number): string {
  return `${fiscalYear}-12-31`;
}

// ============================================================================
// Project-Level Journal Entry Creation
// ============================================================================

/**
 * Create a journal entry for a single project's prior year P&L
 */
function createProjectJournalEntry(
  baseData: PriorYearImportData,
  project: ProjectPLData,
  createdBy: string
): JournalEntry {
  const netProfit = calculateProjectNetProfit(project);

  // Build description with project and summary info
  const description = [
    `Prior Year P&L Import - FY${baseData.fiscalYear} - ${project.projectName}`,
    `Income: ${project.totalIncome.toLocaleString()} THB`,
    `Expenses: ${project.totalExpenses.toLocaleString()} THB`,
    project.managementFees > 0 ? `Mgmt Fees: ${project.managementFees.toLocaleString()} THB` : null,
    `Net ${netProfit >= 0 ? 'Profit' : 'Loss'}: ${Math.abs(netProfit).toLocaleString()} THB`,
  ].filter(Boolean).join(' | ');

  const lines: JournalEntryLine[] = [];

  if (netProfit >= 0) {
    // Profit: Debit Current Year Earnings, Credit Retained Earnings
    lines.push({
      id: generateLineId(),
      accountCode: '3210',
      accountName: 'Current Year Earnings',
      description: `FY${baseData.fiscalYear} ${project.projectName} - closing`,
      type: 'debit',
      amount: netProfit,
      currency: 'THB',
    });
    lines.push({
      id: generateLineId(),
      accountCode: '3200',
      accountName: 'Retained Earnings - Prior Years',
      description: `FY${baseData.fiscalYear} ${project.projectName} - net profit`,
      type: 'credit',
      amount: netProfit,
      currency: 'THB',
    });
  } else {
    // Loss: Debit Retained Earnings, Credit Current Year Earnings
    const lossAmount = Math.abs(netProfit);
    lines.push({
      id: generateLineId(),
      accountCode: '3200',
      accountName: 'Retained Earnings - Prior Years',
      description: `FY${baseData.fiscalYear} ${project.projectName} - net loss`,
      type: 'debit',
      amount: lossAmount,
      currency: 'THB',
    });
    lines.push({
      id: generateLineId(),
      accountCode: '3210',
      accountName: 'Current Year Earnings',
      description: `FY${baseData.fiscalYear} ${project.projectName} - closing`,
      type: 'credit',
      amount: lossAmount,
      currency: 'THB',
    });
  }

  // Calculate totals
  const totalDebit = lines
    .filter(line => line.type === 'debit')
    .reduce((sum, line) => sum + line.amount, 0);
  const totalCredit = lines
    .filter(line => line.type === 'credit')
    .reduce((sum, line) => sum + line.amount, 0);

  // Create the journal entry (auto-posted for opening balances)
  const entry = addJournalEntry({
    date: baseData.effectiveDate,
    companyId: baseData.companyId,
    description,
    lines,
    status: 'posted',
    totalDebit,
    totalCredit,
    createdBy,
    postedBy: createdBy,
    postedAt: new Date().toISOString(),
  });

  return entry;
}

/**
 * Create journal entries for all projects in the import data
 * Skips projects with zero net profit
 */
export function createPriorYearJournalEntries(
  data: PriorYearImportData,
  createdBy: string = 'system'
): JournalEntry[] {
  const entries: JournalEntry[] = [];

  for (const project of data.projects) {
    const netProfit = calculateProjectNetProfit(project);

    // Skip projects with zero or near-zero net profit
    if (Math.abs(netProfit) < 0.01) continue;

    const entry = createProjectJournalEntry(data, project, createdBy);
    entries.push(entry);
  }

  return entries;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate prior year import data with projects
 */
export function validatePriorYearData(data: Partial<PriorYearImportData>): string[] {
  const errors: string[] = [];

  if (!data.fiscalYear || data.fiscalYear < 2000 || data.fiscalYear > new Date().getFullYear()) {
    errors.push('Please select a valid fiscal year');
  }

  if (!data.companyId) {
    errors.push('Please select a company');
  }

  if (!data.effectiveDate) {
    errors.push('Please select an effective date');
  } else if (data.fiscalYear) {
    // Effective date should be within the fiscal year
    const effectiveYear = new Date(data.effectiveDate).getFullYear();
    if (effectiveYear !== data.fiscalYear) {
      errors.push('Effective date must be within the selected fiscal year');
    }
  }

  if (!data.projects || data.projects.length === 0) {
    errors.push('No projects found for the selected company');
  } else {
    // Check for at least one project with data
    const hasData = data.projects.some(
      p => p.totalIncome > 0 || p.totalExpenses > 0 || p.managementFees > 0
    );
    if (!hasData) {
      errors.push('Please enter data for at least one project');
    }

    // Validate individual project data
    for (const project of data.projects) {
      if (project.totalIncome < 0) {
        errors.push(`${project.projectName}: Income must be zero or greater`);
      }
      if (project.totalExpenses < 0) {
        errors.push(`${project.projectName}: Expenses must be zero or greater`);
      }
      if (project.managementFees < 0) {
        errors.push(`${project.projectName}: Management fees must be zero or greater`);
      }
    }
  }

  return errors;
}

// ============================================================================
// Summary Calculations
// ============================================================================

/**
 * Calculate totals for all projects
 */
export function calculateProjectTotals(projects: ProjectPLData[]): {
  totalIncome: number;
  totalExpenses: number;
  totalMgmtFees: number;
  totalNetProfit: number;
} {
  return projects.reduce(
    (totals, project) => ({
      totalIncome: totals.totalIncome + project.totalIncome,
      totalExpenses: totals.totalExpenses + project.totalExpenses,
      totalMgmtFees: totals.totalMgmtFees + project.managementFees,
      totalNetProfit: totals.totalNetProfit + calculateProjectNetProfit(project),
    }),
    { totalIncome: 0, totalExpenses: 0, totalMgmtFees: 0, totalNetProfit: 0 }
  );
}

// ============================================================================
// Legacy Support (backwards compatibility)
// ============================================================================

/**
 * Create a journal entry for company-level import (legacy)
 * @deprecated Use createPriorYearJournalEntries with project-level data instead
 */
export function createPriorYearJournalEntry(
  data: LegacyPriorYearImportData,
  createdBy: string = 'system'
): JournalEntry {
  const netProfit = data.totalIncome - data.totalExpenses - data.managementFees;

  const description = [
    `Prior Year Retained Earnings Import - FY${data.fiscalYear}`,
    `Income: ${data.totalIncome.toLocaleString()} THB`,
    `Expenses: ${data.totalExpenses.toLocaleString()} THB`,
    data.managementFees > 0 ? `Management Fees: ${data.managementFees.toLocaleString()} THB` : null,
    `Net ${netProfit >= 0 ? 'Profit' : 'Loss'}: ${Math.abs(netProfit).toLocaleString()} THB`,
    data.notes ? `Notes: ${data.notes}` : null,
  ].filter(Boolean).join(' | ');

  const lines: JournalEntryLine[] = [];

  if (netProfit >= 0) {
    lines.push({
      id: generateLineId(),
      accountCode: '3210',
      accountName: 'Current Year Earnings',
      description: `FY${data.fiscalYear} closing - transfer to retained earnings`,
      type: 'debit',
      amount: netProfit,
      currency: 'THB',
    });
    lines.push({
      id: generateLineId(),
      accountCode: '3200',
      accountName: 'Retained Earnings - Prior Years',
      description: `FY${data.fiscalYear} net profit`,
      type: 'credit',
      amount: netProfit,
      currency: 'THB',
    });
  } else {
    const lossAmount = Math.abs(netProfit);
    lines.push({
      id: generateLineId(),
      accountCode: '3200',
      accountName: 'Retained Earnings - Prior Years',
      description: `FY${data.fiscalYear} net loss`,
      type: 'debit',
      amount: lossAmount,
      currency: 'THB',
    });
    lines.push({
      id: generateLineId(),
      accountCode: '3210',
      accountName: 'Current Year Earnings',
      description: `FY${data.fiscalYear} closing - transfer loss to retained earnings`,
      type: 'credit',
      amount: lossAmount,
      currency: 'THB',
    });
  }

  const totalDebit = lines
    .filter(line => line.type === 'debit')
    .reduce((sum, line) => sum + line.amount, 0);
  const totalCredit = lines
    .filter(line => line.type === 'credit')
    .reduce((sum, line) => sum + line.amount, 0);

  const entry = addJournalEntry({
    date: data.effectiveDate,
    companyId: data.companyId,
    description,
    lines,
    status: 'posted',
    totalDebit,
    totalCredit,
    createdBy,
    postedBy: createdBy,
    postedAt: new Date().toISOString(),
  });

  return entry;
}
