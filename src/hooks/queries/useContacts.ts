import { useQuery } from '@tanstack/react-query';
import { contactsApi } from '@/lib/supabase/api/contacts';

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgencies() {
  return useQuery({
    queryKey: ['contacts', 'agencies'],
    queryFn: () => contactsApi.getAgencies(),
    staleTime: 5 * 60 * 1000,
  });
}
