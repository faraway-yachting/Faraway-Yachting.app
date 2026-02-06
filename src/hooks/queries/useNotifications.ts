import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/supabase/api/notifications';

export function useNotificationsQuery(role: string) {
  return useQuery({
    queryKey: ['notifications', role],
    queryFn: () => notificationsApi.getForRole(role),
    staleTime: 30 * 1000,
  });
}
