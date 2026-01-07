"use client";

import { AppShell } from "@/components/accounting/AppShell";
import { KPICard } from "@/components/accounting/KPICard";
import { DataTable } from "@/components/accounting/DataTable";
import { DollarSign, TrendingUp, Plus, Filter } from "lucide-react";

const mockIncomeData = [
  {
    id: "INC-001",
    date: "2025-12-26",
    category: "Charter Fee",
    boat: "Ocean Star",
    client: "John Smith",
    amount: "$5,000",
    status: "Received",
  },
  {
    id: "INC-002",
    date: "2025-12-24",
    category: "Charter Fee",
    boat: "Sunset Dream",
    client: "Emma Davis",
    amount: "$4,200",
    status: "Received",
  },
  {
    id: "INC-003",
    date: "2025-12-22",
    category: "Docking Fee Refund",
    boat: "Wave Rider",
    client: "Marina Services",
    amount: "$850",
    status: "Pending",
  },
  {
    id: "INC-004",
    date: "2025-12-20",
    category: "Charter Fee",
    boat: "Sea Breeze",
    client: "Sarah Johnson",
    amount: "$3,800",
    status: "Received",
  },
  {
    id: "INC-005",
    date: "2025-12-18",
    category: "Equipment Rental",
    boat: "Ocean Star",
    client: "Mike Williams",
    amount: "$1,200",
    status: "Received",
  },
];

export default function IncomePage() {
  const columns = [
    { key: "id", header: "ID" },
    { key: "date", header: "Date" },
    { key: "category", header: "Category" },
    { key: "boat", header: "Boat" },
    { key: "client", header: "Client" },
    { key: "amount", header: "Amount", align: "right" as const },
    {
      key: "status",
      header: "Status",
      align: "center" as const,
      render: (row: any) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.status === "Received"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  const totalIncome = mockIncomeData
    .filter((item) => item.status === "Received")
    .reduce((sum, item) => sum + parseFloat(item.amount.replace(/[$,]/g, "")), 0);

  const pendingIncome = mockIncomeData
    .filter((item) => item.status === "Pending")
    .reduce((sum, item) => sum + parseFloat(item.amount.replace(/[$,]/g, "")), 0);

  return (
    <AppShell currentRole="manager">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Income</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track all income sources across your fleet
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <KPICard
          title="Total Income (This Month)"
          value={`$${totalIncome.toLocaleString()}`}
          change={{ value: "15.3%", trend: "up" }}
          icon={DollarSign}
          variant="success"
        />
        <KPICard
          title="Pending Income"
          value={`$${pendingIncome.toLocaleString()}`}
          icon={TrendingUp}
          variant="warning"
          subtitle="Awaiting confirmation"
        />
        <KPICard
          title="Total Transactions"
          value={mockIncomeData.length}
          icon={DollarSign}
          subtitle="This month"
        />
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors shadow-sm">
            <Plus className="h-4 w-4" />
            Add Income
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Date range:</label>
          <select className="rounded-md border-gray-300 text-sm focus:border-[#5A7A8F] focus:ring-[#5A7A8F]">
            <option>This Month</option>
            <option>Last Month</option>
            <option>Last 3 Months</option>
            <option>This Year</option>
            <option>Custom Range</option>
          </select>
        </div>
      </div>

      {/* Income Table */}
      <div>
        <DataTable columns={columns} data={mockIncomeData} />
      </div>
    </AppShell>
  );
}
