'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Eye, Edit, MoreHorizontal } from 'lucide-react';
import { ExpensesScopeBar } from '@/components/expenses/ExpensesScopeBar';
import { getExpenseRecords } from '@/data/expenses/expenses';
import { ExpenseStatus, PaymentStatus, ReceiptStatus } from '@/data/expenses/types';
import { formatCurrency, formatDate, isOverdue } from '@/lib/expenses/utils';

// Mock companies
const companies = [
  { id: 'company-001', name: 'Faraway Yachting' },
  { id: 'company-002', name: 'Blue Horizon Maritime' },
];

export default function ExpenseRecordsPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedStatuses, setSelectedStatuses] = useState<ExpenseStatus[]>([]);
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<PaymentStatus[]>([]);
  const [selectedReceiptStatuses, setSelectedReceiptStatuses] = useState<ReceiptStatus[]>([]);

  // Get filtered expenses
  const expenses = useMemo(() => {
    let result = getExpenseRecords({
      dataScope,
      dateFrom,
      dateTo,
    });

    // Apply status filters
    if (selectedStatuses.length > 0) {
      result = result.filter((e) => selectedStatuses.includes(e.status));
    }

    if (selectedPaymentStatuses.length > 0) {
      result = result.filter((e) => selectedPaymentStatuses.includes(e.paymentStatus));
    }

    if (selectedReceiptStatuses.length > 0) {
      result = result.filter((e) => selectedReceiptStatuses.includes(e.receiptStatus));
    }

    return result;
  }, [dataScope, dateFrom, dateTo, selectedStatuses, selectedPaymentStatuses, selectedReceiptStatuses]);

  const handleExport = () => {
    console.log('Exporting expense records...');
    // TODO: Implement CSV export
  };

  const getStatusBadge = (status: ExpenseStatus) => {
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

  const getPaymentStatusBadge = (status: PaymentStatus) => {
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

  const getReceiptStatusBadge = (status: ReceiptStatus) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_required':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    return expenses.reduce(
      (acc, expense) => {
        acc.total += expense.totalAmount;
        acc.vat += expense.vatAmount;
        acc.wht += expense.whtAmount;
        acc.outstanding += expense.amountOutstanding;
        return acc;
      },
      { total: 0, vat: 0, wht: 0, outstanding: 0 }
    );
  }, [expenses]);

  return (
    <div>
      {/* Header with New Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Expense Records</h2>
          <p className="text-sm text-gray-500">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link
          href="/accounting/accountant/expenses/expense-records/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Expense
        </Link>
      </div>

      {/* Scope Bar */}
      <ExpensesScopeBar
        dataScope={dataScope}
        onDataScopeChange={setDataScope}
        companies={companies}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        selectedStatuses={selectedStatuses}
        onStatusesChange={setSelectedStatuses}
        selectedPaymentStatuses={selectedPaymentStatuses}
        onPaymentStatusesChange={setSelectedPaymentStatuses}
        selectedReceiptStatuses={selectedReceiptStatuses}
        onReceiptStatusesChange={setSelectedReceiptStatuses}
        onExport={handleExport}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(totals.total, 'THB')}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">VAT (Input)</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(totals.vat, 'THB')}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">WHT Deducted</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(totals.wht, 'THB')}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</p>
          <p className={`text-xl font-bold mt-1 ${totals.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(totals.outstanding, 'THB')}
          </p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier Inv #
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VAT
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  WHT
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-500">
                    No expense records found for the selected filters
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const overdueStatus = expense.dueDate && expense.status === 'approved' && expense.paymentStatus !== 'paid'
                    ? isOverdue(expense.dueDate)
                    : false;

                  return (
                    <tr key={expense.id} className={`hover:bg-gray-50 ${overdueStatus ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/accounting/accountant/expenses/expense-records/${expense.id}`}
                          className="text-sm font-medium text-[#5A7A8F] hover:underline"
                        >
                          {expense.expenseNumber}
                        </Link>
                        {overdueStatus && (
                          <span className="ml-2 text-xs text-red-600 font-medium">OVERDUE</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.vendorName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {expense.supplierInvoiceNumber || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(expense.totalAmount, expense.currency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(expense.vatAmount, expense.currency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {expense.whtAmount > 0 ? formatCurrency(expense.whtAmount, expense.currency) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                            expense.status
                          )}`}
                        >
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
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
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getReceiptStatusBadge(
                            expense.receiptStatus
                          )}`}
                        >
                          {expense.receiptStatus === 'not_required'
                            ? 'N/A'
                            : expense.receiptStatus.charAt(0).toUpperCase() +
                              expense.receiptStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/accounting/accountant/expenses/expense-records/${expense.id}`}
                            className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {expense.status === 'draft' && (
                            <Link
                              href={`/accounting/accountant/expenses/expense-records/${expense.id}?edit=true`}
                              className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
