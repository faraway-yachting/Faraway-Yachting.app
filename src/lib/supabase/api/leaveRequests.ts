import { createClient } from '../client';

export interface LeaveRequest {
  id: string;
  request_number: string;
  employee_id: string;
  company_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee?: any;
  leave_type?: any;
}

interface LeaveRequestInsert {
  request_number: string;
  employee_id: string;
  company_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string | null;
  status?: string;
  created_by?: string | null;
}

export const leaveRequestsApi = {
  async getAll(filters?: { companyId?: string; status?: string; year?: number }): Promise<LeaveRequest[]> {
    const supabase = createClient();
    let query = (supabase as any)
      .from('leave_requests')
      .select('*, employee:employees(id, employee_id, full_name_en, nickname, position, picture_url), leave_type:hr_leave_types(id, name, is_paid)')
      .order('created_at', { ascending: false });

    if (filters?.companyId) query = query.eq('company_id', filters.companyId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.year) {
      query = query.gte('start_date', `${filters.year}-01-01`).lte('start_date', `${filters.year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('leave_requests')
      .select('*, leave_type:hr_leave_types(id, name, is_paid)')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<LeaveRequest | null> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('leave_requests')
      .select('*, employee:employees(id, employee_id, full_name_en, nickname, position, picture_url, company_id), leave_type:hr_leave_types(id, name, is_paid)')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async generateNumber(): Promise<string> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .rpc('generate_leave_request_number');
    if (error) throw error;
    return data;
  },

  async create(record: LeaveRequestInsert): Promise<LeaveRequest> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('leave_requests')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async approve(id: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('leave_requests')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async reject(id: string, userId: string, reason: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('leave_requests')
      .update({
        status: 'rejected',
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async cancel(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('leave_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async getForCalendar(startDate: string, endDate: string, companyId?: string): Promise<LeaveRequest[]> {
    const supabase = createClient();
    let query = (supabase as any)
      .from('leave_requests')
      .select('*, employee:employees(id, employee_id, full_name_en, nickname, position, picture_url), leave_type:hr_leave_types(id, name)')
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
};
