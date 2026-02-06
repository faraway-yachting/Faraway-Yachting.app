'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

interface ModuleRouteGuardProps {
  module: 'accounting' | 'bookings' | 'hr' | 'admin';
  requiredPermission?: string;
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Protects individual pages from direct URL access.
 * Checks that the user has the required permission before rendering children.
 * Super admin always passes.
 */
export function ModuleRouteGuard({
  module,
  requiredPermission,
  redirectTo,
  children,
}: ModuleRouteGuardProps) {
  const router = useRouter();
  const { isSuperAdmin, hasPermission, isLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Super admin always has access
    if (isSuperAdmin) {
      setAuthorized(true);
      return;
    }

    // Check required permission
    if (requiredPermission && !hasPermission(requiredPermission)) {
      const target = redirectTo || `/${module}`;
      router.replace(target);
      return;
    }

    setAuthorized(true);
  }, [isLoading, isSuperAdmin, hasPermission, requiredPermission, redirectTo, module, router]);

  if (isLoading || !authorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return <>{children}</>;
}
