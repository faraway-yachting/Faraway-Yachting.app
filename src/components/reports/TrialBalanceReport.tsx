"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import {
  generateTrialBalance,
  TrialBalance,
} from "@/lib/reports/trialBalanceCalculation";
import { companiesApi } from "@/lib/supabase/api/companies";
import type { Database } from "@/lib/supabase/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TrialBalanceReport() {
  const [companyId, setCompanyId] = useState("");
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<TrialBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Load companies on mount
  useEffect(() => {
    async function loadCompanies() {
      try {
        const data = await companiesApi.getAll();
        setCompanies(data);
      } catch (err) {
        console.error("Error loading companies:", err);
      } finally {
        setIsLoadingFilters(false);
      }
    }
    loadCompanies();
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateTrialBalance({
        companyId: companyId || undefined,
        asOfDate,
      });
      setReport(data);
    } catch (err) {
      console.error("Error generating trial balance:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate trial balance"
      );
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!report) return;

    const rows: string[][] = [];
    rows.push(["Trial Balance"]);
    rows.push([`As of: ${asOfDate}`]);
    rows.push([`Generated: ${new Date(report.generatedAt).toLocaleString()}`]);
    rows.push([]);
    rows.push(["Account Code", "Account Name", "Type", "Debit", "Credit"]);

    for (const row of report.rows) {
      rows.push([
        row.accountCode,
        row.accountName,
        row.accountType,
        row.debitBalance > 0 ? row.debitBalance.toFixed(2) : "",
        row.creditBalance > 0 ? row.creditBalance.toFixed(2) : "",
      ]);
    }

    rows.push([]);
    rows.push([
      "",
      "TOTALS",
      "",
      report.totalDebits.toFixed(2),
      report.totalCredits.toFixed(2),
    ]);

    if (!report.isBalanced) {
      rows.push(["", "DIFFERENCE", "", report.difference.toFixed(2), ""]);
    }

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trial-balance-${asOfDate}.csv`);
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
          <h1 className="text-2xl font-bold text-gray-900">Trial Balance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Account balances as of{" "}
            {new Date(asOfDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* As of Date */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              As of Date
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#5A7A8F] focus:ring-1 focus:ring-[#5A7A8F]"
            />
          </div>

          {/* Company Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Company
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={isLoadingFilters}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#5A7A8F] focus:ring-1 focus:ring-[#5A7A8F] disabled:opacity-50"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-5 py-2 text-sm font-medium text-white hover:bg-[#4a6a7f] transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Generate
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Generating trial balance...
            </p>
          </div>
        </div>
      )}

      {/* Report Table */}
      {!isLoading && report && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Balance Status */}
          <div
            className={`px-6 py-3 flex items-center gap-2 text-sm font-medium ${
              report.isBalanced
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {report.isBalanced ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Trial balance is balanced
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                Trial balance is NOT balanced — difference of{" "}
                {formatAmount(report.difference)}
              </>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">
                    Account Code
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">
                    Account Name
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">
                    Type
                  </th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">
                    Debit
                  </th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    key={row.accountCode}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-2.5 font-mono text-[#5A7A8F]">
                      {row.accountCode}
                    </td>
                    <td className="px-6 py-2.5 text-gray-900">
                      {row.accountName}
                    </td>
                    <td className="px-6 py-2.5 text-gray-500">
                      {row.accountType}
                    </td>
                    <td className="px-6 py-2.5 text-right text-gray-900">
                      {row.debitBalance > 0 ? formatAmount(row.debitBalance) : ""}
                    </td>
                    <td className="px-6 py-2.5 text-right text-gray-900">
                      {row.creditBalance > 0
                        ? formatAmount(row.creditBalance)
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-6 py-3" colSpan={3}>
                    Totals
                  </td>
                  <td className="px-6 py-3 text-right text-gray-900">
                    {formatAmount(report.totalDebits)}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-900">
                    {formatAmount(report.totalCredits)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Row count */}
          <div className="px-6 py-3 border-t border-gray-200 text-xs text-gray-400">
            {report.rows.length} account{report.rows.length !== 1 ? "s" : ""}{" "}
            with balances
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !report && !error && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-sm">
            Select filters and click Generate to view the trial balance.
          </p>
        </div>
      )}
    </div>
  );
}
