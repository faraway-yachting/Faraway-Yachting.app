import { createClient } from '../client';
import type { Database } from '../database.types';

type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];
type BankAccountInsert = Database['public']['Tables']['bank_accounts']['Insert'];
type BankAccountUpdate = Database['public']['Tables']['bank_accounts']['Update'];
type Currency = BankAccount['currency'];

export const bankAccountsApi = {
  async getAll(): Promise<BankAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .order('account_name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<BankAccount | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(bankAccount: BankAccountInsert): Promise<BankAccount> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert([bankAccount])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: BankAccountUpdate): Promise<BankAccount> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
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
      .from('bank_accounts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByIds(ids: string[]): Promise<BankAccount[]> {
    if (ids.length === 0) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string): Promise<BankAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('account_name');
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<BankAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('account_name');
    if (error) throw error;
    return data ?? [];
  },

  async getByCurrency(currency: Currency): Promise<BankAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('currency', currency)
      .eq('is_active', true)
      .order('account_name');
    if (error) throw error;
    return data ?? [];
  },

  async toggleStatus(id: string): Promise<BankAccount> {
    const supabase = createClient();
    // First get the current status
    const { data: current, error: fetchError } = await supabase
      .from('bank_accounts')
      .select('is_active')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    // Toggle it
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByCompanyActive(companyId: string): Promise<BankAccount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('account_name');
    if (error) throw error;
    return data ?? [];
  }
};
