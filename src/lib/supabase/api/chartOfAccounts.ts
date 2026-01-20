import { createClient } from '../client';
import type { Database } from '../database.types';

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];

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
