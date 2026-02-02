import { createClient } from '../client';

// Types will be added to database.types.ts after migration
// For now, use inline types matching the migration schema
interface HRLeaveType {
  id: string;
  name: string;
  is_paid: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface HRLeaveTypeInsert {
  id?: string;
  name: string;
  is_paid?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export const hrLeaveTypesApi = {
  async getAll(): Promise<HRLeaveType[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_leave_types')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<HRLeaveType[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_leave_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(record: HRLeaveTypeInsert): Promise<HRLeaveType> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('hr_leave_types')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<HRLeaveTypeInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('hr_leave_types')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('hr_leave_types')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export type { HRLeaveType, HRLeaveTypeInsert };
