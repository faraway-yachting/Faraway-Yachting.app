import { createClient } from '../client';

export interface MeetGreeter {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeetGreeterInsert {
  name: string;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

export interface MeetGreeterUpdate {
  name?: string;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

export const meetGreetersApi = {
  async getAll(): Promise<MeetGreeter[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meet_greeters')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<MeetGreeter[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meet_greeters')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<MeetGreeter | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meet_greeters')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(greeter: MeetGreeterInsert): Promise<MeetGreeter> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meet_greeters')
      .insert([greeter])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: MeetGreeterUpdate): Promise<MeetGreeter> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meet_greeters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('meet_greeters')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
