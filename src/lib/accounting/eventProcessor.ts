/**
 * Event Processor
 *
 * Core engine for processing accounting events and generating journal entries.
 * This is the heart of the event-driven journal entry system.
 *
 * Key features:
 * - Atomic journal creation (all journals succeed or all fail)
 * - Multi-company event support
 * - Settings-based default account fallbacks
 * - Event immutability after processing
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { journalEventSettingsApi } from '@/lib/supabase/api/journalEventSettings';
import { generateJournalReferenceNumber } from './journalPostingService';
import { DEFAULT_ACCOUNTS } from './eventTypes';
import type {
  AccountingEventRow,
  AccountingEventType,
  EventProcessResult,
  JournalSpec,
  JournalLineSpec,
  EventHandler,
} from './eventTypes';

// Allow optional client injection for testing
let injectedClient: SupabaseClient | null = null;

/**
 * Set a custom Supabase client (used for testing with service role)
 */
export function setTestClient(client: SupabaseClient | null): void {
  injectedClient = client;
}

/**
 * Get the Supabase client (injected or default)
 */
function getClient(): SupabaseClient {
  return injectedClient || createClient();
}

// Import event handlers
import { expenseApprovedHandler } from './eventHandlers/expenseApprovedHandler';
import { expensePaidHandler } from './eventHandlers/expensePaidHandler';
import { receiptReceivedHandler } from './eventHandlers/receiptReceivedHandler';
import { managementFeeHandler } from './eventHandlers/managementFeeHandler';
import { intercompanySettlementHandler } from './eventHandlers/intercompanySettlementHandler';
import { partnerProfitAllocationHandler } from './eventHandlers/partnerProfitAllocationHandler';
import { partnerPaymentHandler } from './eventHandlers/partnerPaymentHandler';
import { openingBalanceHandler } from './eventHandlers/openingBalanceHandler';
import { projectServiceCompletedHandler } from './eventHandlers/projectServiceCompletedHandler';
import { capexIncurredHandler } from './eventHandlers/capexIncurredHandler';

// ============================================================================
// Event Handler Registry
// ============================================================================

const eventHandlers: Map<AccountingEventType, EventHandler> = new Map();

// Register all handlers
eventHandlers.set('EXPENSE_APPROVED', expenseApprovedHandler);
eventHandlers.set('EXPENSE_PAID', expensePaidHandler);
eventHandlers.set('RECEIPT_RECEIVED', receiptReceivedHandler);
eventHandlers.set('MANAGEMENT_FEE_RECOGNIZED', managementFeeHandler);
eventHandlers.set('INTERCOMPANY_SETTLEMENT', intercompanySettlementHandler);
eventHandlers.set('PARTNER_PROFIT_ALLOCATION', partnerProfitAllocationHandler);
eventHandlers.set('PARTNER_PAYMENT', partnerPaymentHandler);
eventHandlers.set('OPENING_BALANCE', openingBalanceHandler);
eventHandlers.set('PROJECT_SERVICE_COMPLETED', projectServiceCompletedHandler);
eventHandlers.set('CAPEX_INCURRED', capexIncurredHandler);

// ============================================================================
// Default Account Fallback Logic
// ============================================================================

/**
 * Get the system default account code based on entry type
 * This is the final fallback when no other account is specified
 */
function getSystemDefaultAccount(entryType: 'debit' | 'credit'): string {
  return entryType === 'debit' ? DEFAULT_ACCOUNTS.DEFAULT_EXPENSE : DEFAULT_ACCOUNTS.DEFAULT_REVENUE;
}

/**
 * Apply default accounts to journal lines as fallbacks only
 * Priority: 1. Source document account, 2. Settings default, 3. System default
 */
