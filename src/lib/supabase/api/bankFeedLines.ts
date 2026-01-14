import { createClient } from '../client';
import type { Currency } from '@/data/company/types';

// Note: bank_feed_lines and bank_matches tables are not in the generated database types yet.
// Using type assertion to bypass TypeScript checking until types are regenerated.

// Database types
interface DbBankFeedLine {
  id: string;
  bank_account_id: string;
  company_id: string;
  project_id: string | null;
  currency: string;
  transaction_date: string;
  value_date: string;
  description: string;
  reference: string | null;
  amount: number;
  running_balance: number | null;
  status: string;
  matched_amount: number;
  confidence_score: number | null;
  imported_at: string;
  imported_by: string | null;
  import_source: string;
  notes: string | null;
  attachments: string[] | null;
  matched_by: string | null;
  matched_at: string | null;
  ignored_by: string | null;
  ignored_at: string | null;
  ignored_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface DbBankMatch {
  id: string;
  bank_feed_line_id: string;
  system_record_type: string;
  system_record_id: string;
  project_id: string | null;
  matched_amount: number;
  amount_difference: number;
  matched_by: string;
  matched_at: string;
  match_score: number;
  match_method: string;
  rule_id: string | null;
  adjustment_required: boolean;
  adjustment_reason: string | null;
  adjustment_journal_id: string | null;
  created_at: string;
  updated_at: string;
}

export type BankFeedLineWithMatches = DbBankFeedLine & {
  matches: DbBankMatch[];
};

export interface BankFeedLineInsert {
  bank_account_id: string;
  company_id: string;
  project_id?: string | null;
  currency: string;
  transaction_date: string;
  value_date: string;
  description: string;
  reference?: string | null;
  amount: number;
  running_balance?: number | null;
  status?: string;
  matched_amount?: number;
  confidence_score?: number | null;
  imported_by?: string | null;
  import_source?: string;
  notes?: string | null;
}

export interface BankFeedLineUpdate {
  project_id?: string | null;
  status?: string;
  matched_amount?: number;
  confidence_score?: number | null;
  notes?: string | null;
  matched_by?: string | null;
  matched_at?: string | null;
  ignored_by?: string | null;
  ignored_at?: string | null;
  ignored_reason?: string | null;
}

export interface BankMatchInsert {
  bank_feed_line_id: string;
  system_record_type: string;
  system_record_id: string;
  project_id?: string | null;
  matched_amount: number;
  amount_difference?: number;
  matched_by: string;
  match_score?: number;
  match_method?: string;
  rule_id?: string | null;
  adjustment_required?: boolean;
  adjustment_reason?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => createClient() as any;

export const bankFeedLinesApi = {
  async getAll(): Promise<DbBankFeedLine[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .select('*')
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<DbBankFeedLine | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByIdWithMatches(id: string): Promise<BankFeedLineWithMatches | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .select(`
        *,
        matches:bank_matches(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as BankFeedLineWithMatches;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<BankFeedLineWithMatches[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .select(`
        *,
        matches:bank_matches(*)
      `)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as BankFeedLineWithMatches[];
  },

  async getByBankAccount(bankAccountId: string): Promise<BankFeedLineWithMatches[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .select(`
        *,
        matches:bank_matches(*)
      `)
      .eq('bank_account_id', bankAccountId)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as BankFeedLineWithMatches[];
  },

  async getByCompany(companyId: string): Promise<BankFeedLineWithMatches[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .select(`
        *,
        matches:bank_matches(*)
      `)
      .eq('company_id', companyId)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as BankFeedLineWithMatches[];
  },

  async getByStatus(status: string): Promise<BankFeedLineWithMatches[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .select(`
        *,
        matches:bank_matches(*)
      `)
      .eq('status', status)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as BankFeedLineWithMatches[];
  },

  async create(bankFeedLine: BankFeedLineInsert): Promise<DbBankFeedLine> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .insert([bankFeedLine])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createMany(bankFeedLines: BankFeedLineInsert[]): Promise<{ inserted: number; duplicates: number }> {
    const supabase = getSupabase();
    let inserted = 0;
    let duplicates = 0;

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < bankFeedLines.length; i += batchSize) {
      const batch = bankFeedLines.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('bank_feed_lines')
        .upsert(batch, {
          onConflict: 'bank_account_id,transaction_date,amount,md5(description)',
          ignoreDuplicates: true
        })
        .select();

      if (error) {
        // Handle duplicate constraint violations gracefully
        if (error.code === '23505') {
          duplicates += batch.length;
          continue;
        }
        throw error;
      }
      inserted += data?.length ?? 0;
    }

    return { inserted, duplicates };
  },

  async update(id: string, updates: BankFeedLineUpdate): Promise<DbBankFeedLine> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('bank_feed_lines')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Match operations
  async createMatch(match: BankMatchInsert): Promise<DbBankMatch> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_matches')
      .insert([{
        ...match,
        amount_difference: match.amount_difference ?? 0,
        match_score: match.match_score ?? 100,
        match_method: match.match_method ?? 'manual',
        adjustment_required: match.adjustment_required ?? false,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteMatch(matchId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('bank_matches')
      .delete()
      .eq('id', matchId);
    if (error) throw error;
  },

  async getMatchesByBankFeedLine(bankFeedLineId: string): Promise<DbBankMatch[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_matches')
      .select('*')
      .eq('bank_feed_line_id', bankFeedLineId);
    if (error) throw error;
    return data ?? [];
  },

  // Bulk operations for reconciliation
  async updateStatus(id: string, status: string, matchedAmount?: number): Promise<void> {
    const supabase = getSupabase();
    const updates: BankFeedLineUpdate = { status };
    if (matchedAmount !== undefined) {
      updates.matched_amount = matchedAmount;
    }
    const { error } = await supabase
      .from('bank_feed_lines')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async markAsIgnored(id: string, ignoredBy: string, reason?: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('bank_feed_lines')
      .update({
        status: 'ignored',
        ignored_by: ignoredBy,
        ignored_at: new Date().toISOString(),
        ignored_reason: reason,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async unignore(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('bank_feed_lines')
      .update({
        status: 'unmatched',
        ignored_by: null,
        ignored_at: null,
        ignored_reason: null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  // Check for duplicates before import
  async checkDuplicates(
    bankAccountId: string,
    transactionDate: string,
    amount: number,
    description: string
  ): Promise<boolean> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bank_feed_lines')
      .select('id')
      .eq('bank_account_id', bankAccountId)
      .eq('transaction_date', transactionDate)
      .eq('amount', amount)
      .ilike('description', description.substring(0, 50) + '%')
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  },
};
