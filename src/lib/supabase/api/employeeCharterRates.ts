import { createClient } from '../client';
import type { Database } from '../database.types';

type CharterRate = Database['public']['Tables']['employee_charter_rates']['Row'];
type CharterRateInsert = Database['public']['Tables']['employee_charter_rates']['Insert'];

export const employeeCharterRatesApi = {
  async getByEmployee(employeeId: string): Promise<CharterRate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employee_charter_rates')
      .select('*')
      .eq('employee_id', employeeId)
      .order('charter_rate_type');
    if (error) throw error;
    return data ?? [];
  },

  async upsert(rates: CharterRateInsert[]): Promise<void> {
    if (rates.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('employee_charter_rates')
      .upsert(rates, { onConflict: 'employee_id,charter_rate_type,season' });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('employee_charter_rates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
