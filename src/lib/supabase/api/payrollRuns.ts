import { createClient } from '../client';

export interface PayrollRun {
  id: string;
  run_number: string;
  company_id: string | null;
  period_year: number;
  period_month: number;
  period_label: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employer_ssf: number;
  employee_count: number;
  status: 'draft' | 'approved' | 'paid';
  approved_by: string | null;
  approved_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  payment_date: string | null;
  bank_account_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  company?: any;
}

export const payrollRunsApi = {
  async getAll(companyId?: string): Promise<PayrollRun[]> {
    const supabase = createClient();
    let query = (supabase as any)
      .from('payroll_runs')
      .select('*')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<PayrollRun | null> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('payroll_runs')
      .select('*')
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
      .rpc('generate_payroll_run_number');
    if (error) throw error;
    return data;
  },

  async create(record: {
    run_number: string;
    company_id?: string | null;
    period_year: number;
    period_month: number;
    notes?: string | null;
    created_by?: string | null;
  }): Promise<PayrollRun> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('payroll_runs')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async approve(id: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('payroll_runs')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async markPaid(id: string, bankAccountId: string, paymentDate: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('payroll_runs')
      .update({
        status: 'paid',
        paid_by: userId,
        paid_at: new Date().toISOString(),
        payment_date: paymentDate,
        bank_account_id: bankAccountId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('payroll_runs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