async function applyDefaultAccounts(
  spec: JournalSpec,
  eventType: string
): Promise<JournalSpec> {
  const defaults = await journalEventSettingsApi.getDefaultAccounts(
    spec.companyId,
    eventType
  );

  const updatedLines: JournalLineSpec[] = spec.lines.map((line) => {
    // If line already has an account code, use it (source document takes precedence)
    if (line.accountCode) {
      return line;
    }

    // Try settings default based on entry type
    const settingsDefault = line.entryType === 'debit' ? defaults.debit : defaults.credit;
    if (settingsDefault) {
      return { ...line, accountCode: settingsDefault };
    }

    // Final fallback to system default
    return { ...line, accountCode: getSystemDefaultAccount(line.entryType) };
  });

  return { ...spec, lines: updatedLines };
}

// ============================================================================
// Atomic Journal Creation
// ============================================================================

interface AtomicJournalResult {
  success: boolean;
  journalEntryIds: string[];
  error?: string;
}

/**
 * Prepare journal data for atomic RPC call
 */
async function prepareJournalData(
  spec: JournalSpec,
  event: AccountingEventRow,
  journalStatus: 'draft' | 'posted'
): Promise<Record<string, unknown>> {
  const referenceNumber = await generateJournalReferenceNumber(spec.companyId);

  const totalDebit = spec.lines
    .filter((l) => l.entryType === 'debit')
    .reduce((sum, l) => sum + l.amount, 0);
  const totalCredit = spec.lines
    .filter((l) => l.entryType === 'credit')
    .reduce((sum, l) => sum + l.amount, 0);

  return {
    reference_number: referenceNumber,
    entry_date: spec.entryDate,
    company_id: spec.companyId,
    description: spec.description,
    status: journalStatus,
    total_debit: totalDebit,
    total_credit: totalCredit,
    created_by: event.created_by,
    source_document_type: event.source_document_type,
    source_document_id: event.source_document_id,
    is_auto_generated: true,
    lines: spec.lines.map((line) => ({
      account_code: line.accountCode,
      entry_type: line.entryType,
      amount: line.amount,
      description: line.description,
    })),
  };
}

/**
 * Create all journals atomically using the database RPC function
 * If any journal fails, all are rolled back
 */
async function saveJournalsAtomically(
  eventId: string,
  journalDataArray: Record<string, unknown>[]
): Promise<AtomicJournalResult> {
  const supabase = getClient();

  try {
    const { data, error } = await supabase.rpc('create_journals_atomic', {
      p_event_id: eventId,
      p_journals: journalDataArray as unknown as import('@/lib/supabase/database.types').Json,
    });

    if (error) {
      return {
        success: false,
        journalEntryIds: [],
        error: error.message,
      };
    }

    // Parse the result - RPC returns JSONB
    const result = data as { success: boolean; journal_ids: string[] };
    return {
      success: result.success,
      journalEntryIds: result.journal_ids || [],
    };
  } catch (error) {
    return {
      success: false,
      journalEntryIds: [],
      error: error instanceof Error ? error.message : 'Unknown error during atomic journal creation',
    };
  }
}

// ============================================================================
// Journal Validation and Filtering
// ============================================================================

interface FilteredSpec {
  spec: JournalSpec;
  journalStatus: 'draft' | 'posted';
}

/**
 * Filter journal specs by enabled companies and apply settings
 * Returns only specs that should be created
 */
async function filterAndPrepareSpecs(
  specs: JournalSpec[],
  eventType: string
): Promise<{ filtered: FilteredSpec[]; skippedCompanies: string[] }> {
  const filtered: FilteredSpec[] = [];
  const skippedCompanies: string[] = [];

  for (const spec of specs) {
    // Check if event type is enabled for this company
    const isEnabled = await journalEventSettingsApi.isEventEnabled(
      spec.companyId,
      eventType
    );

    if (!isEnabled) {
      skippedCompanies.push(spec.companyId);
      continue;
    }

    // Apply default accounts as fallbacks
    const specWithDefaults = await applyDefaultAccounts(spec, eventType);

    // Check auto-post setting
    const shouldAutoPost = await journalEventSettingsApi.shouldAutoPost(
      spec.companyId,
      eventType
    );

    filtered.push({
      spec: specWithDefaults,
      journalStatus: shouldAutoPost ? 'posted' : 'draft',
    });
  }

  return { filtered, skippedCompanies };
}

