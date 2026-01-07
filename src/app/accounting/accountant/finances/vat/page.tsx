'use client';

import { useState, useMemo } from 'react';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { VatSummaryCards } from '@/components/finances/VatSummaryCards';
import { VatTransactionTable } from '@/components/finances/VatTransactionTable';
import {
  getAllVatTransactions,
  getVatTransactionsByCompany,
  getVatPeriodSummaries,
} from '@/data/finances/mockVatTransactions';

// Mock companies
const companies = [
  { id: 'company-001', name: 'Faraway Yachting' },
  { id: 'company-002', name: 'Blue Horizon Maritime' },
];

type VatSubTab = 'input' | 'output';

export default function VatPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1);
  const [activeSubTab, setActiveSubTab] = useState<VatSubTab>('output');

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    console.log('Exporting VAT data...');
  };

  const currentMonth = month || new Date().getMonth() + 1;
  const period = `${year}-${String(currentMonth).padStart(2, '0')}`;

  // Get filtered data
  const { vatInput, vatOutput, netVat, transactions, showCompany } = useMemo(() => {
    const allTransactions = getAllVatTransactions();
    const periodFiltered = allTransactions.filter(t => t.period === period);

    let filtered = periodFiltered;
    if (dataScope !== 'all-companies') {
      filtered = getVatTransactionsByCompany(dataScope).filter(t => t.period === period);
    }

    const inputTransactions = filtered.filter(t => t.direction === 'input');
    const outputTransactions = filtered.filter(t => t.direction === 'output');

    const vatInput = inputTransactions.reduce((sum, t) => sum + t.vatAmount, 0);
    const vatOutput = outputTransactions.reduce((sum, t) => sum + t.vatAmount, 0);

    return {
      vatInput,
      vatOutput,
      netVat: vatOutput - vatInput,
      transactions: activeSubTab === 'input' ? inputTransactions : outputTransactions,
      showCompany: dataScope === 'all-companies',
    };
  }, [dataScope, period, activeSubTab]);

  // Calculate due date (15th of following month)
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? year + 1 : year;
  const dueDate = new Date(nextYear, nextMonth - 1, 15);

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

      {/* Summary Cards */}
      <div className="mb-6">
        <VatSummaryCards
          vatInput={vatInput}
          vatOutput={vatOutput}
          netVat={netVat}
        />
      </div>

      {/* Due Date & Filing Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">
              VAT Filing Deadline: {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-blue-700">
              {netVat > 0
                ? `VAT payable: ฿${netVat.toLocaleString()}`
                : netVat < 0
                ? `VAT refundable: ฿${Math.abs(netVat).toLocaleString()}`
                : 'No VAT payable or refundable'}
            </p>
          </div>
        </div>
        <button className="px-3 py-1.5 text-sm font-medium text-blue-800 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
          Generate PP30 Form
        </button>
      </div>

      {/* Sub-tabs for Input/Output */}
      <div className="mb-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveSubTab('output')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'output'
                ? 'border-[#5A7A8F] text-[#5A7A8F]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            VAT Output (Sales)
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
              ฿{vatOutput.toLocaleString()}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('input')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'input'
                ? 'border-[#5A7A8F] text-[#5A7A8F]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            VAT Input (Purchases)
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
              ฿{vatInput.toLocaleString()}
            </span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
          {activeSubTab === 'output' ? 'VAT Output Transactions' : 'VAT Input Transactions'}
        </h3>
        <VatTransactionTable
          transactions={transactions}
          showCompany={showCompany}
        />
      </div>
    </div>
  );
}
