import { createClient } from '../client';
import type { Database } from '../database.types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

export const companiesApi = {
  async getAll(): Promise<Company[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Company | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  async create(company: CompanyInsert): Promise<Company> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .insert([company])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: CompanyUpdate): Promise<Company> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
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
      .from('companies')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getActive(): Promise<Company[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  }
};
