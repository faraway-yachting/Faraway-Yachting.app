'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, FileDown, FileText, XCircle, Building2, CheckCircle } from 'lucide-react';
import { mockReceipts } from '@/data/income/mockData';
import { getCompanyById, getActiveCompanies } from '@/data/company/companies';
import type { ReceiptStatus } from '@/data/income/types';
import type { Currency } from '@/data/company/types';

// Status tabs configuration
const statusTabs = [
  { label: 'Recent', value: 'recent' as const },
  { label: 'All', value: 'all' as const },
  { label: 'Draft', value: 'draft' as ReceiptStatus },
  { label: 'Paid', value: 'paid' as ReceiptStatus },
  { label: 'Void', value: 'void' as ReceiptStatus },
];

// Status badge styling
const getStatusBadge = (status: ReceiptStatus) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-700 border border-gray-300',
    paid: 'bg-green-100 text-green-700 border border-green-300',
    void: 'bg-red-50 text-red-600 border border-red-200',
  };

  const labels = {
    draft: 'Draft',
    paid: 'Paid',
    void: 'Void',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// Filter interface
interface FilterState {
  companyId: string;
  currency: Currency | '';
  dateFrom: string;
  dateTo: string;
}

// Currency options
const currencyOptions: Currency[] = ['USD', 'EUR', 'GBP', 'THB', 'SGD', 'AED'];

export default function ReceiptsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReceiptStatus | 'all' | 'recent'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    companyId: '',
    currency: '',
    dateFrom: '',
    dateTo: '',
  });

  const companies = getActiveCompanies();

  // Check if any filters are active
  const hasActiveFilters = filters.companyId || filters.currency || filters.dateFrom || filters.dateTo;

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      companyId: '',
      currency: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  // Filter receipts based on active tab and filters
  const filteredReceipts = mockReceipts.filter((receipt) => {
    // Status filter
    if (activeTab !== 'all' && activeTab !== 'recent') {
      if (receipt.status !== activeTab) return false;
    }

    // Company filter
    if (filters.companyId && receipt.companyId !== filters.companyId) {
      return false;
    }

    // Currency filter
    if (filters.currency && receipt.currency !== filters.currency) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      const receiptDate = new Date(receipt.receiptDate);
      if (receiptDate < fromDate) return false;
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      const receiptDate = new Date(receipt.receiptDate);
      if (receiptDate > toDate) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        receipt.receiptNumber.toLowerCase().includes(query) ||
        receipt.clientName.toLowerCase().includes(query) ||
        (receipt.reference || '').toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Export to CSV
  const handleExport = () => {
    const headers = ['Receipt No.', 'Company', 'Customer', 'Receipt Date', 'Invoice Ref', 'Currency', 'Total Received', 'Status'];
    const rows = filteredReceipts.map(rcp => [
      rcp.receiptNumber,
      getCompanyById(rcp.companyId)?.name || '-',
      rcp.clientName,
      new Date(rcp.receiptDate).toLocaleDateString('en-US'),
      rcp.reference || '-',
      rcp.currency,
      rcp.totalReceived.toFixed(2),
      rcp.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `receipts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Navigate to edit page
  const handleRowClick = (receiptId: string) => {
    router.push(`/accounting/manager/income/receipts/${receiptId}`);
  };

  // Calculate summary statistics
  const stats = {
    total: filteredReceipts.length,
    totalReceived: filteredReceipts.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.totalReceived, 0),
  };

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {statusTabs.map((tab) => {
              const isActive = activeTab === tab.value;
              let count: number;

              if (tab.value === 'all' || tab.value === 'recent') {
                count = mockReceipts.length;
              } else {
                count = mockReceipts.filter(r => r.status === tab.value).length;
              }

              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`
                    flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${isActive
                      ? 'border-[#5A7A8F] text-[#5A7A8F] bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {tab.label}
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-semibold
                    ${isActive
                      ? 'bg-[#5A7A8F] text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            {/* Search */}
            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md">
              <input
                type="text"
                placeholder="Search by receipt no., customer, or invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
                  showFilterPanel || hasActiveFilters
                    ? 'text-[#5A7A8F] bg-blue-50 border-[#5A7A8F]'
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#5A7A8F] text-white rounded-full">
                    {[filters.companyId, filters.currency, filters.dateFrom, filters.dateTo].filter(Boolean).length}
                  </span>
                )}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => router.push('/accounting/manager/income/receipts/new')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>New Receipt</span>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[#5A7A8F] hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Company Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                  <select
                    value={filters.companyId}
                    onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  >
                    <option value="">All Companies</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Currency Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
                  <select
                    value={filters.currency}
                    onChange={(e) => setFilters({ ...filters, currency: e.target.value as Currency | '' })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  >
                    <option value="">All Currencies</option>
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Receipt Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Receipt Date To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Ref
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Received
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                    No receipts found
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => {
                  return (
                    <tr
                      key={receipt.id}
                      onClick={() => handleRowClick(receipt.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-[#5A7A8F] hover:underline">
                            {receipt.receiptNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {getCompanyById(receipt.companyId)?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{receipt.clientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(receipt.receiptDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {receipt.reference || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                          {receipt.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {receipt.totalReceived.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(receipt.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {receipt.status === 'draft' && (
                            <button className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {receipt.status !== 'void' && (
                            <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Void">
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRowClick(receipt.id)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {filteredReceipts.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredReceipts.length}</span> receipt{filteredReceipts.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-6">
                <div className="text-gray-600">
                  Total Received (Paid): <span className="font-semibold text-green-600">
                    USD {stats.totalReceived.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
