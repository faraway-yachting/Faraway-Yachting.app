/**
 * Bank Reconciliation Matching Engine
 *
 * Core matching algorithm for auto-matching bank transactions to system records.
 * Provides scoring, suggestion generation, and rule evaluation.
 */

import {
  BankFeedLine,
  BankMatch,
  SuggestedMatch,
  MatchingRule,
  TransactionType,
} from '@/data/banking/bankReconciliationTypes';
import { Receipt } from '@/data/income/types';
import { generateId } from '@/lib/income/utils';
import type { ExpenseWithDetails } from '@/lib/supabase/api/expenses';

// ============================================================================
// Types
// ============================================================================

export type MatchReason =
  | 'amount_exact'
  | 'amount_close'
  | 'date_exact'
  | 'date_close'
  | 'reference_match'
  | 'description_match'
  | 'rule_match'
  | 'counterparty_match';

export interface MatchScore {
  score: number;
  reasons: MatchReason[];
}

export interface SystemRecord {
  id: string;
  type: TransactionType;
  reference: string;
  date: string;
  amount: number; // Positive for credits, negative for debits
  counterparty?: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  companyId: string;
  isReconciled?: boolean;
}

export interface AutoMatchResult {
  matches: BankMatch[];
  suggestions: Map<string, SuggestedMatch[]>;
}

// ============================================================================
// Scoring Weights
// ============================================================================

const SCORE_WEIGHTS = {
  AMOUNT_EXACT: 40,
  AMOUNT_CLOSE: 20,      // Within 1%
  DATE_EXACT: 20,
  DATE_CLOSE: 10,        // Within 3 days
  REFERENCE_MATCH: 30,
  DESCRIPTION_MATCH: 15,
  COUNTERPARTY_MATCH: 15,
  RULE_MATCH: 20,
};

const AUTO_MATCH_THRESHOLD = 85;
const DATE_CLOSE_DAYS = 3;
const AMOUNT_TOLERANCE_PERCENT = 0.01; // 1%

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the number of days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if two amounts are within tolerance
 */
function amountsMatch(amount1: number, amount2: number, tolerancePercent: number): boolean {
  if (amount1 === 0 && amount2 === 0) return true;
  const larger = Math.max(Math.abs(amount1), Math.abs(amount2));
  const diff = Math.abs(Math.abs(amount1) - Math.abs(amount2));
  return diff / larger <= tolerancePercent;
}

/**
 * Extract potential reference numbers from a description
 * Looks for patterns like INV-2024-001, REC-2024-001, etc.
 */
function extractReferences(description: string): string[] {
  const patterns = [
    /INV-?\d{4}-?\d{3,4}/gi,
    /REC-?\d{4}-?\d{3,4}/gi,
    /QT-?\d{4}-?\d{3,4}/gi,
    /CN-?\d{4}-?\d{4}/gi,
    /DN-?\d{4}-?\d{4}/gi,
    /\b[A-Z]{2,4}-\d{4,}/gi,
  ];

  const refs: string[] = [];
  for (const pattern of patterns) {
    const matches = description.match(pattern);
    if (matches) {
      refs.push(...matches.map(m => m.toUpperCase().replace(/-/g, '')));
    }
  }
  return refs;
}

/**
 * Normalize a string for comparison
 */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check if any word from source appears in target
 */
function containsKeywords(target: string, keywords: string[]): boolean {
  const normalizedTarget = target.toLowerCase();
  return keywords.some(keyword => normalizedTarget.includes(keyword.toLowerCase()));
}

// ============================================================================
// Core Matching Functions
// ============================================================================

/**
 * Calculate match score between a bank line and a system record
 */
