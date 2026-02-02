import { createClient } from '../client';
import type { Database } from '../database.types';

type ChartOfAccountRow = Database['public']['Tables']['chart_of_accounts']['Row'];

// Extended type that includes columns added in migration 003
// (sub_type, category, description, currency are not in the auto-generated types)
export type ChartOfAccount = ChartOfAccountRow & {
  sub_type?: string | null;
  category?: string | null;
  description?: string | null;
  currency?: string | null;
};

export const chartOfAccountsApi = {
  async getAll(): Promise<ChartOfAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('code');
    if (error) throw error;
    // Cast to extended type that includes category and other extra columns
    return (data ?? []) as ChartOfAccount[];
  },

  async getByType(type: string): Promise<ChartOfAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .ilike('account_type', type)
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
};
