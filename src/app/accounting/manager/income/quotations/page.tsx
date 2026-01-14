'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, FileDown, FileText, Building2, Eye, Printer } from 'lucide-react';
import { quotationsApi } from '@/lib/supabase/api/quotations';
import { dbQuotationToFrontend, dbCompanyToFrontend, dbBankAccountToFrontend, dbContactToFrontend, dbQuotationLineItemToFrontend } from '@/lib/supabase/transforms';
import { companiesApi } from '@/lib/supabase/api/companies';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { contactsApi } from '@/lib/supabase/api/contacts';
import QuotationPrintView from '@/components/income/QuotationPrintView';
import type { Quotation, QuotationStatus, LineItem } from '@/data/income/types';
import type { Currency, Company } from '@/data/company/types';
import type { BankAccount } from '@/data/banking/types';
import type { Contact } from '@/data/contact/types';

// Status tabs configuration
const statusTabs = [
  { label: 'Recent', value: 'recent' as const },
  { label: 'All', value: 'all' as const },
  { label: 'Draft', value: 'draft' as QuotationStatus },
  { label: 'Accepted', value: 'accepted' as QuotationStatus },
  { label: 'Void', value: 'void' as QuotationStatus },
];

// Status badge styling
const getStatusBadge = (status: QuotationStatus) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-700 border border-gray-300',
    accepted: 'bg-blue-100 text-blue-700 border border-blue-300',
    void: 'bg-red-50 text-red-600 border border-red-200',
  };

  const labels = {
    draft: 'Draft',
    accepted: 'Accepted',
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

export default function QuotationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<QuotationStatus | 'all' | 'recent'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    companyId: '',
    currency: '',
    dateFrom: '',
    dateTo: '',
  });

  // State for data from Supabase
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [selectedQuotationForPdf, setSelectedQuotationForPdf] = useState<{
    quotation: Quotation;
    company: Company | undefined;
    bankAccount: BankAccount | undefined;
    client: Contact | undefined;
    lineItems: LineItem[];
  } | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [quotationsData, companiesData] = await Promise.all([
          quotationsApi.getAll(),
          companiesApi.getAll(),
        ]);

        // Transform quotations and companies to frontend format
        const transformedQuotations = quotationsData.map(q => dbQuotationToFrontend(q, []));
        const transformedCompanies = companiesData.map(dbCompanyToFrontend);
        setQuotations(transformedQuotations);
        setCompanies(transformedCompanies);
      } catch (error) {
        console.error('Error fetching quotations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function to get company by ID
  const getCompanyById = (companyId: string) => companies.find(c => c.id === companyId);

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

  // Filter quotations based on active tab and filters
  const filteredQuotations = quotations.filter((quotation) => {
    // Status filter
    if (activeTab !== 'all' && activeTab !== 'recent') {
      if (quotation.status !== activeTab) return false;
    }

    // Company filter
    if (filters.companyId && quotation.companyId !== filters.companyId) {
      return false;
    }

    // Currency filter
    if (filters.currency && quotation.currency !== filters.currency) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      const quotationDate = new Date(quotation.dateCreated);
      if (quotationDate < fromDate) return false;
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      const quotationDate = new Date(quotation.dateCreated);
      if (quotationDate > toDate) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        quotation.quotationNumber.toLowerCase().includes(query) ||
        quotation.clientName.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Export to CSV
  const handleExport = () => {
    const headers = ['Doc No.', 'Company', 'Customer', 'Issue Date', 'Valid Until', 'Currency', 'Net Amount', 'Status'];
    const rows = filteredQuotations.map(q => [
      q.quotationNumber,
      getCompanyById(q.companyId)?.name || '-',
      q.clientName,
      new Date(q.dateCreated).toLocaleDateString('en-US'),
      new Date(q.validUntil).toLocaleDateString('en-US'),
      q.currency,
      q.totalAmount.toFixed(2),
      q.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `quotations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Navigate to edit page
  const handleRowClick = (quotationId: string) => {
    router.push(`/accounting/manager/income/quotations/${quotationId}/edit`);
  };

  // Handle PDF preview
  const handlePdfPreview = async (quotation: Quotation) => {
    setLoadingPdf(true);
    try {
      // Fetch full quotation with line items
      const quotationWithItems = await quotationsApi.getByIdWithLineItems(quotation.id);
      if (!quotationWithItems) {
        console.error('Quotation not found');
        return;
      }

      // Get company
      const company = companies.find(c => c.id === quotation.companyId);

      // Get bank account for the currency
      let bankAccount: BankAccount | undefined;
      if (company) {
        const bankAccounts = await bankAccountsApi.getByCompanyActive(company.id);
        bankAccount = bankAccounts
          .map(dbBankAccountToFrontend)
          .find(ba => ba.currency === quotation.currency);
      }

      // Get client contact
      let client: Contact | undefined;
      if (quotation.clientId) {
        const contactData = await contactsApi.getById(quotation.clientId);
        if (contactData) {
          client = dbContactToFrontend(contactData);
        }
      }

      // Transform line items
      const lineItems = quotationWithItems.line_items?.map(dbQuotationLineItemToFrontend) || [];

      setSelectedQuotationForPdf({
        quotation: dbQuotationToFrontend(quotationWithItems, quotationWithItems.line_items || []),
        company,
        bankAccount,
        client,
        lineItems,
      });
      setShowPdfPreview(true);
    } catch (error) {
      console.error('Error loading quotation for PDF:', error);
    } finally {
      setLoadingPdf(false);
    }
  };

  // Calculate summary statistics grouped by currency
  const totalsByCurrency = useMemo(() => {
    const byCurrency: Record<string, { total: number; thbEquiv: number }> = {};

    filteredQuotations.forEach((quotation) => {
      const currency = quotation.currency;
      if (!byCurrency[currency]) {
        byCurrency[currency] = { total: 0, thbEquiv: 0 };
      }
      byCurrency[currency].total += quotation.totalAmount;
      // Calculate THB equivalent
      if (currency === 'THB') {
        byCurrency[currency].thbEquiv += quotation.totalAmount;
      } else if (quotation.fxRate) {
        byCurrency[currency].thbEquiv += quotation.totalAmount * quotation.fxRate;
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
  }, [filteredQuotations]);

  // Calculate grand total in THB
  const grandTotalThb = useMemo(() => {
    return totalsByCurrency.reduce((sum, item) => sum + item.thbEquiv, 0);
  }, [totalsByCurrency]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading quotations...</div>
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
              const count = tab.value === 'all'
                ? quotations.length
                : tab.value === 'recent'
                ? quotations.length
                : quotations.filter(q => q.status === tab.value).length;

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
                    ${isActive ? 'bg-[#5A7A8F] text-white' : 'bg-gray-200 text-gray-600'}
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
                onClick={() => router.push('/accounting/manager/income/quotations/new')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>New Quotation</span>
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
                  <label className="block text-xs font-medium text-gray-500 mb-1">Issue Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Issue Date To</label>
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
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Until
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
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
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                    No quotations found
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quotation) => (
                  <tr
                    key={quotation.id}
                    onClick={() => handleRowClick(quotation.id)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-[#5A7A8F] hover:underline">
                          {quotation.quotationNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {getCompanyById(quotation.companyId)?.name || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{quotation.clientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(quotation.dateCreated).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(quotation.validUntil).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                        {quotation.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {quotation.totalAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(quotation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-500">
                        {quotation.currency === 'THB'
                          ? '-'
                          : quotation.fxRate
                          ? (quotation.totalAmount * quotation.fxRate).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handlePdfPreview(quotation)}
                          disabled={loadingPdf}
                          className="p-1.5 text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Preview PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePdfPreview(quotation)}
                          disabled={loadingPdf}
                          className="p-1.5 text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Print PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {filteredQuotations.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-start text-sm">
              <div className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredQuotations.length}</span> quotation{filteredQuotations.length !== 1 ? 's' : ''}
              </div>
              <div className="text-right">
                <div className="text-gray-600 mb-2">Total Value:</div>
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
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {selectedQuotationForPdf && (
        <QuotationPrintView
          quotation={{
            quotationNumber: selectedQuotationForPdf.quotation.quotationNumber,
            dateCreated: selectedQuotationForPdf.quotation.dateCreated,
            validUntil: selectedQuotationForPdf.quotation.validUntil,
            boatId: selectedQuotationForPdf.quotation.boatId,
            charterType: selectedQuotationForPdf.quotation.charterType,
            charterDateFrom: selectedQuotationForPdf.quotation.charterDateFrom,
            charterDateTo: selectedQuotationForPdf.quotation.charterDateTo,
            charterTime: selectedQuotationForPdf.quotation.charterTime,
            lineItems: selectedQuotationForPdf.lineItems,
            pricingType: selectedQuotationForPdf.quotation.pricingType,
            subtotal: selectedQuotationForPdf.quotation.subtotal,
            taxAmount: selectedQuotationForPdf.quotation.taxAmount,
            totalAmount: selectedQuotationForPdf.quotation.totalAmount,
            whtAmount: 0,
            currency: selectedQuotationForPdf.quotation.currency,
            termsAndConditions: selectedQuotationForPdf.quotation.termsAndConditions,
          }}
          company={selectedQuotationForPdf.company}
          client={selectedQuotationForPdf.client}
          clientName={selectedQuotationForPdf.quotation.clientName}
          bankAccount={selectedQuotationForPdf.bankAccount}
          isOpen={showPdfPreview}
          onClose={() => {
            setShowPdfPreview(false);
            setSelectedQuotationForPdf(null);
          }}
        />
      )}
    </div>
  );
}
