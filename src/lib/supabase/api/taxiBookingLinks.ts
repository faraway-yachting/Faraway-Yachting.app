import { createClient } from '../client';
import { nanoid } from 'nanoid';
import type { TaxiBookingLink } from '@/data/taxi/types';

function dbToFrontend(db: Record<string, any>): TaxiBookingLink {
  return {
    id: db.id,
    token: db.token,
    bookingId: db.booking_id,
    label: db.label,
    isActive: db.is_active,
    expiresAt: db.expires_at ?? undefined,
    createdBy: db.created_by ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const taxiBookingLinksApi = {
  async getByBookingId(bookingId: string): Promise<TaxiBookingLink[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_booking_links' as any)
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async create(input: {
    bookingId: string;
    label: string;
  }): Promise<TaxiBookingLink> {
    const supabase = createClient();
    const token = nanoid(12);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('taxi_booking_links' as any)
      .insert({
        token,
        booking_id: input.bookingId,
        label: input.label,
        created_by: user?.id || null,
      })
      .select()
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('taxi_booking_links' as any)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
