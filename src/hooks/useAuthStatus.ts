'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const supabase = supabaseRef.current;
    let isCancelled = false;

    const checkAuth = async () => {
      try {
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
            const { data: profile } = await supabase
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
            const { data: profile } = await supabase
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
    console.log('Sign out called');
    const supabase = supabaseRef.current;

    try {
      // Clear state first for immediate UI feedback
      setUser(null);
      setIsSuperAdmin(false);

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Sign out successful');
      }
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
