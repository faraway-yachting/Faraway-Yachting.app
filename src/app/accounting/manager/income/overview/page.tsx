'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IncomeScopeBar } from '@/components/income/IncomeScopeBar';
import { AlertsPanel } from '@/components/income/AlertsPanel';
import { RecentTransactions } from '@/components/income/RecentTransactions';
import { DollarSign, FileText, Receipt, TrendingUp, Calendar, ArrowUpRight, Plus } from 'lucide-react';
import { getAllCompanies } from '@/data/company/companies';
import { getAllProjects } from '@/data/banking/projects';
import { mockInvoices, mockReceipts, mockQuotations } from '@/data/income/mockData';

export default function IncomeOverviewPage() {
  const router = useRouter();

  // State
  const [dataScope, setDataScope] = useState('all-companies');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState('2025-12-31');

  // Get data
  const companies = getAllCompanies();
  const allProjects = getAllProjects();
  const projects = allProjects.map(p => ({ id: p.id, name: p.name }));

  // Calculate KPIs
  const totalRevenue = 15461.5;
  const totalAR = mockInvoices.reduce((sum, inv) => sum + inv.amountOutstanding, 0);
  const totalCash = mockReceipts.reduce((sum, rcp) => sum + rcp.totalReceived, 0);
  const openQuotations = mockQuotations.filter(q => q.status === 'draft' || q.status === 'accepted').length;
  const unpaidInvoices = mockInvoices.filter(inv => inv.amountOutstanding > 0).length;
  const avgDaysToPayment = 14;

  // Calculate alerts
  const overdueInvoices = useMemo(() => {
    const today = new Date();
    return mockInvoices.filter(inv => {
      const dueDate = new Date(inv.dueDate);
      return inv.amountOutstanding > 0 && dueDate < today && inv.status !== 'void';
    });
  }, []);

  const expiringQuotations = useMemo(() => {
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return mockQuotations.filter(q => {
      const validUntil = new Date(q.validUntil);
      return (q.status === 'draft' || q.status === 'accepted') && validUntil <= sevenDaysFromNow && validUntil >= today;
    });
  }, []);

  const unreconciledReceipts = useMemo(() => {
    return mockReceipts.filter(r => r.status === 'draft' || r.status === 'paid');
  }, []);

  const handleExport = () => {
    console.log('Export income data');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Scope Bar */}
      <IncomeScopeBar
        dataScope={dataScope}
        onDataScopeChange={setDataScope}
        companies={companies}
        projects={projects}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onExport={handleExport}
      />

      {/* Hero Metrics - Primary Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <div
          onClick={() => router.push('/accounting/manager/income/invoices')}
          className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-green-500 p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-5xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600 mt-2">
              <ArrowUpRight className="h-4 w-4" />
              <span>+12.5% vs last period</span>
            </div>
          </div>
        </div>

        {/* Cash Received */}
        <div
          onClick={() => router.push('/accounting/manager/income/receipts')}
          className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-blue-500 p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Cash Received</h3>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-5xl font-bold text-gray-900">{formatCurrency(totalCash)}</div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600 mt-2">
              <ArrowUpRight className="h-4 w-4" />
              <span>+8.3% vs last period</span>
            </div>
          </div>
        </div>

        {/* AR Outstanding */}
        <div
          onClick={() => router.push('/accounting/manager/income/invoices?filter=unpaid')}
          className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-yellow-500 p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">AR Outstanding</h3>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-5xl font-bold text-gray-900">{formatCurrency(totalAR)}</div>
            <div className="text-sm font-medium text-amber-600 mt-2">⚠ 2 overdue invoices</div>
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      <AlertsPanel
        overdueInvoices={overdueInvoices}
        expiringQuotations={expiringQuotations}
        unreconciledReceipts={unreconciledReceipts}
      />

      {/* Secondary Metrics - Operational KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Open Quotations */}
        <div
          onClick={() => router.push('/accounting/manager/income/quotations?filter=open')}
          className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer h-24 flex items-center justify-between"
        >
          <div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Open Quotations</h3>
            <div className="text-xl font-bold text-gray-900">{openQuotations}</div>
            <div className="text-xs text-gray-500">Awaiting response</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div
          onClick={() => router.push('/accounting/manager/income/invoices?filter=unpaid')}
          className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer h-24 flex items-center justify-between"
        >
          <div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Unpaid Invoices</h3>
            <div className="text-xl font-bold text-gray-900">{unpaidInvoices}</div>
            <div className="text-xs text-gray-500">{formatCurrency(totalAR)} total</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-yellow-600" />
          </div>
        </div>

        {/* Avg Days to Payment */}
        <div
          onClick={() => router.push('/accounting/manager/income/receipts')}
          className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer h-24 flex items-center justify-between"
        >
          <div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Avg Days to Payment</h3>
            <div className="text-xl font-bold text-gray-900">{avgDaysToPayment} days</div>
            <div className="text-xs text-green-600">Improving</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-green-600" />
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="p-0">
          <RecentTransactions
            quotations={mockQuotations}
            invoices={mockInvoices}
            receipts={mockReceipts}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => console.log('New Quotation')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4A6A7F] transition-colors font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          New Quotation
        </button>
        <button
          onClick={() => console.log('New Invoice')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4A6A7F] transition-colors font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          New Invoice
        </button>
        <button
          onClick={() => console.log('Record Receipt')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4A6A7F] transition-colors font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Record Receipt
        </button>
      </div>
    </div>
  );
}
