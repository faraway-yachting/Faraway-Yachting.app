import { createClient } from '../client';
import type { Database } from '../database.types';

type CharterFee = Database['public']['Tables']['intercompany_charter_fees']['Row'];
type CharterFeeInsert = Database['public']['Tables']['intercompany_charter_fees']['Insert'];
type CharterFeeUpdate = Database['public']['Tables']['intercompany_charter_fees']['Update'];

export const intercompanyCharterFeesApi = {
  async getAll(): Promise<CharterFee[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('intercompany_charter_fees')
      .select('*')
      .order('charter_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getPending(): Promise<CharterFee[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('intercompany_charter_fees')
      .select('*')
      .eq('status', 'pending')
      .order('charter_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getSettled(): Promise<CharterFee[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('intercompany_charter_fees')
      .select('*')
      .eq('status', 'settled')
      .order('settled_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getPendingByOwnerCompany(ownerCompanyId: string): Promise<CharterFee[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('intercompany_charter_fees')
      .select('*')
      .eq('owner_company_id', ownerCompanyId)
      .eq('status', 'pending')
      .order('charter_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(fee: CharterFeeInsert): Promise<CharterFee> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('intercompany_charter_fees')
      .insert([fee])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markAsSettled(
    ids: string[],
    settlementReference: string,
    settledDate: string
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('intercompany_charter_fees')
      .update({
        status: 'settled',
        settled_date: settledDate,
        settlement_reference: settlementReference,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);
    if (error) throw error;
  },

  async getByReceiptId(receiptId: string): Promise<CharterFee[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('intercompany_charter_fees')
      .select('*')
      .eq('receipt_id', receiptId);
    if (error) throw error;
    return data ?? [];
  },

  async update(id: string, data: Partial<CharterFeeInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('intercompany_charter_fees')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('intercompany_charter_fees')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
