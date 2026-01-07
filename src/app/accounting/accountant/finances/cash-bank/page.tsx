'use client';

import { useState, useMemo } from 'react';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { AccountGroupSection } from '@/components/finances/AccountGroupSection';
import {
  mockAccountBalances,
  filterAccountsByCompany,
  getAccountBalancesByGroup,
} from '@/data/finances/mockAccountBalances';

// Mock companies - in production, fetch from API
const companies = [
  { id: 'company-001', name: 'Faraway Yachting' },
  { id: 'company-002', name: 'Blue Horizon Maritime' },
];

export default function CashBankPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1);

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    console.log('Exporting account balances...');
    // TODO: Implement export functionality
  };

  // Filter and group data
  const { groups, showCompany } = useMemo(() => {
    const filtered = filterAccountsByCompany(mockAccountBalances, dataScope);
    const groups = getAccountBalancesByGroup(filtered);
    const showCompany = dataScope === 'all-companies';
    return { groups, showCompany };
  }, [dataScope]);

  // Calculate grand total by currency
  const grandTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    groups.forEach(group => {
      group.accounts.forEach(acc => {
        if (!totals[acc.currency]) {
          totals[acc.currency] = 0;
        }
        totals[acc.currency] += acc.currentBalance;
      });
    });
    return totals;
  }, [groups]);

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

      {/* Grand Total Summary */}
      <div className="bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] rounded-lg p-6 mb-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Total Balances</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(grandTotals).map(([currency, total]) => (
            <div key={currency}>
              <p className="text-sm text-white/70">{currency}</p>
              <p className="text-2xl font-bold">
                {currency === 'THB' && '฿'}
                {currency === 'USD' && '$'}
                {currency === 'EUR' && '€'}
                {currency === 'SGD' && 'S$'}
                {total.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Account Groups */}
      <div className="space-y-6">
        {groups.map((group) => (
          <AccountGroupSection
            key={group.type}
            type={group.type}
            label={group.label}
            accounts={group.accounts}
            totalBalance={group.totalBalance}
            showCompany={showCompany}
          />
        ))}
      </div>

      {/* Empty State */}
      {groups.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No accounts found for the selected criteria</p>
        </div>
      )}
    </div>
  );
}
