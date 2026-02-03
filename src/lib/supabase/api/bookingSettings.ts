import { createClient } from '../client';
import type { BoatColor } from '@/data/booking/types';
import type { ExternalYacht, CalendarDisplaySettings } from '@/contexts/BookingSettingsContext';

export interface BookingSettingsRow {
  boatColors: BoatColor[];
  externalBoats: ExternalYacht[];
  bannerImageUrl: string | null;
  calendarDisplay: CalendarDisplaySettings;
}

export const bookingSettingsApi = {
  async get(): Promise<BookingSettingsRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_settings')
      .select('*')
      .eq('id', 'default')
      .single();
    if (error) throw error;
    return {
      boatColors: (data.boat_colors as BoatColor[]) || [],
      externalBoats: (data.external_boats as ExternalYacht[]) || [],
      bannerImageUrl: data.banner_image_url,
      calendarDisplay: (data.calendar_display as CalendarDisplaySettings) || {
        allBookingsFields: ['title', 'customerName'],
        boatTabFields: ['title', 'customerName', 'bookingType'],
      },
    };
  },

  async update(settings: Partial<BookingSettingsRow>): Promise<void> {
    const supabase = createClient();
    const dbData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (settings.boatColors !== undefined) dbData.boat_colors = settings.boatColors;
    if (settings.externalBoats !== undefined) dbData.external_boats = settings.externalBoats;
    if (settings.bannerImageUrl !== undefined) dbData.banner_image_url = settings.bannerImageUrl;
    if (settings.calendarDisplay !== undefined) dbData.calendar_display = settings.calendarDisplay;

    const { error } = await supabase
      .from('booking_settings')
      .update(dbData)
      .eq('id', 'default');
    if (error) throw error;
  },
};
