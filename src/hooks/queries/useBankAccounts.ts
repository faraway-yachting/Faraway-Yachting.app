import { useQuery } from '@tanstack/react-query';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => bankAccountsApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useActiveBankAccounts() {
  return useQuery({
    queryKey: ['bankAccounts', 'active'],
    queryFn: () => bankAccountsApi.getActive(),
    staleTime: 10 * 60 * 1000,
  });
}
