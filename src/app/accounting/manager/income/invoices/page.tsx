'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, FileDown, FileText, Building2, AlertTriangle, Eye, Printer } from 'lucide-react';
import { invoicesApi } from '@/lib/supabase/api/invoices';
import { companiesApi } from '@/lib/supabase/api/companies';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { dbInvoiceToFrontend, dbCompanyToFrontend, dbBankAccountToFrontend, dbContactToFrontend, dbInvoiceLineItemToFrontend } from '@/lib/supabase/transforms';
import InvoicePrintView from '@/components/income/InvoicePrintView';
import type { Invoice, InvoiceStatus, LineItem } from '@/data/income/types';
import type { Company, Currency } from '@/data/company/types';
import type { BankAccount } from '@/data/banking/types';
import type { Contact } from '@/data/contact/types';

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

// Helper function to check if invoice is overdue
function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status !== 'issued') return false;
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today && invoice.amountOutstanding > 0;
}

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState<{
    invoice: Invoice;
    company: Company | undefined;
    bankAccount: BankAccount | undefined;
    client: Contact | undefined;
    lineItems: LineItem[];
  } | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Fetch invoices and companies on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoicesData, companiesData] = await Promise.all([
          invoicesApi.getAll(),
          companiesApi.getAll(),
        ]);
        const transformedInvoices = invoicesData.map(inv => dbInvoiceToFrontend(inv, []));
        const transformedCompanies = companiesData.map(dbCompanyToFrontend);
        setInvoices(transformedInvoices);
        setCompanies(transformedCompanies.filter(c => c.isActive));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper to get company by ID
  const getCompanyById = (id: string) => companies.find(c => c.id === id);

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
  const filteredInvoices = invoices.filter((invoice) => {
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

  // Handle PDF preview
  const handlePdfPreview = async (invoice: Invoice) => {
    setLoadingPdf(true);
    try {
      // Get company from local state (no API call needed)
      const company = companies.find(c => c.id === invoice.companyId);

      // Fetch all data in parallel - invoice, bank accounts, and client contact
      const [invoiceWithItems, bankAccountsData, contactData] = await Promise.all([
        invoicesApi.getByIdWithLineItems(invoice.id),
        company ? bankAccountsApi.getByCompanyActive(company.id) : Promise.resolve([]),
        invoice.clientId ? contactsApi.getById(invoice.clientId) : Promise.resolve(null),
      ]);

      if (!invoiceWithItems) {
        console.error('Invoice not found');
        return;
      }

      // Process bank account
      const bankAccount = bankAccountsData
        .map(dbBankAccountToFrontend)
        .find(ba => ba.currency === invoice.currency);

      // Process client contact
      const client = contactData ? dbContactToFrontend(contactData) : undefined;

      // Transform line items
      const lineItems = invoiceWithItems.line_items?.map(dbInvoiceLineItemToFrontend) || [];

      setSelectedInvoiceForPdf({
        invoice: dbInvoiceToFrontend(invoiceWithItems, invoiceWithItems.line_items || []),
        company,
        bankAccount,
        client,
        lineItems,
      });
      setShowPdfPreview(true);
    } catch (error) {
      console.error('Error loading invoice for PDF:', error);
    } finally {
      setLoadingPdf(false);
    }
  };

  // Calculate summary statistics grouped by currency
  const totalsByCurrency = useMemo(() => {
    const byCurrency: Record<string, { total: number; outstanding: number; thbEquiv: number; thbOutstanding: number }> = {};

    filteredInvoices.forEach((invoice) => {
      const currency = invoice.currency;
      if (!byCurrency[currency]) {
        byCurrency[currency] = { total: 0, outstanding: 0, thbEquiv: 0, thbOutstanding: 0 };
      }
      byCurrency[currency].total += invoice.totalAmount;
      byCurrency[currency].outstanding += invoice.amountOutstanding;
      // Calculate THB equivalent
      if (currency === 'THB') {
        byCurrency[currency].thbEquiv += invoice.totalAmount;
        byCurrency[currency].thbOutstanding += invoice.amountOutstanding;
      } else if (invoice.fxRate) {
        byCurrency[currency].thbEquiv += invoice.totalAmount * invoice.fxRate;
        byCurrency[currency].thbOutstanding += invoice.amountOutstanding * invoice.fxRate;
      }
    });

    // Sort currencies: THB first, then alphabetically
    const sortedCurrencies = Object.keys(byCurrency).sort((a, b) => {
      if (a === 'THB') return -1;
      if (b === 'THB') return 1;
      return a.localeCompare(b);
    });

    return sortedCurrencies.map((currency) => ({
      currency,
      ...byCurrency[currency],
    }));
  }, [filteredInvoices]);

  // Calculate grand totals in THB
  const grandTotalThb = useMemo(() => {
    return totalsByCurrency.reduce((sum, item) => sum + item.thbEquiv, 0);
  }, [totalsByCurrency]);

  const grandOutstandingThb = useMemo(() => {
    return totalsByCurrency.reduce((sum, item) => sum + item.thbOutstanding, 0);
  }, [totalsByCurrency]);

  // Count overdue invoices
  const overdueCount = invoices.filter(isInvoiceOverdue).length;

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading invoices...</div>
      </div>
    );
  }

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
                count = invoices.length;
              } else if (tab.value === 'overdue') {
                count = overdueCount;
              } else {
                count = invoices.filter(inv => inv.status === tab.value).length;
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
                  THB Equiv.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-sm text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-500">
                          {invoice.currency === 'THB'
                            ? '-'
                            : invoice.fxRate
                            ? (invoice.totalAmount * invoice.fxRate).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handlePdfPreview(invoice)}
                            disabled={loadingPdf}
                            className="p-1.5 text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Preview PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePdfPreview(invoice)}
                            disabled={loadingPdf}
                            className="p-1.5 text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Print PDF"
                          >
                            <Printer className="h-4 w-4" />
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
            <div className="flex justify-between items-start text-sm">
              <div className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredInvoices.length}</span> invoice{filteredInvoices.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-8">
                {/* Total Value */}
                <div className="text-right">
                  <div className="text-gray-600 mb-2">Total:</div>
                  {totalsByCurrency.length === 0 ? (
                    <div className="text-gray-400">-</div>
                  ) : (
                    <div className="space-y-1">
                      {totalsByCurrency.map(({ currency, total, thbEquiv }) => (
                        <div key={currency} className="flex items-center justify-end gap-4">
                          <span className="font-semibold text-gray-900">
                            {currency} {total.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {currency !== 'THB' && thbEquiv > 0 && (
                            <span className="text-gray-500 text-xs">
                              (THB {thbEquiv.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })})
                            </span>
                          )}
                        </div>
                      ))}
                      {totalsByCurrency.length > 1 && (
                        <div className="pt-1 border-t border-gray-300 mt-1">
                          <span className="text-gray-600">Grand Total: </span>
                          <span className="font-semibold text-gray-900">
                            THB {grandTotalThb.toLocaleString('en-US', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Outstanding */}
                <div className="text-right">
                  <div className="text-gray-600 mb-2">Outstanding:</div>
                  {totalsByCurrency.length === 0 ? (
                    <div className="text-gray-400">-</div>
                  ) : (
                    <div className="space-y-1">
                      {totalsByCurrency.map(({ currency, outstanding, thbOutstanding }) => (
                        <div key={currency} className="flex items-center justify-end gap-4">
                          <span className={`font-semibold ${outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {currency} {outstanding.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {currency !== 'THB' && thbOutstanding > 0 && (
                            <span className="text-gray-500 text-xs">
                              (THB {thbOutstanding.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })})
                            </span>
                          )}
                        </div>
                      ))}
                      {totalsByCurrency.length > 1 && (
                        <div className="pt-1 border-t border-gray-300 mt-1">
                          <span className="text-gray-600">Grand Total: </span>
                          <span className={`font-semibold ${grandOutstandingThb > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            THB {grandOutstandingThb.toLocaleString('en-US', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {selectedInvoiceForPdf && (
        <InvoicePrintView
          invoice={{
            invoiceNumber: selectedInvoiceForPdf.invoice.invoiceNumber,
            invoiceDate: selectedInvoiceForPdf.invoice.invoiceDate,
            dueDate: selectedInvoiceForPdf.invoice.dueDate,
            boatId: selectedInvoiceForPdf.invoice.boatId,
            charterType: selectedInvoiceForPdf.invoice.charterType,
            charterDateFrom: selectedInvoiceForPdf.invoice.charterDateFrom,
            charterDateTo: selectedInvoiceForPdf.invoice.charterDateTo,
            charterTime: selectedInvoiceForPdf.invoice.charterTime,
            lineItems: selectedInvoiceForPdf.lineItems,
            pricingType: selectedInvoiceForPdf.invoice.pricingType,
            subtotal: selectedInvoiceForPdf.invoice.subtotal,
            taxAmount: selectedInvoiceForPdf.invoice.taxAmount,
            totalAmount: selectedInvoiceForPdf.invoice.totalAmount,
            whtAmount: 0,
            currency: selectedInvoiceForPdf.invoice.currency,
            notes: selectedInvoiceForPdf.invoice.notes,
            reference: selectedInvoiceForPdf.invoice.reference,
          }}
          company={selectedInvoiceForPdf.company}
          client={selectedInvoiceForPdf.client}
          clientName={selectedInvoiceForPdf.invoice.clientName}
          bankAccount={selectedInvoiceForPdf.bankAccount}
          isOpen={showPdfPreview}
          onClose={() => {
            setShowPdfPreview(false);
            setSelectedInvoiceForPdf(null);
          }}
        />
      )}
    </div>
  );
}
