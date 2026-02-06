import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/lib/supabase/api/companies';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useActiveCompanies() {
  return useQuery({
    queryKey: ['companies', 'active'],
    queryFn: () => companiesApi.getActive(),
    staleTime: 10 * 60 * 1000,
  });
}
