'use client';

import { Download } from 'lucide-react';
import { Currency } from '@/data/company/types';
import { ExpenseStatus, PaymentStatus, ReceiptStatus } from '@/data/expenses/types';

interface ExpensesScopeBarProps {
  // Data scope
  dataScope: string; // Format: "all-companies" | "company-{id}"
  onDataScopeChange: (scope: string) => void;
  companies: Array<{ id: string; name: string }>;

  // Date range
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;

  // Currency filter (optional)
  selectedCurrencies?: Currency[];
  onCurrenciesChange?: (currencies: Currency[]) => void;
  showCurrencyFilter?: boolean;

  // Status filter
  selectedStatuses?: ExpenseStatus[];
  onStatusesChange?: (statuses: ExpenseStatus[]) => void;

  // Payment status filter
  selectedPaymentStatuses?: PaymentStatus[];
  onPaymentStatusesChange?: (statuses: PaymentStatus[]) => void;
  showPaymentStatusFilter?: boolean;

  // Receipt status filter
  selectedReceiptStatuses?: ReceiptStatus[];
  onReceiptStatusesChange?: (statuses: ReceiptStatus[]) => void;
  showReceiptStatusFilter?: boolean;

  // Actions
  onExport: () => void;
}

const expenseStatusOptions: Array<{ value: ExpenseStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'void', label: 'Void' },
];

const paymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
];

const receiptStatusOptions: Array<{ value: ReceiptStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'received', label: 'Received' },
  { value: 'not_required', label: 'N/A' },
];

export function ExpensesScopeBar({
  dataScope,
  onDataScopeChange,
  companies,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  selectedCurrencies = [],
  onCurrenciesChange,
  showCurrencyFilter = false,
  selectedStatuses = [],
  onStatusesChange,
  selectedPaymentStatuses = [],
  onPaymentStatusesChange,
  showPaymentStatusFilter = true,
  selectedReceiptStatuses = [],
  onReceiptStatusesChange,
  showReceiptStatusFilter = true,
  onExport,
}: ExpensesScopeBarProps) {
  const currencyOptions: Currency[] = ['THB', 'USD', 'EUR', 'SGD', 'GBP', 'AED'];

  const toggleCurrency = (currency: Currency) => {
    if (!onCurrenciesChange) return;

    if (selectedCurrencies.includes(currency)) {
      onCurrenciesChange(selectedCurrencies.filter((c) => c !== currency));
    } else {
      onCurrenciesChange([...selectedCurrencies, currency]);
    }
  };

  const toggleStatus = (status: ExpenseStatus) => {
    if (!onStatusesChange) return;

    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const togglePaymentStatus = (status: PaymentStatus) => {
    if (!onPaymentStatusesChange) return;

    if (selectedPaymentStatuses.includes(status)) {
      onPaymentStatusesChange(selectedPaymentStatuses.filter((s) => s !== status));
    } else {
      onPaymentStatusesChange([...selectedPaymentStatuses, status]);
    }
  };

  const toggleReceiptStatus = (status: ReceiptStatus) => {
    if (!onReceiptStatusesChange) return;

    if (selectedReceiptStatuses.includes(status)) {
      onReceiptStatusesChange(selectedReceiptStatuses.filter((s) => s !== status));
    } else {
      onReceiptStatusesChange([...selectedReceiptStatuses, status]);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      {/* Row 1 - Scope & Period */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Data Scope & Date Range */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Data Scope */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Data Scope:
              </label>
              <select
                value={dataScope}
                onChange={(e) => onDataScopeChange(e.target.value)}
                className="px-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm min-w-[250px] bg-white"
              >
                <option value="all-companies">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    Company: {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Period:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="px-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm bg-white"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="px-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Right: Export Button */}
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Row 2 - Filters */}
      <div className="px-6 py-3 bg-gray-50 flex flex-wrap items-center gap-6">
        {/* Status Filter */}
        {onStatusesChange && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Status:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onStatusesChange([])}
                className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
                  selectedStatuses.length === 0
                    ? 'bg-[#5A7A8F] text-white border-[#5A7A8F]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {expenseStatusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleStatus(option.value)}
                  className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
                    selectedStatuses.includes(option.value)
                      ? 'bg-[#5A7A8F] text-white border-[#5A7A8F]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment Status Filter */}
        {showPaymentStatusFilter && onPaymentStatusesChange && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Payment:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onPaymentStatusesChange([])}
                className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
                  selectedPaymentStatuses.length === 0
                    ? 'bg-[#5A7A8F] text-white border-[#5A7A8F]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {paymentStatusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => togglePaymentStatus(option.value)}
                  className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
                    selectedPaymentStatuses.includes(option.value)
                      ? option.value === 'unpaid'
                        ? 'bg-red-500 text-white border-red-500'
                        : option.value === 'paid'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Receipt Status Filter */}
        {showReceiptStatusFilter && onReceiptStatusesChange && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Receipt:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onReceiptStatusesChange([])}
                className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
                  selectedReceiptStatuses.length === 0
                    ? 'bg-[#5A7A8F] text-white border-[#5A7A8F]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {receiptStatusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleReceiptStatus(option.value)}
                  className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
                    selectedReceiptStatuses.includes(option.value)
                      ? option.value === 'pending'
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : option.value === 'received'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-gray-400 text-white border-gray-400'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Currency Filter */}
        {showCurrencyFilter && onCurrenciesChange && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Currency:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onCurrenciesChange([])}
                className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
                  selectedCurrencies.length === 0
                    ? 'bg-[#5A7A8F] text-white border-[#5A7A8F]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {currencyOptions.map((currency) => (
                <button
                  key={currency}
                  onClick={() => toggleCurrency(currency)}
                  className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
                    selectedCurrencies.includes(currency)
                      ? 'bg-[#5A7A8F] text-white border-[#5A7A8F]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
