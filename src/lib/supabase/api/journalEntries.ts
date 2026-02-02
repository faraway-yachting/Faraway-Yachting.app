import { createClient } from '../client';
import type { Database } from '../database.types';

type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update'];
type JournalEntryLine = Database['public']['Tables']['journal_entry_lines']['Row'];
type JournalEntryLineInsert = Database['public']['Tables']['journal_entry_lines']['Insert'];
// Type for creating lines without journal_entry_id (added by create function)
type JournalEntryLineCreate = Omit<JournalEntryLineInsert, 'journal_entry_id'>;
type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];
type ChartOfAccountInsert = Database['public']['Tables']['chart_of_accounts']['Insert'];
type ChartOfAccountUpdate = Database['public']['Tables']['chart_of_accounts']['Update'];

export type JournalEntryWithLines = JournalEntry & {
  lines: JournalEntryLine[];
};

export const journalEntriesApi = {
  // Journal Entry operations
  async getAll(): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .neq('status', 'deleted')
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getAllWithLines(): Promise<JournalEntryWithLines[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(*)
      `)
      .neq('status', 'deleted')
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as JournalEntryWithLines[];
  },

  async getById(id: string): Promise<JournalEntry | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByIdWithLines(id: string): Promise<JournalEntryWithLines | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as JournalEntryWithLines;
  },

  async create(entry: JournalEntryInsert, lines?: JournalEntryLineCreate[]): Promise<JournalEntry> {
    const supabase = createClient();

    console.log('[journalEntriesApi.create] Attempting to insert journal entry:', {
      reference_number: entry.reference_number,
      entry_date: entry.entry_date,
      company_id: entry.company_id,
      created_by: entry.created_by || '(empty)',
      total_debit: entry.total_debit,
      total_credit: entry.total_credit,
      linesCount: lines?.length || 0,
    });

    const { data: entryData, error: entryError } = await supabase
      .from('journal_entries')
      .insert([entry])
      .select()
      .single();
    if (entryError) {
      console.error('[journalEntriesApi.create] Supabase error:', {
        message: entryError.message,
        code: entryError.code,
        details: entryError.details,
        hint: entryError.hint,
      });
      throw new Error(`Failed to create journal entry: ${entryError.message} (code: ${entryError.code})`);
    }

    console.log('[journalEntriesApi.create] Journal entry created:', entryData.id);

    if (lines && lines.length > 0) {
      const linesWithEntryId = lines.map((line, index) => ({
        ...line,
        journal_entry_id: entryData.id,
        line_order: index + 1
      }));

      console.log('[journalEntriesApi.create] Inserting', linesWithEntryId.length, 'journal lines');

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntryId);
      if (linesError) {
        console.error('[journalEntriesApi.create] Supabase lines error:', {
          message: linesError.message,
          code: linesError.code,
          details: linesError.details,
          hint: linesError.hint,
        });
        throw new Error(`Failed to create journal entry lines: ${linesError.message} (code: ${linesError.code})`);
      }

      console.log('[journalEntriesApi.create] Journal lines created successfully');
    }

    return entryData;
  },

  async update(id: string, updates: JournalEntryUpdate): Promise<JournalEntry> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('journal_entries')
      .update({ status: 'deleted' })
      .eq('id', id);
    if (error) throw error;
  },

  async getDeleted(companyId?: string): Promise<JournalEntryWithLines[]> {
    const supabase = createClient();
    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(*)
      `)
      .eq('status', 'deleted')
      .order('updated_at', { ascending: false });
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as JournalEntryWithLines[];
  },

  async restore(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('journal_entries')
      .update({ status: 'draft' })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Delete all journal entries for a source document
   * Used when deleting or voiding expenses/receipts
   */
  async deleteBySourceDocument(
    sourceDocumentType: string,
    sourceDocumentId: string
  ): Promise<number> {
    const supabase = createClient();

    // First get the entries to count them
    const { data: entries, error: fetchError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('source_document_type', sourceDocumentType)
      .eq('source_document_id', sourceDocumentId);

    if (fetchError) throw fetchError;

    if (!entries || entries.length === 0) {
      return 0;
    }

    // Soft-delete the entries (set status to 'deleted')
    const { error: deleteError } = await supabase
      .from('journal_entries')
      .update({ status: 'deleted' })
      .eq('source_document_type', sourceDocumentType)
      .eq('source_document_id', sourceDocumentId);

    if (deleteError) throw deleteError;

    return entries.length;
  },

  async getByStatus(status: 'draft' | 'posted'): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('status', status)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'deleted')
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByDateRange(startDate: string, endDate: string): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .neq('status', 'deleted')
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Journal Entry Lines operations
  async getLines(journalEntryId: string): Promise<JournalEntryLine[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entry_lines')
      .select('*')
      .eq('journal_entry_id', journalEntryId)
      .order('line_order');
    if (error) throw error;
    return data ?? [];
  },

  async updateLines(journalEntryId: string, lines: JournalEntryLineInsert[]): Promise<void> {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('journal_entry_lines')
      .delete()
      .eq('journal_entry_id', journalEntryId);
    if (deleteError) throw deleteError;

    if (lines.length > 0) {
      const linesWithOrder = lines.map((line, index) => ({
        ...line,
        journal_entry_id: journalEntryId,
        line_order: index + 1
      }));

      const { error: insertError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithOrder);
      if (insertError) throw insertError;
    }
  },

  async postEntry(id: string): Promise<JournalEntry> {
    return this.update(id, { status: 'posted' });
  },

  // Get journal entries by source document (for viewing related entries)
  async getBySourceDocument(
    sourceType: string,
    sourceId: string
  ): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('source_document_type', sourceType)
      .eq('source_document_id', sourceId)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Get all auto-generated journal entries
  async getAutoGenerated(): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('is_auto_generated', true)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Get auto-generated drafts (pending review)
  async getPendingAutoGeneratedDrafts(): Promise<JournalEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('is_auto_generated', true)
      .eq('status', 'draft')
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get posted journal entries with lines up to a specific date
   * Used by Balance Sheet and other financial reports
   */
  async getPostedEntriesWithLinesUpToDate(
    asOfDate: string,
    companyId?: string
  ): Promise<JournalEntryWithLines[]> {
    const supabase = createClient();

    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(*)
      `)
      .eq('status', 'posted')
      .lte('entry_date', asOfDate)
      .order('entry_date', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as JournalEntryWithLines[];
  },

  /**
   * Get posted journal entries with lines within a date range
   * Used by P&L Report calculation
   */
  async getPostedEntriesWithLinesInDateRange(
    dateFrom: string,
    dateTo: string,
    companyId?: string
  ): Promise<JournalEntryWithLines[]> {
    const supabase = createClient();

    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(*)
      `)
      .eq('status', 'posted')
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as JournalEntryWithLines[];
  }
};

// Chart of Accounts API
export const chartOfAccountsApi = {
  async getAll(): Promise<ChartOfAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('code');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<ChartOfAccount | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByCode(code: string): Promise<ChartOfAccount | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('code', code)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(account: ChartOfAccountInsert): Promise<ChartOfAccount> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert([account])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ChartOfAccountUpdate): Promise<ChartOfAccount> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('chart_of_accounts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByType(accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'): Promise<ChartOfAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('account_type', accountType)
      .order('code');
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<ChartOfAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('code');
    if (error) throw error;
    return data ?? [];
  }
};
