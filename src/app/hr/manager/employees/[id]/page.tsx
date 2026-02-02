'use client';

import { use } from 'react';
import { HRAppShell } from '@/components/hr/HRAppShell';
import EmployeeProfile from '@/components/hr/EmployeeProfile';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <HRAppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/hr/manager/employees" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Employee Detail</h1>
        </div>
        <EmployeeProfile employeeId={id} />
      </div>
    </HRAppShell>
  );
}
