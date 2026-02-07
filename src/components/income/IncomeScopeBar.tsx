'use client';

import { Download, ChevronDown } from 'lucide-react';
import { Currency } from '@/data/company/types';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';

// Generic status type - will be customized per page
export type IncomeDocumentStatus = string;

interface IncomeScopeBarProps {
  // Data scope
  dataScope: string; // Format: "all-companies" | "company-{id}" | "project-{id}"
  onDataScopeChange: (scope: string) => void;
  companies: Array<{ id: string; name: string }>;
  projects?: Array<{ id: string; name: string }>;

  // Date range
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;

  // Currency filter (optional - shown only if multi-currency)
  selectedCurrencies?: Currency[];
  onCurrenciesChange?: (currencies: Currency[]) => void;
  showCurrencyFilter?: boolean;

  // Status filter (page-specific)
  selectedStatuses?: string[];
  onStatusesChange?: (statuses: string[]) => void;
  statusOptions?: Array<{ value: string; label: string }>;

  // Actions
  onExport: () => void;
}

export function IncomeScopeBar({
  dataScope,
  onDataScopeChange,
  companies,
  projects = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  selectedCurrencies = [],
  onCurrenciesChange,
  showCurrencyFilter = false,
  selectedStatuses = [],
  onStatusesChange,
  statusOptions = [],
  onExport,
}: IncomeScopeBarProps) {
  const { options: currencyOptionsList } = useCurrencyOptions();
  const currencyOptions: Currency[] = currencyOptionsList.map(o => o.value as Currency);

  const toggleCurrency = (currency: Currency) => {
    if (!onCurrenciesChange) return;

    if (selectedCurrencies.includes(currency)) {
      onCurrenciesChange(selectedCurrencies.filter(c => c !== currency));
    } else {
      onCurrenciesChange([...selectedCurrencies, currency]);
    }
  };

  const toggleStatus = (status: string) => {
    if (!onStatusesChange) return;

    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
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
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Data Scope:</label>
              <select
                value={dataScope}
                onChange={(e) => onDataScopeChange(e.target.value)}
                className="px-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm min-w-[250px] bg-white"
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
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Period:</label>
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

      {/* Row 2 - Currency Filter (conditional) */}
      {showCurrencyFilter && onCurrenciesChange && (
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Currency:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCurrenciesChange([])}
                className={`px-3 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
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
                  className={`px-3 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
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
        </div>
      )}

      {/* Row 3 - Status Filter (page-specific) */}
      {statusOptions.length > 0 && onStatusesChange && (
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onStatusesChange([])}
                className={`px-3 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
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
                  className={`px-3 h-7 text-xs font-medium rounded-md border transition-colors inline-flex items-center ${
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
        </div>
      )}
    </div>
  );
}
