import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/supabase/api/bookings';

export function useBookingsByMonth(year: number, month: number, projectIds?: string[] | null) {
  return useQuery({
    queryKey: ['bookings', 'month', year, month, projectIds ?? 'all'],
    queryFn: () => bookingsApi.getByMonth(year, month, projectIds ?? undefined),
    staleTime: 60 * 1000,
  });
}

export function useAllBookings(projectIds?: string[] | null) {
  return useQuery({
    queryKey: ['bookings', projectIds ?? 'all'],
    queryFn: () => bookingsApi.getAll(projectIds ?? undefined),
    staleTime: 60 * 1000,
  });
}

export function useUpcomingBookings(projectIds?: string[] | null) {
  return useQuery({
    queryKey: ['bookings', 'upcoming', projectIds ?? 'all'],
    queryFn: () => bookingsApi.getUpcoming(projectIds ?? undefined),
    staleTime: 60 * 1000,
  });
}

export function usePendingCharterExpenses(projectIds?: string[] | null) {
  return useQuery({
    queryKey: ['bookings', 'pendingCharterExpenses', projectIds ?? 'all'],
    queryFn: () => bookingsApi.getPendingCharterExpenses(projectIds ?? undefined),
    staleTime: 60 * 1000,
  });
}
