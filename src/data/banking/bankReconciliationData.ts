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
  TransactionType,
} from './bankReconciliationTypes';
import { BankAccount } from './types';
import { Project, getProjectById } from './projects';
import { Currency } from '../company/types';
import { generateId } from '@/lib/income/utils';

// Mock bank feed lines
export const mockBankFeedLines: BankFeedLine[] = [
  {
    id: 'bf-001',
    bankAccountId: 'bank-001',
    companyId: 'company-001',
    projectId: 'project-001', // Amadeus
    currency: 'THB',
    transactionDate: '2024-12-28',
    valueDate: '2024-12-28',
    description: 'TRANSFER FROM CUSTOMER - INV-2024-001',
    reference: 'TRF202412280001',
    amount: 150000,
    runningBalance: 850000,
    status: 'matched',
    matchedAmount: 150000,
    confidenceScore: 95,
    matches: [
      {
        id: 'match-001',
        bankFeedLineId: 'bf-001',
        systemRecordType: 'receipt',
        systemRecordId: 'inv-001',
        projectId: 'project-001', // Amadeus
        matchedAmount: 150000,
        amountDifference: 0,
        matchedBy: 'admin',
        matchedAt: '2024-12-28T10:30:00.000Z',
        matchScore: 95,
        matchMethod: 'manual',
        adjustmentRequired: false,
      },
    ],
    importedAt: '2024-12-28T09:00:00.000Z',
    importedBy: 'system',
    importSource: 'api',
  },
  {
    id: 'bf-002',
    bankAccountId: 'bank-001',
    companyId: 'company-001',
    currency: 'THB',
    transactionDate: '2024-12-27',
    valueDate: '2024-12-27',
    description: 'MARINA PORT FEES DEC 2024',
    reference: 'PMT202412270045',
    amount: -25000,
    runningBalance: 700000,
    status: 'missing_record',
    matchedAmount: 0,
    confidenceScore: 75,
    matches: [],
    importedAt: '2024-12-28T09:00:00.000Z',
    importedBy: 'system',
    importSource: 'api',
    notes: 'Needs to create expense record',
  },
  {
    id: 'bf-003',
    bankAccountId: 'bank-001',
    companyId: 'company-001',
    projectId: 'project-002', // Hot Chilli
    currency: 'THB',
    transactionDate: '2024-12-26',
    valueDate: '2024-12-26',
    description: 'FUEL SUPPLY - PTT STATION',
    reference: 'DEB202412260012',
    amount: -15750,
    runningBalance: 725000,
    status: 'needs_review',
    matchedAmount: 15000,
    confidenceScore: 60,
    matches: [
      {
        id: 'match-003',
        bankFeedLineId: 'bf-003',
        systemRecordType: 'expense',
        systemRecordId: 'exp-003',
        projectId: 'project-002', // Hot Chilli
        matchedAmount: 15000,
        amountDifference: -750,
        matchedBy: 'admin',
        matchedAt: '2024-12-26T14:00:00.000Z',
        matchScore: 60,
        matchMethod: 'suggested',
        adjustmentRequired: true,
        adjustmentReason: 'Amount difference - VAT or additional fees',
      },
    ],
    importedAt: '2024-12-28T09:00:00.000Z',
    importedBy: 'system',
    importSource: 'api',
  },
  {
    id: 'bf-004',
    bankAccountId: 'bank-001',
    companyId: 'company-001',
    currency: 'THB',
    transactionDate: '2024-12-25',
    valueDate: '2024-12-25',
    description: 'TRANSFER TO SAVINGS ACCOUNT',
    reference: 'TRF202412250078',
    amount: -100000,
    runningBalance: 740750,
    status: 'unmatched',
    matchedAmount: 0,
    confidenceScore: 0,
    matches: [],
    importedAt: '2024-12-28T09:00:00.000Z',
    importedBy: 'system',
    importSource: 'api',
  },
  {
    id: 'bf-005',
    bankAccountId: 'bank-001',
    companyId: 'company-001',
    currency: 'THB',
    transactionDate: '2024-12-24',
    valueDate: '2024-12-24',
    description: 'MONTHLY BANK FEE',
    reference: 'FEE202412',
    amount: -350,
    runningBalance: 840750,
    status: 'ignored',
    matchedAmount: 0,
    matches: [],
    importedAt: '2024-12-28T09:00:00.000Z',
    importedBy: 'system',
    importSource: 'api',
    ignoredBy: 'admin',
    ignoredAt: '2024-12-28T11:00:00.000Z',
    ignoredReason: 'Recurring bank fee - auto-recorded',
  },
  {
    id: 'bf-006',
    bankAccountId: 'bank-002',
    companyId: 'company-001',
    currency: 'USD',
    transactionDate: '2024-12-23',
    valueDate: '2024-12-23',
    description: 'WIRE TRANSFER - YACHT PARTS ORDER',
    reference: 'WIRE202412230033',
    amount: -5000,
    runningBalance: 25000,
    status: 'partially_matched',
    matchedAmount: 4500,
    confidenceScore: 85,
    matches: [
      {
        id: 'match-006',
        bankFeedLineId: 'bf-006',
        systemRecordType: 'expense',
        systemRecordId: 'exp-006',
        matchedAmount: 4500,
        amountDifference: -500,
        matchedBy: 'admin',
        matchedAt: '2024-12-23T16:00:00.000Z',
        matchScore: 85,
        matchMethod: 'manual',
        adjustmentRequired: true,
        adjustmentReason: 'Wire transfer fee not included in original invoice',
      },
    ],
    importedAt: '2024-12-28T09:00:00.000Z',
    importedBy: 'system',
    importSource: 'api',
  },
];

