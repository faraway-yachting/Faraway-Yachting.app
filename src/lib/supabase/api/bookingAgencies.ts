import { createClient } from '../client';
import type { Database } from '../database.types';

type DbAgency = Database['public']['Tables']['booking_agencies']['Row'];
type DbAgencyInsert = Database['public']['Tables']['booking_agencies']['Insert'];
type DbAgencyUpdate = Database['public']['Tables']['booking_agencies']['Update'];

export interface AgencyWithContact extends DbAgency {
  contact: {
    id: string;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export const bookingAgenciesApi = {
  async getAll(): Promise<AgencyWithContact[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_agencies')
      .select('*, contact:contacts(id, name, contact_person, email, phone)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AgencyWithContact[];
  },

  async getActive(): Promise<AgencyWithContact[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_agencies')
      .select('*, contact:contacts(id, name, contact_person, email, phone)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AgencyWithContact[];
  },

  async getById(id: string): Promise<AgencyWithContact | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_agencies')
      .select('*, contact:contacts(id, name, contact_person, email, phone)')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as AgencyWithContact;
  },

  async create(agency: DbAgencyInsert): Promise<DbAgency> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_agencies')
      .insert([agency])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: DbAgencyUpdate): Promise<DbAgency> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_agencies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_agencies')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
