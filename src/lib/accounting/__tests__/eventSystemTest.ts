/**
 * Event-Driven Journal System Integration Tests
 *
 * This script tests the complete event processing flow against the real database.
 * Run with: npx tsx src/lib/accounting/__tests__/eventSystemTest.ts
 *
 * Tests:
 * 1. Single-company events (8 types)
 * 2. Multi-company events (2 types)
 * 3. Settings behavior (enable/disable, auto-post, default accounts)
 * 4. Balance validation
 * 5. Immutability
 * 6. Error handling
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
config({ path: resolve(process.cwd(), '.env.local') });

// Verify environment variables are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase environment variables.');
  console.error('Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Create admin client (bypasses RLS) - used for all test operations
function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required for tests');
    console.error('Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
    process.exit(1);
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );
}

// Global admin client for tests
const adminClient = createAdminClient();

// Import and configure event processor to use admin client
import { setTestClient } from '@/lib/accounting/eventProcessor';
import { setTestClient as setSettingsTestClient } from '@/lib/supabase/api/journalEventSettings';
import { accountingEventsApi } from '@/lib/supabase/api/accountingEvents';

// Set the admin client for the event processor and settings API to bypass RLS
setTestClient(adminClient);
setSettingsTestClient(adminClient);
import {
  assert,
  assertBalanced,
  assertHasLine,
  getJournalWithLines,
  getJournal,
  getJournalByCompany,
  getEvent,
  logSuccess,
  logStart,
  logSection,
  logFinalResults,
} from './testHelpers';
import {
  TEST_PREFIX,
  createExpenseApprovedEventData,
  createExpensePaidEventData,
  createReceiptReceivedEventData,
  createManagementFeeEventData,
  createIntercompanySettlementEventData,
  createOpeningBalanceEventData,
  createPartnerProfitAllocationEventData,
  createPartnerPaymentEventData,
  createCapexIncurredEventData,
  createProjectServiceCompletedEventData,
} from './testData';
import { DEFAULT_ACCOUNTS } from '../eventTypes';

// Test state
let testCompanyA: string;
let testCompanyB: string;
let testBankAccountA: string;
let testBankAccountB: string;
let createdEventIds: string[] = [];
let createdJournalIds: string[] = [];
let testSettingIds: string[] = [];
let createdCompanyIds: string[] = []; // Track created test companies for cleanup
let passedTests = 0;
let failedTests = 0;

// ============================================================================
// Setup and Cleanup
// ============================================================================

async function setup() {
  console.log('Setting up test environment...\n');
  const adminClient = createAdminClient();

  // Get existing companies for testing
  let { data: companies, error: companyError } = await adminClient
    .from('companies')
    .select('id, name')
    .limit(2);

  // If we don't have enough companies, create test companies
  if (!companies || companies.length < 2) {
    console.log('Creating test companies...');

    const testCompanies = [
      { name: 'Test Company A', tax_id: 'TEST-A-001', is_active: true },
      { name: 'Test Company B', tax_id: 'TEST-B-001', is_active: true },
    ];

    const { data: newCompanies, error: createError } = await adminClient
      .from('companies')
      .insert(testCompanies)
      .select();

    if (createError || !newCompanies || newCompanies.length < 2) {
      throw new Error(`Failed to create test companies: ${createError?.message}`);
    }

    companies = newCompanies;
    createdCompanyIds = newCompanies.map((c) => c.id);
    console.log(`Created ${newCompanies.length} test companies`);
  }

  testCompanyA = companies[0].id;
  testCompanyB = companies[1].id;
  console.log(`Using Company A: ${companies[0].name} (${testCompanyA})`);
  console.log(`Using Company B: ${companies[1].name} (${testCompanyB})`);

  // Get bank accounts with GL codes
  const { data: bankAccounts, error: bankError } = await adminClient
    .from('bank_accounts')
    .select('id, gl_account_code, company_id')
    .not('gl_account_code', 'is', null)
    .limit(2);

  if (bankError || !bankAccounts || bankAccounts.length === 0) {
    // Use default GL codes if no bank accounts exist
    testBankAccountA = '1011';
    testBankAccountB = '1012';
    console.log('No bank accounts found, using default GL codes');
  } else {
    testBankAccountA = bankAccounts[0].gl_account_code || '1011';
    testBankAccountB = bankAccounts[1]?.gl_account_code || '1012';
  }

  console.log(`Bank A GL: ${testBankAccountA}, Bank B GL: ${testBankAccountB}\n`);
}

async function cleanup() {
  console.log('\nCleaning up test data...');
  const adminClient = createAdminClient();

  // Delete test settings
  if (testSettingIds.length > 0) {
    await adminClient
      .from('journal_event_settings')
      .delete()
      .in('id', testSettingIds);
  }

  // Delete test events (cascades to event_journal_entries)
  if (createdEventIds.length > 0) {
    // First get the journal IDs before deleting events
    const { data: links } = await adminClient
      .from('event_journal_entries')
      .select('journal_entry_id')
      .in('event_id', createdEventIds);

    if (links) {
      createdJournalIds.push(...links.map((l) => l.journal_entry_id));
    }

    await adminClient.from('accounting_events').delete().in('id', createdEventIds);
  }

  // Delete test journals
  if (createdJournalIds.length > 0) {
    await adminClient
      .from('journal_entry_lines')
      .delete()
      .in('journal_entry_id', createdJournalIds);

    await adminClient.from('journal_entries').delete().in('id', createdJournalIds);
  }

  // Delete test companies (created during setup if none existed)
  if (createdCompanyIds.length > 0) {
    await adminClient.from('companies').delete().in('id', createdCompanyIds);
    console.log(`Deleted ${createdCompanyIds.length} test companies`);
  }

  console.log('Cleanup complete.');
}

// ============================================================================
// Test Wrapper
// ============================================================================

async function runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
  logStart(testName);
  try {
    await testFn();
    logSuccess(testName);
    passedTests++;
  } catch (error) {
    console.error(`\x1b[31m✗\x1b[0m ${testName} FAILED:`, error);
    failedTests++;
  }
}

// ============================================================================
// Single-Company Event Tests
// ============================================================================

async function testExpenseApproved() {
  const eventData = createExpenseApprovedEventData();

  const result = await accountingEventsApi.createAndProcess(
    'EXPENSE_APPROVED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `EXPENSE_APPROVED should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  assertBalanced(journal);

  // Verify accounts: Expense debits + VAT debit, AP credit
  assertHasLine(journal, { accountCode: '6100', entryType: 'debit', amount: 1000 });
  assertHasLine(journal, { accountCode: '6200', entryType: 'debit', amount: 2000 });
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.VAT_RECEIVABLE,
    entryType: 'debit',
    amount: 210,
  });
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
    entryType: 'credit',
    amount: 3210,
  });
}

async function testExpensePaid() {
  const eventData = createExpensePaidEventData({ bankAccountGlCode: testBankAccountA });

  const result = await accountingEventsApi.createAndProcess(
    'EXPENSE_PAID',
    '2024-01-20',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `EXPENSE_PAID should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  assertBalanced(journal);

  // AP debit, Bank credit
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
    entryType: 'debit',
    amount: 3210,
  });
  assertHasLine(journal, {
    accountCode: testBankAccountA,
    entryType: 'credit',
    amount: 3210,
  });
}

async function testReceiptReceived() {
  const eventData = createReceiptReceivedEventData();
  eventData.payments[0].bankAccountGlCode = testBankAccountA;

  const result = await accountingEventsApi.createAndProcess(
    'RECEIPT_RECEIVED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `RECEIPT_RECEIVED should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  assertBalanced(journal);

  // Bank debit, Revenue credit, VAT Payable credit
  assertHasLine(journal, { accountCode: testBankAccountA, entryType: 'debit', amount: 53500 });
  assertHasLine(journal, { accountCode: '4100', entryType: 'credit', amount: 50000 });
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.VAT_PAYABLE,
    entryType: 'credit',
    amount: 3500,
  });
}

async function testOpeningBalance() {
  const eventData = createOpeningBalanceEventData();

  const result = await accountingEventsApi.createAndProcess(
    'OPENING_BALANCE',
    '2024-01-01',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `OPENING_BALANCE should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  assertBalanced(journal);

  // All asset debits, all liability/equity credits
  assertHasLine(journal, { accountCode: '1000', entryType: 'debit', amount: 50000 });
  assertHasLine(journal, { accountCode: '1010', entryType: 'debit', amount: 200000 });
  assertHasLine(journal, { accountCode: '2050', entryType: 'credit', amount: 100000 });
  assertHasLine(journal, { accountCode: '3200', entryType: 'credit', amount: 150000 });
}

async function testProjectServiceCompleted() {
  const eventData = createProjectServiceCompletedEventData();

  const result = await accountingEventsApi.createAndProcess(
    'PROJECT_SERVICE_COMPLETED',
    '2024-01-31',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `PROJECT_SERVICE_COMPLETED should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  assertBalanced(journal);

  // Deferred Revenue debit, Revenue credit
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.DEFERRED_REVENUE,
    entryType: 'debit',
    amount: 50000,
  });
  assertHasLine(journal, { accountCode: '4100', entryType: 'credit', amount: 50000 });
}

async function testPartnerProfitAllocation() {
  const eventData = createPartnerProfitAllocationEventData();

  const result = await accountingEventsApi.createAndProcess(
    'PARTNER_PROFIT_ALLOCATION',
    '2024-03-31',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `PARTNER_PROFIT_ALLOCATION should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  assertBalanced(journal);

  // Retained Earnings debit, Partner Payables credits
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.RETAINED_EARNINGS,
    entryType: 'debit',
    amount: 100000,
  });
  // Two partner allocations: 60000 + 40000 = 100000
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.PARTNER_PAYABLES,
    entryType: 'credit',
    amount: 60000,
  });
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.PARTNER_PAYABLES,
    entryType: 'credit',
    amount: 40000,
  });
}

async function testPartnerPayment() {
  const eventData = createPartnerPaymentEventData(testBankAccountA);

  const result = await accountingEventsApi.createAndProcess(
    'PARTNER_PAYMENT',
    '2024-04-01',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `PARTNER_PAYMENT should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  assertBalanced(journal);

  // Partner Payables debit, Bank credit
  assertHasLine(journal, {
    accountCode: DEFAULT_ACCOUNTS.PARTNER_PAYABLES,
    entryType: 'debit',
    amount: 60000,
  });
  assertHasLine(journal, { accountCode: testBankAccountA, entryType: 'credit', amount: 60000 });
}

async function testCapexIncurred() {
  const eventData = createCapexIncurredEventData(testBankAccountA);

  const result = await accountingEventsApi.createAndProcess(
    'CAPEX_INCURRED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `CAPEX_INCURRED should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  assertBalanced(journal);

  // Asset debit, Bank credit (for bank payment method)
  assertHasLine(journal, { accountCode: '1500', entryType: 'debit', amount: 150000 });
  assertHasLine(journal, { accountCode: testBankAccountA, entryType: 'credit', amount: 150000 });
}

// ============================================================================
// Multi-Company Event Tests
// ============================================================================

async function testManagementFeeRecognized() {
  const eventData = createManagementFeeEventData(testCompanyA, testCompanyB);

  const result = await accountingEventsApi.createAndProcess(
    'MANAGEMENT_FEE_RECOGNIZED',
    '2024-01-31',
    [testCompanyA, testCompanyB],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `MANAGEMENT_FEE should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 2, 'Should create 2 journals');

  // Verify project company journal (expense side)
  const projectJournal = await getJournalByCompany(result.journalEntryIds, testCompanyA);
  assertBalanced(projectJournal);
  assertHasLine(projectJournal, {
    accountCode: DEFAULT_ACCOUNTS.MANAGEMENT_FEE_EXPENSE,
    entryType: 'debit',
    amount: 10000,
  });
  assertHasLine(projectJournal, {
    accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_PAYABLE,
    entryType: 'credit',
    amount: 10000,
  });

  // Verify management company journal (income side)
  const mgmtJournal = await getJournalByCompany(result.journalEntryIds, testCompanyB);
  assertBalanced(mgmtJournal);
  assertHasLine(mgmtJournal, {
    accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_RECEIVABLE,
    entryType: 'debit',
    amount: 10000,
  });
  assertHasLine(mgmtJournal, {
    accountCode: DEFAULT_ACCOUNTS.MANAGEMENT_FEE_INCOME,
    entryType: 'credit',
    amount: 10000,
  });
}

async function testIntercompanySettlement() {
  const eventData = createIntercompanySettlementEventData(
    testCompanyA,
    testCompanyB,
    testBankAccountA,
    testBankAccountB
  );

  const result = await accountingEventsApi.createAndProcess(
    'INTERCOMPANY_SETTLEMENT',
    '2024-02-01',
    [testCompanyA, testCompanyB],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `INTERCOMPANY_SETTLEMENT should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 2, 'Should create 2 journals');

  // Verify paying company journal (Company A)
  const payerJournal = await getJournalByCompany(result.journalEntryIds, testCompanyA);
  assertBalanced(payerJournal);
  assertHasLine(payerJournal, {
    accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_PAYABLE,
    entryType: 'debit',
    amount: 10000,
  });
  assertHasLine(payerJournal, {
    accountCode: testBankAccountA,
    entryType: 'credit',
    amount: 10000,
  });

  // Verify receiving company journal (Company B)
  const receiverJournal = await getJournalByCompany(result.journalEntryIds, testCompanyB);
  assertBalanced(receiverJournal);
  assertHasLine(receiverJournal, {
    accountCode: testBankAccountB,
    entryType: 'debit',
    amount: 10000,
  });
  assertHasLine(receiverJournal, {
    accountCode: DEFAULT_ACCOUNTS.INTERCOMPANY_RECEIVABLE,
    entryType: 'credit',
    amount: 10000,
  });
}

// ============================================================================
// Settings Behavior Tests
// ============================================================================

async function testSettingsDisabled() {
  // Disable EXPENSE_APPROVED for Company A
  const { data: setting } = await adminClient
    .from('journal_event_settings')
    .upsert(
      {
        company_id: testCompanyA,
        event_type: 'EXPENSE_APPROVED',
        is_enabled: false,
        auto_post: false,
      },
      { onConflict: 'company_id,event_type' }
    )
    .select()
    .single();

  if (setting) testSettingIds.push(setting.id);

  const eventData = createExpenseApprovedEventData({
    expenseId: `${TEST_PREFIX}exp-disabled`,
    expenseNumber: 'TEST-EXP-DISABLED',
  });

  const result = await accountingEventsApi.createAndProcess(
    'EXPENSE_APPROVED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  // Should succeed but with 0 journals (skipped)
  assert(result.success, 'Should succeed gracefully');
  assert(result.journalEntryIds.length === 0, 'Should create 0 journals when disabled');

  // Re-enable for other tests
  await adminClient
    .from('journal_event_settings')
    .update({ is_enabled: true })
    .eq('company_id', testCompanyA)
    .eq('event_type', 'EXPENSE_APPROVED');
}

async function testSettingsAutoPost() {
  // Enable auto-post for Company A
  const { data: setting } = await adminClient
    .from('journal_event_settings')
    .upsert(
      {
        company_id: testCompanyA,
        event_type: 'EXPENSE_APPROVED',
        is_enabled: true,
        auto_post: true,
      },
      { onConflict: 'company_id,event_type' }
    )
    .select()
    .single();

  if (setting) testSettingIds.push(setting.id);

  const eventData = createExpenseApprovedEventData({
    expenseId: `${TEST_PREFIX}exp-autopost`,
    expenseNumber: 'TEST-EXP-AUTOPOST',
  });

  const result = await accountingEventsApi.createAndProcess(
    'EXPENSE_APPROVED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `Should succeed: ${result.error}`);
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal');

  const journal = await getJournal(result.journalEntryIds[0]);
  assert(journal.status === 'posted', `Journal should be posted, got: ${journal.status}`);

  // Reset auto_post for other tests
  await adminClient
    .from('journal_event_settings')
    .update({ auto_post: false })
    .eq('company_id', testCompanyA)
    .eq('event_type', 'EXPENSE_APPROVED');
}

async function testSettingsDefaultAccounts() {
  // Set default debit account
  const { data: setting } = await adminClient
    .from('journal_event_settings')
    .upsert(
      {
        company_id: testCompanyA,
        event_type: 'EXPENSE_APPROVED',
        is_enabled: true,
        auto_post: false,
        default_debit_account: '6999', // Custom default
      },
      { onConflict: 'company_id,event_type' }
    )
    .select()
    .single();

  if (setting) testSettingIds.push(setting.id);

  // Create expense with null account code
  const eventData = createExpenseApprovedEventData({
    expenseId: `${TEST_PREFIX}exp-default`,
    expenseNumber: 'TEST-EXP-DEFAULT',
    lineItems: [{ description: 'No account specified', accountCode: null, amount: 1000 }],
    totalSubtotal: 1000,
    totalVatAmount: 70,
    totalAmount: 1070,
  });

  const result = await accountingEventsApi.createAndProcess(
    'EXPENSE_APPROVED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `Should succeed: ${result.error}`);

  const journal = await getJournalWithLines(result.journalEntryIds[0]);
  // Should use the settings default '6999' for the expense line
  assertHasLine(journal, { accountCode: '6999', entryType: 'debit', amount: 1000 });

  // Clean up the custom setting
  await adminClient
    .from('journal_event_settings')
    .update({ default_debit_account: null })
    .eq('company_id', testCompanyA)
    .eq('event_type', 'EXPENSE_APPROVED');
}

async function testMixedMultiCompanySettings() {
  // Disable MANAGEMENT_FEE for Company B only
  const { data: setting } = await adminClient
    .from('journal_event_settings')
    .upsert(
      {
        company_id: testCompanyB,
        event_type: 'MANAGEMENT_FEE_RECOGNIZED',
        is_enabled: false,
        auto_post: false,
      },
      { onConflict: 'company_id,event_type' }
    )
    .select()
    .single();

  if (setting) testSettingIds.push(setting.id);

  const eventData = createManagementFeeEventData(testCompanyA, testCompanyB, {
    projectId: `${TEST_PREFIX}proj-mixed`,
    projectName: 'Mixed Settings Test',
  });

  const result = await accountingEventsApi.createAndProcess(
    'MANAGEMENT_FEE_RECOGNIZED',
    '2024-01-31',
    [testCompanyA, testCompanyB],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, `Should succeed: ${result.error}`);
  // Should only create 1 journal (Company A), Company B is disabled
  assert(result.journalEntryIds.length === 1, 'Should create 1 journal (Company B disabled)');

  const journal = await getJournal(result.journalEntryIds[0]);
  assert(journal.company_id === testCompanyA, 'Journal should be for Company A');

  // Re-enable Company B
  await adminClient
    .from('journal_event_settings')
    .update({ is_enabled: true })
    .eq('company_id', testCompanyB)
    .eq('event_type', 'MANAGEMENT_FEE_RECOGNIZED');
}

// ============================================================================
// Error Handling Tests
// ============================================================================

async function testValidationErrors() {
  const eventData = {
    expenseId: '', // Invalid - missing
    // Missing other required fields
  };

  const result = await accountingEventsApi.createAndProcess(
    'EXPENSE_APPROVED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(!result.success, 'Should fail due to validation');
  assert(result.error !== undefined, 'Should have error message');

  // Check event is marked as failed
  const event = await getEvent(result.eventId);
  assert(event.status === 'failed', `Event should be failed, got: ${event.status}`);
}

async function testAllCompaniesDisabled() {
  // Disable RECEIPT_RECEIVED for Company A
  const { data: setting } = await adminClient
    .from('journal_event_settings')
    .upsert(
      {
        company_id: testCompanyA,
        event_type: 'RECEIPT_RECEIVED',
        is_enabled: false,
      },
      { onConflict: 'company_id,event_type' }
    )
    .select()
    .single();

  if (setting) testSettingIds.push(setting.id);

  const eventData = createReceiptReceivedEventData();
  eventData.receiptId = `${TEST_PREFIX}rec-alldisabled`;
  eventData.payments[0].bankAccountGlCode = testBankAccountA;

  const result = await accountingEventsApi.createAndProcess(
    'RECEIPT_RECEIVED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  // Should succeed but with 0 journals
  assert(result.success, 'Should succeed gracefully when all disabled');
  assert(result.journalEntryIds.length === 0, 'Should create 0 journals');

  // Re-enable
  await adminClient
    .from('journal_event_settings')
    .update({ is_enabled: true })
    .eq('company_id', testCompanyA)
    .eq('event_type', 'RECEIPT_RECEIVED');
}

// ============================================================================
// Immutability Test
// ============================================================================

async function testEventImmutability() {
  // Create and process an event
  const eventData = createExpenseApprovedEventData({
    expenseId: `${TEST_PREFIX}exp-immutable`,
    expenseNumber: 'TEST-EXP-IMMUTABLE',
  });

  const result = await accountingEventsApi.createAndProcess(
    'EXPENSE_APPROVED',
    '2024-01-15',
    [testCompanyA],
    eventData
  );

  createdEventIds.push(result.eventId);

  assert(result.success, 'Event should process successfully');

  // Verify event is processed
  const processedEvent = await getEvent(result.eventId);
  assert(processedEvent.status === 'processed', 'Event should be processed');

  // Try to modify event_data (should be rejected by trigger)
  // Note: Admin/service role client bypasses SECURITY DEFINER but not BEFORE triggers
  const { error } = await adminClient
    .from('accounting_events')
    .update({ event_data: { modified: true } })
    .eq('id', result.eventId);

  // The trigger should reject this with a specific error message
  assert(
    error !== null && error.message.includes('Cannot modify event_data'),
    `Modifying event_data should be rejected, got: ${error?.message || 'no error'}`
  );

  // Cancellation should be allowed
  await accountingEventsApi.cancelEvent(result.eventId);
  const event = await getEvent(result.eventId);
  assert(event.status === 'cancelled', 'Event should be cancellable');
}

// ============================================================================
// Main
// ============================================================================

async function runAllTests() {
  console.log('========================================');
  console.log('Event-Driven Journal System Tests');
  console.log('========================================\n');

  try {
    await setup();

    // Single-company tests
    logSection('Single-Company Events');
    await runTest('EXPENSE_APPROVED', testExpenseApproved);
    await runTest('EXPENSE_PAID', testExpensePaid);
    await runTest('RECEIPT_RECEIVED', testReceiptReceived);
    await runTest('OPENING_BALANCE', testOpeningBalance);
    await runTest('PROJECT_SERVICE_COMPLETED', testProjectServiceCompleted);
    await runTest('PARTNER_PROFIT_ALLOCATION', testPartnerProfitAllocation);
    await runTest('PARTNER_PAYMENT', testPartnerPayment);
    await runTest('CAPEX_INCURRED', testCapexIncurred);

    // Multi-company tests
    logSection('Multi-Company Events');
    await runTest('MANAGEMENT_FEE_RECOGNIZED', testManagementFeeRecognized);
    await runTest('INTERCOMPANY_SETTLEMENT', testIntercompanySettlement);

    // Settings tests
    logSection('Settings Behavior');
    await runTest('Settings: Disabled', testSettingsDisabled);
    await runTest('Settings: Auto-Post', testSettingsAutoPost);
    await runTest('Settings: Default Accounts', testSettingsDefaultAccounts);
    await runTest('Settings: Mixed Multi-Company', testMixedMultiCompanySettings);

    // Error handling tests
    logSection('Error Handling');
    await runTest('Validation Errors', testValidationErrors);
    await runTest('All Companies Disabled', testAllCompaniesDisabled);

    // Immutability test
    logSection('Immutability');
    await runTest('Event Immutability', testEventImmutability);

    logFinalResults(passedTests, failedTests);

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n========================================');
    console.error('TEST SUITE FAILED');
    console.error(error);
    console.error('========================================');
    process.exit(1);
  } finally {
    await cleanup();
  }
}

runAllTests();
