'use client';

import { HRAppShell } from '@/components/hr/HRAppShell';
import EmployeeList from '@/components/hr/EmployeeList';

export default function EmployeesPage() {
  return (
    <HRAppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your team members, their details, and documents.
          </p>
        </div>
        <EmployeeList />
      </div>
    </HRAppShell>
  );
}
