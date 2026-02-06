import { createClient } from '../client';
import { nanoid } from 'nanoid';
import type { Database } from '../database.types';

type PublicCalendarLink = Database['public']['Tables']['public_calendar_links']['Row'];
type PublicCalendarLinkInsert = Database['public']['Tables']['public_calendar_links']['Insert'];

export type { PublicCalendarLink };

export const publicCalendarLinksApi = {
  async getAll(): Promise<PublicCalendarLink[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('public_calendar_links')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: {
    label: string;
    project_ids: string[];
    visible_statuses?: string[];
    expires_at?: string | null;
    created_by?: string;
  }): Promise<PublicCalendarLink> {
    const supabase = createClient();
    const token = nanoid(12);
    const row: PublicCalendarLinkInsert = {
      token,
      label: input.label,
      project_ids: input.project_ids,
      visible_statuses: input.visible_statuses ?? ['booked', 'completed', 'hold'],
      expires_at: input.expires_at ?? null,
      created_by: input.created_by ?? null,
    };
    const { data, error } = await supabase
      .from('public_calendar_links')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    input: {
      label?: string;
      project_ids?: string[];
      visible_statuses?: string[];
      is_active?: boolean;
      expires_at?: string | null;
    }
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('public_calendar_links')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('public_calendar_links')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
