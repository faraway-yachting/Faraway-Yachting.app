/**
 * Bank Reconciliation Mock Data
 *
 * Mock data for bank reconciliation development.
 * Will be replaced with API calls in production.
 */

import {
  BankFeedLine,
  BankFeedStatus,
  BankAccountCoverage,
  BankMatch,
  MatchingRule,
  SuggestedMatch,
  ReconciliationStats,
} from './bankReconciliationTypes';
import { BankAccount } from './types';
import { Project, getProjectById } from './projects';
import { Currency } from '../company/types';
import { generateId } from '@/lib/income/utils';

// Bank feed lines storage (empty - no mock data)
export const mockBankFeedLines: BankFeedLine[] = [];

// Bank account coverage storage (empty - no mock data)
export const mockBankAccountCoverage: BankAccountCoverage[] = [];

// Suggested matches storage (empty - no mock data)
export const mockSuggestedMatches: Record<string, SuggestedMatch[]> = {};

// Matching rules storage (empty - no mock data)
export const mockMatchingRules: MatchingRule[] = [];

// Utility functions
export function getBankFeedLinesByFilter(
  companyIds: string[],
  bankAccountIds: string[],
  statuses: string[],
  dateFrom: string,
  dateTo: string
): BankFeedLine[] {
  return mockBankFeedLines.filter((line) => {
    if (companyIds.length > 0 && !companyIds.includes(line.companyId)) return false;
    if (bankAccountIds.length > 0 && !bankAccountIds.includes(line.bankAccountId)) return false;
    if (statuses.length > 0 && !statuses.includes(line.status)) return false;
    if (dateFrom && line.transactionDate < dateFrom) return false;
    if (dateTo && line.transactionDate > dateTo) return false;
    return true;
  });
}

export function getBankAccountCoverageByCompany(companyId: string): BankAccountCoverage[] {
  return mockBankAccountCoverage.filter((cov) => cov.companyId === companyId);
}

export function getSuggestedMatches(bankFeedLineId: string): SuggestedMatch[] {
  return mockSuggestedMatches[bankFeedLineId] || [];
}

export function getActiveMatchingRules(): MatchingRule[] {
  return mockMatchingRules.filter((rule) => rule.enabled).sort((a, b) => b.priority - a.priority);
}

export function getReconciliationStats(bankLines: BankFeedLine[]): ReconciliationStats {
  const matchedLines = bankLines.filter((line) => line.status === 'matched').length;
  const unmatchedLines = bankLines.filter((line) => line.status === 'unmatched').length;
  const missingRecordLines = bankLines.filter((line) => line.status === 'missing_record').length;
  const needsReviewLines = bankLines.filter((line) => line.status === 'needs_review').length;
  const ignoredLines = bankLines.filter((line) => line.status === 'ignored').length;

  const totalBankMovement = bankLines.reduce((sum, line) => sum + line.amount, 0);
  const totalSystemMovement = bankLines.reduce((sum, line) => sum + line.matchedAmount, 0);

  return {
    totalBankLines: bankLines.length,
    matchedLines,
    unmatchedLines,
    missingRecordLines,
    needsReviewLines,
    ignoredLines,
    systemRecordsNotInBank: 0, // TODO: Calculate from system records
    totalBankMovement,
    totalSystemMovement,
    netDifference: totalBankMovement - totalSystemMovement,
  };
}

/**
 * Data Scope Filter
 *
 * Represents the parsed data scope defining which financial universe to display
 */
export interface DataScopeFilter {
  type: 'all-companies' | 'company' | 'project';
  id?: string; // company-id or project-id
}

/**
 * Parse Data Scope String
 *
 * Converts the data scope string format into a structured filter object
 * @param dataScope - Format: "all-companies" | "company-{id}" | "project-{id}"
 * @returns Parsed scope filter
 */
export function parseDataScope(dataScope: string): DataScopeFilter {
  if (dataScope === 'all-companies') {
    return { type: 'all-companies' };
  }

  if (dataScope.startsWith('company-')) {
    return { type: 'company', id: dataScope.replace('company-', '') };
  }

  if (dataScope.startsWith('project-')) {
    return { type: 'project', id: dataScope.replace('project-', '') };
  }

  return { type: 'all-companies' };
}

