'use client';

import { HRAppShell } from '@/components/hr/HRAppShell';
import EmployeeForm from '@/components/hr/EmployeeForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewEmployeePage() {
  return (
    <HRAppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/hr/manager/employees" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Employee</h1>
            <p className="mt-1 text-sm text-gray-500">Create a new employee record.</p>
          </div>
        </div>
        <EmployeeForm />
      </div>
    </HRAppShell>
  );
}
