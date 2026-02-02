"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import { PLReportFilters } from "./PLReportFilters";
import { PLReportSummary } from "./PLReportSummary";
import { PLReportTable } from "./PLReportTable";
import { generatePLReport, PLReport as PLReportData } from "@/lib/reports/plCalculation";
import { companiesApi } from "@/lib/supabase/api/companies";
import { projectsApi } from "@/lib/supabase/api/projects";
import type { Database } from "@/lib/supabase/database.types";

type Company = Database['public']['Tables']['companies']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

export function PLReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<PLReportData | null>(null);

  // Filter data from Supabase
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Filter state
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [showInTHB, setShowInTHB] = useState(true);

  // Load companies and projects on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        const [companiesData, projectsData] = await Promise.all([
          companiesApi.getAll(),
          projectsApi.getAll(),
        ]);
        setCompanies(companiesData);
        setProjects(projectsData);
      } catch (error) {
        console.error("Error loading filter data:", error);
      } finally {
        setIsLoadingFilters(false);
      }
    }
    loadFilters();
  }, []);

  // Load report on filter change
  useEffect(() => {
    if (!isLoadingFilters) {
      loadReport();
    }
  }, [dateFrom, dateTo, companyId, projectId, isLoadingFilters]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const reportData = await generatePLReport({
        companyId: companyId || undefined,
        projectId: projectId || undefined,
        dateFrom,
        dateTo,
        showInTHB,
      });
      setReport(reportData);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    console.log("Export report");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Profit & Loss Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {showInTHB
              ? "All amounts converted to THB using transaction-time exchange rates"
              : "Amounts shown in original transaction currencies"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <PLReportFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        companyId={companyId}
        projectId={projectId}
        showInTHB={showInTHB}
        companies={companies}
        projects={projects}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onCompanyChange={setCompanyId}
        onProjectChange={setProjectId}
        onShowInTHBChange={setShowInTHB}
        isLoadingFilters={isLoadingFilters}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Generating report...</p>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && report && (
        <>
          {/* Summary Cards */}
          <PLReportSummary
            totalIncome={showInTHB ? report.income.totalTHB : report.income.totalOriginal}
            totalExpenses={showInTHB ? report.expenses.totalTHB : report.expenses.totalOriginal}
            netProfit={showInTHB ? report.netProfitTHB : report.netProfitOriginal}
            showInTHB={showInTHB}
          />

          {/* Multi-currency warning */}
          {report.hasMultipleCurrencies && !showInTHB && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This report contains transactions in multiple currencies (
                {report.currencies.join(", ")}). Totals shown in original currency mode may not be
                meaningful. Switch to THB view for accurate consolidated totals.
              </p>
            </div>
          )}

          {/* Income Table */}
          <PLReportTable
            title="Income"
            categories={report.income.categories}
            showInTHB={showInTHB}
            type="income"
          />

          {/* Expenses Table */}
          <PLReportTable
            title="Expenses"
            categories={report.expenses.categories}
            showInTHB={showInTHB}
            type="expense"
          />

          {/* Net Profit Summary */}
          <div className="bg-gray-900 rounded-lg px-6 py-4 mt-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">Net Profit</span>
              <span
                className={`text-2xl font-bold ${
                  (showInTHB ? report.netProfitTHB : report.netProfitOriginal) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {showInTHB
                  ? `฿${report.netProfitTHB.toLocaleString()}`
                  : `${report.netProfitOriginal.toLocaleString()}`}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && !report && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No report data available. Please select a date range.</p>
        </div>
      )}
    </div>
  );
}