/**
 * Filter Bank Accounts by Data Scope
 *
 * Determines which bank accounts are available based on the current data scope
 * @param allAccounts - All bank accounts in the system
 * @param scope - Parsed data scope filter
 * @param projects - All projects (needed for project-to-company mapping)
 * @returns Filtered bank accounts within scope
 */
export function filterBankAccountsByScope(
  allAccounts: BankAccount[],
  scope: DataScopeFilter,
  projects: Project[]
): BankAccount[] {
  if (scope.type === 'all-companies') {
    return allAccounts;
  }

  if (scope.type === 'company') {
    return allAccounts.filter(acc => acc.companyId === scope.id);
  }

  if (scope.type === 'project') {
    // Projects use their company's bank accounts
    const project = projects.find(p => p.id === scope.id);
    if (project) {
      return allAccounts.filter(acc => acc.companyId === project.companyId);
    }
    return [];
  }

  return allAccounts;
}

/**
 * Filter Bank Lines by Data Scope
 *
 * Determines which bank feed lines are visible based on the current data scope
 * For projects: includes matched lines + optionally unassigned lines
 * @param allLines - All bank feed lines
 * @param scope - Parsed data scope filter
 * @param includeUnassigned - For project scope: whether to show unmatched/unassigned lines
 * @returns Filtered bank lines within scope
 */
export function filterBankLinesByScope(
  allLines: BankFeedLine[],
  scope: DataScopeFilter,
  includeUnassigned: boolean = true
): BankFeedLine[] {
  if (scope.type === 'all-companies') {
    return allLines;
  }

  if (scope.type === 'company') {
    return allLines.filter(line => line.companyId === scope.id);
  }

  if (scope.type === 'project') {
    if (!scope.id) return [];

    return allLines.filter(line => {
      // Include if matched to this project
      if (line.projectId === scope.id) return true;

      // Include unmatched/unassigned if toggle is on
      // (lines without projectId that belong to the project's company)
      if (includeUnassigned && !line.projectId && scope.id) {
        // Need to check if line belongs to project's company
        const project = getProjectById(scope.id);
        if (project && line.companyId === project.companyId) {
          return true;
        }
      }

      return false;
    });
  }

  return allLines;
}

/**
 * Expected Bank Movement Record
 *
 * Represents system records (invoices, expenses) marked as paid but not found in bank feed
 */
export interface ExpectedBankMovementRecord {
  id: string;
  type: 'invoice' | 'expense' | 'transfer';
  reference: string;
  date: string;
  counterparty: string;
  amount: number;
  currency: Currency;
  projectId?: string;
  projectName?: string;
  companyId: string;
  companyName: string;
  paidDate?: string; // Date marked as paid
  expectedInBankDate?: string;
  notes?: string;
}

/**
 * Get Expected Bank Movement
 *
 * Returns system records marked as paid but not found in bank feed
 * @param dateFrom - Start date for filtering
 * @param dateTo - End date for filtering
 * @param companyId - Optional company filter
 * @param projectId - Optional project filter
 * @returns Array of expected bank movement records
 */
export function getExpectedBankMovement(
  _dateFrom: string,
  _dateTo: string,
  _companyId?: string,
  _projectId?: string
): ExpectedBankMovementRecord[] {
  // TODO: In production, fetch from API
  // Returns empty array - no mock data
  return [];
}

// ============================================================================
// CRUD Functions for Bank Reconciliation
// ============================================================================

/**
 * Get a bank feed line by ID
 */
export function getBankFeedLineById(id: string): BankFeedLine | undefined {
  return mockBankFeedLines.find(line => line.id === id);
}

/**
 * Get all unmatched bank feed lines
 */
export function getUnmatchedBankFeeds(): BankFeedLine[] {
  return mockBankFeedLines.filter(
    line => line.status === 'unmatched' || line.status === 'missing_record'
  );
}

