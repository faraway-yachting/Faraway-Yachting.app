import { createClient } from '../client';

interface VatFiling {
  id: string;
  company_id: string;
  period: string;
  vat_output: number;
  vat_input: number;
  net_vat: number;
  status: 'pending' | 'filed' | 'paid';
  filed_date: string | null;
  filed_by: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type { VatFiling };

export const vatFilingsApi = {
  async getByPeriod(companyId: string, period: string): Promise<VatFiling | null> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('vat_filings')
      .select('*')
      .eq('company_id', companyId)
      .eq('period', period)
      .maybeSingle();
    if (error) throw error;
    return data as VatFiling | null;
  },

  async getAll(companyId: string): Promise<VatFiling[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('vat_filings')
      .select('*')
      .eq('company_id', companyId)
      .order('period', { ascending: false });
    if (error) throw error;
    return (data ?? []) as VatFiling[];
  },

  async createOrUpdate(filing: {
    company_id: string;
    period: string;
    vat_output: number;
    vat_input: number;
    net_vat: number;
    notes?: string;
  }): Promise<VatFiling> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('vat_filings')
      .upsert(filing, { onConflict: 'company_id,period' })
      .select()
      .single();
    if (error) throw error;
    return data as VatFiling;
  },

  async markFiled(id: string, filedDate: string, filedBy: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('vat_filings')
      .update({
        status: 'filed',
        filed_date: filedDate,
        filed_by: filedBy,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async markPaid(id: string, paymentDate: string, reference: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('vat_filings')
      .update({
        status: 'paid',
        payment_date: paymentDate,
        payment_reference: reference,
      })
      .eq('id', id);
    if (error) throw error;
  },
};
