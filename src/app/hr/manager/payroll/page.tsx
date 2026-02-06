'use client';

import { HRAppShell } from '@/components/hr/HRAppShell';
import { ModuleRouteGuard } from '@/components/auth';
import PayrollRunList from '@/components/hr/PayrollRunList';

export default function PayrollPage() {
  return (
    <HRAppShell>
      <ModuleRouteGuard module="hr" requiredPermission="hr.payroll.view" redirectTo="/hr/manager">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="mt-1 text-sm text-gray-500">Manage monthly payroll runs and employee pay slips.</p>
        </div>
        <PayrollRunList />
      </div>
      </ModuleRouteGuard>
    </HRAppShell>
  );
}
