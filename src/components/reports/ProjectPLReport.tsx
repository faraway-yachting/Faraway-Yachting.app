"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, Info } from "lucide-react";
import { ProjectPLDrillDown } from "./ProjectPLDrillDown";
import {
  generateProjectPL,
  getRecentFiscalYears,
  formatTHBAmount,
  ProjectPLReport as ProjectPLReportData,
} from "@/lib/reports/projectPLCalculation";

interface ProjectPLReportProps {
  projectId: string;
  projectName?: string;
}

// Projects for selection - matches projectId in income line items
const mockProjects = [
  { id: "project-ocean-star", name: "Ocean Star" },
  { id: "project-wave-rider", name: "Wave Rider" },
  { id: "project-sea-breeze", name: "Sea Breeze" },
];

export function ProjectPLReport({ projectId: initialProjectId, projectName }: ProjectPLReportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ProjectPLReportData | null>(null);
  const [reports, setReports] = useState<ProjectPLReportData[]>([]); // For "All Projects"
  // Default to "all" if no initialProjectId provided (empty string or undefined)
  const [projectId, setProjectId] = useState(initialProjectId && initialProjectId.length > 0 ? initialProjectId : "all");
  const [fiscalYear, setFiscalYear] = useState(getRecentFiscalYears(1)[0]);

  // Drill-down modal state
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownMonth, setDrillDownMonth] = useState("");
  const [drillDownType, setDrillDownType] = useState<"income" | "expense">("income");
  const [drillDownProjectId, setDrillDownProjectId] = useState("");
  const [drillDownProjectName, setDrillDownProjectName] = useState("");

  const fiscalYears = getRecentFiscalYears(5);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      if (projectId === "all") {
        // Load all projects in parallel
        const allReports = await Promise.all(
          mockProjects.map(p => generateProjectPL(p.id, fiscalYear))
        );
        // Filter out any null reports
        setReports(allReports.filter((r): r is ProjectPLReportData => r !== null));
        setReport(null);
      } else {
        // Load single project
        const reportData = await generateProjectPL(projectId, fiscalYear);
        setReport(reportData);
        setReports([]);
      }
    } catch (error) {
      console.error("Error generating project P&L:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, fiscalYear]);

  useEffect(() => {
    if (projectId) {
      loadReport();
    }
  }, [projectId, fiscalYear, loadReport]);

  const handleCellClick = (month: string, type: "income" | "expense", clickedProjectId?: string, clickedProjectName?: string) => {
    setDrillDownMonth(month);
    setDrillDownType(type);
    // For "all" mode, use the clicked project's info
    if (clickedProjectId && clickedProjectName) {
      setDrillDownProjectId(clickedProjectId);
      setDrillDownProjectName(clickedProjectName);
    } else {
      setDrillDownProjectId(projectId);
      setDrillDownProjectName(selectedProject?.name || "");
    }
    setDrillDownOpen(true);
  };

  const handleExport = () => {
    // Generate CSV content
    const generateCSV = (reportData: ProjectPLReportData): string => {
      const rows: string[] = [];

      // Header row
      rows.push(`Project P&L: ${reportData.projectName}`);
      rows.push(`Fiscal Year: ${reportData.fiscalYearLabel}`);
      rows.push(`Management Fee: ${reportData.managementFeePercent}%`);
      rows.push(`Generated: ${new Date().toLocaleString()}`);
      rows.push('');

      // Column headers
      rows.push('Period,Income (THB),Expense (THB),Management Fee (THB),Profit (THB)');

      // Data rows
      for (const month of reportData.months) {
        rows.push(`${month.monthLabel},${month.income},${month.expense},${month.managementFee},${month.profit}`);
      }

      // Total row
      rows.push(`TOTAL,${reportData.totals.income},${reportData.totals.expense},${reportData.totals.managementFee},${reportData.totals.profit}`);

      return rows.join('\n');
    };

    let csvContent = '';
    let filename = '';

    if (projectId === "all" && reports.length > 0) {
      // Export all projects
      const allCSV = reports.map(r => generateCSV(r)).join('\n\n---\n\n');
      csvContent = allCSV;
      filename = `project-pl-all-${fiscalYear}.csv`;
    } else if (report) {
      // Export single project
      csvContent = generateCSV(report);
      filename = `project-pl-${report.projectName.toLowerCase().replace(/\s+/g, '-')}-${fiscalYear}.csv`;
    } else {
      return;
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const selectedProject = mockProjects.find((p) => p.id === projectId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Project P&L: {projectId === "all" ? "All Projects" : (selectedProject?.name || projectName || "Select Project")}
          </h1>
          {(report || reports.length > 0) && (
            <p className="text-sm text-gray-500 mt-1">
              {report?.fiscalYearLabel || reports[0]?.fiscalYearLabel} | Management Fee: {report?.managementFeePercent || reports[0]?.managementFeePercent}%
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReport}
            disabled={isLoading || !projectId}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={!report && reports.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {mockProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fiscal Year Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fiscal Year
            </label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {fiscalYears.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy} (Nov {fy.split("-")[0]} - Oct {fy.split("-")[1]})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About this report</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Fiscal year runs from November 1 to October 31</li>
              <li>All amounts are shown in THB (Thai Baht)</li>
              <li>Management Fee is calculated as {report?.managementFeePercent || reports[0]?.managementFeePercent || "XX"}% of Income</li>
              <li>Click on any Income or Expense cell to see transaction details</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Generating report...</p>
          </div>
        </div>
      )}

      {/* Report Tables - Multiple tables for "All Projects" */}
      {!isLoading && projectId === "all" && reports.length > 0 && (
        <div className="space-y-8">
          {reports.map((projectReport) => (
            <div key={projectReport.projectId}>
              {/* Project Heading */}
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {projectReport.projectName}
              </h3>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">
                          Period
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-green-700 min-w-[120px]">
                          Income
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-red-700 min-w-[120px]">
                          Expense
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-amber-700 min-w-[140px]">
                          Mgt Fee ({projectReport.managementFeePercent}%)
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-bold text-gray-900 bg-gray-100 min-w-[120px]">
                          PROFIT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Month Rows */}
                      {projectReport.months.map((month) => (
                        <tr key={month.month} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-700">
                            {month.monthLabel}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-right text-gray-900 cursor-pointer hover:bg-green-50 transition-colors"
                            onClick={() => handleCellClick(month.month, "income", projectReport.projectId, projectReport.projectName)}
                          >
                            {month.income > 0 ? formatTHBAmount(month.income) : "-"}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-right text-gray-900 cursor-pointer hover:bg-red-50 transition-colors"
                            onClick={() => handleCellClick(month.month, "expense", projectReport.projectId, projectReport.projectName)}
                          >
                            {month.expense > 0 ? formatTHBAmount(month.expense) : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-amber-700">
                            {month.managementFee > 0 ? formatTHBAmount(month.managementFee) : "-"}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-right font-medium ${
                              month.profit >= 0 ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {month.profit !== 0 ? formatTHBAmount(month.profit) : "-"}
                          </td>
                        </tr>
                      ))}

                      {/* Total Row */}
                      <tr className="bg-gray-900">
                        <td className="px-4 py-4 text-sm font-bold text-white">
                          TOTAL
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-bold text-green-400">
                          {formatTHBAmount(projectReport.totals.income)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-bold text-red-400">
                          {formatTHBAmount(projectReport.totals.expense)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-bold text-amber-400">
                          {formatTHBAmount(projectReport.totals.managementFee)}
                        </td>
                        <td
                          className={`px-4 py-4 text-sm text-right font-bold ${
                            projectReport.totals.profit >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {formatTHBAmount(projectReport.totals.profit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {/* Table Footer */}
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500">
              All amounts in THB (฿). Click on Income or Expense cells to view detailed transactions.
            </p>
          </div>
        </div>
      )}

      {/* Report Table - Single project view */}
      {!isLoading && projectId !== "all" && report && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-[100px]">
                    Period
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-green-700 min-w-[120px]">
                    Income
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-red-700 min-w-[120px]">
                    Expense
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-amber-700 min-w-[140px]">
                    Mgt Fee ({report.managementFeePercent}%)
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-bold text-gray-900 bg-gray-100 min-w-[120px]">
                    PROFIT
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Month Rows */}
                {report.months.map((month) => (
                  <tr key={month.month} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">
                      {month.monthLabel}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right text-gray-900 cursor-pointer hover:bg-green-50 transition-colors"
                      onClick={() => handleCellClick(month.month, "income")}
                    >
                      {month.income > 0 ? formatTHBAmount(month.income) : "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right text-gray-900 cursor-pointer hover:bg-red-50 transition-colors"
                      onClick={() => handleCellClick(month.month, "expense")}
                    >
                      {month.expense > 0 ? formatTHBAmount(month.expense) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-amber-700">
                      {month.managementFee > 0 ? formatTHBAmount(month.managementFee) : "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium ${
                        month.profit >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {month.profit !== 0 ? formatTHBAmount(month.profit) : "-"}
                    </td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="bg-gray-900">
                  <td className="px-4 py-4 text-sm font-bold text-white">
                    TOTAL
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-bold text-green-400">
                    {formatTHBAmount(report.totals.income)}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-bold text-red-400">
                    {formatTHBAmount(report.totals.expense)}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-bold text-amber-400">
                    {formatTHBAmount(report.totals.managementFee)}
                  </td>
                  <td
                    className={`px-4 py-4 text-sm text-right font-bold ${
                      report.totals.profit >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatTHBAmount(report.totals.profit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              All amounts in THB (฿). Click on Income or Expense cells to view detailed transactions.
            </p>
          </div>
        </div>
      )}

      {/* Empty State - Single Project */}
      {!isLoading && projectId !== "all" && !report && projectId && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            No data available for this project and fiscal year.
          </p>
        </div>
      )}

      {/* Empty State - All Projects */}
      {!isLoading && projectId === "all" && reports.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            No data available for any projects in this fiscal year.
          </p>
        </div>
      )}

      {/* Drill-down Modal */}
      <ProjectPLDrillDown
        isOpen={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        projectId={drillDownProjectId || projectId}
        projectName={drillDownProjectName || selectedProject?.name || ""}
        month={drillDownMonth}
        type={drillDownType}
      />
    </div>
  );
}
