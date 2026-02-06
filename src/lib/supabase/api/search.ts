import { createClient } from '../client';

/**
 * Full-text search API using PostgreSQL tsvector search.
 * Requires migration 097_full_text_search.sql to be run first.
 * Falls back gracefully if the search_records function doesn't exist yet.
 */
export const searchApi = {
  /**
   * Search bookings by title, customer name, booking number, notes, etc.
   * Uses ranked full-text search with prefix matching.
   */
  async searchBookings(query: string, limit = 50): Promise<any[]> {
    if (!query.trim()) return [];
    const supabase = createClient();
    const { data, error } = await supabase.rpc('search_records', {
      p_table: 'bookings',
      p_query: query,
      p_limit: limit,
    });
    if (error) {
      console.warn('Bookings search error (falling back to client-side):', error.message);
      return [];
    }
    return data ?? [];
  },

  /**
   * Search contacts by name, email, phone, company, tax ID, etc.
   */
  async searchContacts(query: string, limit = 50): Promise<any[]> {
    if (!query.trim()) return [];
    const supabase = createClient();
    const { data, error } = await supabase.rpc('search_records', {
      p_table: 'contacts',
      p_query: query,
      p_limit: limit,
    });
    if (error) {
      console.warn('Contacts search error (falling back to client-side):', error.message);
      return [];
    }
    return data ?? [];
  },

  /**
   * Search expenses by number, vendor, description, reference, notes.
   */
  async searchExpenses(query: string, limit = 50): Promise<any[]> {
    if (!query.trim()) return [];
    const supabase = createClient();
    const { data, error } = await supabase.rpc('search_records', {
      p_table: 'expenses',
      p_query: query,
      p_limit: limit,
    });
    if (error) {
      console.warn('Expenses search error (falling back to client-side):', error.message);
      return [];
    }
    return data ?? [];
  },
};
