"use client";

import { AppShell } from "@/components/accounting/AppShell";
import { KPICard } from "@/components/accounting/KPICard";
import { DataTable } from "@/components/accounting/DataTable";
import { FileText, DollarSign, Plus } from "lucide-react";
import { mockInvoices } from "@/data/accounting/mockData";

export default function InvoicesPage() {
  const columns = [
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
  const totalRevenue = mockInvoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + parseFloat(inv.amount.replace(/[$,]/g, "")), 0);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage customer invoices
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <KPICard
          title="Total Invoiced"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
          subtitle={`${paidCount} paid invoices`}
        />
        <KPICard
          title="Pending Payment"
          value="$3,800"
          icon={FileText}
          variant="warning"
          subtitle="1 invoice"
        />
        <KPICard
          title="Draft Invoices"
          value="1"
          icon={FileText}
          subtitle="Not yet sent"
        />
      </div>

      <div className="mb-6">
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#5A7A8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c3e50] transition-colors shadow-sm">
          <Plus className="h-4 w-4" />
          Create Invoice
        </button>
      </div>

      <DataTable columns={columns} data={mockInvoices} />
    </AppShell>
  );
}
