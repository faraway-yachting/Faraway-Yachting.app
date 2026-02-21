import { useQuery } from '@tanstack/react-query';
import { taxiTransfersApi } from '@/lib/supabase/api/taxiTransfers';
import { taxiCompaniesApi } from '@/lib/supabase/api/taxiCompanies';
import { taxiGuestNoteTemplatesApi } from '@/lib/supabase/api/taxiGuestNoteTemplates';

export function useAllTaxiTransfers() {
  return useQuery({
    queryKey: ['taxiTransfers'],
    queryFn: () => taxiTransfersApi.getAll(),
    staleTime: 60 * 1000,
  });
}

export function useTaxiTransfersByBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['taxiTransfers', 'booking', bookingId],
    queryFn: () => taxiTransfersApi.getByBookingId(bookingId!),
    enabled: !!bookingId,
    staleTime: 60 * 1000,
  });
}

export function useTaxiTransfersByWeek(weekString: string) {
  return useQuery({
    queryKey: ['taxiTransfers', 'week', weekString],
    queryFn: () => taxiTransfersApi.getByWeek(weekString),
    enabled: !!weekString,
    staleTime: 60 * 1000,
  });
}

export function useUnpaidTaxiTransfers() {
  return useQuery({
    queryKey: ['taxiTransfers', 'unpaid'],
    queryFn: () => taxiTransfersApi.getUnpaidByFaraway(),
    staleTime: 60 * 1000,
  });
}

export function useTaxiCompanies() {
  return useQuery({
    queryKey: ['taxiCompanies'],
    queryFn: () => taxiCompaniesApi.getActive(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllTaxiCompanies() {
  return useQuery({
    queryKey: ['taxiCompanies', 'all'],
    queryFn: () => taxiCompaniesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTaxiGuestNoteTemplates() {
  return useQuery({
    queryKey: ['taxiGuestNoteTemplates'],
    queryFn: () => taxiGuestNoteTemplatesApi.getActive(),
    staleTime: 5 * 60 * 1000,
  });
}
