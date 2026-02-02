'use client';

import { HRAppShell } from '@/components/hr/HRAppShell';
import LeaveRequestForm from '@/components/hr/LeaveRequestForm';

export default function NewLeaveRequestPage() {
  return (
    <HRAppShell>
      <LeaveRequestForm />
    </HRAppShell>
  );
}