export function calculateMatchScore(
  bankLine: BankFeedLine,
  systemRecord: SystemRecord
): MatchScore {
  let score = 0;
  const reasons: MatchReason[] = [];

  // 1. Amount matching
  const bankAmount = Math.abs(bankLine.amount);
  const recordAmount = Math.abs(systemRecord.amount);

  if (bankAmount === recordAmount) {
    score += SCORE_WEIGHTS.AMOUNT_EXACT;
    reasons.push('amount_exact');
  } else if (amountsMatch(bankAmount, recordAmount, AMOUNT_TOLERANCE_PERCENT)) {
    score += SCORE_WEIGHTS.AMOUNT_CLOSE;
    reasons.push('amount_close');
  }

  // Check direction matches (credit vs debit)
  const bankIsCredit = bankLine.amount > 0;
  const recordIsCredit = systemRecord.amount > 0;

  // For receipts (income), bank should be credit (+)
  // For expenses (outflow), bank should be debit (-)
  if (systemRecord.type === 'receipt' && !bankIsCredit) {
    // Receipt should appear as credit in bank, reduce score
    score = Math.max(0, score - 20);
  }
  if (systemRecord.type === 'expense' && bankIsCredit) {
    // Expense should appear as debit in bank, reduce score
    score = Math.max(0, score - 20);
  }

  // 2. Date matching
  const daysDiff = daysBetween(bankLine.transactionDate, systemRecord.date);
  if (daysDiff === 0) {
    score += SCORE_WEIGHTS.DATE_EXACT;
    reasons.push('date_exact');
  } else if (daysDiff <= DATE_CLOSE_DAYS) {
    score += SCORE_WEIGHTS.DATE_CLOSE;
    reasons.push('date_close');
  }

  // 3. Reference matching
  const bankRefs = extractReferences(bankLine.description);
  const recordRef = normalize(systemRecord.reference);

  if (bankRefs.some(ref => normalize(ref) === recordRef || recordRef.includes(normalize(ref)))) {
    score += SCORE_WEIGHTS.REFERENCE_MATCH;
    reasons.push('reference_match');
  }

  // Also check if record reference appears directly in description
  if (bankLine.description.toUpperCase().includes(systemRecord.reference.toUpperCase())) {
    if (!reasons.includes('reference_match')) {
      score += SCORE_WEIGHTS.REFERENCE_MATCH;
      reasons.push('reference_match');
    }
  }

  // 4. Counterparty matching
  if (systemRecord.counterparty) {
    const counterpartyWords = systemRecord.counterparty.split(/\s+/).filter(w => w.length > 2);
    if (containsKeywords(bankLine.description, counterpartyWords)) {
      score += SCORE_WEIGHTS.COUNTERPARTY_MATCH;
      reasons.push('counterparty_match');
    }
  }

  // 5. Description matching
  if (systemRecord.description) {
    const descWords = systemRecord.description.split(/\s+/).filter(w => w.length > 3);
    if (containsKeywords(bankLine.description, descWords)) {
      score += SCORE_WEIGHTS.DESCRIPTION_MATCH;
      reasons.push('description_match');
    }
  }

  // Cap score at 100
  score = Math.min(100, score);

  return { score, reasons };
}

/**
 * Evaluate if a matching rule applies to a bank line
 */
export function evaluateRule(
  rule: MatchingRule,
  bankLine: BankFeedLine
): boolean {
  // Check description keywords
  if (rule.descriptionContains && rule.descriptionContains.length > 0) {
    const hasKeyword = rule.descriptionContains.some(keyword =>
      bankLine.description.toUpperCase().includes(keyword.toUpperCase())
    );
    if (!hasKeyword) return false;
  }

  // Check amount range
  const absAmount = Math.abs(bankLine.amount);
  if (rule.amountMin !== undefined && absAmount < rule.amountMin) return false;
  if (rule.amountMax !== undefined && absAmount > rule.amountMax) return false;

  // Check amount sign
  if (rule.amountSign) {
    const isDebit = bankLine.amount < 0;
    if (rule.amountSign === 'debit' && !isDebit) return false;
    if (rule.amountSign === 'credit' && isDebit) return false;
  }

  // Check bank account filter
  if (rule.bankAccountIds && rule.bankAccountIds.length > 0) {
    if (!rule.bankAccountIds.includes(bankLine.bankAccountId)) return false;
  }

  return true;
}

/**
 * Generate suggested matches for a bank line
 */
