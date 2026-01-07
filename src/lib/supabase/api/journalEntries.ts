import { createClient } from '../client';
import type { Database } from '../database.types';

type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update'];
type JournalEntryLine = Database['public']['Tables']['journal_entry_lines']['Row'];
type JournalEntryLineInsert = Database['public']['Tables']['journal_entry_lines']['Insert'];
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
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
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

  async create(entry: JournalEntryInsert, lines?: JournalEntryLineInsert[]): Promise<JournalEntry> {
    const supabase = createClient();

    const { data: entryData, error: entryError } = await supabase
      .from('journal_entries')
      .insert([entry])
      .select()
      .single();
    if (entryError) throw entryError;

    if (lines && lines.length > 0) {
      const linesWithEntryId = lines.map((line, index) => ({
        ...line,
        journal_entry_id: entryData.id,
        line_order: index + 1
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntryId);
      if (linesError) throw linesError;
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
      .delete()
      .eq('id', id);
    if (error) throw error;
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
