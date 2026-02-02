import { createClient } from '../client';

export interface CashCollection {
  id: string;
  company_id: string;
  booking_id: string | null;
  amount: number;
  currency: string;
  collected_by: string;
  collected_at: string;
  collection_notes: string | null;
  status: 'collected' | 'pending_handover' | 'accepted' | 'rejected';
  handed_over_to: string | null;
  handover_initiated_at: string | null;
  handover_notes: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  collector_name?: string;
  recipient_name?: string;
  confirmer_name?: string;
  booking_reference?: string;
}

export const cashCollectionsApi = {
  async getAll(): Promise<CashCollection[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cash_collections')
      .select('*')
      .order('collected_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CashCollection[];
  },

  async getByCompany(companyId: string): Promise<CashCollection[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cash_collections')
      .select('*')
      .eq('company_id', companyId)
      .order('collected_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CashCollection[];
  },

  async getByBookingId(bookingId: string): Promise<CashCollection[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cash_collections')
      .select('*')
      .eq('booking_id', bookingId)
      .order('collected_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CashCollection[];
  },

  async getPendingHandovers(companyId: string): Promise<CashCollection[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cash_collections')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['collected', 'pending_handover'])
      .order('collected_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CashCollection[];
  },

  async create(record: {
    company_id: string;
    booking_id?: string;
    amount: number;
    currency: string;
    collected_by: string;
    collection_notes?: string;
  }): Promise<CashCollection> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cash_collections')
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data as CashCollection;
  },

  async initiateHandover(id: string, handedOverTo: string, notes?: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('cash_collections')
      .update({
        status: 'pending_handover',
        handed_over_to: handedOverTo,
        handover_initiated_at: new Date().toISOString(),
        handover_notes: notes || null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async initiateHandoverBulk(ids: string[], handedOverTo: string, notes?: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('cash_collections')
      .update({
        status: 'pending_handover',
        handed_over_to: handedOverTo,
        handover_initiated_at: new Date().toISOString(),
        handover_notes: notes || null,
      })
      .in('id', ids);
    if (error) throw error;
  },

  async confirmReceipt(id: string, confirmedBy: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('cash_collections')
      .update({
        status: 'accepted',
        confirmed_by: confirmedBy,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  async rejectHandover(id: string, confirmedBy: string, reason: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('cash_collections')
      .update({
        status: 'rejected',
        confirmed_by: confirmedBy,
        confirmed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('cash_collections')
      .delete()
      .eq('id', id)
      .eq('status', 'collected');
    if (error) throw error;
  },
};
