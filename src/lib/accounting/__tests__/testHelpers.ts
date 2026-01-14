/**
 * Test Helper Functions for Event-Driven Journal System
 */

import { createClient } from '@/lib/supabase/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Create admin client for test queries (bypasses RLS)
function createAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return createClient();
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );
}

// Singleton admin client
let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createAdminClient();
  }
  return adminClient;
}

// Types for test assertions
export interface JournalWithLines {
  id: string;
  reference_number: string;
  entry_date: string;
  company_id: string;
  description: string;
  status: string;
  total_debit: number;
  total_credit: number;
  lines: JournalLine[];
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_code: string;
  entry_type: 'debit' | 'credit';
  amount: number;
  description: string;
}

export interface ExpectedLine {
  accountCode?: string;
  entryType?: 'debit' | 'credit';
  amount?: number;
}

/**
 * Simple assertion function
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assert that a journal is balanced (debits = credits within tolerance)
 */
export function assertBalanced(journal: JournalWithLines): void {
  const totalDebit = journal.lines
    .filter((l) => l.entry_type === 'debit')
    .reduce((sum, l) => sum + l.amount, 0);
  const totalCredit = journal.lines
    .filter((l) => l.entry_type === 'credit')
    .reduce((sum, l) => sum + l.amount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Journal unbalanced: Debit=${totalDebit.toFixed(2)}, Credit=${totalCredit.toFixed(2)}`
    );
  }
}

/**
 * Assert that a journal contains an expected line
 */
export function assertHasLine(journal: JournalWithLines, expected: ExpectedLine): void {
  const found = journal.lines.some(
    (line) =>
      (!expected.accountCode || line.account_code === expected.accountCode) &&
      (!expected.entryType || line.entry_type === expected.entryType) &&
      (expected.amount === undefined || Math.abs(line.amount - expected.amount) < 0.01)
  );
  if (!found) {
    const linesInfo = journal.lines
      .map((l) => `  ${l.entry_type}: ${l.account_code} = ${l.amount}`)
      .join('\n');
    throw new Error(
      `Expected line not found: ${JSON.stringify(expected)}\nActual lines:\n${linesInfo}`
    );
  }
}

/**
 * Assert that a journal does NOT contain a specific line
 */
export function assertNoLine(journal: JournalWithLines, expected: ExpectedLine): void {
  const found = journal.lines.some(
    (line) =>
      (!expected.accountCode || line.account_code === expected.accountCode) &&
      (!expected.entryType || line.entry_type === expected.entryType) &&
      (expected.amount === undefined || Math.abs(line.amount - expected.amount) < 0.01)
  );
  if (found) {
    throw new Error(`Line should not exist: ${JSON.stringify(expected)}`);
  }
}

/**
 * Fetch a journal entry with its lines
 */
export async function getJournalWithLines(journalId: string): Promise<JournalWithLines> {
  const supabase = getAdminClient();

  const { data: journal, error: journalError } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', journalId)
    .single();

  if (journalError || !journal) {
    throw new Error(`Failed to fetch journal ${journalId}: ${journalError?.message}`);
  }

  const { data: lines, error: linesError } = await supabase
    .from('journal_entry_lines')
    .select('*')
    .eq('journal_entry_id', journalId)
    .order('line_order');

  if (linesError) {
    throw new Error(`Failed to fetch journal lines: ${linesError.message}`);
  }

  return {
    ...journal,
    lines: lines || [],
  } as JournalWithLines;
}

/**
 * Fetch a journal entry (without lines)
 */
export async function getJournal(journalId: string): Promise<JournalWithLines> {
  return getJournalWithLines(journalId);
}

/**
 * Find journal by company from a list of journal IDs
 */
export async function getJournalByCompany(
  journalIds: string[],
  companyId: string
): Promise<JournalWithLines> {
  const supabase = getAdminClient();

  const { data: journal, error } = await supabase
    .from('journal_entries')
    .select('*')
    .in('id', journalIds)
    .eq('company_id', companyId)
    .single();

  if (error || !journal) {
    throw new Error(`No journal found for company ${companyId}`);
  }

  return getJournalWithLines(journal.id);
}

/**
 * Get event by ID
 */
export async function getEvent(eventId: string) {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('accounting_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch event ${eventId}: ${error?.message}`);
  }

  return data;
}

/**
 * Log test result with formatting
 */
export function logSuccess(testName: string): void {
  console.log(`\x1b[32m✓\x1b[0m ${testName} passed`);
}

/**
 * Log test start
 */
export function logStart(testName: string): void {
  console.log(`Testing ${testName}...`);
}

/**
 * Log section header
 */
export function logSection(sectionName: string): void {
  console.log(`\n\x1b[36m--- ${sectionName} ---\x1b[0m`);
}

/**
 * Log final results
 */
export function logFinalResults(passed: number, failed: number): void {
  console.log('\n========================================');
  if (failed === 0) {
    console.log(`\x1b[32mALL ${passed} TESTS PASSED ✓\x1b[0m`);
  } else {
    console.log(`\x1b[31m${failed} TESTS FAILED\x1b[0m`);
    console.log(`\x1b[32m${passed} tests passed\x1b[0m`);
  }
  console.log('========================================');
}
