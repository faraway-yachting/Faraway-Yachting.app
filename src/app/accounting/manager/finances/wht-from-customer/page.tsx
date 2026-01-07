'use client';

import { useState, useMemo } from 'react';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { WhtSummaryBox } from '@/components/finances/WhtSummaryBox';
import { WhtTransactionTable } from '@/components/finances/WhtTransactionTable';
import {
  getAllWhtFromCustomer,
  getWhtFromCustomerByCompany,
  getWhtFromCustomerSummaries,
} from '@/data/finances/mockWhtFromCustomer';

// Mock companies
const companies = [
  { id: 'company-001', name: 'Faraway Yachting' },
  { id: 'company-002', name: 'Blue Horizon Maritime' },
];

export default function WhtFromCustomerPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1);

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    console.log('Exporting WHT from Customer data...');
  };

  const currentMonth = month || new Date().getMonth() + 1;
  const period = `${year}-${String(currentMonth).padStart(2, '0')}`;

  // Get filtered data
  const { summaries, transactions, showCompany } = useMemo(() => {
    const allTransactions = getAllWhtFromCustomer();
    const periodFiltered = allTransactions.filter(t => t.period === period);

    let filtered = periodFiltered;
    if (dataScope !== 'all-companies') {
      filtered = getWhtFromCustomerByCompany(dataScope).filter(t => t.period === period);
    }

    const summaries = getWhtFromCustomerSummaries(period);
    const filteredSummaries = dataScope === 'all-companies'
      ? summaries
      : summaries.filter(s => s.companyId === dataScope.replace('company-', '') || `company-${s.companyId}` === dataScope);

    return {
      summaries: filteredSummaries,
      transactions: filtered,
      showCompany: dataScope === 'all-companies',
    };
  }, [dataScope, period]);

  // Calculate totals
  const totalWht = transactions.reduce((sum, t) => sum + t.whtAmount, 0);
  const pendingCount = transactions.filter(t => t.status === 'pending').length;

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

      {/* Summary Header */}
      <div className="bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] rounded-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Withheld Tax</h2>
            <p className="text-sm text-white/70">
              Tax withheld by customers when they make payments to us
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/70">Total WHT Amount</p>
            <p className="text-3xl font-bold">฿{totalWht.toLocaleString()}</p>
            {pendingCount > 0 && (
              <p className="text-sm text-yellow-300 mt-1">
                {pendingCount} pending certificate{pendingCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Boxes by Company */}
      {summaries.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Monthly Summary by Company
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map((summary) => (
              <WhtSummaryBox
                key={`${summary.companyId}-${summary.period}`}
                summary={summary}
                type="from-customer"
              />
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
          Transactions
        </h3>
        <WhtTransactionTable
          transactions={transactions}
          type="from-customer"
          showCompany={showCompany}
        />
      </div>
    </div>
  );
}
