'use client';

import { useState, useMemo } from 'react';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { WhtSummaryBox } from '@/components/finances/WhtSummaryBox';
import { WhtTransactionTable } from '@/components/finances/WhtTransactionTable';
import WhtCertificatePrintView from '@/components/finances/WhtCertificatePrintView';
import {
  getAllWhtToSupplier,
  getWhtToSupplierByCompany,
  getWhtToSupplierSummaries,
} from '@/data/finances/mockWhtToSupplier';
import { getCompanyById } from '@/data/company/companies';
import { getContactById } from '@/data/contact/contacts';
import type { WhtToSupplier, WhtToSupplierSummary } from '@/data/finances/types';
import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';

// Mock companies
const companies = [
  { id: 'company-001', name: 'Faraway Yachting' },
  { id: 'company-002', name: 'Blue Horizon Maritime' },
];

export default function WhtToSupplierPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  // Initialize to current month
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1); // null = all periods

  // WHT Certificate print view state
  const [selectedTransaction, setSelectedTransaction] = useState<WhtToSupplier | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>(undefined);
  const [selectedSupplier, setSelectedSupplier] = useState<Contact | undefined>(undefined);
  const [showPrintView, setShowPrintView] = useState(false);

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    console.log('Exporting WHT to Supplier data...');
  };

  const handleDownloadCertificate = (transaction: WhtToSupplier) => {
    // Fetch company and supplier details
    const company = getCompanyById(transaction.companyId);
    const supplier = getContactById(transaction.supplierId);

    setSelectedTransaction(transaction);
    setSelectedCompany(company);
    setSelectedSupplier(supplier);
    setShowPrintView(true);
  };

  const handleClosePrintView = () => {
    setShowPrintView(false);
    setSelectedTransaction(null);
    setSelectedCompany(undefined);
    setSelectedSupplier(undefined);
  };

  const period = month ? `${year}-${String(month).padStart(2, '0')}` : null; // null = all periods

  // Get filtered data
  const { summaries, transactions, showCompany } = useMemo(() => {
    const allTransactions = getAllWhtToSupplier();

    // Filter by period (if specific month selected) or by year (if all periods)
    let periodFiltered = allTransactions;
    if (period) {
      periodFiltered = allTransactions.filter(t => t.period === period);
    } else {
      // All periods - filter by year only
      periodFiltered = allTransactions.filter(t => t.period.startsWith(`${year}-`));
    }

    let filtered = periodFiltered;
    if (dataScope !== 'all-companies') {
      const companyTransactions = getWhtToSupplierByCompany(dataScope);
      if (period) {
        filtered = companyTransactions.filter(t => t.period === period);
      } else {
        filtered = companyTransactions.filter(t => t.period.startsWith(`${year}-`));
      }
    }

    // Get summaries - for all periods, get all months in the year
    let allSummaries: WhtToSupplierSummary[] = [];
    if (period) {
      allSummaries = getWhtToSupplierSummaries(period);
    } else {
      // Get summaries for all months in the year
      for (let m = 1; m <= 12; m++) {
        const monthPeriod = `${year}-${String(m).padStart(2, '0')}`;
        const monthSummaries = getWhtToSupplierSummaries(monthPeriod);
        allSummaries = [...allSummaries, ...monthSummaries];
      }
    }

    const filteredSummaries: WhtToSupplierSummary[] = dataScope === 'all-companies'
      ? allSummaries
      : allSummaries.filter((s: WhtToSupplierSummary) => s.companyId === dataScope.replace('company-', '') || `company-${s.companyId}` === dataScope);

    return {
      summaries: filteredSummaries,
      transactions: filtered,
      showCompany: dataScope === 'all-companies',
    };
  }, [dataScope, period, year]);

  // Calculate totals
  const totalWht = transactions.reduce((sum, t) => sum + t.whtAmount, 0);
  const pnd3Total = transactions.filter(t => t.whtType === 'pnd3').reduce((sum, t) => sum + t.whtAmount, 0);
  const pnd53Total = transactions.filter(t => t.whtType === 'pnd53').reduce((sum, t) => sum + t.whtAmount, 0);
  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  // Calculate due date (only meaningful for specific month)
  const currentMonth = month || new Date().getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? year + 1 : year;
  const dueDate = new Date(nextYear, nextMonth - 1, 7);

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
            <h2 className="text-lg font-semibold mb-1">Withholding Tax</h2>
            <p className="text-sm text-white/70">
              Tax we withhold when making payments to suppliers (PND3 &amp; PND53)
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/70">Total WHT Amount</p>
            <p className="text-3xl font-bold">฿{totalWht.toLocaleString()}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-blue-200">PND3: ฿{pnd3Total.toLocaleString()}</span>
              <span className="text-purple-200">PND53: ฿{pnd53Total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Due Date Alert */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Filing Deadline: {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-yellow-700">
              {pendingCount > 0
                ? `${pendingCount} transaction${pendingCount !== 1 ? 's' : ''} pending submission`
                : 'All transactions filed'}
            </p>
          </div>
        </div>
        {pendingCount > 0 && (
          <button className="px-3 py-1.5 text-sm font-medium text-yellow-800 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors">
            Submit to Revenue Dept
          </button>
        )}
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
                type="to-supplier"
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
          type="to-supplier"
          showCompany={showCompany}
          onDownloadCertificate={handleDownloadCertificate}
        />
      </div>

      {/* WHT Certificate Print View */}
      {selectedTransaction && (
        <WhtCertificatePrintView
          transaction={selectedTransaction}
          company={selectedCompany}
          supplier={selectedSupplier}
          isOpen={showPrintView}
          onClose={handleClosePrintView}
        />
      )}
    </div>
  );
}
