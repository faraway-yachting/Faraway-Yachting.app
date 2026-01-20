'use client';

import { ReactNode } from 'react';
import { usePermissions, PermissionCode } from '@/hooks/usePermissions';

interface PermissionGateProps {
  /**
   * Single permission code to check
   */
  permission?: PermissionCode | string;

  /**
   * Multiple permissions - user must have ANY of these
   */
  anyOf?: (PermissionCode | string)[];

  /**
   * Multiple permissions - user must have ALL of these
   */
  allOf?: (PermissionCode | string)[];

  /**
   * Content to render if user has permission
   */
  children: ReactNode;

  /**
   * Optional fallback content if user lacks permission
   */
  fallback?: ReactNode;

  /**
   * If true, also check super admin status (super admins always pass)
   * Default: true
   */
  superAdminBypass?: boolean;
}

/**
 * Component for conditionally rendering content based on user permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission="accounting.expenses.create">
 *   <CreateExpenseButton />
 * </PermissionGate>
 *
 * @example
 * // Any of multiple permissions
 * <PermissionGate anyOf={['accounting.expenses.view', 'accounting.income.view']}>
 *   <TransactionsSection />
 * </PermissionGate>
 *
 * @example
 * // All permissions required
 * <PermissionGate allOf={['accounting.expenses.view', 'accounting.expenses.edit']}>
 *   <EditExpenseForm />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate
 *   permission="accounting.reports.view_management"
 *   fallback={<p>You don't have access to management reports.</p>}
 * >
 *   <ManagementReports />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
  superAdminBypass = true,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();

  // Super admin bypass
  if (superAdminBypass && isSuperAdmin) {
    return <>{children}</>;
  }

  // Check single permission
  if (permission) {
    if (!hasPermission(permission)) {
      return <>{fallback}</>;
    }
  }

  // Check any of multiple permissions
  if (anyOf && anyOf.length > 0) {
    if (!hasAnyPermission(anyOf)) {
      return <>{fallback}</>;
    }
  }

  // Check all permissions
  if (allOf && allOf.length > 0) {
    if (!hasAllPermissions(allOf)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Higher-order component for protecting entire pages/components
 *
 * @example
 * export default withPermission(SettingsPage, 'accounting.settings.manage');
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: PermissionCode | string,
  FallbackComponent?: React.ComponentType
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGate
        permission={permission}
        fallback={FallbackComponent ? <FallbackComponent /> : <AccessDenied />}
      >
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Default access denied component
 */
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 max-w-md">
        You don&apos;t have permission to access this page. Please contact your administrator if you
        believe this is an error.
      </p>
    </div>
  );
}

/**
 * Hook-based permission check for conditional logic in components
 *
 * @example
 * const canEdit = useCanAccess('accounting.expenses.edit');
 * if (canEdit) {
 *   // Show edit button
 * }
 */
export function useCanAccess(permission: PermissionCode | string): boolean {
  const { hasPermission, isSuperAdmin } = usePermissions();
  return isSuperAdmin || hasPermission(permission);
}

/**
 * Component to hide content from users without company access
 */
interface CompanyGateProps {
  companyId: string;
  requiredAccess?: ('admin' | 'manager' | 'member' | 'viewer')[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function CompanyGate({
  companyId,
  requiredAccess,
  children,
  fallback = null,
}: CompanyGateProps) {
  const { hasCompanyAccess, isSuperAdmin } = usePermissions();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!hasCompanyAccess(companyId, requiredAccess)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component to hide content from users without project access
 */
interface ProjectGateProps {
  projectId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProjectGate({ projectId, children, fallback = null }: ProjectGateProps) {
  const { hasProjectAccess, isSuperAdmin } = usePermissions();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!hasProjectAccess(projectId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
