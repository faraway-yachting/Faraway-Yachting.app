import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '@/lib/supabase/api/employees';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActiveEmployees() {
  return useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => employeesApi.getByStatus('active'),
    staleTime: 5 * 60 * 1000,
  });
}
