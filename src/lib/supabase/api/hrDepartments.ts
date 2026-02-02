import { createClient } from '../client';

export interface HRDepartment {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface HRDepartmentInsert {
  id?: string;
  name: string;
  is_active?: boolean;
  sort_order?: number;
}

export const hrDepartmentsApi = {
  async getAll(): Promise<HRDepartment[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_departments')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<HRDepartment[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_departments')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(record: HRDepartmentInsert): Promise<HRDepartment> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_departments')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<HRDepartmentInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('hr_departments')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('hr_departments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
