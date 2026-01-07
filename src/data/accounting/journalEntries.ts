/**
 * Journal Entries Mock Data
 *
 * Mock data for double-entry bookkeeping journal entries.
 * In production, this will be replaced with database queries.
 */

import { JournalEntry, JournalEntryLine, JournalEntryStatus } from './journalEntryTypes';

// Initial mock data with sample journal entries
export let journalEntries: JournalEntry[] = [
  {
    id: 'je-001',
    referenceNumber: 'JE-2024-001',
    date: '2024-01-01',
    companyId: 'company-001',
    description: 'Opening balance - Transfer from old system',
    lines: [
      {
        id: 'jel-001-1',
        accountCode: '1010',
        accountName: 'Cash - THB',
        description: 'Opening cash balance',
        type: 'debit',
        amount: 500000,
        currency: 'THB',
      },
      {
        id: 'jel-001-2',
        accountCode: '3010',
        accountName: 'Share Capital',
        description: 'Initial capital contribution',
        type: 'credit',
        amount: 500000,
        currency: 'THB',
      },
    ],
    status: 'posted',
    totalDebit: 500000,
    totalCredit: 500000,
    createdBy: 'admin',
    createdAt: '2024-01-01T08:00:00.000Z',
    postedBy: 'admin',
    postedAt: '2024-01-01T08:30:00.000Z',
    updatedAt: '2024-01-01T08:30:00.000Z',
  },
  {
    id: 'je-002',
    referenceNumber: 'JE-2024-002',
    date: '2024-01-15',
    companyId: 'company-001',
    description: 'Bank transfer to USD account',
    lines: [
      {
        id: 'jel-002-1',
        accountCode: '1020',
        accountName: 'Bank Account - Kasikorn (THB)',
        description: 'Transfer out to USD account',
        type: 'credit',
        amount: 100000,
        currency: 'THB',
      },
      {
        id: 'jel-002-2',
        accountCode: '1021',
        accountName: 'Bank Account - Bangkok Bank (USD)',
        description: 'Transfer in from THB account',
        type: 'debit',
        amount: 100000,
        currency: 'THB',
      },
    ],
    status: 'posted',
    totalDebit: 100000,
    totalCredit: 100000,
    createdBy: 'admin',
    createdAt: '2024-01-15T10:00:00.000Z',
    postedBy: 'admin',
    postedAt: '2024-01-15T10:15:00.000Z',
    updatedAt: '2024-01-15T10:15:00.000Z',
  },
  {
    id: 'je-003',
    referenceNumber: 'JE-2024-003',
    date: '2024-02-01',
    companyId: 'company-001',
    description: 'Monthly office expenses allocation',
    lines: [
      {
        id: 'jel-003-1',
        accountCode: '5010',
        accountName: 'Rent Expense',
        description: 'February office rent',
        type: 'debit',
        amount: 50000,
        currency: 'THB',
      },
      {
        id: 'jel-003-2',
        accountCode: '5020',
        accountName: 'Utilities Expense',
        description: 'Electricity and water',
        type: 'debit',
        amount: 8000,
        currency: 'THB',
      },
      {
        id: 'jel-003-3',
        accountCode: '5030',
        accountName: 'Office Supplies',
        description: 'Stationery and supplies',
        type: 'debit',
        amount: 3500,
        currency: 'THB',
      },
      {
        id: 'jel-003-4',
        accountCode: '1020',
        accountName: 'Bank Account - Kasikorn (THB)',
        description: 'Payment for monthly expenses',
        type: 'credit',
        amount: 61500,
        currency: 'THB',
      },
    ],
    status: 'posted',
    totalDebit: 61500,
    totalCredit: 61500,
    createdBy: 'admin',
    createdAt: '2024-02-01T09:00:00.000Z',
    postedBy: 'admin',
    postedAt: '2024-02-01T09:30:00.000Z',
    updatedAt: '2024-02-01T09:30:00.000Z',
  },
  {
    id: 'je-004',
    referenceNumber: 'JE-2024-004',
    date: '2024-12-28',
    companyId: 'company-002',
    description: 'Draft: Equipment purchase pending approval',
    lines: [
      {
        id: 'jel-004-1',
        accountCode: '1510',
        accountName: 'Equipment',
        description: 'New navigation system',
        type: 'debit',
        amount: 150000,
        currency: 'THB',
      },
      {
        id: 'jel-004-2',
        accountCode: '2010',
        accountName: 'Accounts Payable',
        description: 'Payment due to supplier',
        type: 'credit',
        amount: 150000,
        currency: 'THB',
      },
    ],
    status: 'draft',
    totalDebit: 150000,
    totalCredit: 150000,
    createdBy: 'manager',
    createdAt: '2024-12-28T14:00:00.000Z',
    updatedAt: '2024-12-28T14:00:00.000Z',
  },
  {
    id: 'je-005',
    referenceNumber: 'JE-2024-005',
    date: '2024-12-29',
    companyId: 'company-001',
    description: 'Draft: Revenue recognition - unbalanced',
    lines: [
      {
        id: 'jel-005-1',
        accountCode: '1030',
        accountName: 'Accounts Receivable',
        description: 'Charter service invoice',
        type: 'debit',
        amount: 250000,
        currency: 'THB',
      },
      {
        id: 'jel-005-2',
        accountCode: '4010',
        accountName: 'Charter Revenue',
        description: 'Revenue from charter',
        type: 'credit',
        amount: 220000,
        currency: 'THB',
      },
    ],
    status: 'draft',
    totalDebit: 250000,
    totalCredit: 220000,
    createdBy: 'accountant',
    createdAt: '2024-12-29T11:00:00.000Z',
    updatedAt: '2024-12-29T11:00:00.000Z',
  },
];

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
