import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import { cabinAllocationsApi } from '@/lib/supabase/api/cabinAllocations';

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

export function useAgencyPayments() {
  return useQuery({
    queryKey: ['bookings', 'agencyPayments'],
    queryFn: () => bookingsApi.getAgencyPayments(),
    staleTime: 60 * 1000,
  });
}

export function useAgencyCabinPayments() {
  return useQuery({
    queryKey: ['cabinAllocations', 'agencyPayments'],
    queryFn: () => cabinAllocationsApi.getAgencyPayments(),
    staleTime: 60 * 1000,
  });
}
