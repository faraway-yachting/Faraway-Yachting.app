'use client';

import { Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface FinancesScopeBarProps {
  // Data scope
  dataScope: string; // Format: "all-companies" | "company-{id}"
  onDataScopeChange: (scope: string) => void;
  companies: Array<{ id: string; name: string }>;

  // Period (month-based)
  year: number;
  month: number | null; // 1-12 or null for all periods
  onPeriodChange: (year: number, month: number | null) => void;

  // Optional actions
  onExport?: () => void;
  showExport?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function FinancesScopeBar({
  dataScope,
  onDataScopeChange,
  companies,
  year,
  month,
  onPeriodChange,
  onExport,
  showExport = true,
}: FinancesScopeBarProps) {
  const handlePreviousMonth = () => {
    if (month === null) {
      // If "All Periods", go to previous year
      onPeriodChange(year - 1, null);
    } else if (month === 1) {
      onPeriodChange(year - 1, 12);
    } else {
      onPeriodChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === null) {
      // If "All Periods", go to next year
      onPeriodChange(year + 1, null);
    } else if (month === 12) {
      onPeriodChange(year + 1, 1);
    } else {
      onPeriodChange(year, month + 1);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'all') {
      onPeriodChange(year, null);
    } else {
      onPeriodChange(year, parseInt(value));
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPeriodChange(parseInt(e.target.value), month);
  };

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Data Scope & Period */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Data Scope */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Company:</label>
              <select
                value={dataScope}
                onChange={(e) => onDataScopeChange(e.target.value)}
                className="px-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm min-w-[200px] bg-white"
              >
                <option value="all-companies">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={`company-${company.id}`}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Period:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousMonth}
                  className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>

                <select
                  value={month === null ? 'all' : month}
                  onChange={handleMonthChange}
                  className="px-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm bg-white"
                >
                  <option value="all">All Periods</option>
                  {MONTH_NAMES.map((name, index) => (
                    <option key={index + 1} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={handleYearChange}
                  className="px-3 h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm bg-white"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Export Button */}
          {showExport && onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center gap-2 px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
