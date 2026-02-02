import { createClient } from '../client';
import type { Database } from '../database.types';

type HREmploymentType = Database['public']['Tables']['hr_employment_types']['Row'];
type HREmploymentTypeInsert = Database['public']['Tables']['hr_employment_types']['Insert'];

export const hrEmploymentTypesApi = {
  async getAll(): Promise<HREmploymentType[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('hr_employment_types')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<HREmploymentType[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('hr_employment_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(record: HREmploymentTypeInsert): Promise<HREmploymentType> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('hr_employment_types')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<HREmploymentTypeInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('hr_employment_types')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('hr_employment_types')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
