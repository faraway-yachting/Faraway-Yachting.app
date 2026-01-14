"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw, Calendar } from "lucide-react";
import { BalanceSheetSummary } from "./BalanceSheetSummary";
import { BalanceSheetTable } from "./BalanceSheetTable";
import {
  generateBalanceSheet,
  BalanceSheet,
} from "@/lib/reports/balanceSheetCalculation";

// Mock data for companies and projects
const mockCompanies = [
  { id: "company-001", name: "Faraway Yachting Co., Ltd." },
  { id: "company-002", name: "Faraway Marine Services" },
];

const mockProjects = [
  { id: "project-001", name: "Ocean Star" },
  { id: "project-002", name: "Sea Breeze" },
  { id: "project-003", name: "Wind Dancer" },
];

export function BalanceSheetReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<BalanceSheet | null>(null);

  // Filter state
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [showInTHB, setShowInTHB] = useState(true);

  // Load report on filter change
  useEffect(() => {
    loadReport();
  }, [asOfDate, companyId, projectId]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const reportData = await generateBalanceSheet({
        companyId: companyId || undefined,
        projectId: projectId || undefined,
        asOfDate,
        showInTHB,
      });
      setReport(reportData);
    } catch (error) {
      console.error("Error generating balance sheet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;

    // Prepare CSV data
    const rows: string[][] = [];
    rows.push(["Balance Sheet"]);
    rows.push([`As of: ${asOfDate}`]);
    rows.push([""]);

    // Assets
    rows.push(["ASSETS"]);
    for (const subType of report.assets.subTypes) {
      rows.push([subType.name]);
      for (const account of subType.accounts) {
        rows.push([
          account.accountCode,
          account.accountName,
          (showInTHB ? account.balanceTHB : account.balance).toFixed(2),
        ]);
      }
      rows.push([
        "",
        `Total ${subType.name}`,
        (showInTHB ? subType.totalTHB : subType.total).toFixed(2),
      ]);
    }
    rows.push([
      "",
      "TOTAL ASSETS",
      (showInTHB ? report.totalAssetsTHB : report.totalAssets).toFixed(2),
    ]);
    rows.push([""]);

    // Liabilities
    rows.push(["LIABILITIES"]);
    for (const subType of report.liabilities.subTypes) {
      rows.push([subType.name]);
      for (const account of subType.accounts) {
        rows.push([
          account.accountCode,
          account.accountName,
          (showInTHB ? account.balanceTHB : account.balance).toFixed(2),
        ]);
      }
      rows.push([
        "",
        `Total ${subType.name}`,
        (showInTHB ? subType.totalTHB : subType.total).toFixed(2),
      ]);
    }
    rows.push([
      "",
      "TOTAL LIABILITIES",
      (showInTHB ? report.totalLiabilitiesTHB : report.totalLiabilities).toFixed(2),
    ]);
    rows.push([""]);

    // Equity
    rows.push(["EQUITY"]);
    for (const subType of report.equity.subTypes) {
      rows.push([subType.name]);
      for (const account of subType.accounts) {
        rows.push([
          account.accountCode,
          account.accountName,
          (showInTHB ? account.balanceTHB : account.balance).toFixed(2),
        ]);
      }
      rows.push([
        "",
        `Total ${subType.name}`,
        (showInTHB ? subType.totalTHB : subType.total).toFixed(2),
      ]);
    }
    rows.push([
      "",
      "TOTAL EQUITY",
      (showInTHB ? report.totalEquityTHB : report.totalEquity).toFixed(2),
    ]);
    rows.push([""]);

    // Summary
    rows.push([
      "",
      "TOTAL LIABILITIES + EQUITY",
      (showInTHB ? report.totalLiabilitiesAndEquityTHB : report.totalLiabilitiesAndEquity).toFixed(2),
    ]);

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `balance-sheet-${asOfDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Financial position as of {new Date(asOfDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* As of Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">As of:</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Company:</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Companies</option>
              {mockCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Project:</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {mockProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* THB Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm font-medium text-gray-700">
              Show in THB:
            </label>
            <button
              onClick={() => setShowInTHB(!showInTHB)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showInTHB ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showInTHB ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Generating balance sheet...</p>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && report && (
        <>
          {/* Summary Cards */}
          <BalanceSheetSummary
            totalAssets={showInTHB ? report.totalAssetsTHB : report.totalAssets}
            totalLiabilitiesAndEquity={
              showInTHB
                ? report.totalLiabilitiesAndEquityTHB
                : report.totalLiabilitiesAndEquity
            }
            isBalanced={report.isBalanced}
            difference={showInTHB ? report.differenceTHB : report.difference}
            showInTHB={showInTHB}
          />

          {/* Multi-currency warning */}
          {report.hasMultipleCurrencies && !showInTHB && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This report contains transactions in
                multiple currencies ({report.currencies.join(", ")}). Totals
                shown in original currency mode may not be meaningful. Switch to
                THB view for accurate consolidated totals.
              </p>
            </div>
          )}

          {/* Assets Table */}
          <BalanceSheetTable section={report.assets} showInTHB={showInTHB} />

          {/* Liabilities Table */}
          <BalanceSheetTable section={report.liabilities} showInTHB={showInTHB} />

          {/* Equity Table */}
          <BalanceSheetTable section={report.equity} showInTHB={showInTHB} />

          {/* Balance Equation Summary */}
          <div className="bg-gray-900 rounded-lg px-6 py-4 mt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-400">Total Assets</p>
                <p className="text-xl font-bold text-blue-400">
                  {showInTHB
                    ? `฿${report.totalAssetsTHB.toLocaleString()}`
                    : report.totalAssets.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-500">=</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Liabilities + Equity</p>
                <p className="text-xl font-bold text-purple-400">
                  {showInTHB
                    ? `฿${report.totalLiabilitiesAndEquityTHB.toLocaleString()}`
                    : report.totalLiabilitiesAndEquity.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && !report && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            No balance sheet data available. Please select a date.
          </p>
        </div>
      )}
    </div>
  );
}
