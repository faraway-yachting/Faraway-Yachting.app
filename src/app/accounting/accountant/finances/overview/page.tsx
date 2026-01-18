'use client';

import { useState, useEffect } from 'react';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { CashFlowCalendar } from '@/components/finances/CashFlowCalendar';
import { cashFlowApi, type CurrencyCashFlowSummary } from '@/lib/supabase/api/cashFlow';
import type { DailyCashFlow } from '@/data/finances/types';

// Currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  AED: 'د.إ',
};

export default function FinancesOverviewPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1);

  // Real data from Supabase
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [dailyCashFlow, setDailyCashFlow] = useState<DailyCashFlow[]>([]);
  const [currencySummary, setCurrencySummary] = useState<{
    byCurrency: CurrencyCashFlowSummary[];
    totalInTHB: number;
    totalOutTHB: number;
    netMovementTHB: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    console.log('Exporting cash flow data...');
  };

  const currentMonth = month || new Date().getMonth() + 1;

  // Fetch companies and cash flow data from Supabase
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const companyId = dataScope !== 'all-companies' ? dataScope : undefined;

        const [companiesData, cashFlowData, summaryData] = await Promise.all([
          cashFlowApi.getCompanies(),
          cashFlowApi.getDailyCashFlow(year, currentMonth, companyId),
          cashFlowApi.getCashFlowSummaryByCurrency(year, currentMonth, companyId),
        ]);

        setCompanies(companiesData);
        setDailyCashFlow(cashFlowData);
        setCurrencySummary(summaryData);
      } catch (error) {
        console.error('Failed to fetch cash flow data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [year, currentMonth, dataScope]);

  return (
    <div>
      {/* Scope Bar */}
      <FinancesScopeBar
        dataScope={dataScope}
        onDataScopeChange={setDataScope}
        companies={companies}
        year={year}
        month={month}
        onPeriodChange={handlePeriodChange}
        onExport={handleExport}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F]"></div>
          <span className="ml-3 text-gray-500">Loading cash flow data...</span>
        </div>
      ) : (
        <>
          {/* Currency Summary Cards */}
          {currencySummary && currencySummary.byCurrency.length > 0 && (
            <div className="bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] rounded-lg p-6 mb-6 text-white">
              <h2 className="text-lg font-semibold mb-4">Cash Flow Summary</h2>

              {/* By Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {currencySummary.byCurrency.map((item) => (
                  <div key={item.currency} className="bg-white/10 rounded-lg p-4">
                    <div className="text-sm text-white/70 mb-2">{item.currency}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/60">In:</span>
                        <span className="text-sm font-medium text-green-300">
                          +{CURRENCY_SYMBOLS[item.currency] || ''}{item.totalIn.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/60">Out:</span>
                        <span className="text-sm font-medium text-red-300">
                          -{CURRENCY_SYMBOLS[item.currency] || ''}{item.totalOut.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-white/20 pt-1 mt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white/60">Net:</span>
                          <span className={`text-sm font-semibold ${
                            item.netMovement >= 0 ? 'text-green-300' : 'text-red-300'
                          }`}>
                            {item.netMovement >= 0 ? '+' : ''}
                            {CURRENCY_SYMBOLS[item.currency] || ''}{item.netMovement.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* THB Equivalent Total */}
              <div className="border-t border-white/20 pt-4">
                <div className="text-sm text-white/70 mb-2">Total (THB Equivalent)</div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-white/60">Total In</div>
                    <div className="text-2xl font-bold text-green-300">
                      +฿{currencySummary.totalInTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Total Out</div>
                    <div className="text-2xl font-bold text-red-300">
                      -฿{currencySummary.totalOutTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Net Movement</div>
                    <div className={`text-2xl font-bold ${
                      currencySummary.netMovementTHB >= 0 ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {currencySummary.netMovementTHB >= 0 ? '+' : ''}฿{currencySummary.netMovementTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cash Flow Calendar */}
          <CashFlowCalendar
            year={year}
            month={currentMonth}
            dailyData={dailyCashFlow}
          />
        </>
      )}
    </div>
  );
}
