"use client";

import { useState } from "react";
import { AppShell } from "@/components/accounting/AppShell";
import { PLReport } from "@/components/reports/PLReport";
import { ProjectPLReport } from "@/components/reports/ProjectPLReport";
import { BalanceSheetReport } from "@/components/reports/BalanceSheetReport";
import { BarChart3, FileText, TrendingUp, Building2, Ship } from "lucide-react";

type ReportTab = "pl" | "balance-sheet" | "project-pl" | "other";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("pl");

  const tabs = [
    { id: "pl" as ReportTab, label: "P&L Report", icon: TrendingUp },
    { id: "balance-sheet" as ReportTab, label: "Balance Sheet", icon: Building2 },
    { id: "project-pl" as ReportTab, label: "Project P&L", icon: Ship },
    { id: "other" as ReportTab, label: "Other Reports", icon: FileText },
  ];

  return (
    <AppShell currentRole="manager">
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4" aria-label="Report tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "pl" && <PLReport />}

      {activeTab === "balance-sheet" && <BalanceSheetReport />}

      {activeTab === "project-pl" && <ProjectPLReport projectId="" />}

      {activeTab === "other" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Other Reports</h2>
            <p className="text-sm text-gray-500 mt-1">
              Additional financial reports and statements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash Flow Statement */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Cash Flow Statement
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Track cash inflows and outflows
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Period: Monthly, Quarterly
                    </span>
                    <button
                      disabled
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Summary Report */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <FileText className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Tax Summary Report
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    VAT, WHT, and other tax obligations
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Period: Monthly, Quarterly, Yearly
                    </span>
                    <button
                      disabled
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Analysis */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Expense Analysis
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Detailed breakdown of expenses by category
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Period: Monthly, Quarterly
                    </span>
                    <button
                      disabled
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Report Builder */}
          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Custom Report Builder
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Need a specific report? Use our custom report builder to create
              reports tailored to your needs.
            </p>
            <button
              disabled
              className="inline-flex items-center gap-2 rounded-lg bg-blue-300 px-4 py-2 text-sm font-medium text-white cursor-not-allowed"
            >
              <FileText className="h-4 w-4" />
              Coming Soon
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
