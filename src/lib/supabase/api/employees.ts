import { createClient } from '../client';
import type { Database } from '../database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];

export const employeesApi = {
  async getAll(): Promise<Employee[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('employee_id', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Employee | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByStatus(status: 'active' | 'on_leave' | 'resigned' | 'terminated'): Promise<Employee[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('status', status)
      .order('full_name_en');
    if (error) throw error;
    return data ?? [];
  },

  async getByDepartment(department: string): Promise<Employee[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('employees')
      .select('*')
      .eq('department', department)
      .eq('status', 'active')
      .order('full_name_en');
    if (error) throw error;
    return data ?? [];
  },

  async getByUserId(userId: string): Promise<Employee | null> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('employees')
      .select('*')
      .eq('user_profile_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByCompany(companyId: string): Promise<Employee[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('full_name_en');
    if (error) throw error;
    return data ?? [];
  },

  async create(employee: EmployeeInsert): Promise<Employee> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<EmployeeInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('employees')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
