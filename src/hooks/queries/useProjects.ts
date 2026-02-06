import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/supabase/api/projects';
import { dbProjectToFrontend } from '@/lib/supabase/transforms';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const data = await projectsApi.getActive();
      return data.map(dbProjectToFrontend);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useYachtProjects() {
  return useQuery({
    queryKey: ['projects', 'yachts'],
    queryFn: async () => {
      const data = await projectsApi.getActive();
      return data.map(dbProjectToFrontend).filter(p => p.type === 'yacht');
    },
    staleTime: 5 * 60 * 1000,
  });
}
