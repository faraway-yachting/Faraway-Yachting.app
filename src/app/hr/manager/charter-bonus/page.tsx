'use client';

import { HRAppShell } from '@/components/hr/HRAppShell';
import { ModuleRouteGuard } from '@/components/auth';
import CharterBonusSummary from '@/components/hr/CharterBonusSummary';

export default function CharterBonusPage() {
  return (
    <HRAppShell>
      <ModuleRouteGuard module="hr" requiredPermission="hr.charter_bonus.view" redirectTo="/hr/manager">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Charter Bonus</h1>
          <p className="mt-1 text-sm text-gray-500">Calculate and review crew charter bonuses by month.</p>
        </div>
        <CharterBonusSummary />
      </div>
      </ModuleRouteGuard>
    </HRAppShell>
  );
}