/**
 * Get bank feeds by status
 */
export function getBankFeedsByStatus(status: BankFeedStatus): BankFeedLine[] {
  return mockBankFeedLines.filter(line => line.status === status);
}

/**
 * Update bank feed line status
 */
export function updateBankFeedStatus(
  id: string,
  status: BankFeedStatus,
  additionalUpdates?: Partial<BankFeedLine>
): BankFeedLine | null {
  const index = mockBankFeedLines.findIndex(line => line.id === id);
  if (index === -1) return null;

  mockBankFeedLines[index] = {
    ...mockBankFeedLines[index],
    ...additionalUpdates,
    status,
  };

  return mockBankFeedLines[index];
}

/**
 * Create a new bank match and update the bank feed line
 */
export function createBankMatch(
  bankFeedLineId: string,
  match: Omit<BankMatch, 'id' | 'bankFeedLineId'>
): BankMatch | null {
  const lineIndex = mockBankFeedLines.findIndex(line => line.id === bankFeedLineId);
  if (lineIndex === -1) return null;

  const newMatch: BankMatch = {
    id: generateId(),
    bankFeedLineId,
    ...match,
  };

  // Add match to bank feed line
  mockBankFeedLines[lineIndex].matches.push(newMatch);

  // Update matched amount
  const totalMatched = mockBankFeedLines[lineIndex].matches.reduce(
    (sum, m) => sum + m.matchedAmount,
    0
  );
  mockBankFeedLines[lineIndex].matchedAmount = totalMatched;

  // Update status based on matching
  const bankAmount = Math.abs(mockBankFeedLines[lineIndex].amount);
  if (Math.abs(totalMatched - bankAmount) < 0.01) {
    mockBankFeedLines[lineIndex].status = 'matched';
  } else if (totalMatched > 0) {
    mockBankFeedLines[lineIndex].status = 'partially_matched';
  }

  // Update confidence score
  mockBankFeedLines[lineIndex].confidenceScore = match.matchScore;

  // Update match metadata
  mockBankFeedLines[lineIndex].matchedBy = match.matchedBy;
  mockBankFeedLines[lineIndex].matchedAt = match.matchedAt;

  return newMatch;
}

/**
 * Remove a bank match from a bank feed line
 */
export function removeBankMatch(bankFeedLineId: string, matchId: string): boolean {
  const lineIndex = mockBankFeedLines.findIndex(line => line.id === bankFeedLineId);
  if (lineIndex === -1) return false;

  const matchIndex = mockBankFeedLines[lineIndex].matches.findIndex(m => m.id === matchId);
  if (matchIndex === -1) return false;

  // Remove the match
  mockBankFeedLines[lineIndex].matches.splice(matchIndex, 1);

  // Recalculate matched amount
  const totalMatched = mockBankFeedLines[lineIndex].matches.reduce(
    (sum, m) => sum + m.matchedAmount,
    0
  );
  mockBankFeedLines[lineIndex].matchedAmount = totalMatched;

  // Update status
  if (totalMatched === 0) {
    mockBankFeedLines[lineIndex].status = 'unmatched';
    mockBankFeedLines[lineIndex].confidenceScore = 0;
    mockBankFeedLines[lineIndex].matchedBy = undefined;
    mockBankFeedLines[lineIndex].matchedAt = undefined;
  } else {
    mockBankFeedLines[lineIndex].status = 'partially_matched';
  }

  return true;
}

/**
 * Mark a bank feed line as ignored
 */
export function ignoreBankFeedLine(
  id: string,
  ignoredBy: string,
  reason?: string
): BankFeedLine | null {
  const index = mockBankFeedLines.findIndex(line => line.id === id);
  if (index === -1) return null;

  mockBankFeedLines[index] = {
    ...mockBankFeedLines[index],
    status: 'ignored',
    ignoredBy,
    ignoredAt: new Date().toISOString(),
    ignoredReason: reason,
  };

  return mockBankFeedLines[index];
}

/**
 * Unignore a bank feed line (set back to unmatched)
 */
