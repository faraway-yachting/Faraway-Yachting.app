'use client';

import { useState, useMemo, useEffect } from 'react';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { AccountGroupSection } from '@/components/finances/AccountGroupSection';
import { accountBalancesApi } from '@/lib/supabase/api/accountBalances';
import type { AccountBalance, AccountBalanceGroup } from '@/data/finances/types';

export default function CashBankPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1);

  // Real data from Supabase
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    console.log('Exporting account balances...');
  };

  // Fetch companies and account balances from Supabase
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const companyId = dataScope !== 'all-companies' ? dataScope : undefined;

        const [companiesData, balancesData] = await Promise.all([
          accountBalancesApi.getCompanies(),
          accountBalancesApi.getAll(companyId),
        ]);

        setCompanies(companiesData);
        setAccountBalances(balancesData);
      } catch (error) {
        console.error('Failed to fetch account balances:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [dataScope]);

  // Group accounts by type
  const groups = useMemo(() => {
    return accountBalancesApi.groupByType(accountBalances);
  }, [accountBalances]);

  const showCompany = dataScope === 'all-companies';

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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F]"></div>
          <span className="ml-3 text-gray-500">Loading account balances...</span>
        </div>
      ) : (
        <>
          {/* Grand Total Summary */}
          <div className="bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] rounded-lg p-6 mb-6 text-white">
            <h2 className="text-lg font-semibold mb-4">Total Balances</h2>
            {Object.keys(grandTotals).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(grandTotals).map(([currency, total]) => (
                  <div key={currency}>
                    <p className="text-sm text-white/70">{currency}</p>
                    <p className="text-2xl font-bold">
                      {currency === 'THB' && '฿'}
                      {currency === 'USD' && '$'}
                      {currency === 'EUR' && '€'}
                      {currency === 'SGD' && 'S$'}
                      {currency === 'GBP' && '£'}
                      {currency === 'AED' && 'د.إ'}
                      {total.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/70">No accounts configured</p>
            )}
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
              <p className="text-gray-500">No bank accounts found.</p>
              <p className="text-sm text-gray-400 mt-1">
                Add bank accounts in Settings to see account balances here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
