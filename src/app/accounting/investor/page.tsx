"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/accounting/AppShell";
import { KPICard } from "@/components/accounting/KPICard";
import { DataTable } from "@/components/accounting/DataTable";
import {
  DollarSign,
  TrendingUp,
  Loader2,
  Lock,
  Download,
  Ship,
  Percent,
} from "lucide-react";
import { useAuth } from "@/components/auth";
import { projectsApi } from "@/lib/supabase/api/projects";
import {
  generateProjectPL,
  getFiscalYear,
  type ProjectPLReport,
} from "@/lib/reports/projectPLCalculation";
import type { ProjectParticipant } from "@/data/project/types";

const formatMoney = (n: number) =>
  Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " THB";

interface BoatInvestment {
  projectId: string;
  projectName: string;
  ownershipPct: number;
  capitalInvested: number;
  capitalCurrency: string;
  revenue: number;
  expenses: number;
  managementFee: number;
  profit: number;
  investorShare: number;
  roi: number;
  plReport: ProjectPLReport;
}

export default function InvestorDashboard() {
  const { user, projectAccess, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [boats, setBoats] = useState<BoatInvestment[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fiscalYear = getFiscalYear(new Date());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const investorProjects = projectAccess.filter(
        (pa) => pa.access_type === "investor"
      );

      if (investorProjects.length === 0) {
        setBoats([]);
        return;
      }

      const results: BoatInvestment[] = [];

      for (const pa of investorProjects) {
        const [project, plReport] = await Promise.all([
          projectsApi.getById(pa.project_id),
          generateProjectPL(pa.project_id, fiscalYear),
        ]);

        if (!project || !plReport) continue;

        // Find this investor's participant entry
        const participants: ProjectParticipant[] = project.participants
          ? (typeof project.participants === "string"
              ? JSON.parse(project.participants)
              : project.participants)
          : [];

        // Match by email or name
        const me = participants.find(
          (p) =>
            p.email === user?.email ||
            p.name === profile?.full_name
        );

        const ownershipPct = me?.ownershipPercentage || 0;
        const capitalInvested = me?.capitalInvested || 0;
        const capitalCurrency = me?.capitalCurrency || "THB";

        const revenue = plReport.totals.income;
        const expenses = plReport.totals.expense;
        const managementFee = plReport.totals.managementFee;
        const profit = plReport.totals.profit;
        const investorShare = profit * (ownershipPct / 100);
        const roi =
          capitalInvested > 0 ? (investorShare / capitalInvested) * 100 : 0;

        results.push({
          projectId: pa.project_id,
          projectName: plReport.projectName,
          ownershipPct,
          capitalInvested,
          capitalCurrency,
          revenue,
          expenses,
          managementFee,
          profit,
          investorShare,
          roi,
          plReport,
        });
      }

      setBoats(results);
    } catch (error) {
      console.error("Failed to load investor data:", error);
    } finally {
      setLoading(false);
    }
  }, [projectAccess, fiscalYear, user?.email, profile?.full_name]);

  useEffect(() => {
    if (projectAccess.length >= 0) loadData();
  }, [loadData, projectAccess]);

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Investment Report", w / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${profile?.full_name || "Investor"} — Fiscal Year ${fiscalYear}`,
        w / 2,
        y,
        { align: "center" }
      );
      y += 4;
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
        w / 2,
        y,
        { align: "center" }
      );
      y += 12;

      for (const boat of boats) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(boat.projectName, 14, y);
        y += 7;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const rows = [
          ["Ownership", `${boat.ownershipPct}%`],
          ["Capital Invested", `${formatMoney(boat.capitalInvested)}`],
          ["Revenue (FY)", formatMoney(boat.revenue)],
          ["Expenses (FY)", formatMoney(boat.expenses)],
          ["Management Fee", formatMoney(boat.managementFee)],
          ["Net Profit", formatMoney(boat.profit)],
          ["Your Share", formatMoney(boat.investorShare)],
          ["ROI", `${boat.roi.toFixed(1)}%`],
        ];

        for (const [label, val] of rows) {
          doc.text(label, 18, y);
          doc.text(val, w - 18, y, { align: "right" });
          y += 5;
        }

        y += 4;
        doc.setDrawColor(200);
        doc.line(14, y, w - 14, y);
        y += 8;
      }

      // Summary
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      const totalInvested = boats.reduce((s, b) => s + b.capitalInvested, 0);
      const totalShare = boats.reduce((s, b) => s + b.investorShare, 0);
      const overallRoi = totalInvested > 0 ? (totalShare / totalInvested) * 100 : 0;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Total Capital Invested:", 18, y);
      doc.text(formatMoney(totalInvested), w - 18, y, { align: "right" });
      y += 6;
      doc.text("Total Profit Share:", 18, y);
      doc.text(formatMoney(totalShare), w - 18, y, { align: "right" });
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Overall ROI:", 18, y);
      doc.text(`${overallRoi.toFixed(1)}%`, w - 18, y, { align: "right" });

      const url = doc.output("bloburl");
      window.open(url as unknown as string, "_blank");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppShell>
    );
  }

  const totalInvested = boats.reduce((s, b) => s + b.capitalInvested, 0);
  const totalShare = boats.reduce((s, b) => s + b.investorShare, 0);
  const totalRevenue = boats.reduce((s, b) => s + b.revenue, 0);
  const totalProfit = boats.reduce((s, b) => s + b.profit, 0);
  const overallRoi = totalInvested > 0 ? (totalShare / totalInvested) * 100 : 0;

  const boatTableData = boats.map((b) => ({
    boat: b.projectName,
    ownership: `${b.ownershipPct}%`,
    revenue: formatMoney(b.revenue),
    expenses: formatMoney(b.expenses),
    profit: formatMoney(b.profit),
    yourShare: formatMoney(b.investorShare),
    roi: `${b.roi.toFixed(1)}%`,
  }));

  const boatColumns = [
    { key: "boat", header: "Boat", primary: true },
    { key: "ownership", header: "Ownership", align: "right" as const },
    { key: "revenue", header: "Revenue (FY)", align: "right" as const, mobileLabel: "Revenue" },
    { key: "expenses", header: "Expenses (FY)", align: "right" as const, hideOnMobile: true },
    {
      key: "profit",
      header: "Net Profit",
      align: "right" as const,
      render: (row: any) => (
        <span className={`font-semibold ${parseFloat(row.profit) >= 0 ? "text-green-600" : "text-red-600"}`}>
          {row.profit}
        </span>
      ),
    },
    {
      key: "yourShare",
      header: "Your Share",
      align: "right" as const,
      render: (row: any) => (
        <span className="font-bold text-[#5A7A8F]">{row.yourShare}</span>
      ),
    },
    { key: "roi", header: "ROI", align: "right" as const, hideOnMobile: true },
  ];

  // Monthly P&L breakdown (aggregate across all boats)
  const monthlyData: { month: string; revenue: number; expense: number; profit: number }[] = [];
  if (boats.length > 0) {
    const monthMap = new Map<string, { revenue: number; expense: number; profit: number }>();
    for (const boat of boats) {
      for (const m of boat.plReport.months) {
        const existing = monthMap.get(m.monthLabel) || { revenue: 0, expense: 0, profit: 0 };
        existing.revenue += m.income * (boat.ownershipPct / 100);
        existing.expense += (m.expense + m.managementFee) * (boat.ownershipPct / 100);
        existing.profit += m.profit * (boat.ownershipPct / 100);
        monthMap.set(m.monthLabel, existing);
      }
    }
    for (const [month, data] of monthMap) {
      monthlyData.push({ month, ...data });
    }
  }
  const maxMonthlyVal = Math.max(...monthlyData.map((m) => Math.max(m.revenue, m.expense)), 1);

  return (
    <AppShell>
      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Investor Dashboard — FY {fiscalYear}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Viewing financial reports for {boats.length} boat{boats.length !== 1 ? "s" : ""} you&apos;ve invested in.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KPICard
          title="Boats Invested"
          value={boats.length}
          icon={Ship}
          subtitle={`Active investments`}
        />
        <KPICard
          title="Total Revenue"
          value={formatMoney(totalRevenue)}
          icon={DollarSign}
          subtitle={`All boats, FY ${fiscalYear}`}
        />
        <KPICard
          title="Your Profit Share"
          value={formatMoney(totalShare)}
          icon={TrendingUp}
          variant={totalShare >= 0 ? "success" : "danger"}
          subtitle={`Based on ownership %`}
        />
        <KPICard
          title="Overall ROI"
          value={`${overallRoi.toFixed(1)}%`}
          icon={Percent}
          variant={overallRoi >= 0 ? "success" : "danger"}
          subtitle={`On ${formatMoney(totalInvested)} invested`}
        />
      </div>

      {/* Download */}
      <div className="mb-8">
        <button
          onClick={handleDownloadPdf}
          disabled={generatingPdf || boats.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors shadow-sm disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {generatingPdf ? "Generating..." : "Download Investment Report (PDF)"}
        </button>
      </div>

      {/* Boat Performance */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Boats — FY {fiscalYear}
        </h2>
        <DataTable
          columns={boatColumns}
          data={boatTableData}
          emptyMessage="No invested boats found."
        />
      </div>

      {/* Monthly P&L Trend */}
      {monthlyData.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly P&L Trend (Your Share)
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {monthlyData.map((m) => {
                const revWidth = (m.revenue / maxMonthlyVal) * 100;
                const expWidth = (m.expense / maxMonthlyVal) * 100;
                const profWidth = Math.abs(m.profit) / maxMonthlyVal * 100;
                return (
                  <div key={m.month}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 w-16">
                        {m.month}
                      </span>
                      <div className="flex-1 ml-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, revWidth)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-24 text-right">
                              {formatMoney(Math.round(m.revenue))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-red-400 h-2 rounded-full"
                                style={{ width: `${Math.min(100, expWidth)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-24 text-right">
                              {formatMoney(Math.round(m.expense))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${m.profit >= 0 ? "bg-blue-500" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(100, profWidth)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-24 text-right font-semibold">
                              {formatMoney(Math.round(m.profit))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-600">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full" />
                <span className="text-xs text-gray-600">Expenses + Mgmt Fee</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-xs text-gray-600">Profit</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
