'use client';

import { HRAppShell } from '@/components/hr/HRAppShell';
import HRSettings from '@/components/hr/HRSettings';
import LeavePolicySettings from '@/components/hr/LeavePolicySettings';

export default function HRSettingsPage() {
  return (
    <HRAppShell>
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
    </HRAppShell>
  );
}
