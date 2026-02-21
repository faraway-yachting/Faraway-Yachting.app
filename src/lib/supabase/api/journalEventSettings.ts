/**
 * Journal Event Settings API
 *
 * Per-company configuration for journal event processing.
 * Controls which events generate journals, auto-post behavior, and default accounts.
 */

import { createClient } from '../client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

type JournalEventSetting = Database['public']['Tables']['journal_event_settings']['Row'];
type JournalEventSettingInsert = Database['public']['Tables']['journal_event_settings']['Insert'];
type JournalEventSettingUpdate = Database['public']['Tables']['journal_event_settings']['Update'];

export type { JournalEventSetting };

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

export const journalEventSettingsApi = {
  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all settings for a company
   */
  async getByCompany(companyId: string): Promise<JournalEventSetting[]> {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('journal_event_settings')
      .select('*')
      .eq('company_id', companyId)
      .order('event_type');
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get setting for specific event type
   */
  async getByEventType(
    companyId: string,
    eventType: string
  ): Promise<JournalEventSetting | null> {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('journal_event_settings')
      .select('*')
      .eq('company_id', companyId)
      .eq('event_type', eventType)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // ============================================================================
  // Mutation Operations
  // ============================================================================

  /**
   * Create a new setting
   */
  async create(setting: JournalEventSettingInsert): Promise<JournalEventSetting> {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('journal_event_settings')
      .insert([setting])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Update an existing setting
   */
  async update(id: string, updates: JournalEventSettingUpdate): Promise<JournalEventSetting> {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('journal_event_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Upsert setting (create or update)
   * Uses company_id + event_type as unique key
   */
  async upsert(
    setting: JournalEventSettingInsert
  ): Promise<JournalEventSetting> {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('journal_event_settings')
      .upsert([setting], {
        onConflict: 'company_id,event_type',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Delete a setting (reverts to defaults)
   */
  async delete(id: string): Promise<void> {
    const supabase = getClient();
    const { error } = await supabase
      .from('journal_event_settings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Delete setting by company and event type
   */
  async deleteByEventType(companyId: string, eventType: string): Promise<void> {
    const supabase = getClient();
    const { error } = await supabase
      .from('journal_event_settings')
      .delete()
      .eq('company_id', companyId)
      .eq('event_type', eventType);
    if (error) throw error;
  },

  // ============================================================================
  // Helper Operations (for event processor)
  // ============================================================================

  /**
   * Check if event type is enabled for company
   * Returns true if no setting exists (default behavior)
   */
  async isEventEnabled(companyId: string, eventType: string): Promise<boolean> {
    const setting = await this.getByEventType(companyId, eventType);
    // Default: enabled if no setting exists
    return setting?.is_enabled ?? true;
  },

  /**
   * Check if auto-post is enabled for event type
   * Returns false if no setting exists (default to draft)
   */
  async shouldAutoPost(companyId: string, eventType: string): Promise<boolean> {
    const setting = await this.getByEventType(companyId, eventType);
    // Default: draft (no auto-post) if no setting exists
    return setting?.auto_post ?? false;
  },

  /**
   * Get default accounts for event type
   * Returns null values if no setting exists
   */
  async getDefaultAccounts(
    companyId: string,
    eventType: string
  ): Promise<{ debit: string | null; credit: string | null }> {
    const setting = await this.getByEventType(companyId, eventType);
    return {
      debit: setting?.default_debit_account ?? null,
      credit: setting?.default_credit_account ?? null,
    };
  },

  /**
   * Bulk update settings for a company
   * Useful for saving all settings at once from the UI
   */
  async bulkUpsert(
    settings: JournalEventSettingInsert[]
  ): Promise<JournalEventSetting[]> {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('journal_event_settings')
      .upsert(settings, {
        onConflict: 'company_id,event_type',
      })
      .select();
    if (error) throw error;
    return data ?? [];
  },
};
