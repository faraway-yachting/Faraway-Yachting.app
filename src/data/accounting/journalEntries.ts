/**
 * Journal Entries Mock Data
 *
 * Mock data for double-entry bookkeeping journal entries.
 * In production, this will be replaced with database queries.
 */

import { JournalEntry, JournalEntryLine, JournalEntryStatus } from './journalEntryTypes';

// Journal entries storage (empty - no mock data)
export let journalEntries: JournalEntry[] = [];

// Utility functions

/**
 * Get all journal entries
 */
export function getAllJournalEntries(): JournalEntry[] {
  return journalEntries;
}

/**
 * Get journal entry by ID
 */
export function getJournalEntryById(id: string): JournalEntry | undefined {
  return journalEntries.find(je => je.id === id);
}

/**
 * Get journal entries by company
 */
export function getJournalEntriesByCompany(companyId: string): JournalEntry[] {
  return journalEntries.filter(je => je.companyId === companyId);
}

/**
 * Get journal entries by status
 */
export function getJournalEntriesByStatus(status: JournalEntryStatus): JournalEntry[] {
  return journalEntries.filter(je => je.status === status);
}

/**
 * Generate unique reference number in format JE-YYYY-NNN
 */
export function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const yearEntries = journalEntries.filter(je =>
    je.referenceNumber.startsWith(`JE-${year}`)
  );
  const nextNum = (yearEntries.length + 1).toString().padStart(3, '0');
  return `JE-${year}-${nextNum}`;
}

/**
 * Calculate total debits and credits for an array of lines
 */
export function calculateTotals(lines: JournalEntryLine[]): {
  totalDebit: number;
  totalCredit: number;
} {
  const totalDebit = lines
    .filter(line => line.type === 'debit')
    .reduce((sum, line) => sum + line.amount, 0);
  const totalCredit = lines
    .filter(line => line.type === 'credit')
    .reduce((sum, line) => sum + line.amount, 0);
  return { totalDebit, totalCredit };
}

/**
 * Check if journal entry lines are balanced (debits = credits)
 */
export function isBalanced(lines: JournalEntryLine[]): boolean {
  const { totalDebit, totalCredit } = calculateTotals(lines);
  // Use small epsilon for floating point comparison
  return Math.abs(totalDebit - totalCredit) < 0.01;
}

/**
 * Add a new journal entry
 */
export function addJournalEntry(
  entry: Omit<JournalEntry, 'id' | 'referenceNumber' | 'createdAt' | 'updatedAt'>
): JournalEntry {
  const { totalDebit, totalCredit } = calculateTotals(entry.lines);

  const newEntry: JournalEntry = {
    ...entry,
    id: `je-${Date.now()}`,
    referenceNumber: generateReferenceNumber(),
    totalDebit,
    totalCredit,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  journalEntries.push(newEntry);
  return newEntry;
}

/**
 * Update an existing journal entry (draft only)
 */
export function updateJournalEntry(
  id: string,
  updates: Partial<Omit<JournalEntry, 'id' | 'referenceNumber' | 'createdAt'>>
): JournalEntry | null {
  const index = journalEntries.findIndex(je => je.id === id);
  if (index === -1) return null;

  const entry = journalEntries[index];

  // Only allow updates to draft entries
  if (entry.status === 'posted') {
    throw new Error('Cannot update posted journal entries');
  }

  // Recalculate totals if lines are being updated
  let totalDebit = entry.totalDebit;
  let totalCredit = entry.totalCredit;
  if (updates.lines) {
    const totals = calculateTotals(updates.lines);
    totalDebit = totals.totalDebit;
    totalCredit = totals.totalCredit;
  }

  journalEntries[index] = {
    ...entry,
    ...updates,
    id, // Ensure ID cannot be changed
    referenceNumber: entry.referenceNumber, // Ensure reference number cannot be changed
    totalDebit,
    totalCredit,
    updatedAt: new Date().toISOString(),
  };

  return journalEntries[index];
}

/**
 * Post a journal entry (convert from draft to posted)
 */
export function postJournalEntry(id: string, postedBy: string): JournalEntry | null {
  const entry = getJournalEntryById(id);
  if (!entry) return null;

  if (entry.status === 'posted') {
    throw new Error('Journal entry is already posted');
  }

  if (!isBalanced(entry.lines)) {
    throw new Error('Cannot post unbalanced journal entry. Debits must equal credits.');
  }

  return updateJournalEntry(id, {
    status: 'posted',
    postedBy,
    postedAt: new Date().toISOString(),
  });
}

/**
 * Delete a journal entry (draft only)
 */
export function deleteJournalEntry(id: string): boolean {
  const index = journalEntries.findIndex(je => je.id === id);
  if (index === -1) return false;

  const entry = journalEntries[index];

  // Only allow deletion of draft entries
  if (entry.status === 'posted') {
    throw new Error('Cannot delete posted journal entries');
  }

  journalEntries.splice(index, 1);
  return true;
}
