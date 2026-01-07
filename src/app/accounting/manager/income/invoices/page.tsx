'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, FileDown, FileText, CheckCircle, XCircle, Building2, AlertTriangle } from 'lucide-react';
import { mockInvoices } from '@/data/income/mockData';
import { getCompanyById, getActiveCompanies } from '@/data/company/companies';
import { isInvoiceOverdue, getPaymentTermsLabel } from '@/data/income/invoices';
import type { InvoiceStatus } from '@/data/income/types';
import type { Currency } from '@/data/company/types';

// Status tabs configuration
const statusTabs = [
  { label: 'Recent', value: 'recent' as const },
  { label: 'All', value: 'all' as const },
  { label: 'Draft', value: 'draft' as InvoiceStatus },
  { label: 'Issued', value: 'issued' as InvoiceStatus },
  { label: 'Overdue', value: 'overdue' as const },
  { label: 'Void', value: 'void' as InvoiceStatus },
];

// Status badge styling
const getStatusBadge = (status: InvoiceStatus, isOverdue: boolean = false) => {
  if (isOverdue && status === 'issued') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  const styles = {
    draft: 'bg-gray-100 text-gray-700 border border-gray-300',
    issued: 'bg-blue-100 text-blue-700 border border-blue-300',
    void: 'bg-red-50 text-red-600 border border-red-200',
  };

  const labels = {
    draft: 'Draft',
    issued: 'Issued',
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

export default function InvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<InvoiceStatus | 'all' | 'recent' | 'overdue'>('recent');
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

  // Filter invoices based on active tab and filters
  const filteredInvoices = mockInvoices.filter((invoice) => {
    const overdue = isInvoiceOverdue(invoice);

    // Status filter
    if (activeTab === 'overdue') {
      if (!overdue) return false;
    } else if (activeTab !== 'all' && activeTab !== 'recent') {
      if (invoice.status !== activeTab) return false;
    }

    // Company filter
    if (filters.companyId && invoice.companyId !== filters.companyId) {
      return false;
    }

    // Currency filter
    if (filters.currency && invoice.currency !== filters.currency) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      const invoiceDate = new Date(invoice.invoiceDate);
      if (invoiceDate < fromDate) return false;
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      const invoiceDate = new Date(invoice.invoiceDate);
      if (invoiceDate > toDate) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.clientName.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Export to CSV
  const handleExport = () => {
    const headers = ['Doc No.', 'Company', 'Customer', 'Invoice Date', 'Due Date', 'Currency', 'Total', 'Outstanding', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      getCompanyById(inv.companyId)?.name || '-',
      inv.clientName,
      new Date(inv.invoiceDate).toLocaleDateString('en-US'),
      new Date(inv.dueDate).toLocaleDateString('en-US'),
      inv.currency,
      inv.totalAmount.toFixed(2),
      inv.amountOutstanding.toFixed(2),
      inv.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Navigate to edit page
  const handleRowClick = (invoiceId: string) => {
    router.push(`/accounting/manager/income/invoices/${invoiceId}`);
  };

  // Calculate summary statistics
  const stats = {
    total: filteredInvoices.length,
    totalValue: filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    totalOutstanding: filteredInvoices.reduce((sum, inv) => sum + inv.amountOutstanding, 0),
  };

  // Count overdue invoices
  const overdueCount = mockInvoices.filter(isInvoiceOverdue).length;

  return (
    <div className="space-y-6">
      {/* Status Tabs - Flowaccount style */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {statusTabs.map((tab) => {
              const isActive = activeTab === tab.value;
              let count: number;

              if (tab.value === 'all' || tab.value === 'recent') {
                count = mockInvoices.length;
              } else if (tab.value === 'overdue') {
                count = overdueCount;
              } else {
                count = mockInvoices.filter(inv => inv.status === tab.value).length;
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
                      : tab.value === 'overdue' && overdueCount > 0
                        ? 'bg-red-500 text-white'
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
                placeholder="Search by document no. or customer name..."
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
                onClick={() => router.push('/accounting/manager/income/invoices/new')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>New Invoice</span>
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
                  <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Date To</label>
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
                  Doc No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
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
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const overdue = isInvoiceOverdue(invoice);
                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => handleRowClick(invoice.id)}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${overdue ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-[#5A7A8F] hover:underline">
                            {invoice.invoiceNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {getCompanyById(invoice.companyId)?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.clientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {new Date(invoice.dueDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                          {invoice.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.totalAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${invoice.amountOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {invoice.amountOutstanding.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(invoice.status, overdue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {invoice.status === 'draft' && (
                            <button className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Issue">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {invoice.status !== 'void' && (
                            <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Void">
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRowClick(invoice.id)}
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
        {filteredInvoices.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredInvoices.length}</span> invoice{filteredInvoices.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-6">
                <div className="text-gray-600">
                  Total: <span className="font-semibold text-gray-900">
                    USD {stats.totalValue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="text-gray-600">
                  Outstanding: <span className={`font-semibold ${stats.totalOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    USD {stats.totalOutstanding.toLocaleString('en-US', {
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
