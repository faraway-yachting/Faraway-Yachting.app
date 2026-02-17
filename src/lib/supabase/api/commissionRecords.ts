import { createClient } from '../client';
import type { Database } from '../database.types';

type CommissionRecord = Database['public']['Tables']['commission_records']['Row'];
type CommissionRecordInsert = Database['public']['Tables']['commission_records']['Insert'];

export const commissionRecordsApi = {
  async getAll(): Promise<(CommissionRecord & {
    bookings?: { external_boat_name: string | null; type: string | null } | null;
    cabin_allocations?: { cabin_label: string; cabin_number: number } | null;
  })[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('commission_records')
      .select('*, bookings(external_boat_name, type), cabin_allocations(cabin_label, cabin_number)')
      .order('charter_date_from', { ascending: false });
    if (error) throw error;
    return (data ?? []) as (CommissionRecord & {
      bookings?: { external_boat_name: string | null; type: string | null } | null;
      cabin_allocations?: { cabin_label: string; cabin_number: number } | null;
    })[];
  },

  async getByBookingId(bookingId: string): Promise<CommissionRecord[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('commission_records')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(record: CommissionRecordInsert): Promise<CommissionRecord> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('commission_records')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<CommissionRecordInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('commission_records')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('commission_records')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Sync commission records from bookings via server-side RPC.
   * Single call — all logic runs in PostgreSQL (no N+1 HTTP requests).
   */
  async syncFromBookings(): Promise<{ created: number; updated: number; cleaned: number }> {
    const supabase = createClient();
    const { data, error } = await (supabase as any).rpc('sync_commissions_from_bookings');
    if (error) throw error;
    return (data as { created: number; updated: number; cleaned: number }) ?? { created: 0, updated: 0, cleaned: 0 };
  },

  async markAsApproved(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('commission_records')
      .update({ payment_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async markAsPaid(
    id: string,
    paidDate: string,
    paidBy: string,
    reference: string | null,
    method: string | null
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('commission_records')
      .update({
        payment_status: 'paid',
        paid_date: paidDate,
        paid_by: paidBy,
        payment_reference: reference || null,
        payment_method: method || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },
};
