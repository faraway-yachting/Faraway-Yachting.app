import { createClient } from '../client';

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitlement_days: number;
  carried_over_days: number;
  used_days: number;
  remaining_days: number; // generated column
  created_at: string;
  updated_at: string;
  // Joined
  leave_type?: { id: string; name: string; is_paid: boolean };
}

export const leaveBalancesApi = {
  async getByEmployee(employeeId: string, year: number): Promise<LeaveBalance[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('leave_balances')
      .select('*, leave_type:hr_leave_types(id, name, is_paid)')
      .eq('employee_id', employeeId)
      .eq('year', year);
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string, year: number): Promise<LeaveBalance[]> {
    const supabase = createClient();
    // Join through employees to filter by company
    const { data, error } = await (supabase as any)
      .from('leave_balances')
      .select('*, leave_type:hr_leave_types(id, name, is_paid), employee:employees!inner(id, employee_id, full_name_en, company_id)')
      .eq('employee.company_id', companyId)
      .eq('year', year);
    if (error) throw error;
    return data ?? [];
  },

  async initialize(companyId: string, year: number): Promise<number> {
    // Create balance records for all active employees based on leave policies
    const supabase = createClient();

    // Get policies for this company
    const { data: policies, error: pErr } = await (supabase as any)
      .from('leave_policies')
      .select('*')
      .eq('company_id', companyId);
    if (pErr) throw pErr;
    if (!policies || policies.length === 0) return 0;

    // Get active employees for this company
    const { data: employees, error: eErr } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active');
    if (eErr) throw eErr;
    if (!employees || employees.length === 0) return 0;

    // Build balance records
    const records: any[] = [];
    for (const emp of employees) {
      for (const policy of policies) {
        records.push({
          employee_id: emp.id,
          leave_type_id: policy.leave_type_id,
          year,
          entitlement_days: policy.annual_entitlement_days,
          carried_over_days: 0,
          used_days: 0,
        });
      }
    }

    // Upsert (won't overwrite existing balances due to ON CONFLICT)
    const { error: iErr } = await (supabase as any)
      .from('leave_balances')
      .upsert(records, { onConflict: 'employee_id,leave_type_id,year', ignoreDuplicates: true });
    if (iErr) throw iErr;

    return records.length;
  },

  async update(id: string, updates: { entitlement_days?: number; carried_over_days?: number }): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('leave_balances')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
