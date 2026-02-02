'use client';

import { HRAppShell } from '@/components/hr/HRAppShell';
import HRDashboard from '@/components/hr/HRDashboard';

export default function HRManagerPage() {
  return (
    <HRAppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of employees, documents, and alerts.
          </p>
        </div>
        <HRDashboard />
      </div>
    </HRAppShell>
  );
}
