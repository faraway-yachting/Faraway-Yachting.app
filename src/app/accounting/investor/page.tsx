"use client";

import { AppShell } from "@/components/accounting/AppShell";
import { KPICard } from "@/components/accounting/KPICard";
import { DataTable } from "@/components/accounting/DataTable";
import { DollarSign, TrendingDown, TrendingUp, Download, Lock } from "lucide-react";
import { mockBoatPerformance, mockMonthlyPLTrend } from "@/data/accounting/mockData";

export default function InvestorDashboard() {
  // Filter to show only boats the investor has invested in
  const investedBoats = mockBoatPerformance.filter((boat) =>
    ["Ocean Star", "Sea Breeze"].includes(boat.boat)
  );

  const totalRevenue = investedBoats.reduce(
    (sum, boat) => sum + parseFloat(boat.revenue.replace(/[$,]/g, "")),
    0
  );

  const totalExpenses = investedBoats.reduce(
    (sum, boat) => sum + parseFloat(boat.expenses.replace(/[$,]/g, "")),
    0
  );

  const totalProfit = investedBoats.reduce(
    (sum, boat) => sum + parseFloat(boat.profit.replace(/[$,]/g, "")),
    0
  );

  const boatColumns = [
    { key: "boat", header: "Boat" },
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

  return (
    <AppShell currentRole="investor">
      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Read-Only Access
            </p>
            <p className="text-sm text-blue-700 mt-1">
              You can view financial reports for boats you've invested in: Ocean Star and Sea Breeze
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <KPICard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          change={{ value: "8.5%", trend: "up" }}
          icon={DollarSign}
          subtitle="Your invested boats, this month"
        />
        <KPICard
          title="Total Expenses"
          value={`$${totalExpenses.toLocaleString()}`}
          change={{ value: "3.2%", trend: "up" }}
          icon={TrendingDown}
          subtitle="Your invested boats, this month"
        />
        <KPICard
          title="Net Profit"
          value={`$${totalProfit.toLocaleString()}`}
          change={{ value: "12.8%", trend: "up" }}
          icon={TrendingUp}
          variant="success"
          subtitle="Your invested boats, this month"
        />
      </div>

      {/* Download Reports */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Download Reports
        </h2>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Download P&L Report (PDF)
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Download Excel Report
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="h-4 w-4" />
            Download Annual Summary
          </button>
        </div>
      </div>

      {/* Boat Performance */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Boats Performance
        </h2>
        <DataTable columns={boatColumns} data={investedBoats} />
      </div>

      {/* Monthly P&L Trend Chart */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Monthly P&L Trend (Last 6 Months)
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {mockMonthlyPLTrend.map((month) => {
              const revenueWidth = (month.revenue / 200000) * 100;
              const expensesWidth = (month.expenses / 200000) * 100;
              const profitWidth = (month.profit / 200000) * 100;

              return (
                <div key={month.month}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 w-12">
                      {month.month}
                    </span>
                    <div className="flex-1 ml-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${revenueWidth}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-20 text-right">
                            ${(month.revenue / 1000).toFixed(0)}k
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${expensesWidth}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-20 text-right">
                            ${(month.expenses / 1000).toFixed(0)}k
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${profitWidth}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-20 text-right font-semibold">
                            ${(month.profit / 1000).toFixed(0)}k
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
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-xs text-gray-600">Expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-xs text-gray-600">Profit</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
