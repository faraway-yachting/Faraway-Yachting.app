import { createClient } from '../client';
import type { Database } from '../database.types';

type DbExternalBoat = Database['public']['Tables']['external_boats']['Row'];
type DbExternalBoatInsert = Database['public']['Tables']['external_boats']['Insert'];
type DbExternalBoatUpdate = Database['public']['Tables']['external_boats']['Update'];

export type { DbExternalBoat };

export const externalBoatsApi = {
  async getAll(): Promise<DbExternalBoat[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('external_boats')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<DbExternalBoat[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('external_boats')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<DbExternalBoat | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('external_boats')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(boat: DbExternalBoatInsert): Promise<DbExternalBoat> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('external_boats')
      .insert([boat])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: DbExternalBoatUpdate): Promise<DbExternalBoat> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('external_boats')
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
      .from('external_boats')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
