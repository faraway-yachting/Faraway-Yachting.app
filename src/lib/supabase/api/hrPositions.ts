import { createClient } from '../client';
import type { Database } from '../database.types';

type HRPosition = Database['public']['Tables']['hr_positions']['Row'] & { department_id?: string | null };
type HRPositionInsert = Database['public']['Tables']['hr_positions']['Insert'];

export const hrPositionsApi = {
  async getAll(): Promise<HRPosition[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_positions')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<HRPosition[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_positions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getByDepartment(departmentId: string): Promise<HRPosition[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_positions')
      .select('*')
      .eq('is_active', true)
      .or(`department_id.eq.${departmentId},department_id.is.null`)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(record: HRPositionInsert & { department_id?: string | null }): Promise<HRPosition> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_positions')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<HRPositionInsert> & { department_id?: string | null }): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('hr_positions')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('hr_positions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export type { HRPosition };
