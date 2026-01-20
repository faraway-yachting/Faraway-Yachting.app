"use client";

import { useState } from "react";
import { AppShell } from "@/components/accounting/AppShell";
import { KPICard } from "@/components/accounting/KPICard";
import { DataTable } from "@/components/accounting/DataTable";
import { FileText, DollarSign, CheckCircle, Clock, Plus } from "lucide-react";
import { mockInvoices } from "@/data/accounting/mockData";

export default function SalesDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredInvoices =
    statusFilter === "all"
      ? mockInvoices
      : mockInvoices.filter((inv) => inv.status.toLowerCase() === statusFilter);

  const invoiceColumns = [
    { key: "id", header: "Invoice ID" },
    { key: "client", header: "Client" },
    { key: "boat", header: "Boat" },
    { key: "amount", header: "Amount", align: "right" as const },
    { key: "date", header: "Date" },
    { key: "dueDate", header: "Due Date" },
    {
      key: "status",
      header: "Status",
      align: "center" as const,
      render: (row: any) => {
        const statusStyles = {
          Paid: "bg-green-100 text-green-800",
          Sent: "bg-blue-100 text-blue-800",
          Draft: "bg-gray-100 text-gray-800",
        };
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
              statusStyles[row.status as keyof typeof statusStyles]
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
  ];

  const paidCount = mockInvoices.filter((inv) => inv.status === "Paid").length;
  const sentCount = mockInvoices.filter((inv) => inv.status === "Sent").length;
  const draftCount = mockInvoices.filter((inv) => inv.status === "Draft").length;

  const totalRevenue = mockInvoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + parseFloat(inv.amount.replace(/[$,]/g, "")), 0);

  const pendingRevenue = mockInvoices
    .filter((inv) => inv.status === "Sent")
    .reduce((sum, inv) => sum + parseFloat(inv.amount.replace(/[$,]/g, "")), 0);

  return (
    <AppShell>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KPICard
          title="Total Invoices"
          value={mockInvoices.length}
          icon={FileText}
          subtitle="All time"
        />
        <KPICard
          title="Paid Invoices"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
          subtitle={`${paidCount} invoices`}
        />
        <KPICard
          title="Pending Payment"
          value={`$${pendingRevenue.toLocaleString()}`}
          icon={Clock}
          variant="warning"
          subtitle={`${sentCount} invoices`}
        />
        <KPICard
          title="Draft Invoices"
          value={draftCount}
          icon={FileText}
          subtitle="Not yet sent"
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
            Create Invoice
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <FileText className="h-4 w-4" />
            Create Receipt
          </button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2">
            {["all", "paid", "sent", "draft"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-[#5A7A8F] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {statusFilter === "all" ? "All Invoices" : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Invoices`}
          </h2>
          <span className="text-sm text-gray-600">
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
          </span>
        </div>
        <DataTable columns={invoiceColumns} data={filteredInvoices} />
      </div>

      {/* Info Card */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Note: Sales role has no access to expenses or P&L reports
            </p>
            <p className="text-sm text-blue-700 mt-1">
              You can only create and manage invoices and receipts. For financial
              reports, please contact your manager or accountant.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
