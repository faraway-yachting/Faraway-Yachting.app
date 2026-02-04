'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, clearSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const supabase = createClient();

    const fetchSuperAdmin = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('is_super_admin')
          .eq('id', userId)
          .single();
        if (!isCancelled) {
          setIsSuperAdmin(data?.is_super_admin ?? false);
        }
      } catch {}
    };

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (isCancelled) return;
      setUser(currentUser);
      setIsLoading(false);
      if (currentUser) fetchSuperAdmin(currentUser.id);
    }).catch(() => {
      if (!isCancelled) {
        setUser(null);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isCancelled) return;

      // Skip refetch on token refresh - user data hasn't changed
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (event === 'SIGNED_OUT') {
        setIsSuperAdmin(false);
        return;
      }

      // Only fetch super admin on SIGNED_IN or INITIAL_SESSION
      if (currentUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        fetchSuperAdmin(currentUser.id);
      } else if (!currentUser) {
        setIsSuperAdmin(false);
      }
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setIsSuperAdmin(false);
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'global' });
    clearSupabaseClient();
    window.location.href = '/login';
  }, []);

  return { user, isSuperAdmin, isLoading, signOut };
}
