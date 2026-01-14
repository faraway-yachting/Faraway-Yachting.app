/**
 * Accounting Events API
 *
 * CRUD and processing operations for accounting events.
 * Events automatically generate journal entries when processed.
 */

import { createClient } from '../client';
import type { Database } from '../database.types';
import type { AccountingEventType, EventProcessResult } from '@/lib/accounting/eventTypes';
import {
  processEvent,
  retryEvent,
  cancelEvent as cancelEventProcessor,
  createAndProcessEvent,
  checkDuplicateEvent,
  getEventJournalEntries,
} from '@/lib/accounting/eventProcessor';

type AccountingEvent = Database['public']['Tables']['accounting_events']['Row'];
type AccountingEventInsert = Database['public']['Tables']['accounting_events']['Insert'];
type EventJournalEntry = Database['public']['Tables']['event_journal_entries']['Row'];
type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];

export interface AccountingEventWithJournals extends AccountingEvent {
  journals?: JournalEntry[];
}

export const accountingEventsApi = {
  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all events
   */
  async getAll(): Promise<AccountingEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get event by ID
   */
  async getById(id: string): Promise<AccountingEvent | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Get event by ID with linked journal entries
   */
  async getByIdWithJournals(id: string): Promise<AccountingEventWithJournals | null> {
    const supabase = createClient();

    // Get the event
    const { data: event, error } = await supabase
      .from('accounting_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Get linked journal entries
    const { data: links } = await supabase
      .from('event_journal_entries')
      .select('journal_entry_id')
      .eq('event_id', id);

    if (links && links.length > 0) {
      const journalIds = links.map((l) => l.journal_entry_id);
      const { data: journals } = await supabase
        .from('journal_entries')
        .select('*')
        .in('id', journalIds);

      return { ...event, journals: journals ?? [] };
    }

    return { ...event, journals: [] };
  },

  /**
   * Get pending events
   */
  async getPending(): Promise<AccountingEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get failed events
   */
  async getFailed(): Promise<AccountingEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get processed events
   */
  async getProcessed(): Promise<AccountingEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .eq('status', 'processed')
      .order('processed_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get events by source document
   */
  async getBySourceDocument(
    sourceType: string,
    sourceId: string
  ): Promise<AccountingEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .eq('source_document_type', sourceType)
      .eq('source_document_id', sourceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get events by type
   */
  async getByType(eventType: AccountingEventType): Promise<AccountingEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .eq('event_type', eventType)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get events by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<AccountingEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get events by company
   */
  async getByCompany(companyId: string): Promise<AccountingEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .select('*')
      .contains('affected_companies', [companyId])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // ============================================================================
  // Create Operations
  // ============================================================================

  /**
   * Create an event without processing
   */
  async create(event: AccountingEventInsert): Promise<AccountingEvent> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounting_events')
      .insert([event])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Create and immediately process an event
   * This is the primary method for generating journal entries from events
   */
  async createAndProcess(
    eventType: AccountingEventType,
    eventDate: string,
    affectedCompanies: string[],
    eventData: Record<string, unknown>,
    sourceDocumentType?: string,
    sourceDocumentId?: string,
    createdBy?: string
  ): Promise<EventProcessResult> {
    return createAndProcessEvent(
      eventType,
      eventDate,
      affectedCompanies,
      eventData,
      sourceDocumentType,
      sourceDocumentId,
      createdBy
    );
  },

  // ============================================================================
  // Processing Operations
  // ============================================================================

  /**
   * Process a pending event
   */
  async processEvent(eventId: string): Promise<EventProcessResult> {
    return processEvent(eventId);
  },

  /**
   * Retry a failed event
   */
  async retryEvent(eventId: string): Promise<EventProcessResult> {
    return retryEvent(eventId);
  },

  /**
   * Cancel an event
   */
  async cancelEvent(eventId: string): Promise<void> {
    return cancelEventProcessor(eventId);
  },

  // ============================================================================
  // Helper Operations
  // ============================================================================

  /**
   * Check if an event already exists for a source document
   * Prevents duplicate event creation (idempotency)
   */
  async checkDuplicate(
    eventType: AccountingEventType,
    sourceDocumentType: string,
    sourceDocumentId: string
  ): Promise<boolean> {
    return checkDuplicateEvent(eventType, sourceDocumentType, sourceDocumentId);
  },

  /**
   * Get journal entries linked to an event
   */
  async getEventJournals(eventId: string): Promise<string[]> {
    return getEventJournalEntries(eventId);
  },

  /**
   * Get event journal entry links
   */
  async getEventJournalLinks(eventId: string): Promise<EventJournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_journal_entries')
      .select('*')
      .eq('event_id', eventId);
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get statistics for events dashboard
   */
  async getStatistics(): Promise<{
    pending: number;
    processed: number;
    failed: number;
    cancelled: number;
  }> {
    const supabase = createClient();

    const [pending, processed, failed, cancelled] = await Promise.all([
      supabase
        .from('accounting_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('accounting_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processed'),
      supabase
        .from('accounting_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabase
        .from('accounting_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled'),
    ]);

    return {
      pending: pending.count ?? 0,
      processed: processed.count ?? 0,
      failed: failed.count ?? 0,
      cancelled: cancelled.count ?? 0,
    };
  },
};
