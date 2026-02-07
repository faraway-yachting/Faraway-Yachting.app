'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Check } from 'lucide-react';
import { Currency } from '@/data/company/types';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { ExpenseStatus, PaymentStatus, ReceiptStatus } from '@/data/expenses/types';
import type { BankAccount } from '@/data/banking/types';

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

  // Bank account filter (optional)
  bankAccounts?: BankAccount[];
  selectedBankAccountIds?: string[];
  onBankAccountIdsChange?: (ids: string[]) => void;
  showBankAccountFilter?: boolean;

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

// Currency options loaded dynamically in component via useCurrencyOptions hook

// Reusable dropdown component for multi-select filters
function FilterDropdown<T extends string>({
  label,
  options,
  selectedValues,
  onChange,
  getOptionLabel,
}: {
  label: string;
  options: T[];
  selectedValues: T[];
  onChange: (values: T[]) => void;
  getOptionLabel: (value: T) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (value: T) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return 'All';
    if (selectedValues.length === 1) return getOptionLabel(selectedValues[0]);
    return `${selectedValues.length} selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 h-9 text-sm rounded-md border transition-colors inline-flex items-center gap-2 min-w-[120px] justify-between ${
          selectedValues.length > 0
            ? 'bg-[#5A7A8F]/10 text-[#5A7A8F] border-[#5A7A8F]/30'
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className="truncate">
          <span className="text-gray-500 font-medium">{label}:</span>{' '}
          <span className="font-medium">{getDisplayText()}</span>
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1">
          {/* All option */}
          <button
            onClick={() => {
              onChange([]);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              {selectedValues.length === 0 && <Check className="h-4 w-4 text-[#5A7A8F]" />}
            </div>
            All
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Options */}
          {options.map((option) => (
            <button
              key={option}
              onClick={() => toggleValue(option)}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <div className="w-4 h-4 flex items-center justify-center border border-gray-300 rounded">
                {selectedValues.includes(option) && <Check className="h-3 w-3 text-[#5A7A8F]" />}
              </div>
              {getOptionLabel(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  bankAccounts = [],
  selectedBankAccountIds = [],
  onBankAccountIdsChange,
  showBankAccountFilter = false,
  onExport,
}: ExpensesScopeBarProps) {
  const { options: currencyOptionsList } = useCurrencyOptions();
  const currencyOptions: Currency[] = currencyOptionsList.map(o => o.value as Currency);

  // Bank account dropdown state
  const [bankAccountDropdownOpen, setBankAccountDropdownOpen] = useState(false);
  const bankAccountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bankAccountDropdownRef.current && !bankAccountDropdownRef.current.contains(event.target as Node)) {
        setBankAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleBankAccount = (accountId: string) => {
    if (!onBankAccountIdsChange) return;

    if (selectedBankAccountIds.includes(accountId)) {
      onBankAccountIdsChange(selectedBankAccountIds.filter((id) => id !== accountId));
    } else {
      onBankAccountIdsChange([...selectedBankAccountIds, accountId]);
    }
  };

  const getBankAccountDisplayName = (account: BankAccount) => {
    return account.accountName || account.bankInformation?.bankName || 'Unknown Account';
  };

  const getBankAccountDisplayText = () => {
    if (selectedBankAccountIds.length === 0) return 'All';
    if (selectedBankAccountIds.length === 1) {
      if (selectedBankAccountIds[0] === 'not-specified') return 'Not Specified';
      const account = bankAccounts.find((a) => a.id === selectedBankAccountIds[0]);
      return account ? getBankAccountDisplayName(account) : '1 selected';
    }
    return `${selectedBankAccountIds.length} selected`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Data Scope */}
        <select
          value={dataScope}
          onChange={(e) => onDataScopeChange(e.target.value)}
          className="px-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm bg-white"
        >
          <option value="all-companies">All Companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Date Range */}
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

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Status Filter */}
        {onStatusesChange && (
          <FilterDropdown
            label="Status"
            options={expenseStatusOptions.map((o) => o.value)}
            selectedValues={selectedStatuses}
            onChange={onStatusesChange}
            getOptionLabel={(v) => expenseStatusOptions.find((o) => o.value === v)?.label || v}
          />
        )}

        {/* Payment Status Filter */}
        {showPaymentStatusFilter && onPaymentStatusesChange && (
          <FilterDropdown
            label="Payment"
            options={paymentStatusOptions.map((o) => o.value)}
            selectedValues={selectedPaymentStatuses}
            onChange={onPaymentStatusesChange}
            getOptionLabel={(v) => paymentStatusOptions.find((o) => o.value === v)?.label || v}
          />
        )}

        {/* Receipt Status Filter */}
        {showReceiptStatusFilter && onReceiptStatusesChange && (
          <FilterDropdown
            label="Receipt"
            options={receiptStatusOptions.map((o) => o.value)}
            selectedValues={selectedReceiptStatuses}
            onChange={onReceiptStatusesChange}
            getOptionLabel={(v) => receiptStatusOptions.find((o) => o.value === v)?.label || v}
          />
        )}

        {/* Currency Filter */}
        {showCurrencyFilter && onCurrenciesChange && (
          <FilterDropdown
            label="Currency"
            options={currencyOptions}
            selectedValues={selectedCurrencies}
            onChange={onCurrenciesChange}
            getOptionLabel={(v) => v}
          />
        )}

        {/* Bank Account (Paid From) Filter */}
        {showBankAccountFilter && onBankAccountIdsChange && bankAccounts.length > 0 && (
          <div className="relative" ref={bankAccountDropdownRef}>
            <button
              onClick={() => setBankAccountDropdownOpen(!bankAccountDropdownOpen)}
              className={`px-3 h-9 text-sm rounded-md border transition-colors inline-flex items-center gap-2 min-w-[120px] justify-between ${
                selectedBankAccountIds.length > 0
                  ? 'bg-[#5A7A8F]/10 text-[#5A7A8F] border-[#5A7A8F]/30'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className="truncate">
                <span className="text-gray-500 font-medium">Paid From:</span>{' '}
                <span className="font-medium">{getBankAccountDisplayText()}</span>
              </span>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${bankAccountDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {bankAccountDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[240px] max-h-[300px] overflow-y-auto py-1">
                {/* All option */}
                <button
                  onClick={() => {
                    onBankAccountIdsChange([]);
                    setBankAccountDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {selectedBankAccountIds.length === 0 && <Check className="h-4 w-4 text-[#5A7A8F]" />}
                  </div>
                  All Accounts
                </button>

                <div className="border-t border-gray-100 my-1" />

                {/* Not Specified Option */}
                <button
                  onClick={() => toggleBankAccount('not-specified')}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <div className="w-4 h-4 flex items-center justify-center border border-gray-300 rounded">
                    {selectedBankAccountIds.includes('not-specified') && (
                      <Check className="h-3 w-3 text-[#5A7A8F]" />
                    )}
                  </div>
                  <span className="text-gray-500 italic">Not Specified</span>
                </button>

                {/* Bank Account Options */}
                {bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => toggleBankAccount(account.id)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <div className="w-4 h-4 flex items-center justify-center border border-gray-300 rounded">
                      {selectedBankAccountIds.includes(account.id) && (
                        <Check className="h-3 w-3 text-[#5A7A8F]" />
                      )}
                    </div>
                    <span className="truncate">{getBankAccountDisplayName(account)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export Button */}
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>
    </div>
  );
}
