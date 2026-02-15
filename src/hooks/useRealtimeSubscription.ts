'use client';

import { useEffect, useRef, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  queryKeys: string[][];
}

/**
 * Subscribe to Supabase Realtime postgres_changes events.
 * Automatically invalidates the specified React Query cache keys
 * when matching database changes occur.
 */
export function useRealtimeSubscription(configs: RealtimeConfig[]) {
  const queryClient = useQueryClient();
  // Stable unique ID per hook instance — avoids channel name collisions
  // between multiple hook usages while preventing leaks from re-renders
  const rawId = useId();
  const channelId = rawId.replace(/:/g, '');
  const configsRef = useRef(configs);
  configsRef.current = configs;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('app-realtime-' + channelId);

    configsRef.current.forEach(({ table, event = '*', filter, queryKeys }) => {
      const params: any = { event, schema: 'public', table };
      if (filter) params.filter = filter;

      channel.on('postgres_changes', params, () => {
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, channelId]);
}
