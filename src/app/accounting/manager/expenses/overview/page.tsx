'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingDown,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  Receipt,
  Package,
  Landmark,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { KPICard } from '@/components/accounting/KPICard';
import { getExpenseSummary, getRecentExpenseRecords, getOverdueExpenseRecords, getExpensesPendingReceipt } from '@/data/expenses/expenses';
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/expenses/utils';

// Mock companies (should come from company data)
const companies = [
  { id: 'company-001', name: 'Faraway Yachting' },
  { id: 'company-002', name: 'Blue Horizon Maritime' },
];

export default function ExpensesOverviewPage() {
  const [dataScope, setDataScope] = useState('all-companies');

  // Get filtered data based on scope
  const companyId = dataScope === 'all-companies' ? undefined : dataScope;
  const summary = useMemo(() => getExpenseSummary(companyId), [companyId]);
  const recentExpenses = useMemo(() => getRecentExpenseRecords(5), []);
  const overdueExpenses = useMemo(() => getOverdueExpenseRecords(), []);
  const pendingReceipts = useMemo(() => getExpensesPendingReceipt(), []);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'void':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Company Filter */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Company:</label>
          <select
            value={dataScope}
            onChange={(e) => setDataScope(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm min-w-[200px]"
          >
            <option value="all-companies">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Link
            href="/accounting/manager/expenses/expense-records/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Expense
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KPICard
          title="Total Expenses"
          value={formatCurrency(summary.totalExpenses, 'THB')}
          subtitle="Approved expenses"
          icon={TrendingDown}
          variant="default"
        />
        <KPICard
          title="Pending Payments"
          value={formatCurrency(summary.pendingPayments, 'THB')}
          subtitle="Outstanding amount"
          icon={Clock}
          variant={summary.pendingPayments > 0 ? 'warning' : 'default'}
        />
        <KPICard
          title="Overdue Payments"
          value={formatCurrency(summary.overduePayments, 'THB')}
          subtitle={`${overdueExpenses.length} expense${overdueExpenses.length !== 1 ? 's' : ''}`}
          icon={AlertTriangle}
          variant={summary.overduePayments > 0 ? 'danger' : 'default'}
        />
        <KPICard
          title="Pending Receipts"
          value={String(summary.pendingReceipts)}
          subtitle="Missing documents"
          icon={FileText}
          variant={summary.pendingReceipts > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/accounting/manager/expenses/expense-records/new"
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-[#5A7A8F] hover:shadow-sm transition-all group"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Receipt className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#5A7A8F]">
              Record Expense
            </h3>
            <p className="text-xs text-gray-500">Record bills and invoices from suppliers</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#5A7A8F]" />
        </Link>

        <Link
          href="/accounting/manager/expenses/purchase-inventory"
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-[#5A7A8F] hover:shadow-sm transition-all group"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Package className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#5A7A8F]">
              Purchase Inventory
            </h3>
            <p className="text-xs text-gray-500">Record inventory purchases</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#5A7A8F]" />
        </Link>

        <Link
          href="/accounting/manager/expenses/purchase-assets"
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-[#5A7A8F] hover:shadow-sm transition-all group"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Landmark className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#5A7A8F]">
              Purchase Asset
            </h3>
            <p className="text-xs text-gray-500">Record fixed asset purchases</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#5A7A8F]" />
        </Link>
      </div>

      {/* Alerts Section */}
      {(overdueExpenses.length > 0 || pendingReceipts.length > 0) && (
        <div className="mb-8 space-y-4">
          {/* Overdue Payments Alert */}
          {overdueExpenses.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800">
                    Overdue Payments ({overdueExpenses.length})
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    The following expenses are past their due date:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {overdueExpenses.slice(0, 3).map((expense) => (
                      <li key={expense.id} className="text-sm text-red-700">
                        <Link
                          href={`/accounting/manager/expenses/expense-records/${expense.id}`}
                          className="font-medium hover:underline"
                        >
                          {expense.expenseNumber}
                        </Link>
                        {' - '}
                        {expense.vendorName} - {formatCurrency(expense.amountOutstanding, expense.currency)}
                        {expense.dueDate && (
                          <span className="text-red-500 ml-1">
                            ({Math.abs(getDaysUntilDue(expense.dueDate))} days overdue)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {overdueExpenses.length > 3 && (
                    <Link
                      href="/accounting/manager/expenses/expense-records?payment=unpaid"
                      className="text-sm text-red-800 font-medium hover:underline mt-2 inline-block"
                    >
                      View all {overdueExpenses.length} overdue expenses →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pending Receipts Alert */}
          {pendingReceipts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800">
                    Missing Receipts ({pendingReceipts.length})
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    The following expenses are waiting for receipt documents:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {pendingReceipts.slice(0, 3).map((expense) => (
                      <li key={expense.id} className="text-sm text-yellow-700">
                        <Link
                          href={`/accounting/manager/expenses/expense-records/${expense.id}`}
                          className="font-medium hover:underline"
                        >
                          {expense.expenseNumber}
                        </Link>
                        {' - '}
                        {expense.vendorName}
                      </li>
                    ))}
                  </ul>
                  {pendingReceipts.length > 3 && (
                    <Link
                      href="/accounting/manager/expenses/expense-records?receipt=pending"
                      className="text-sm text-yellow-800 font-medium hover:underline mt-2 inline-block"
                    >
                      View all {pendingReceipts.length} pending receipts →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Expenses Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
          <Link
            href="/accounting/manager/expenses/expense-records"
            className="text-sm text-[#5A7A8F] hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No expenses recorded yet
                  </td>
                </tr>
              ) : (
                recentExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/accounting/manager/expenses/expense-records/${expense.id}`}
                        className="text-sm font-medium text-[#5A7A8F] hover:underline"
                      >
                        {expense.expenseNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(expense.expenseDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.vendorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(expense.totalAmount, expense.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                          expense.status
                        )}`}
                      >
                        {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPaymentStatusBadge(
                          expense.paymentStatus
                        )}`}
                      >
                        {expense.paymentStatus === 'partially_paid'
                          ? 'Partial'
                          : expense.paymentStatus.charAt(0).toUpperCase() +
                            expense.paymentStatus.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Tax Summary
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Total VAT (Input Tax)</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatCurrency(summary.totalVat, 'THB')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Total WHT Deducted</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatCurrency(summary.totalWht, 'THB')}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Document Status
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Draft Expenses</dt>
              <dd className="text-sm font-medium text-gray-900">{summary.draftCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Approved Expenses</dt>
              <dd className="text-sm font-medium text-gray-900">{summary.approvedCount}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
