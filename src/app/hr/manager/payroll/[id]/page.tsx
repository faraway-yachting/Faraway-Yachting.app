'use client';

import { useParams } from 'next/navigation';
import { HRAppShell } from '@/components/hr/HRAppShell';
import PayrollRunDetail from '@/components/hr/PayrollRunDetail';

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <HRAppShell>
      <PayrollRunDetail runId={id} />
    </HRAppShell>
  );
}
