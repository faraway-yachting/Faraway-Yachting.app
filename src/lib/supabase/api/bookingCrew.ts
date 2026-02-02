import { createClient } from '../client';
import type { Database } from '../database.types';

type BookingCrewRow = Database['public']['Tables']['booking_crew']['Row'];
type BookingCrewInsert = Database['public']['Tables']['booking_crew']['Insert'];

export const bookingCrewApi = {
  async getByBookingId(bookingId: string): Promise<BookingCrewRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_crew')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(record: BookingCrewInsert): Promise<BookingCrewRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_crew')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setCrewForBooking(bookingId: string, employeeIds: string[]): Promise<void> {
    const supabase = createClient();
    // Delete existing crew
    const { error: deleteError } = await supabase
      .from('booking_crew')
      .delete()
      .eq('booking_id', bookingId);
    if (deleteError) throw deleteError;

    // Insert new crew if any
    if (employeeIds.length > 0) {
      const records = employeeIds.map(employeeId => ({
        booking_id: bookingId,
        employee_id: employeeId,
      }));
      const { error: insertError } = await supabase
        .from('booking_crew')
        .insert(records);
      if (insertError) throw insertError;
    }
  },

  async getByEmployee(employeeId: string): Promise<BookingCrewRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_crew')
      .select('*, booking:bookings(id, booking_number, title, date_from, date_to, status, project_id)')
      .eq('employee_id', employeeId);
    if (error) throw error;
    return data ?? [];
  },

  async getAllWithBookings(): Promise<BookingCrewRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_crew')
      .select('*, booking:bookings(id, booking_number, title, date_from, date_to, status, project_id)')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_crew')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