export function generateSuggestedMatches(
  bankLine: BankFeedLine,
  systemRecords: SystemRecord[],
  rules: MatchingRule[]
): SuggestedMatch[] {
  const suggestions: SuggestedMatch[] = [];

  // Find matching rule (if any)
  const matchingRule = rules
    .sort((a, b) => b.priority - a.priority)
    .find(rule => evaluateRule(rule, bankLine));

  // Score each system record
  for (const record of systemRecords) {
    // Skip already reconciled records
    if (record.isReconciled) continue;

    // Skip if company doesn't match
    if (record.companyId !== bankLine.companyId) continue;

    const { score, reasons } = calculateMatchScore(bankLine, record);

    // Add rule match bonus if applicable
    let finalScore = score;
    const finalReasons = [...reasons];

    if (matchingRule && matchingRule.suggestType === record.type) {
      finalScore = Math.min(100, finalScore + SCORE_WEIGHTS.RULE_MATCH);
      finalReasons.push('rule_match');
    }

    // Only suggest if score is meaningful (> 30)
    if (finalScore > 30) {
      suggestions.push({
        systemRecordType: record.type,
        systemRecordId: record.id,
        counterparty: record.counterparty,
        reference: record.reference,
        projectId: record.projectId,
        projectName: record.projectName,
        amount: Math.abs(record.amount),
        date: record.date,
        description: record.description,
        matchScore: finalScore,
        matchReasons: finalReasons,
      });
    }
  }

  // Sort by score descending
  suggestions.sort((a, b) => b.matchScore - a.matchScore);

  // Return top 5 suggestions
  return suggestions.slice(0, 5);
}

/**
 * Run auto-matching on all unmatched bank lines
 */
export function autoMatchBankLines(
  bankLines: BankFeedLine[],
  systemRecords: SystemRecord[],
  rules: MatchingRule[]
): AutoMatchResult {
  const matches: BankMatch[] = [];
  const suggestions = new Map<string, SuggestedMatch[]>();
  const usedRecordIds = new Set<string>();

  // Process each unmatched bank line
  for (const bankLine of bankLines) {
    // Skip already matched or ignored lines
    if (bankLine.status === 'matched' || bankLine.status === 'ignored') {
      continue;
    }

    // Filter out already used records
    const availableRecords = systemRecords.filter(r => !usedRecordIds.has(r.id));

    // Generate suggestions
    const lineSuggestions = generateSuggestedMatches(bankLine, availableRecords, rules);
    suggestions.set(bankLine.id, lineSuggestions);

    // Check if we should auto-match
    if (lineSuggestions.length > 0) {
      const topSuggestion = lineSuggestions[0];

      // Find applicable rule
      const matchingRule = rules
        .sort((a, b) => b.priority - a.priority)
        .find(rule => evaluateRule(rule, bankLine));

      const autoMatchThreshold = matchingRule?.autoMatchIfConfidence ?? AUTO_MATCH_THRESHOLD;

      // Auto-match if score meets threshold
      if (topSuggestion.matchScore >= autoMatchThreshold) {
        const match: BankMatch = {
          id: generateId(),
          bankFeedLineId: bankLine.id,
          systemRecordType: topSuggestion.systemRecordType,
          systemRecordId: topSuggestion.systemRecordId,
          projectId: topSuggestion.projectId,
          matchedAmount: topSuggestion.amount,
          amountDifference: Math.abs(bankLine.amount) - topSuggestion.amount,
          matchedBy: 'system',
          matchedAt: new Date().toISOString(),
          matchScore: topSuggestion.matchScore,
          matchMethod: matchingRule ? 'rule' : 'suggested',
          ruleId: matchingRule?.id,
          adjustmentRequired: Math.abs(Math.abs(bankLine.amount) - topSuggestion.amount) > 0.01,
          adjustmentReason: Math.abs(Math.abs(bankLine.amount) - topSuggestion.amount) > 0.01
            ? 'Amount difference detected'
            : undefined,
        };

        matches.push(match);
        usedRecordIds.add(topSuggestion.systemRecordId);

        // Remove this suggestion from the list since it's now matched
        suggestions.set(bankLine.id, lineSuggestions.slice(1));
      }
    }
  }

  return { matches, suggestions };
}

/**
 * Create a BankMatch from a suggestion
 */
export function createMatchFromSuggestion(
  bankLine: BankFeedLine,
  suggestion: SuggestedMatch,
  matchedBy: string
): BankMatch {
  const amountDiff = Math.abs(bankLine.amount) - suggestion.amount;

  return {
    id: generateId(),
    bankFeedLineId: bankLine.id,
    systemRecordType: suggestion.systemRecordType,
    systemRecordId: suggestion.systemRecordId,
    projectId: suggestion.projectId,
    matchedAmount: suggestion.amount,
    amountDifference: amountDiff,
    matchedBy,
    matchedAt: new Date().toISOString(),
    matchScore: suggestion.matchScore,
    matchMethod: 'suggested',
    adjustmentRequired: Math.abs(amountDiff) > 0.01,
    adjustmentReason: Math.abs(amountDiff) > 0.01 ? 'Amount difference detected' : undefined,
  };
}

