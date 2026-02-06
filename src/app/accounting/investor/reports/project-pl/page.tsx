"use client";

import { AppShell } from "@/components/accounting/AppShell";
import { ProjectPLReport } from "@/components/reports/ProjectPLReport";
import { useDataScope } from "@/hooks/useDataScope";

export default function InvestorProjectPLPage() {
  const { projectIds } = useDataScope();

  return (
    <AppShell>
      <ProjectPLReport projectId="" accessibleProjectIds={projectIds} />
    </AppShell>
  );
}
