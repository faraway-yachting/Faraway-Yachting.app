"use client";

import { AppShell } from "@/components/accounting/AppShell";
import { ProjectPLReport } from "@/components/reports/ProjectPLReport";

export default function InvestorProjectPLPage() {
  return (
    <AppShell currentRole="investor">
      <ProjectPLReport projectId="" />
    </AppShell>
  );
}