/**
 * Validate that a journal spec is balanced
 */
function validateBalance(spec: JournalSpec): { valid: boolean; error?: string } {
  const totalDebit = spec.lines
    .filter((l) => l.entryType === 'debit')
    .reduce((sum, l) => sum + l.amount, 0);
  const totalCredit = spec.lines
    .filter((l) => l.entryType === 'credit')
    .reduce((sum, l) => sum + l.amount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      valid: false,
      error: `Unbalanced: Debit=${totalDebit.toFixed(2)}, Credit=${totalCredit.toFixed(2)}`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Core Processing Functions
// ============================================================================

/**
 * Process a pending accounting event
 * Creates journal entries atomically for all affected companies
 */
export async function processEvent(eventId: string): Promise<EventProcessResult> {
  const supabase = getClient();

  try {
    // 1. Fetch the event
    const { data: event, error: fetchError } = await supabase
      .from('accounting_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !event) {
      return {
        success: false,
        eventId,
        journalEntryIds: [],
        error: fetchError?.message || 'Event not found',
      };
    }

    // 2. Check event status
    if (event.status === 'processed') {
      return {
        success: true,
        eventId,
        journalEntryIds: [],
        error: 'Event already processed',
      };
    }

    if (event.status === 'cancelled') {
      return {
        success: false,
        eventId,
        journalEntryIds: [],
        error: 'Event has been cancelled',
      };
    }

    // 3. Get the handler for this event type
    const handler = eventHandlers.get(event.event_type as AccountingEventType);
    if (!handler) {
      await markEventFailed(eventId, `No handler registered for event type: ${event.event_type}`);
      return {
        success: false,
        eventId,
        journalEntryIds: [],
        error: `No handler registered for event type: ${event.event_type}`,
      };
    }

    // 4. Validate event data
    const validation = handler.validate(event.event_data);
    if (!validation.valid) {
      await markEventFailed(eventId, validation.error || 'Validation failed');
      return {
        success: false,
        eventId,
        journalEntryIds: [],
        error: validation.error || 'Validation failed',
      };
    }

    // 5. Generate journal specifications from handler
    const journalSpecs = await handler.generateJournals(event);

    if (journalSpecs.length === 0) {
      await markEventFailed(eventId, 'No journal entries generated');
      return {
        success: false,
        eventId,
        journalEntryIds: [],
        error: 'No journal entries generated',
      };
    }

    // 6. Filter by enabled companies and apply settings
    const { filtered, skippedCompanies } = await filterAndPrepareSpecs(
      journalSpecs,
      event.event_type
    );

    // If all companies are disabled, mark as processed with note
    if (filtered.length === 0) {
      await markEventProcessed(eventId);
      return {
        success: true,
        eventId,
        journalEntryIds: [],
        error: `Event processed but journals skipped for disabled companies: ${skippedCompanies.join(', ')}`,
      };
    }

    // 7. Validate all journal specs are balanced
    for (const { spec } of filtered) {
      const balanceCheck = validateBalance(spec);
      if (!balanceCheck.valid) {
        await markEventFailed(
          eventId,
          `Unbalanced journal for company ${spec.companyId}: ${balanceCheck.error}`
        );
        return {
          success: false,
          eventId,
          journalEntryIds: [],
          error: `Journal entry is not balanced: ${balanceCheck.error}`,
        };
      }
    }

    // 8. Prepare journal data for atomic creation
    const journalDataArray: Record<string, unknown>[] = [];
    for (const { spec, journalStatus } of filtered) {
      const journalData = await prepareJournalData(spec, event, journalStatus);
      journalDataArray.push(journalData);
    }

    // 9. Create all journals atomically (all or nothing)
    const atomicResult = await saveJournalsAtomically(eventId, journalDataArray);

    if (!atomicResult.success) {
      await markEventFailed(eventId, atomicResult.error || 'Atomic journal creation failed');
      return {
        success: false,
        eventId,
        journalEntryIds: [],
        error: atomicResult.error || 'Failed to create journals atomically',
      };
    }

    // 10. Mark event as processed
    await markEventProcessed(eventId);

    return {
      success: true,
      eventId,
      journalEntryIds: atomicResult.journalEntryIds,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await markEventFailed(eventId, errorMessage);
    return {
      success: false,
      eventId,
      journalEntryIds: [],
      error: errorMessage,
    };
  }
}

/**
 * Mark an event as processed
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  const supabase = getClient();
  await supabase
    .from('accounting_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', eventId);
}

/**
 * Mark an event as failed
 */
export async function markEventFailed(eventId: string, error: string): Promise<void> {
  const supabase = getClient();

  // Get current retry count
  const { data: event } = await supabase
    .from('accounting_events')
    .select('retry_count')
    .eq('id', eventId)
    .single();

  await supabase
    .from('accounting_events')
    .update({
      status: 'failed',
      error_message: error,
      retry_count: (event?.retry_count || 0) + 1,
    })
    .eq('id', eventId);
}

/**
 * Retry a failed event
 */
export async function retryEvent(eventId: string): Promise<EventProcessResult> {
  const supabase = getClient();

  // Reset status to pending
  await supabase
    .from('accounting_events')
    .update({
      status: 'pending',
      error_message: null,
    })
    .eq('id', eventId);

  // Process the event
  return processEvent(eventId);
}

/**
 * Cancel an event
 */
export async function cancelEvent(eventId: string): Promise<void> {
  const supabase = getClient();
  await supabase
    .from('accounting_events')
    .update({
      status: 'cancelled',
    })
    .eq('id', eventId);
}

/**
 * Create and process an event in one operation
 * This is the main entry point for creating accounting events
 */
export async function createAndProcessEvent(
  eventType: AccountingEventType,
  eventDate: string,
  affectedCompanies: string[],
  eventData: Record<string, unknown>,
  sourceDocumentType?: string,
  sourceDocumentId?: string,
  createdBy?: string
): Promise<EventProcessResult> {
  const supabase = getClient();

  try {
    // Create the event
    const { data: event, error: createError } = await supabase
      .from('accounting_events')
      .insert({
        event_type: eventType,
        event_date: eventDate,
        status: 'pending' as const,
        affected_companies: affectedCompanies,
        event_data: eventData as unknown as import('@/lib/supabase/database.types').Json,
        source_document_type: sourceDocumentType,
        source_document_id: sourceDocumentId,
        created_by: createdBy,
      })
      .select()
      .single();

    if (createError || !event) {
      return {
        success: false,
        eventId: '',
        journalEntryIds: [],
        error: createError?.message || 'Failed to create event',
      };
    }

    // Process the event
    return processEvent(event.id);
  } catch (error) {
    return {
      success: false,
      eventId: '',
      journalEntryIds: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if an event already exists for a source document
 * Prevents duplicate event creation (idempotency)
 */
export async function checkDuplicateEvent(
  eventType: AccountingEventType,
  sourceDocumentType: string,
  sourceDocumentId: string
): Promise<boolean> {
  const supabase = getClient();

  const { data } = await supabase
    .from('accounting_events')
    .select('id')
    .eq('event_type', eventType)
    .eq('source_document_type', sourceDocumentType)
    .eq('source_document_id', sourceDocumentId)
    .not('status', 'eq', 'cancelled')
    .limit(1);

  return data !== null && data.length > 0;
}

/**
 * Get journal entries linked to an event
 */
export async function getEventJournalEntries(eventId: string): Promise<string[]> {
  const supabase = getClient();

  const { data } = await supabase
    .from('event_journal_entries')
    .select('journal_entry_id')
    .eq('event_id', eventId);

  return data?.map((row) => row.journal_entry_id) || [];
}
