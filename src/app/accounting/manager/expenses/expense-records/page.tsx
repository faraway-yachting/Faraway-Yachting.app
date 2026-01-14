'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Paperclip, X, Download } from 'lucide-react';
import { ExpensesScopeBar } from '@/components/expenses/ExpensesScopeBar';
import { expensesApi } from '@/lib/supabase/api/expenses';
import { companiesApi } from '@/lib/supabase/api/companies';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { dbExpenseToFrontend, dbCompanyToFrontend, dbBankAccountToFrontend } from '@/lib/supabase/transforms';
import type { ExpenseRecord, ExpenseStatus, PaymentStatus, ReceiptStatus } from '@/data/expenses/types';
import type { Company, Currency } from '@/data/company/types';
import type { BankAccount } from '@/data/banking/types';
import type { Attachment } from '@/data/accounting/journalEntryTypes';
import { formatCurrency, formatDate, isOverdue } from '@/lib/expenses/utils';

// Extended expense type with payment info
interface ExpenseWithPaymentInfo extends ExpenseRecord {
  paidFromBankAccountId?: string;
}

export default function ExpenseRecordsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithPaymentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dataScope, setDataScope] = useState('all-companies');
  // Default date range: current year (Jan 1 to Dec 31)
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-01-01`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-12-31`;
  });
  // Default status: Approved
  const [selectedStatuses, setSelectedStatuses] = useState<ExpenseStatus[]>(['approved']);
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<PaymentStatus[]>([]);
  const [selectedReceiptStatuses, setSelectedReceiptStatuses] = useState<ReceiptStatus[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<Currency[]>([]);
  const [selectedBankAccountIds, setSelectedBankAccountIds] = useState<string[]>([]);
  const [selectedExpenseForDownload, setSelectedExpenseForDownload] = useState<ExpenseWithPaymentInfo | null>(null);
  const [selectedAttachmentIndices, setSelectedAttachmentIndices] = useState<number[]>([]);

  // Load companies and bank accounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [companiesData, bankAccountsData] = await Promise.all([
          companiesApi.getActive(),
          bankAccountsApi.getAll(),
        ]);
        setCompanies(companiesData.map(dbCompanyToFrontend));
        setBankAccounts(bankAccountsData.map(dbBankAccountToFrontend));
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadInitialData();
  }, []);

  // Load expenses from Supabase (with payments)
  useEffect(() => {
    const loadExpenses = async () => {
      setIsLoading(true);
      try {
        // Use getAllWithLineItemsByDateRange to get payments info
        const expensesData = await expensesApi.getAllWithLineItemsByDateRange(dateFrom, dateTo);
        const transformedExpenses = expensesData.map((expense) => {
          const baseExpense = dbExpenseToFrontend(expense, expense.line_items);
          // Get first payment's bank account if exists
          const firstPayment = expense.payments?.[0];

          // Calculate actual amount paid from payments
          const amountPaid = expense.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          const netPayable = baseExpense.netPayable || 0;
          const amountOutstanding = Math.max(0, netPayable - amountPaid);

          return {
            ...baseExpense,
            amountPaid,
            amountOutstanding,
            paidFromBankAccountId: firstPayment?.paid_from ?? undefined,
          };
        });
        setExpenses(transformedExpenses);
      } catch (error) {
        console.error('Failed to load expenses:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadExpenses();
  }, [dateFrom, dateTo]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Filter by company
    if (dataScope !== 'all-companies') {
      const companyId = dataScope.replace('company-', '');
      result = result.filter((e) => e.companyId === companyId);
    }

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

    // Filter by currency
    if (selectedCurrencies.length > 0) {
      result = result.filter((e) => selectedCurrencies.includes(e.currency));
    }

    // Filter by bank account
    if (selectedBankAccountIds.length > 0) {
      result = result.filter((e) =>
        selectedBankAccountIds.includes(e.paidFromBankAccountId || 'not-specified')
      );
    }

    return result;
  }, [expenses, dataScope, selectedStatuses, selectedPaymentStatuses, selectedReceiptStatuses, selectedCurrencies, selectedBankAccountIds]);

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

  // Calculate totals grouped by currency
  const totalsByCurrency = useMemo(() => {
    const byCurrency: Record<string, { total: number; vat: number; wht: number; outstanding: number }> = {};

    filteredExpenses.forEach((expense) => {
      const currency = expense.currency;
      if (!byCurrency[currency]) {
        byCurrency[currency] = { total: 0, vat: 0, wht: 0, outstanding: 0 };
      }
      byCurrency[currency].total += expense.totalAmount;
      byCurrency[currency].vat += expense.vatAmount;
      byCurrency[currency].wht += expense.whtAmount;
      byCurrency[currency].outstanding += expense.amountOutstanding;
    });

    // Sort currencies: THB first, then alphabetically
    const sortedCurrencies = Object.keys(byCurrency).sort((a, b) => {
      if (a === 'THB') return -1;
      if (b === 'THB') return 1;
      return a.localeCompare(b);
    });

    return sortedCurrencies.map((currency) => ({
      currency,
      ...byCurrency[currency],
    }));
  }, [filteredExpenses]);

  // Get bank account name by ID
  const getBankAccountName = (bankAccountId: string | undefined): string => {
    if (!bankAccountId) return '-';
    const account = bankAccounts.find((ba) => ba.id === bankAccountId);
    if (!account) return '-';
    return account.accountName || account.bankInformation?.bankName || '-';
  };

  // Format number without currency symbol
  const formatNumber = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Handle download single attachment (force download via proxy API)
  const handleDownloadSingleAttachment = async (attachment: Attachment) => {
    try {
      // Use our proxy API to bypass CORS and force download
      const proxyUrl = `/api/download?url=${encodeURIComponent(attachment.url)}&filename=${encodeURIComponent(attachment.name)}`;

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download file:', error);
      // Fallback: Open in new tab
      window.open(attachment.url, '_blank');
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedExpenseForDownload) {
        setSelectedExpenseForDownload(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedExpenseForDownload]);

  // Reset attachment selection when modal opens
  useEffect(() => {
    if (selectedExpenseForDownload) {
      // Select all attachments by default
      setSelectedAttachmentIndices(
        selectedExpenseForDownload.attachments?.map((_, i) => i) || []
      );
    }
  }, [selectedExpenseForDownload]);

  // Handle download selected attachments
  const handleDownloadSelectedAttachments = async () => {
    if (!selectedExpenseForDownload?.attachments) return;

    const selectedAttachments = selectedExpenseForDownload.attachments.filter(
      (_, index) => selectedAttachmentIndices.includes(index)
    );

    // Download files sequentially with small delay to avoid browser blocking
    for (const attachment of selectedAttachments) {
      await handleDownloadSingleAttachment(attachment);
      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  // Toggle attachment selection
  const toggleAttachmentSelection = (index: number) => {
    setSelectedAttachmentIndices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  // Select/deselect all attachments
  const toggleSelectAllAttachments = () => {
    if (!selectedExpenseForDownload?.attachments) return;

    if (selectedAttachmentIndices.length === selectedExpenseForDownload.attachments.length) {
      setSelectedAttachmentIndices([]);
    } else {
      setSelectedAttachmentIndices(
        selectedExpenseForDownload.attachments.map((_, i) => i)
      );
    }
  };

  // Format companies for scope bar
  const companiesForScopeBar = companies.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div>
      {/* Header with New Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Expense Records</h2>
          <p className="text-sm text-gray-500">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link
          href="/accounting/manager/expenses/expense-records/new"
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
        companies={companiesForScopeBar}
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
        showCurrencyFilter={true}
        selectedCurrencies={selectedCurrencies}
        onCurrenciesChange={setSelectedCurrencies}
        showBankAccountFilter={true}
        bankAccounts={bankAccounts}
        selectedBankAccountIds={selectedBankAccountIds}
        onBankAccountIdsChange={setSelectedBankAccountIds}
        onExport={handleExport}
      />

      {/* Summary Cards - Totals by Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Total Amount</p>
          {totalsByCurrency.length === 0 ? (
            <p className="text-lg font-bold text-gray-400">-</p>
          ) : (
            <div className="space-y-1">
              {totalsByCurrency.map(({ currency, total }) => (
                <div key={currency} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{currency}</span>
                  <span className="text-base font-bold text-gray-900">{formatNumber(total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">VAT (Input)</p>
          {totalsByCurrency.length === 0 ? (
            <p className="text-lg font-bold text-gray-400">-</p>
          ) : (
            <div className="space-y-1">
              {totalsByCurrency.map(({ currency, vat }) => (
                <div key={currency} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{currency}</span>
                  <span className="text-base font-bold text-gray-900">{formatNumber(vat)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">WHT Deducted</p>
          {totalsByCurrency.length === 0 ? (
            <p className="text-lg font-bold text-gray-400">-</p>
          ) : (
            <div className="space-y-1">
              {totalsByCurrency.map(({ currency, wht }) => (
                <div key={currency} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{currency}</span>
                  <span className="text-base font-bold text-gray-900">{formatNumber(wht)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Outstanding</p>
          {totalsByCurrency.length === 0 ? (
            <p className="text-lg font-bold text-gray-400">-</p>
          ) : (
            <div className="space-y-1">
              {totalsByCurrency.map(({ currency, outstanding }) => (
                <div key={currency} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{currency}</span>
                  <span className={`text-base font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatNumber(outstanding)}
                  </span>
                </div>
              ))}
            </div>
          )}
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  THB Equiv.
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid From
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attach
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#5A7A8F]" />
                      <span className="text-sm text-gray-500">Loading expenses...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-sm text-gray-500">
                    No expense records found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const overdueStatus = expense.dueDate && expense.status === 'approved' && expense.paymentStatus !== 'paid'
                    ? isOverdue(expense.dueDate)
                    : false;

                  const hasAttachments = expense.attachments && expense.attachments.length > 0;

                  return (
                    <tr key={expense.id} className={`hover:bg-gray-50 ${overdueStatus ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/accounting/manager/expenses/expense-records/${expense.id}`}
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
                        {expense.vendorName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {expense.supplierInvoiceNumber || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                        {expense.currency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatNumber(expense.totalAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNumber(expense.vatAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {expense.whtAmount > 0 ? formatNumber(expense.whtAmount) : '-'}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {expense.currency === 'THB'
                          ? '-'
                          : expense.fxRate
                          ? formatNumber(expense.totalAmount * expense.fxRate)
                          : '-'}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {getBankAccountName(expense.paidFromBankAccountId)}
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
                        {hasAttachments ? (
                          <button
                            onClick={() => setSelectedExpenseForDownload(expense)}
                            className="inline-flex items-center gap-1 text-[#5A7A8F] hover:text-[#4a6a7f]"
                            title={`${expense.attachments!.length} attachment${expense.attachments!.length > 1 ? 's' : ''}`}
                          >
                            <Paperclip className="h-4 w-4" />
                            <span className="text-xs">{expense.attachments!.length}</span>
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Confirmation Modal */}
      {selectedExpenseForDownload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedExpenseForDownload(null)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#5A7A8F]/10 rounded-full flex items-center justify-center">
                  <Download className="h-5 w-5 text-[#5A7A8F]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Download Attachments</h3>
                  <p className="text-sm text-gray-500">{selectedExpenseForDownload.expenseNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedExpenseForDownload(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                Select files to download:
              </p>
              <button
                onClick={toggleSelectAllAttachments}
                className="text-xs text-[#5A7A8F] hover:underline"
              >
                {selectedAttachmentIndices.length === selectedExpenseForDownload.attachments?.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            {/* Attachment List with Checkboxes */}
            <div className="bg-gray-50 rounded-lg p-3 mb-6 max-h-60 overflow-y-auto">
              <ul className="space-y-2">
                {selectedExpenseForDownload.attachments?.map((attachment, index) => (
                  <li
                    key={index}
                    className={`flex items-center gap-3 p-2 bg-white rounded border transition-colors cursor-pointer ${
                      selectedAttachmentIndices.includes(index)
                        ? 'border-[#5A7A8F] bg-[#5A7A8F]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleAttachmentSelection(index)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAttachmentIndices.includes(index)}
                      onChange={() => toggleAttachmentSelection(index)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 text-[#5A7A8F] border-gray-300 rounded focus:ring-[#5A7A8F]"
                    />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{attachment.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSingleAttachment(attachment);
                      }}
                      className="flex-shrink-0 p-1.5 text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded transition-colors"
                      title="Download this file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setSelectedExpenseForDownload(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDownloadSelectedAttachments}
                disabled={selectedAttachmentIndices.length === 0}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 ${
                  selectedAttachmentIndices.length > 0
                    ? 'text-white bg-[#5A7A8F] hover:bg-[#4a6a7f]'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
              >
                <Download className="h-4 w-4" />
                Download Selected ({selectedAttachmentIndices.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
