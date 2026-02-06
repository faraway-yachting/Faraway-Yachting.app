'use client';

import { useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { BookingsAppShell, BookingsRole } from '@/components/bookings/BookingsAppShell';
import { BookingSettingsProvider } from '@/contexts/BookingSettingsContext';
import { useAuth } from '@/components/auth';

interface BookingsRoleLayoutProps {
  children: React.ReactNode;
}

const validRoles: BookingsRole[] = ['admin', 'manager', 'agent', 'crew', 'investor', 'viewer'];

// Inner component that has access to auth context
function BookingsLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { getModuleRole, isSuperAdmin, isLoading, profile } = useAuth();

  const urlRole = params.role as string;

  // Get user's actual role from database
  // If still loading or profile not loaded, default to manager (fail open)
  const userBookingsRole = getModuleRole('bookings');
  const effectiveRole = (isLoading || !profile) 
    ? 'manager' 
    : (isSuperAdmin ? 'manager' : (userBookingsRole as BookingsRole) || 'viewer');

  // Redirect to correct role URL if mismatch
  useEffect(() => {
    if (isLoading) return;

    // If URL role doesn't match user's actual role, redirect
    if (urlRole !== effectiveRole) {
      const newPath = pathname.replace(`/bookings/${urlRole}`, `/bookings/${effectiveRole}`);
      router.replace(newPath);
    }
  }, [urlRole, effectiveRole, pathname, router, isLoading]);

  // Validate role for display purposes
  const currentRole = validRoles.includes(urlRole as BookingsRole)
    ? (urlRole as BookingsRole)
    : 'manager';

  return (
    <BookingSettingsProvider>
      <BookingsAppShell currentRole={currentRole}>
        {children}
      </BookingsAppShell>
    </BookingSettingsProvider>
  );
}

export default function BookingsRoleLayout({
  children,
}: BookingsRoleLayoutProps) {
  return (
    <BookingsLayoutInner>
      {children}
    </BookingsLayoutInner>
  );
}
