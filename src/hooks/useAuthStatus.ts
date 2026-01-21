'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, clearSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Lightweight auth hook for public pages (like home page)
 * Doesn't load full permissions - just checks if user is logged in
 * Also fetches super admin status for showing admin button
 */
export function useAuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isCancelled = false;

    const checkAuth = async () => {
      try {
        // Get fresh client each time to ensure we don't use stale cached state
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (isCancelled) return;

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setUser(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setIsLoading(false);

          // Fetch super admin status in background
          try {
            const supabaseForProfile = createClient();
            const { data: profile } = await supabaseForProfile
              .from('user_profiles')
              .select('is_super_admin')
              .eq('id', session.user.id)
              .single();

            if (!isCancelled) {
              setIsSuperAdmin(profile?.is_super_admin ?? false);
            }
          } catch (err) {
            console.error('Error fetching super admin status:', err);
          }
        } else {
          setUser(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        if (!isCancelled) {
          setUser(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Get fresh client for subscription
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isCancelled) return;

      console.log('Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setIsLoading(false);

        if (event === 'SIGNED_IN') {
          try {
            const supabaseForProfile = createClient();
            const { data: profile } = await supabaseForProfile
              .from('user_profiles')
              .select('is_super_admin')
              .eq('id', session.user.id)
              .single();

            if (!isCancelled) {
              setIsSuperAdmin(profile?.is_super_admin ?? false);
            }
          } catch (err) {
            console.error('Error fetching super admin status:', err);
          }
        }
      }
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [mounted]);

  const signOut = useCallback(async () => {
    console.log('Sign out called from useAuthStatus');

    try {
      // Clear state first for immediate UI feedback
      setUser(null);
      setIsSuperAdmin(false);

      // Get fresh client for sign out
      const supabase = createClient();

      // Sign out from Supabase with GLOBAL scope (terminates session on server)
      // This invalidates all session tokens, not just the current tab
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Sign out successful');
      }

      // Clear the singleton so next createClient() gets a fresh instance
      // This ensures no stale session data persists
      clearSupabaseClient();
    } catch (error) {
      console.error('Sign out error:', error);
    }

    setIsLoading(false);
  }, []);

  if (!mounted) {
    return { user: null, isSuperAdmin: false, isLoading: true, signOut };
  }

  return { user, isSuperAdmin, isLoading, signOut };
}