// Mock bank account coverage
export const mockBankAccountCoverage: BankAccountCoverage[] = [
  {
    bankAccountId: 'bank-001',
    bankAccountName: 'Kasikorn Bank - THB Operating',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'THB',
    lastImportDate: '2024-12-28T09:00:00.000Z',
    lastImportSource: 'api',
    feedStatus: 'active',
    totalLinesInRange: 12,
    matchedLines: 8,
    unmatchedLines: 2,
    missingRecordLines: 2,
    bankNetMovement: -150000,
    systemNetMovement: -145000,
    netDifference: -5000,
    reconciledPercentage: 83.33,
  },
  {
    bankAccountId: 'bank-002',
    bankAccountName: 'Bangkok Bank - USD',
    companyId: 'company-001',
    companyName: 'Faraway Yachting',
    currency: 'USD',
    lastImportDate: '2024-12-28T09:00:00.000Z',
    lastImportSource: 'api',
    feedStatus: 'active',
    totalLinesInRange: 8,
    matchedLines: 6,
    unmatchedLines: 1,
    missingRecordLines: 1,
    bankNetMovement: -12000,
    systemNetMovement: -11500,
    netDifference: -500,
    reconciledPercentage: 95.83,
  },
  {
    bankAccountId: 'bank-003',
    bankAccountName: 'SCB - Project Account',
    companyId: 'company-002',
    companyName: 'Blue Horizon Yachts',
    currency: 'THB',
    lastImportDate: '2024-12-20T09:00:00.000Z',
    lastImportSource: 'csv',
    feedStatus: 'manual',
    totalLinesInRange: 15,
    matchedLines: 10,
    unmatchedLines: 3,
    missingRecordLines: 2,
    bankNetMovement: 250000,
    systemNetMovement: 248000,
    netDifference: 2000,
    reconciledPercentage: 66.67,
  },
];

// Mock suggested matches
export const mockSuggestedMatches: Record<string, SuggestedMatch[]> = {
  'bf-002': [
    {
      systemRecordType: 'expense',
      systemRecordId: 'exp-draft-001',
      counterparty: 'Royal Phuket Marina',
      reference: 'Port Fees - December',
      projectId: 'proj-001',
      projectName: 'M/Y Azure Spirit',
      amount: 25000,
      date: '2024-12-27',
      description: 'Monthly port fees',
      matchScore: 75,
      matchReasons: ['amount_exact', 'description_similar', 'date_exact'],
    },
  ],
  'bf-004': [
    {
      systemRecordType: 'transfer',
      systemRecordId: 'transfer-001',
      reference: 'Internal Transfer',
      amount: 100000,
      date: '2024-12-25',
      description: 'Transfer to savings',
      matchScore: 90,
      matchReasons: ['amount_exact', 'date_exact', 'description_match'],
    },
  ],
};

