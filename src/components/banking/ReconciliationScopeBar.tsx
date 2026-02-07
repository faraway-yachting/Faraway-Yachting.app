'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Download, RefreshCw, ChevronDown } from 'lucide-react';
import { ReconciliationScope, ViewMode, BankFeedStatus } from '@/data/banking/bankReconciliationTypes';
import { Currency } from '@/data/company/types';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';

interface ReconciliationScopeBarProps {
  dataScope: string; // Format: "all-companies" | "company-{id}" | "project-{id}"
  onDataScopeChange: (scope: string) => void;
  companies: Array<{ id: string; name: string }>;
  projects?: Array<{ id: string; name: string }>; // Optional project list

  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;

  selectedBankAccountIds: string[];
  onBankAccountIdsChange: (ids: string[]) => void;
  bankAccounts: Array<{ id: string; name: string; companyName: string; currency: Currency }>;

  selectedCurrencies: Currency[];
  onCurrenciesChange: (currencies: Currency[]) => void;

  selectedStatuses: BankFeedStatus[];
  onStatusesChange: (statuses: BankFeedStatus[]) => void;

  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  showUnassignedLines?: boolean;
  onShowUnassignedLinesChange?: (show: boolean) => void;

  onImport: () => void;
  onExport: () => void;
}

export function ReconciliationScopeBar({
  dataScope,
  onDataScopeChange,
  companies,
  projects = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  selectedBankAccountIds,
  onBankAccountIdsChange,
  bankAccounts,
  selectedCurrencies,
  onCurrenciesChange,
  selectedStatuses,
  onStatusesChange,
  viewMode,
  onViewModeChange,
  showUnassignedLines = true,
  onShowUnassignedLinesChange,
  onImport,
  onExport,
}: ReconciliationScopeBarProps) {
  const statusOptions: { value: BankFeedStatus; label: string }[] = [
    { value: 'missing_record', label: 'Missing record' },
    { value: 'unmatched', label: 'Unmatched' },
    { value: 'needs_review', label: 'Needs review' },
    { value: 'matched', label: 'Matched' },
    { value: 'partially_matched', label: 'Partially matched' },
    { value: 'ignored', label: 'Ignored' },
  ];

  const { options: currencyOptionsList } = useCurrencyOptions();
  const currencyOptions: Currency[] = currencyOptionsList.map(o => o.value as Currency);

  const toggleStatus = (status: BankFeedStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const toggleCurrency = (currency: Currency) => {
    if (selectedCurrencies.includes(currency)) {
      onCurrenciesChange(selectedCurrencies.filter(c => c !== currency));
    } else {
      onCurrenciesChange([...selectedCurrencies, currency]);
    }
  };

  // Bank accounts dropdown state
  const [isBankAccountsOpen, setIsBankAccountsOpen] = useState(false);
  const bankAccountsDropdownRef = useRef<HTMLDivElement>(null);

  // Calculate unique currencies from selected or all bank accounts
  // Used to conditionally show currency filter only when multiple currencies exist
  const relevantBankAccounts = selectedBankAccountIds.length > 0
    ? bankAccounts.filter(acc => selectedBankAccountIds.includes(acc.id))
    : bankAccounts;
  const uniqueCurrencies = Array.from(new Set(relevantBankAccounts.map(acc => acc.currency)));
  const shouldShowCurrencyFilter = uniqueCurrencies.length > 1;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bankAccountsDropdownRef.current && !bankAccountsDropdownRef.current.contains(event.target as Node)) {
        setIsBankAccountsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleBankAccount = (accountId: string) => {
    if (selectedBankAccountIds.includes(accountId)) {
      onBankAccountIdsChange(selectedBankAccountIds.filter(id => id !== accountId));
    } else {
      onBankAccountIdsChange([...selectedBankAccountIds, accountId]);
    }
  };

  // Group accounts by company
  const accountsByCompany: Record<string, typeof bankAccounts> = {};
  bankAccounts.forEach((account) => {
    if (!accountsByCompany[account.companyName]) {
      accountsByCompany[account.companyName] = [];
    }
    accountsByCompany[account.companyName].push(account);
  });

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      {/* Row 1 - Scope & Period */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Data Scope */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Data Scope:</label>
            <select
              value={dataScope}
              onChange={(e) => onDataScopeChange(e.target.value)}
              className="px-3 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm min-w-[250px]"
            >
              <option value="all-companies">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={`company-${company.id}`}>
                  Company: {company.name}
                </option>
              ))}
              {projects.map((project) => (
                <option key={project.id} value={`project-${project.id}`}>
                  Project: {project.name}
                </option>
              ))}
            </select>

            {/* Show unassigned checkbox - only for project scope */}
            {dataScope.startsWith('project-') && onShowUnassignedLinesChange && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnassignedLines}
                  onChange={(e) => onShowUnassignedLinesChange(e.target.checked)}
                  className="w-4 h-4 text-[#5A7A8F] border-gray-300 rounded focus:ring-[#5A7A8F]"
                />
                <span>Show unassigned lines</span>
              </label>
            )}
          </div>

          {/* Right: Date Range + Actions */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="px-3 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="px-3 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
            />
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Import / Sync
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 h-10 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Row 2 - Bank & Currency */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Bank Accounts */}
          <div className="flex items-center gap-3 relative" ref={bankAccountsDropdownRef}>
            <label className="text-sm font-medium text-gray-700">Bank Accounts:</label>
            <div className="relative">
              <button
                onClick={() => setIsBankAccountsOpen(!isBankAccountsOpen)}
                className="px-3 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm min-w-[300px] flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-700">
                  {selectedBankAccountIds.length === 0
                    ? 'All accounts in scope'
                    : `${selectedBankAccountIds.length} selected`}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isBankAccountsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isBankAccountsOpen && (
                <div className="absolute top-full left-0 mt-1 w-[400px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
                  <div className="p-2">
                    {Object.entries(accountsByCompany).map(([companyName, accounts]) => (
                      <div key={companyName} className="mb-2">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 sticky top-0">
                          {companyName}
                        </div>
                        <div className="py-1">
                          {accounts.map((account) => (
                            <label
                              key={account.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer rounded transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedBankAccountIds.includes(account.id)}
                                onChange={() => toggleBankAccount(account.id)}
                                className="w-4 h-4 text-[#5A7A8F] border-gray-300 rounded focus:ring-[#5A7A8F]"
                              />
                              <div className="flex-1">
                                <div className="text-sm text-gray-900">{account.name}</div>
                                <div className="text-xs text-gray-500">{account.currency}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer with clear all button */}
                  <div className="border-t border-gray-200 p-2 bg-gray-50 sticky bottom-0">
                    <button
                      onClick={() => onBankAccountIdsChange([])}
                      className="w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Currency Filter Pills */}
          {shouldShowCurrencyFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Currency:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => onCurrenciesChange([])}
                  className={`px-3 h-8 text-xs font-medium rounded-full border transition-colors inline-flex items-center ${
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
                    className={`px-3 h-8 text-xs font-medium rounded-full border transition-colors inline-flex items-center ${
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

      {/* Row 3 - Reconciliation State */}
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status Filter Pills */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onStatusesChange([])}
                className={`px-3 h-8 text-xs font-medium rounded-full border transition-colors inline-flex items-center ${
                  selectedStatuses.length === 0
                    ? 'bg-[#5A7A8F] text-white border-[#5A7A8F]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {statusOptions.map((statusOption) => (
                <button
                  key={statusOption.value}
                  onClick={() => toggleStatus(statusOption.value)}
                  className={`px-3 h-8 text-xs font-medium rounded-full border transition-colors inline-flex items-center ${
                    selectedStatuses.includes(statusOption.value)
                      ? 'bg-[#5A7A8F] text-white border-[#5A7A8F]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {statusOption.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: View Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => onViewModeChange('bank-first')}
                className={`px-3 h-8 text-xs font-medium transition-colors inline-flex items-center ${
                  viewMode === 'bank-first'
                    ? 'bg-[#5A7A8F] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Bank-first
              </button>
              <button
                onClick={() => onViewModeChange('system-first')}
                className={`px-3 h-8 text-xs font-medium border-l border-gray-300 transition-colors inline-flex items-center ${
                  viewMode === 'system-first'
                    ? 'bg-[#5A7A8F] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                System-first
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
