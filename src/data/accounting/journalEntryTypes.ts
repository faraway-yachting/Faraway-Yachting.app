/**
 * Journal Entry Data Types
 *
 * Defines the data structure for double-entry bookkeeping journal entries.
 * Used across the accounting module for transaction management.
 */

import { Currency } from '../company/types';

export type JournalEntryStatus = 'draft' | 'posted';
export type EntryType = 'debit' | 'credit';

export interface Attachment {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type
  url: string; // File URL or base64 data URL
  uploadedAt: string;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string; // Links to Chart of Accounts
  accountName: string; // Cached for display
  description: string;
  type: EntryType; // 'debit' or 'credit'
  amount: number;
  currency: Currency;
}

export interface JournalEntry {
  id: string;
  referenceNumber: string; // Auto-generated: JE-YYYY-NNN
  date: string; // Entry date (ISO format)
  companyId: string; // Links to Company
  description: string; // Overall entry description
  lines: JournalEntryLine[]; // Array of debit/credit lines
  status: JournalEntryStatus; // draft or posted
  totalDebit: number; // Calculated sum
  totalCredit: number; // Calculated sum
  createdBy: string; // User who created
  createdAt: string;
  postedBy?: string; // User who posted
  postedAt?: string; // When it was posted
  updatedAt: string;
  attachments?: Attachment[]; // Supporting documents (receipts, invoices, etc.)
}
