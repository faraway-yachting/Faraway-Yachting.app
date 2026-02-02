import { createClient } from '../client';
import type { Database } from '../database.types';

type EmployeeDocument = Database['public']['Tables']['employee_documents']['Row'];
type EmployeeDocumentInsert = Database['public']['Tables']['employee_documents']['Insert'];

export const employeeDocumentsApi = {
  async getByEmployee(employeeId: string): Promise<EmployeeDocument[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('expiry_date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getExpiringSoon(daysAhead: number = 30): Promise<EmployeeDocument[]> {
    const supabase = createClient();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(doc: EmployeeDocumentInsert): Promise<EmployeeDocument> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employee_documents')
      .insert([doc])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<EmployeeDocumentInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('employee_documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
