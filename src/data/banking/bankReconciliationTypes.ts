/**
 * Bank Reconciliation Data Types
 *
 * Defines the data structure for bank reconciliation and matching.
 * Designed to support real bank feed integration.
 */

import { Currency } from '../company/types';

export type BankFeedStatus =
  | 'missing_record'    // No system record linked
  | 'matched'           // Fully matched
  | 'partially_matched' // Some amount matched
  | 'needs_review'      // Matched but has issues
  | 'ignored'           // User marked as non-business
  | 'unmatched';        // Default state

export type ReconciliationScope = 'group' | 'company' | 'project';
export type ViewMode = 'bank-first' | 'system-first';

export type TransactionType =
  | 'receipt'           // Income/customer payment
  | 'expense'           // Vendor payment
  | 'transfer'          // Between bank accounts
  | 'owner_contribution'// Shareholder loan/capital
  | 'bank_fee'          // Bank charges
  | 'interest'          // Bank interest
  | 'refund';           // Refund received/given

export interface BankFeedLine {
  id: string;
  bankAccountId: string;          // Links to bank account
  companyId: string;               // Company that owns the account
  projectId?: string;              // Optional: Links to project if matched to project record
  currency: Currency;

  // From bank feed
  transactionDate: string;         // ISO date
  valueDate: string;               // When it cleared
  description: string;             // Bank description
  reference?: string;              // Bank reference number
  amount: number;                  // Positive = credit, Negative = debit
  runningBalance?: number;         // Balance after transaction

  // Reconciliation
  status: BankFeedStatus;
  matchedAmount: number;           // Sum of matched links
  confidenceScore?: number;        // 0-100 for suggested matches

  // Links to system records
  matches: BankMatch[];

  // Metadata
  importedAt: string;
  importedBy: string;
  importSource: string;            // 'api', 'csv', 'manual'
  notes?: string;
  attachments?: string[];          // Statement screenshots

  // Audit trail
  matchedBy?: string;
  matchedAt?: string;
  ignoredBy?: string;
  ignoredAt?: string;
  ignoredReason?: string;
}

export interface BankMatch {
  id: string;
  bankFeedLineId: string;

  // What it's matched to
  systemRecordType: TransactionType;
  systemRecordId: string;          // Invoice, expense, transfer, etc.
  projectId?: string;              // Project associated with the matched system record

  // Match details
  matchedAmount: number;
  amountDifference: number;        // If not exact match

  // Match metadata
  matchedBy: string;
  matchedAt: string;
  matchScore: number;              // 0-100 confidence
  matchMethod: 'manual' | 'rule' | 'suggested';
  ruleId?: string;                 // If matched by rule

  // For adjustments
  adjustmentRequired: boolean;
  adjustmentReason?: string;
  adjustmentJournalId?: string;
}

export interface BankAccountCoverage {
  bankAccountId: string;
  bankAccountName: string;
  companyId: string;
  companyName: string;
  currency: Currency;

  // Import status
  lastImportDate?: string;
  lastImportSource?: string;
  feedStatus: 'active' | 'broken' | 'manual';

  // Coverage stats for date range
  totalLinesInRange: number;
  matchedLines: number;
  unmatchedLines: number;
  missingRecordLines: number;

  // Financial
  bankNetMovement: number;         // Sum of all bank transactions
  systemNetMovement: number;       // Sum of all matched system records
  netDifference: number;           // Discrepancy

  reconciledPercentage: number;    // 0-100
}

export interface SuggestedMatch {
  systemRecordType: TransactionType;
  systemRecordId: string;

  // Display info
  counterparty?: string;           // Customer/vendor name
  reference?: string;              // Invoice#, expense#, etc.
  projectId?: string;
  projectName?: string;

  amount: number;
  date: string;
  description?: string;

  // Match quality
  matchScore: number;              // 0-100
  matchReasons: string[];          // ['amount_exact', 'date_close', 'reference_match']
}

export interface ReconciliationFilter {
  scope: ReconciliationScope;
  companyIds: string[];
  projectIds: string[];
  bankAccountIds: string[];       // Empty = all
  currencies: Currency[];          // Empty = all
  statuses: BankFeedStatus[];      // Empty = all
  dateFrom: string;
  dateTo: string;
  viewMode: ViewMode;
  searchTerm?: string;
}

export interface ReconciliationStats {
  // Bank line stats
  totalBankLines: number;
  matchedLines: number;
  unmatchedLines: number;
  missingRecordLines: number;
  needsReviewLines: number;
  ignoredLines: number;

  // System record stats
  systemRecordsNotInBank: number;  // Paid but not in bank feed

  // Financial
  totalBankMovement: number;
  totalSystemMovement: number;
  netDifference: number;
}

export interface MatchingRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;                 // Higher = check first

  // Conditions
  descriptionContains?: string[];
  amountMin?: number;
  amountMax?: number;
  amountSign?: 'debit' | 'credit';
  bankAccountIds?: string[];

  // Actions
  suggestType?: TransactionType;
  suggestCategory?: string;
  suggestCounterparty?: string;
  suggestProject?: string;
  autoMatchIfConfidence?: number;  // Auto-match if score >= this

  // Metadata
  createdBy: string;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}
