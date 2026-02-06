'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth';
import { Loader2 } from 'lucide-react';

/**
 * Bookings module entry point
 *
 * Redirects users to the calendar view using their actual role from the database.
 * The [role] URL segment is used by the layout for validation.
 */
export default function BookingsPage() {
  const router = useRouter();
  const { getModuleRole, isSuperAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const bookingsRole = getModuleRole('bookings');

    if (isSuperAdmin) {
      router.replace('/bookings/admin/calendar');
    } else if (bookingsRole) {
      router.replace(`/bookings/${bookingsRole}/calendar`);
    } else {
      router.replace('/unauthorized?module=bookings');
    }
  }, [isLoading, getModuleRole, isSuperAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}
