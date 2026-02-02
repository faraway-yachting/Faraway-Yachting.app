import { createClient } from '../client';
import type { Database } from '../database.types';

type BookingLookup = Database['public']['Tables']['booking_lookups']['Row'];
type BookingLookupInsert = Database['public']['Tables']['booking_lookups']['Insert'];

export type BookingLookupCategory =
  | 'contact_channel'
  | 'agent_platform'
  | 'charter_type'
  | 'booking_status'
  | 'payment_status'
  | 'currency'
  | 'payment_type'
  | 'time_preset'
  | 'destination'
  | 'departure_location'
  | 'arrival_location'
  | 'extras';

export type { BookingLookup };

export const bookingLookupsApi = {
  async getByCategory(category: BookingLookupCategory): Promise<BookingLookup[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_lookups')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getAllByCategory(category: BookingLookupCategory): Promise<BookingLookup[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_lookups')
      .select('*')
      .eq('category', category)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getAllCategories(): Promise<Record<string, BookingLookup[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_lookups')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const grouped: Record<string, BookingLookup[]> = {};
    for (const item of data ?? []) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
    return grouped;
  },

  async create(record: BookingLookupInsert): Promise<BookingLookup> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_lookups')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<BookingLookupInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_lookups')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_lookups')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
