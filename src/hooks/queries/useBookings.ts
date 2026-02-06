import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/supabase/api/bookings';

export function useBookingsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['bookings', 'month', year, month],
    queryFn: () => bookingsApi.getByMonth(year, month),
    staleTime: 60 * 1000,
  });
}

export function useAllBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getAll(),
    staleTime: 60 * 1000,
  });
}

export function useUpcomingBookings() {
  return useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => bookingsApi.getUpcoming(),
    staleTime: 60 * 1000,
  });
}

export function usePendingCharterExpenses() {
  return useQuery({
    queryKey: ['bookings', 'pendingCharterExpenses'],
    queryFn: () => bookingsApi.getPendingCharterExpenses(),
    staleTime: 60 * 1000,
  });
}
