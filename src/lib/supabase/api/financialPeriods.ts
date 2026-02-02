import { createClient } from '../client';

export interface FinancialPeriod {
  id: string;
  company_id: string;
  period: string;
  status: 'open' | 'closed' | 'locked';
  closed_by: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const financialPeriodsApi = {
  async getAll(companyId: string): Promise<FinancialPeriod[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('financial_periods')
      .select('*')
      .eq('company_id', companyId)
      .order('period', { ascending: false });
    if (error) throw error;
    return (data ?? []) as FinancialPeriod[];
  },

  async getByPeriod(companyId: string, period: string): Promise<FinancialPeriod | null> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('financial_periods')
      .select('*')
      .eq('company_id', companyId)
      .eq('period', period)
      .maybeSingle();
    if (error) throw error;
    return data as FinancialPeriod | null;
  },

  /**
   * Check if a period is open for posting.
   * If no record exists for the period, it's considered open.
   */
  async isOpen(companyId: string, date: string): Promise<boolean> {
    const period = date.substring(0, 7); // 'YYYY-MM'
    const record = await this.getByPeriod(companyId, period);
    if (!record) return true; // No record = open
    return record.status === 'open';
  },

  /**
   * Check period and throw if closed. Use before creating journal entries.
   */
  async assertOpen(companyId: string, date: string): Promise<void> {
    const period = date.substring(0, 7);
    const isOpen = await this.isOpen(companyId, date);
    if (!isOpen) {
      throw new Error(`Cannot post to closed period ${period}. Please reopen the period first.`);
    }
  },

  async closePeriod(companyId: string, period: string, userId: string, notes?: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('financial_periods')
      .upsert({
        company_id: companyId,
        period,
        status: 'closed',
        closed_by: userId,
        closed_at: new Date().toISOString(),
        notes: notes || null,
      }, { onConflict: 'company_id,period' });
    if (error) throw error;
  },

  async reopenPeriod(companyId: string, period: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('financial_periods')
      .update({
        status: 'open',
        closed_by: null,
        closed_at: null,
      })
      .eq('company_id', companyId)
      .eq('period', period);
    if (error) throw error;
  },

  async lockPeriod(companyId: string, period: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('financial_periods')
      .update({ status: 'locked' })
      .eq('company_id', companyId)
      .eq('period', period);
    if (error) throw error;
  },
};
