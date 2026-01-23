import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton pattern - reuse the same client instance
let supabaseClient: SupabaseClient<Database> | null = null;

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabaseClient;
}

// Clear the singleton instance (call this on sign-out)
export function clearSupabaseClient() {
  supabaseClient = null;
}
