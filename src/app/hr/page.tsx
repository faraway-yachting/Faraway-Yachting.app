'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth';
import { Loader2 } from 'lucide-react';

export default function HRPage() {
  const router = useRouter();
  const { getModuleRole, isSuperAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const hrRole = getModuleRole('hr');

    if (isSuperAdmin || hrRole === 'manager' || hrRole === 'admin') {
      router.replace('/hr/manager');
    } else if (hrRole === 'employee') {
      router.replace('/hr/employee');
    } else if (hrRole === 'hr_staff' || hrRole === 'viewer') {
      // hr_staff and viewer use the manager shell with filtered menus
      router.replace('/hr/manager');
    } else {
      router.replace('/unauthorized?module=hr');
    }
  }, [isLoading, getModuleRole, isSuperAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}
