import { createClient } from '../client';
import type { Database } from '../database.types';

type HRDocumentType = Database['public']['Tables']['hr_document_types']['Row'];
type HRDocumentTypeInsert = Database['public']['Tables']['hr_document_types']['Insert'];

export const hrDocumentTypesApi = {
  async getAll(): Promise<HRDocumentType[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('hr_document_types')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getActive(): Promise<HRDocumentType[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('hr_document_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(record: HRDocumentTypeInsert): Promise<HRDocumentType> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('hr_document_types')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<HRDocumentTypeInsert>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('hr_document_types')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('hr_document_types')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
