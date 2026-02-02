import { createClient } from '../client';

export interface LeavePolicy {
  id: string;
  company_id: string;
  leave_type_id: string;
  annual_entitlement_days: number;
  carry_over_max_days: number;
  requires_approval: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LeavePolicyInsert {
  id?: string;
  company_id: string;
  leave_type_id: string;
  annual_entitlement_days: number;
  carry_over_max_days?: number;
  requires_approval?: boolean;
  notes?: string | null;
}

export const leavePoliciesApi = {
  async getByCompany(companyId: string): Promise<LeavePolicy[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('leave_policies')
      .select('*')
      .eq('company_id', companyId);
    if (error) throw error;
    return data ?? [];
  },

  async upsert(record: LeavePolicyInsert): Promise<LeavePolicy> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('leave_policies')
      .upsert([{
        ...record,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'company_id,leave_type_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('leave_policies')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
