"use client";

import { AppShell } from "@/components/accounting/AppShell";
import { KPICard } from "@/components/accounting/KPICard";
import { DataTable } from "@/components/accounting/DataTable";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  FileText,
  Wallet,
} from "lucide-react";
import {
  mockBoatPerformance,
  mockAlerts,
  mockCompanyCashBalance,
} from "@/data/accounting/mockData";

export default function ManagerDashboard() {
  const boatColumns = [
    { key: "boat", header: "Boat" },
    { key: "company", header: "Company" },
    { key: "revenue", header: "Revenue", align: "right" as const },
    { key: "expenses", header: "Expenses", align: "right" as const },
    {
      key: "profit",
      header: "Profit",
      align: "right" as const,
      render: (row: any) => (
        <span className="font-semibold text-green-600">{row.profit}</span>
      ),
    },
    { key: "margin", header: "Margin", align: "right" as const },
  ];

  const cashBalanceColumns = [
    { key: "company", header: "Company" },
    { key: "balance", header: "Balance", align: "right" as const },
    {
      key: "status",
      header: "Status",
      align: "center" as const,
      render: (row: any) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.status === "healthy"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {row.status === "healthy" ? "Healthy" : "Low"}
        </span>
      ),
    },
  ];

  return (
    <AppShell>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KPICard
          title="Total Revenue"
          value="$466,000"
          change={{ value: "12.5%", trend: "up" }}
          icon={DollarSign}
          subtitle="All companies, this month"
        />
        <KPICard
          title="Total Expenses"
          value="$204,000"
          change={{ value: "5.2%", trend: "up" }}
          icon={TrendingDown}
          subtitle="All companies, this month"
        />
        <KPICard
          title="Net Profit"
          value="$262,000"
          change={{ value: "18.3%", trend: "up" }}
          icon={TrendingUp}
          variant="success"
          subtitle="All companies, this month"
        />
        <KPICard
          title="Profit Margin"
          value="56.2%"
          change={{ value: "3.1%", trend: "up" }}
          icon={TrendingUp}
          subtitle="Across all boats"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors shadow-sm">
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors shadow-sm">
            <Plus className="h-4 w-4" />
            Add Income
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors shadow-sm">
            <FileText className="h-4 w-4" />
            Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Boat Performance Table */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Boat Performance
          </h2>
          <DataTable columns={boatColumns} data={mockBoatPerformance} />
        </div>

        {/* Alerts Panel */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h2>
          <div className="space-y-3">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${
                  alert.type === "danger"
                    ? "border-red-200 bg-red-50"
                    : alert.type === "warning"
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`h-5 w-5 flex-shrink-0 ${
                      alert.type === "danger"
                        ? "text-red-600"
                        : alert.type === "warning"
                        ? "text-yellow-600"
                        : "text-blue-600"
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        alert.type === "danger"
                          ? "text-red-900"
                          : alert.type === "warning"
                          ? "text-yellow-900"
                          : "text-blue-900"
                      }`}
                    >
                      {alert.message}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        alert.type === "danger"
                          ? "text-red-700"
                          : alert.type === "warning"
                          ? "text-yellow-700"
                          : "text-blue-700"
                      }`}
                    >
                      {alert.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Company Cash Balance */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Company Cash Balance
        </h2>
        <DataTable columns={cashBalanceColumns} data={mockCompanyCashBalance} />
      </div>
    </AppShell>
  );
}
