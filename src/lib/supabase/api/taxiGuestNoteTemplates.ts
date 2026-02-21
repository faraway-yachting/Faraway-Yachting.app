import { createClient } from '../client';
import type { TaxiGuestNoteTemplate } from '@/data/taxi/types';

function dbToFrontend(db: Record<string, any>): TaxiGuestNoteTemplate {
  return {
    id: db.id,
    name: db.name,
    contentEn: db.content_en ?? undefined,
    contentTh: db.content_th ?? undefined,
    isActive: db.is_active,
    sortOrder: db.sort_order,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const taxiGuestNoteTemplatesApi = {
  async getAll(): Promise<TaxiGuestNoteTemplate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_guest_note_templates')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getActive(): Promise<TaxiGuestNoteTemplate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_guest_note_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async create(template: {
    name: string;
    contentEn?: string;
    contentTh?: string;
    sortOrder?: number;
  }): Promise<TaxiGuestNoteTemplate> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_guest_note_templates')
      .insert([{
        name: template.name,
        content_en: template.contentEn || null,
        content_th: template.contentTh || null,
        sort_order: template.sortOrder ?? 0,
      }])
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async update(id: string, updates: Partial<{
    name: string;
    contentEn: string;
    contentTh: string;
    isActive: boolean;
    sortOrder: number;
  }>): Promise<TaxiGuestNoteTemplate> {
    const supabase = createClient();
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.contentEn !== undefined) dbUpdates.content_en = updates.contentEn || null;
    if (updates.contentTh !== undefined) dbUpdates.content_th = updates.contentTh || null;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

    const { data, error } = await supabase
      .from('taxi_guest_note_templates')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('taxi_guest_note_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
