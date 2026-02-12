import { createClient } from '../client';
import type { Database } from '../database.types';

type CommissionRecord = Database['public']['Tables']['commission_records']['Row'];
type CommissionRecordInsert = Database['public']['Tables']['commission_records']['Insert'];
type BookingRow = Database['public']['Tables']['bookings']['Row'];

interface Project {
  id: string;
  managementFeePercentage?: number;
  management_fee_percentage?: number;
}

export const commissionRecordsApi = {
  async getAll(): Promise<CommissionRecord[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('commission_records')
      .select('*')
      .order('charter_date_from', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByBookingId(bookingId: string): Promise<CommissionRecord | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('commission_records')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return data;
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
   * Sync commission records from bookings.
   * Creates new records for bookings without one, updates existing ones.
   * Only syncs bookings with status 'booked' or 'completed' that have a projectId.
   */
  async syncFromBookings(projects: Project[]): Promise<{ created: number; updated: number }> {
    const supabase = createClient();

    // 1. Fetch qualifying bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .in('status', ['booked', 'completed'])
      .not('project_id', 'is', null);
    if (bookingsError) throw bookingsError;

    if (!bookings || bookings.length === 0) {
      return { created: 0, updated: 0 };
    }

    // 2. Fetch existing commission records that have a booking_id
    let existingRecords: CommissionRecord[] | null = null;
    try {
      const { data, error: recordsError } = await supabase
        .from('commission_records')
        .select('*')
        .not('booking_id', 'is', null);
      if (recordsError) throw recordsError;
      existingRecords = data;
    } catch {
      // booking_id column doesn't exist — migration not applied, skip sync
      console.warn('[commissionRecords.syncFromBookings] Migration not applied yet, skipping sync');
      return { created: 0, updated: 0 };
    }

    const existingByBookingId = new Map<string, CommissionRecord>();
    for (const rec of existingRecords ?? []) {
      if (rec.booking_id) {
        existingByBookingId.set(rec.booking_id, rec);
      }
    }

    // Build project lookup
    const projectMap = new Map<string, Project>();
    for (const p of projects) {
      projectMap.set(p.id, p);
    }

    let created = 0;
    let updated = 0;

    for (const booking of bookings as BookingRow[]) {
      if (!booking.project_id) continue;

      const project = projectMap.get(booking.project_id);
      const mgmtFeePercent = project?.managementFeePercentage ?? project?.management_fee_percentage ?? 0;

      const charterFee = booking.charter_fee ?? booking.total_price ?? 0;
      const managementFee = Math.round((charterFee * mgmtFeePercent / 100) * 100) / 100;
      const netIncome = charterFee - managementFee;
      const commissionRate = booking.commission_rate ?? 0;
      const totalCommission = Math.round((netIncome * commissionRate / 100) * 100) / 100;

      const existing = existingByBookingId.get(booking.id);

      if (!existing) {
        // Create new commission record
        const newRecord: CommissionRecordInsert = {
          booking_id: booking.id,
          source: 'booking',
          boat_id: booking.project_id,
          charter_date_from: booking.date_from,
          charter_date_to: booking.date_to,
          charter_type: booking.type,
          booking_type: booking.type,
          charter_fee: charterFee,
          management_fee: managementFee,
          net_income: netIncome,
          commission_rate: commissionRate,
          total_commission: totalCommission,
          booking_owner_id: (booking as any).sales_owner_id || booking.booking_owner || null,
          currency: booking.currency || 'THB',
          management_fee_overridden: false,
        };

        const { error: insertError } = await supabase
          .from('commission_records')
          .upsert([newRecord], { onConflict: 'booking_id' });
        if (!insertError) created++;
      } else {
        // Update existing record
        const updates: Partial<CommissionRecordInsert> = {
          boat_id: booking.project_id,
          charter_date_from: booking.date_from,
          charter_date_to: booking.date_to,
          charter_type: booking.type,
          booking_type: booking.type,
          charter_fee: charterFee,
          commission_rate: commissionRate,
          booking_owner_id: (booking as any).sales_owner_id || booking.booking_owner || null,
          currency: booking.currency || 'THB',
        };

        // Only update management fee if not overridden
        if (!existing.management_fee_overridden) {
          updates.management_fee = managementFee;
        } else {
          // Recalculate net_income with the overridden management_fee
          const effectiveMgmtFee = existing.management_fee;
          updates.net_income = charterFee - effectiveMgmtFee;
          updates.total_commission = Math.round(((charterFee - effectiveMgmtFee) * commissionRate / 100) * 100) / 100;
        }

        if (!existing.management_fee_overridden) {
          updates.net_income = netIncome;
          updates.total_commission = totalCommission;
        }

        const { error: updateError } = await supabase
          .from('commission_records')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (!updateError) updated++;
      }
    }

    return { created, updated };
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
