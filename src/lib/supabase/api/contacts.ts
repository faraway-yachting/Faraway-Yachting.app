import { createClient } from '../client';
import type { Database } from '../database.types';

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

export const contactsApi = {
  async getAll(): Promise<Contact[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Contact | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(contact: ContactInsert): Promise<Contact> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .insert([contact])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ContactUpdate): Promise<Contact> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
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
      .from('contacts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getCustomers(): Promise<Contact[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .contains('type', ['customer'])
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getVendors(): Promise<Contact[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .contains('type', ['vendor'])
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getAgencies(): Promise<Contact[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .contains('type', ['agency'])
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getBoatOperators(): Promise<Contact[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .contains('type', ['boat_operator'])
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<Contact[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async toggleStatus(id: string): Promise<Contact> {
    const supabase = createClient();
    // First get the current status
    const { data: current, error: fetchError } = await supabase
      .from('contacts')
      .select('is_active')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    // Then toggle it
    const { data, error } = await supabase
      .from('contacts')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