export function unignoreBankFeedLine(id: string): BankFeedLine | null {
  const index = mockBankFeedLines.findIndex(line => line.id === id);
  if (index === -1) return null;

  mockBankFeedLines[index] = {
    ...mockBankFeedLines[index],
    status: 'unmatched',
    ignoredBy: undefined,
    ignoredAt: undefined,
    ignoredReason: undefined,
  };

  return mockBankFeedLines[index];
}

/**
 * Update a matching rule's usage stats
 */
export function updateMatchingRuleUsage(ruleId: string): void {
  const rule = mockMatchingRules.find(r => r.id === ruleId);
  if (rule) {
    rule.lastUsed = new Date().toISOString();
    rule.useCount += 1;
  }
}

/**
 * Store for dynamically generated suggestions
 * This replaces the static mockSuggestedMatches when matching engine is used
 */
let dynamicSuggestedMatches: Record<string, SuggestedMatch[]> = {};

/**
 * Set suggested matches for a bank feed line
 */
export function setSuggestedMatches(bankFeedLineId: string, suggestions: SuggestedMatch[]): void {
  dynamicSuggestedMatches[bankFeedLineId] = suggestions;
}

/**
 * Get suggested matches (checks dynamic first, then falls back to mock)
 */
export function getDynamicSuggestedMatches(bankFeedLineId: string): SuggestedMatch[] {
  return dynamicSuggestedMatches[bankFeedLineId] || mockSuggestedMatches[bankFeedLineId] || [];
}

/**
 * Clear all dynamic suggestions
 */
export function clearDynamicSuggestions(): void {
  dynamicSuggestedMatches = {};
}

/**
 * Batch update bank feed lines with new suggestions from matching engine
 */
export function updateSuggestionsFromMatchingEngine(
  suggestions: Map<string, SuggestedMatch[]>
): void {
  suggestions.forEach((lineSuggestions, bankFeedLineId) => {
    dynamicSuggestedMatches[bankFeedLineId] = lineSuggestions;

    // Update confidence score on the bank line if there are suggestions
    if (lineSuggestions.length > 0) {
      const lineIndex = mockBankFeedLines.findIndex(line => line.id === bankFeedLineId);
      if (lineIndex !== -1 && mockBankFeedLines[lineIndex].status !== 'matched') {
        mockBankFeedLines[lineIndex].confidenceScore = lineSuggestions[0].matchScore;
      }
    }
  });
}

/**
 * Apply auto-matches from matching engine
 */
export function applyAutoMatches(matches: BankMatch[]): void {
  for (const match of matches) {
    createBankMatch(match.bankFeedLineId, {
      systemRecordType: match.systemRecordType,
      systemRecordId: match.systemRecordId,
      projectId: match.projectId,
      matchedAmount: match.matchedAmount,
      amountDifference: match.amountDifference,
      matchedBy: match.matchedBy,
      matchedAt: match.matchedAt,
      matchScore: match.matchScore,
      matchMethod: match.matchMethod,
      ruleId: match.ruleId,
      adjustmentRequired: match.adjustmentRequired,
      adjustmentReason: match.adjustmentReason,
    });

    // Update rule usage if matched by rule
    if (match.ruleId) {
      updateMatchingRuleUsage(match.ruleId);
    }
  }
}

/**
 * Add imported bank feed lines from CSV
 */
export function addImportedBankFeedLines(lines: BankFeedLine[]): number {
  // Filter out duplicates based on date + amount + description
  const existingKeys = new Set(
    mockBankFeedLines.map(line =>
      `${line.transactionDate}|${line.amount}|${line.bankAccountId}|${line.description.substring(0, 50)}`
    )
  );

  let addedCount = 0;
  for (const line of lines) {
    const key = `${line.transactionDate}|${line.amount}|${line.bankAccountId}|${line.description.substring(0, 50)}`;
    if (!existingKeys.has(key)) {
      mockBankFeedLines.push(line);
      existingKeys.add(key);
      addedCount++;
    }
  }

  return addedCount;
}