/**
 * Convert Receipt to SystemRecord for matching
 */
export function receiptToSystemRecord(receipt: Receipt): SystemRecord {
  // Get unique project IDs from line items
  const projectIds = [...new Set(receipt.lineItems.map(li => li.projectId).filter(Boolean))];

  return {
    id: receipt.id,
    type: 'receipt',
    reference: receipt.receiptNumber,
    date: receipt.receiptDate,
    amount: receipt.totalReceived, // Positive for income
    counterparty: receipt.clientName,
    description: receipt.reference ? `Payment for ${receipt.reference}` : undefined,
    projectId: projectIds.length === 1 ? projectIds[0] : undefined, // Only set if single project
    companyId: receipt.companyId,
    isReconciled: false, // TODO: Add reconciledBankLineId field to Receipt
  };
}

/**
 * Get unreconciled receipts as system records
 * @param receipts - All receipts to filter
 * @param companyId - Optional company filter
 * @param projectId - Optional project filter
 * @param matchedRecordIds - Set of receipt IDs that are already matched to bank feed lines
 */
export function getUnreconciledReceiptsAsSystemRecords(
  receipts: Receipt[],
  companyId?: string,
  projectId?: string,
  matchedRecordIds?: Set<string>
): SystemRecord[] {
  let filtered = receipts.filter(r => r.status === 'paid');

  // Exclude already matched receipts
  if (matchedRecordIds && matchedRecordIds.size > 0) {
    filtered = filtered.filter(r => !matchedRecordIds.has(r.id));
  }

  if (companyId) {
    filtered = filtered.filter(r => r.companyId === companyId);
  }

  if (projectId) {
    filtered = filtered.filter(r => r.lineItems.some(li => li.projectId === projectId));
  }

  return filtered.map(receiptToSystemRecord);
}

/**
 * Convert Expense (from Supabase) to SystemRecord for matching
 */
export function expenseToSystemRecord(expense: ExpenseWithDetails): SystemRecord {
  // Get unique project IDs from line items
  const projectIds = [...new Set(expense.line_items?.map(li => li.project_id).filter(Boolean) ?? [])];

  // Use net_payable (amount actually paid) or fall back to total_amount
  const amount = expense.net_payable ?? expense.total_amount ?? 0;

  return {
    id: expense.id,
    type: 'expense',
    reference: expense.expense_number,
    date: expense.expense_date,
    amount: -Math.abs(amount), // Negative for expenses (outflow)
    counterparty: expense.vendor_name,
    description: expense.supplier_invoice_number
      ? `Invoice ${expense.supplier_invoice_number}`
      : expense.notes ?? undefined,
    projectId: projectIds.length === 1 ? projectIds[0] ?? undefined : undefined,
    companyId: expense.company_id,
    isReconciled: false, // TODO: Add reconciledBankLineId field to Expense
  };
}

/**
 * Get unreconciled expenses as system records
 * @param expenses - All expenses to filter
 * @param companyId - Optional company filter
 * @param projectId - Optional project filter
 * @param matchedRecordIds - Set of expense IDs that are already matched to bank feed lines
 */
export function getUnreconciledExpensesAsSystemRecords(
  expenses: ExpenseWithDetails[],
  companyId?: string,
  projectId?: string,
  matchedRecordIds?: Set<string>
): SystemRecord[] {
  // Only include approved expenses that have been paid
  let filtered = expenses.filter(e =>
    e.status === 'approved' && e.payment_status === 'paid'
  );

  // Exclude already matched expenses
  if (matchedRecordIds && matchedRecordIds.size > 0) {
    filtered = filtered.filter(e => !matchedRecordIds.has(e.id));
  }

  if (companyId) {
    filtered = filtered.filter(e => e.company_id === companyId);
  }

  if (projectId) {
    filtered = filtered.filter(e =>
      e.line_items?.some(li => li.project_id === projectId)
    );
  }

  return filtered.map(expenseToSystemRecord);
}
