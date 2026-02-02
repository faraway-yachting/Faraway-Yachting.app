import { createClient } from '../client';
import type { Database } from '../database.types';

type DbBeamMerchantAccount = Database['public']['Tables']['beam_merchant_accounts']['Row'];
type DbBeamMerchantAccountInsert = Database['public']['Tables']['beam_merchant_accounts']['Insert'];
type DbBeamMerchantAccountUpdate = Database['public']['Tables']['beam_merchant_accounts']['Update'];

export type { DbBeamMerchantAccount };

export const beamMerchantAccountsApi = {
  async getAll() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_merchant_accounts')
      .select('*, company:companies(id, name)')
      .order('merchant_name');
    if (error) throw error;
    return data ?? [];
  },

  async getActive() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_merchant_accounts')
      .select('*, company:companies(id, name)')
      .eq('is_active', true)
      .order('merchant_name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<DbBeamMerchantAccount | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_merchant_accounts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(account: DbBeamMerchantAccountInsert): Promise<DbBeamMerchantAccount> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_merchant_accounts')
      .insert([account])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: DbBeamMerchantAccountUpdate): Promise<DbBeamMerchantAccount> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('beam_merchant_accounts')
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
      .from('beam_merchant_accounts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
