"use client";

import { useState, useEffect } from "react";
import { generateARaging, generateAPaging } from "@/lib/reports/agingCalculation";
import type { AgingReport as AgingReportData, AgingBucket } from "@/lib/reports/agingCalculation";
import { companiesApi } from "@/lib/supabase/api/companies";
import type { Database } from "@/lib/supabase/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

const BUCKET_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  "Current":     { bg: "bg-green-50",  text: "text-green-700",   bar: "bg-green-500" },
  "1-30 days":   { bg: "bg-yellow-50", text: "text-yellow-700",  bar: "bg-yellow-500" },
  "31-60 days":  { bg: "bg-orange-50", text: "text-orange-700",  bar: "bg-orange-500" },
  "61-90 days":  { bg: "bg-red-50",    text: "text-red-600",     bar: "bg-red-500" },
  "90+ days":    { bg: "bg-red-100",   text: "text-red-800",     bar: "bg-red-800" },
};

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AgingReport() {
  const [type, setType] = useState<"receivable" | "payable">("receivable");
  const [companyId, setCompanyId] = useState("");
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<AgingReportData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await companiesApi.getAll();
        setCompanies(data);
      } catch (err) {
        console.error("Error loading companies:", err);
      } finally {
        setIsLoadingCompanies(false);
      }
    }
    load();
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const fn = type === "receivable" ? generateARaging : generateAPaging;
      const data = await fn(asOfDate, companyId || undefined);
      setReport(data);
    } catch (err) {
      console.error("Error generating aging report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex rounded-md overflow-hidden border border-gray-300">
              <button
                onClick={() => setType("receivable")}
                className={`px-4 py-2 text-sm font-medium ${
                  type === "receivable"
                    ? "bg-[#5A7A8F] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Receivable (AR)
              </button>
              <button
                onClick={() => setType("payable")}
                className={`px-4 py-2 text-sm font-medium ${
                  type === "payable"
                    ? "bg-[#5A7A8F] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Payable (AP)
              </button>
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              disabled={isLoadingCompanies}
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* As of Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-4 py-2 bg-[#5A7A8F] text-white text-sm font-medium rounded-md hover:bg-[#4a6a7f] disabled:opacity-50"
          >
            {isLoading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Report */}
      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {report.buckets.map((bucket) => {
              const colors = BUCKET_COLORS[bucket.label] ?? { bg: "bg-gray-50", text: "text-gray-700", bar: "bg-gray-400" };
              return (
                <div key={bucket.label} className={`${colors.bg} rounded-lg shadow p-4`}>
                  <p className={`text-sm font-medium ${colors.text}`}>{bucket.label}</p>
                  <p className={`text-lg font-bold ${colors.text} mt-1`}>{fmt(bucket.amount)}</p>
                  <p className="text-xs text-gray-500 mt-1">{bucket.count} item{bucket.count !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>

          {/* Distribution bar */}
          {report.totalOutstanding > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Distribution</p>
              <div className="flex h-6 rounded-md overflow-hidden">
                {report.buckets.map((bucket) => {
                  const pct = (bucket.amount / report.totalOutstanding) * 100;
                  if (pct <= 0) return null;
                  const colors = BUCKET_COLORS[bucket.label] ?? { bg: "bg-gray-50", text: "text-gray-700", bar: "bg-gray-400" };
                  return (
                    <div
                      key={bucket.label}
                      className={`${colors.bar} relative group`}
                      style={{ width: `${pct}%` }}
                      title={`${bucket.label}: ${fmt(bucket.amount)} (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                {report.buckets.map((bucket) => {
                  const colors = BUCKET_COLORS[bucket.label] ?? { bg: "bg-gray-50", text: "text-gray-700", bar: "bg-gray-400" };
                  return (
                    <div key={bucket.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className={`inline-block w-3 h-3 rounded ${colors.bar}`} />
                      {bucket.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detail table */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-[#5A7A8F]">Doc #</th>
                  <th className="px-4 py-3 text-left font-medium text-[#5A7A8F]">Counterparty</th>
                  <th className="px-4 py-3 text-left font-medium text-[#5A7A8F]">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-[#5A7A8F]">Due Date</th>
                  <th className="px-4 py-3 text-right font-medium text-[#5A7A8F]">Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-[#5A7A8F]">Outstanding</th>
                  <th className="px-4 py-3 text-right font-medium text-[#5A7A8F]">Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {report.buckets.flatMap((bucket) =>
                  bucket.items.map((item) => {
                    const colors = BUCKET_COLORS[bucket.label] ?? { bg: "bg-gray-50", text: "text-gray-700", bar: "bg-gray-400" };
                    return (
                      <tr key={item.documentId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{item.documentNumber}</td>
                        <td className="px-4 py-2">{item.counterpartyName}</td>
                        <td className="px-4 py-2">{item.documentDate}</td>
                        <td className="px-4 py-2">{item.dueDate}</td>
                        <td className="px-4 py-2 text-right">{fmt(item.originalAmount)}</td>
                        <td className={`px-4 py-2 text-right font-medium ${colors.text}`}>
                          {fmt(item.outstandingAmount)}
                        </td>
                        <td className="px-4 py-2 text-right">{item.daysOverdue > 0 ? item.daysOverdue : "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-gray-50 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-right text-[#5A7A8F]">
                    Total Outstanding
                  </td>
                  <td className="px-4 py-3 text-right text-[#5A7A8F]">{fmt(report.totalOutstanding)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
