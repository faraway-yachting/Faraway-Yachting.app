"use client";

import { AppShell } from "@/components/accounting/AppShell";
import { KPICard } from "@/components/accounting/KPICard";
import { DataTable } from "@/components/accounting/DataTable";
import {
  Receipt,
  FileText,
  AlertCircle,
  Plus,
  Wallet,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  mockTransactions,
  mockBankReconciliation,
  mockMissingDocuments,
  mockVATStatus,
  mockWHTStatus,
} from "@/data/accounting/mockData";

export default function AccountantDashboard() {
  const transactionColumns = [
    { key: "id", header: "ID" },
    { key: "date", header: "Date" },
    {
      key: "type",
      header: "Type",
      render: (row: any) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.type === "Income"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.type}
        </span>
      ),
    },
    { key: "category", header: "Category" },
    { key: "boat", header: "Boat" },
    { key: "amount", header: "Amount", align: "right" as const },
    {
      key: "receipt",
      header: "Receipt",
      align: "center" as const,
      render: (row: any) =>
        row.receipt === "Yes" ? (
          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
        ),
    },
  ];

  const reconciliationColumns = [
    { key: "date", header: "Date" },
    { key: "description", header: "Description" },
    { key: "bankAmount", header: "Bank Amount", align: "right" as const },
    { key: "systemAmount", header: "System Amount", align: "right" as const },
    {
      key: "status",
      header: "Status",
      align: "center" as const,
      render: (row: any) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.status === "Matched"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  const missingDocsColumns = [
    { key: "transaction", header: "Transaction ID" },
    { key: "date", header: "Date" },
    { key: "description", header: "Description" },
    { key: "amount", header: "Amount", align: "right" as const },
    { key: "documentType", header: "Missing Document" },
  ];

  return (
    <AppShell currentRole="accountant">
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

      {/* VAT & WHT Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-4">VAT Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Period:</span>
              <span className="font-medium">{mockVATStatus.currentPeriod}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Input VAT:</span>
              <span className="font-medium">{mockVATStatus.inputVAT}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Output VAT:</span>
              <span className="font-medium">{mockVATStatus.outputVAT}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-sm font-semibold">
                <span>Net VAT Payable:</span>
                <span className="text-red-600">{mockVATStatus.netVAT}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium">{mockVATStatus.dueDate}</span>
            </div>
            <div className="mt-3">
              <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                {mockVATStatus.status}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-4">
            Withholding Tax Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Period:</span>
              <span className="font-medium">{mockWHTStatus.currentMonth}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Withheld:</span>
              <span className="font-medium text-red-600">
                {mockWHTStatus.totalWithheld}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Submission Date:</span>
              <span className="font-medium">{mockWHTStatus.submissionDate}</span>
            </div>
            <div className="mt-3">
              <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                {mockWHTStatus.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Transactions
        </h2>
        <DataTable columns={transactionColumns} data={mockTransactions} />
      </div>

      {/* Bank Reconciliation */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Bank Reconciliation
          </h2>
          <span className="text-sm text-gray-600">
            2 unmatched transactions
          </span>
        </div>
        <DataTable
          columns={reconciliationColumns}
          data={mockBankReconciliation}
        />
      </div>

      {/* Missing Documents */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Missing Receipts & Documents
          </h2>
        </div>
        <DataTable columns={missingDocsColumns} data={mockMissingDocuments} />
      </div>
    </AppShell>
  );
}
