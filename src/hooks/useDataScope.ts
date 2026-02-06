import { useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface DataScope {
  /** Project IDs the user can access. null = unrestricted (show all). */
  projectIds: string[] | null;
  /** Company IDs the user can access. null = unrestricted (show all). */
  companyIds: string[] | null;
  isSuperAdmin: boolean;
  /** true if user needs data filtering (restricted role) */
  isRestricted: boolean;
}

const FULL_ACCESS_ROLES = ['manager', 'admin', 'accountant', 'hr_staff'];

/**
 * Central hook for data scoping.
 * Returns project/company IDs to filter queries, or null for unrestricted access.
 * Super admin and full-access roles (manager, admin, accountant) see everything.
 * Restricted roles (investor, viewer, crew, employee, petty-cash, sales) see only assigned data.
 */
export function useDataScope(): DataScope {
  const { isSuperAdmin, moduleRoles, projectAccess, companyAccess } = useAuth();

  return useMemo(() => {
    // Super admin sees everything
    if (isSuperAdmin) {
      return { projectIds: null, companyIds: null, isSuperAdmin: true, isRestricted: false };
    }

    // Check if user has any full-access role across any module
    const hasFullAccess = moduleRoles.some(
      (mr) => FULL_ACCESS_ROLES.includes(mr.role) && mr.is_active
    );

    if (hasFullAccess) {
      return { projectIds: null, companyIds: null, isSuperAdmin: false, isRestricted: false };
    }

    // Restricted user — filter by their assigned access
    const projectIds = projectAccess.map((pa) => pa.project_id);
    const companyIds = companyAccess.map((ca) => ca.company_id);

    return {
      projectIds: projectIds.length > 0 ? projectIds : [],
      companyIds: companyIds.length > 0 ? companyIds : [],
      isSuperAdmin: false,
      isRestricted: true,
    };
  }, [isSuperAdmin, moduleRoles, projectAccess, companyAccess]);
}
