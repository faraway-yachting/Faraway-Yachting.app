'use client';

import { HRAppShell } from '@/components/hr/HRAppShell';
import { ModuleRouteGuard } from '@/components/auth';
import HRSettings from '@/components/hr/HRSettings';
import LeavePolicySettings from '@/components/hr/LeavePolicySettings';

export default function HRSettingsPage() {
  return (
    <HRAppShell>
      <ModuleRouteGuard module="hr" requiredPermission="hr.settings.manage" redirectTo="/hr/manager">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage dropdown options and policies for HR module.
          </p>
        </div>
        <HRSettings />
        <LeavePolicySettings />
      </div>
      </ModuleRouteGuard>
    </HRAppShell>
  );
}
