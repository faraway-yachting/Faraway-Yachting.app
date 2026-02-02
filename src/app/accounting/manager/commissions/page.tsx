'use client';

import { AppShell } from '@/components/accounting/AppShell';
import CommissionTable from '@/components/commissions/CommissionTable';

export default function CommissionsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Commissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and calculate commissions for the sales team based on net income.
          </p>
        </div>
        <CommissionTable />
      </div>
    </AppShell>
  );
}
