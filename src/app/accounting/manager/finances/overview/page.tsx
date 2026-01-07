'use client';

import { useState, useMemo } from 'react';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { CashFlowCalendar } from '@/components/finances/CashFlowCalendar';
import { mockDailyCashFlow, filterCashFlowByCompany } from '@/data/finances/mockCashFlow';

// Mock companies - in production, fetch from API
const companies = [
  { id: 'company-001', name: 'Faraway Yachting' },
  { id: 'company-002', name: 'Blue Horizon Maritime' },
];

export default function FinancesOverviewPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1);

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    console.log('Exporting cash flow data...');
    // TODO: Implement export functionality
  };

  // Filter data based on company selection
  const filteredData = useMemo(() => {
    const companyId = dataScope === 'all-companies' ? '' : dataScope.replace('company-', '');
    return filterCashFlowByCompany(mockDailyCashFlow, companyId ? `company-${companyId}` : '');
  }, [dataScope]);

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

      {/* Cash Flow Calendar */}
      <CashFlowCalendar
        year={year}
        month={month || new Date().getMonth() + 1}
        dailyData={filteredData}
      />
    </div>
  );
}
