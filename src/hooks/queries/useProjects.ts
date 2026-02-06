import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/supabase/api/projects';
import { dbProjectToFrontend } from '@/lib/supabase/transforms';

export function useProjects(projectIds?: string[] | null) {
  return useQuery({
    queryKey: ['projects', projectIds ?? 'all'],
    queryFn: async () => {
      const data = projectIds
        ? await projectsApi.getActiveByIds(projectIds)
        : await projectsApi.getActive();
      return data.map(dbProjectToFrontend);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useYachtProjects(projectIds?: string[] | null) {
  return useQuery({
    queryKey: ['projects', 'yachts', projectIds ?? 'all'],
    queryFn: async () => {
      const data = projectIds
        ? await projectsApi.getActiveByIds(projectIds)
        : await projectsApi.getActive();
      return data.map(dbProjectToFrontend).filter(p => p.type === 'yacht');
    },
    staleTime: 5 * 60 * 1000,
  });
}
