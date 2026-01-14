/**
 * Bookings API
 *
 * NOTE: The bookings table needs to be created first by running the migration:
 * supabase/migrations/022_bookings.sql
 *
 * After running the migration, regenerate database types:
 * npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/database.types.ts
 *
 * Then uncomment the actual API calls in this file.
 */

import type { Booking, BookingGuest, BookingStatus } from '@/data/booking/types';

// Placeholder API that throws until migration is run
// This allows the app to compile while the database schema is pending

export const bookingsApi = {
  async getAll(): Promise<Booking[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },

  async getById(id: string): Promise<Booking | null> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return null;
  },

  async getByDateRange(from: string, to: string): Promise<Booking[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },

  async getByProject(projectId: string): Promise<Booking[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },

  async getByStatus(status: BookingStatus): Promise<Booking[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },

  async getByOwner(userId: string): Promise<Booking[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },

  async create(booking: Partial<Booking>): Promise<Booking> {
    throw new Error('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
  },

  async update(id: string, updates: Partial<Booking>): Promise<Booking> {
    throw new Error('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
  },

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    throw new Error('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
  },

  async delete(id: string): Promise<void> {
    throw new Error('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
  },

  async getUpcoming(): Promise<Booking[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },

  async getByMonth(year: number, month: number): Promise<Booking[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },

  async checkConflicts(projectId: string, dateFrom: string, dateTo: string, excludeBookingId?: string): Promise<Booking[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },
};

export const bookingGuestsApi = {
  async getByBookingId(bookingId: string): Promise<BookingGuest[]> {
    console.warn('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
    return [];
  },

  async create(guest: Partial<BookingGuest>): Promise<BookingGuest> {
    throw new Error('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
  },

  async update(id: string, updates: Partial<BookingGuest>): Promise<BookingGuest> {
    throw new Error('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
  },

  async delete(id: string): Promise<void> {
    throw new Error('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
  },

  async deleteByBookingId(bookingId: string): Promise<void> {
    throw new Error('Bookings API: Database table not yet created. Run migration 022_bookings.sql');
  },
};

/*
 * ==========================================
 * FULL API IMPLEMENTATION (uncomment after migration)
 * ==========================================
 *
 * After running the migration and regenerating types, replace the placeholder
 * API above with the full implementation below.

import { createClient } from '../client';
import type { Database } from '../database.types';

type DbBooking = Database['public']['Tables']['bookings']['Row'];
type DbBookingInsert = Database['public']['Tables']['bookings']['Insert'];
type DbBookingGuest = Database['public']['Tables']['booking_guests']['Row'];
type DbBookingGuestInsert = Database['public']['Tables']['booking_guests']['Insert'];

// Transform functions
function dbBookingToFrontend(db: DbBooking): Booking { ... }
function frontendBookingToDb(booking: Partial<Booking>): DbBookingInsert { ... }
function dbBookingGuestToFrontend(db: DbBookingGuest): BookingGuest { ... }
function frontendBookingGuestToDb(guest: Partial<BookingGuest>): DbBookingGuestInsert { ... }

export const bookingsApi = {
  async getAll(): Promise<Booking[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('date_from', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },
  // ... rest of implementation
};

*/
