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
        const supabase = createClient();
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();

        if (isCancelled) return;

        if (error || !currentUser) {
          setUser(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
          return;
        }

        setUser(currentUser);
        setIsLoading(false);

        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_super_admin')
            .eq('id', currentUser.id)
            .single();

          if (!isCancelled) {
            setIsSuperAdmin(profile?.is_super_admin ?? false);
          }
        } catch (err) {
          console.error('Error fetching super admin status:', err);
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
    setUser(null);
    setIsSuperAdmin(false);
    setIsLoading(false);

    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
      clearSupabaseClient();
    } catch (error) {
      console.error('Sign out error:', error);
    }

    window.location.href = '/login';
  }, []);

  if (!mounted) {
    return { user: null, isSuperAdmin: false, isLoading: true, signOut };
  }

  return { user, isSuperAdmin, isLoading, signOut };
}