// Mock matching rules
export const mockMatchingRules: MatchingRule[] = [
  {
    id: 'rule-001',
    name: 'Marina Port Fees',
    description: 'Auto-suggest port fees for marina transactions',
    enabled: true,
    priority: 10,
    descriptionContains: ['MARINA', 'PORT', 'BERTH'],
    amountSign: 'debit',
    suggestType: 'expense',
    suggestCategory: 'Port Fees',
    autoMatchIfConfidence: 85,
    createdBy: 'admin',
    createdAt: '2024-01-15T10:00:00.000Z',
    lastUsed: '2024-12-27T14:30:00.000Z',
    useCount: 45,
  },
  {
    id: 'rule-002',
    name: 'Customer Payments',
    description: 'Match customer invoice payments',
    enabled: true,
    priority: 20,
    descriptionContains: ['TRANSFER FROM', 'CUSTOMER', 'INV-'],
    amountSign: 'credit',
    suggestType: 'receipt',
    autoMatchIfConfidence: 90,
    createdBy: 'admin',
    createdAt: '2024-01-15T10:00:00.000Z',
    lastUsed: '2024-12-28T10:30:00.000Z',
    useCount: 128,
  },
  {
    id: 'rule-003',
    name: 'Fuel Expenses',
    description: 'Auto-categorize fuel purchases',
    enabled: true,
    priority: 15,
    descriptionContains: ['PTT', 'FUEL', 'DIESEL'],
    amountSign: 'debit',
    suggestType: 'expense',
    suggestCategory: 'Fuel & Oil',
    createdBy: 'admin',
    createdAt: '2024-01-15T10:00:00.000Z',
    lastUsed: '2024-12-26T14:00:00.000Z',
    useCount: 67,
  },
];

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
  dateFrom: string,
  dateTo: string,
  companyId?: string,
  projectId?: string
): ExpectedBankMovementRecord[] {
  // TODO: In production, fetch from API
  // For now, return mock data showing records marked as paid but not in bank

  const mockRecords: ExpectedBankMovementRecord[] = [
    {
      id: 'inv-999',
      type: 'invoice',
      reference: 'INV-2024-999',
      date: '2024-12-20',
      counterparty: 'Customer ABC',
      amount: 50000,
      currency: 'THB',
      companyId: 'company-001',
      companyName: 'Faraway Yachting',
      projectId: 'project-001',
      projectName: 'Amadeus',
      paidDate: '2024-12-20',
      expectedInBankDate: '2024-12-21',
      notes: 'Marked as paid but not in bank feed',
    },
    {
      id: 'exp-888',
      type: 'expense',
      reference: 'EXP-2024-888',
      date: '2024-12-18',
      counterparty: 'Supplier XYZ',
      amount: -25000,
      currency: 'THB',
      companyId: 'company-001',
      companyName: 'Faraway Yachting',
      projectId: 'project-002',
      projectName: 'Hot Chilli',
      paidDate: '2024-12-18',
      expectedInBankDate: '2024-12-19',
      notes: 'Payment confirmed but not in bank statement',
    },
    {
      id: 'inv-777',
      type: 'invoice',
      reference: 'INV-2024-777',
      date: '2024-12-15',
      counterparty: 'Client DEF',
      amount: 75000,
      currency: 'THB',
      companyId: 'company-001',
      companyName: 'Faraway Yachting',
      paidDate: '2024-12-15',
      expectedInBankDate: '2024-12-16',
      notes: 'Customer confirmed payment',
    },
  ];

  // Filter by date range
  let filtered = mockRecords.filter(record => {
    return record.date >= dateFrom && record.date <= dateTo;
  });

  // Filter by company if specified
  if (companyId) {
    filtered = filtered.filter(r => r.companyId === companyId);
  }

  // Filter by project if specified
  if (projectId) {
    filtered = filtered.filter(r => r.projectId === projectId);
  }

  return filtered;
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
