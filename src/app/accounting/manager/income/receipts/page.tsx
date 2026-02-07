'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, FileDown, FileText, Building2, Eye, Printer } from 'lucide-react';
import { receiptsApi } from '@/lib/supabase/api/receipts';
import { companiesApi } from '@/lib/supabase/api/companies';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { dbReceiptToFrontend, dbCompanyToFrontend, dbBankAccountToFrontend, dbContactToFrontend, dbReceiptLineItemToFrontend, dbPaymentRecordToFrontend } from '@/lib/supabase/transforms';
import ReceiptPrintView from '@/components/income/ReceiptPrintView';
import type { Receipt, ReceiptStatus, LineItem, PaymentRecord } from '@/data/income/types';
import type { Company, Currency } from '@/data/company/types';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import type { BankAccount } from '@/data/banking/types';
import type { Contact } from '@/data/contact/types';

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

export default function ReceiptsPage() {
  const router = useRouter();
  const { options: currencyOptionsList } = useCurrencyOptions();
  const currencyOptions: Currency[] = currencyOptionsList.map(o => o.value as Currency);
  const [activeTab, setActiveTab] = useState<ReceiptStatus | 'all' | 'recent'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    companyId: '',
    currency: '',
    dateFrom: '',
    dateTo: '',
  });
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [selectedReceiptForPdf, setSelectedReceiptForPdf] = useState<{
    receipt: Receipt;
    company: Company | undefined;
    bankAccount: BankAccount | undefined;
    client: Contact | undefined;
    lineItems: LineItem[];
    payments: PaymentRecord[];
  } | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Fetch receipts and companies on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [receiptsData, companiesData] = await Promise.all([
          receiptsApi.getAll(),
          companiesApi.getAll(),
        ]);
        const transformedReceipts = receiptsData.map(r => dbReceiptToFrontend(r, [], []));
        const transformedCompanies = companiesData.map(dbCompanyToFrontend);
        setReceipts(transformedReceipts);
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

  // Filter receipts based on active tab and filters
  const filteredReceipts = receipts.filter((receipt) => {
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

  // Handle PDF preview
  const handlePdfPreview = async (receipt: Receipt) => {
    setLoadingPdf(true);
    try {
      // Fetch full receipt with line items and payments
      const receiptWithItems = await receiptsApi.getByIdWithLineItems(receipt.id);
      if (!receiptWithItems) {
        console.error('Receipt not found');
        return;
      }

      // Get company
      const company = companies.find(c => c.id === receipt.companyId);

      // Get bank account for the currency
      let bankAccount: BankAccount | undefined;
      if (company) {
        const bankAccounts = await bankAccountsApi.getByCompanyActive(company.id);
        bankAccount = bankAccounts
          .map(dbBankAccountToFrontend)
          .find(ba => ba.currency === receipt.currency);
      }

      // Get client contact
      let client: Contact | undefined;
      if (receipt.clientId) {
        const contactData = await contactsApi.getById(receipt.clientId);
        if (contactData) {
          client = dbContactToFrontend(contactData);
        }
      }

      // Transform line items and payments
      const lineItems = receiptWithItems.line_items?.map(dbReceiptLineItemToFrontend) || [];
      const payments = receiptWithItems.payment_records?.map(dbPaymentRecordToFrontend) || [];

      setSelectedReceiptForPdf({
        receipt: dbReceiptToFrontend(receiptWithItems, receiptWithItems.line_items || [], receiptWithItems.payment_records || []),
        company,
        bankAccount,
        client,
        lineItems,
        payments,
      });
      setShowPdfPreview(true);
    } catch (error) {
      console.error('Error loading receipt for PDF:', error);
    } finally {
      setLoadingPdf(false);
    }
  };

  // Calculate summary statistics grouped by currency
  const totalsByCurrency = useMemo(() => {
    const byCurrency: Record<string, { total: number; thbEquiv: number }> = {};

    // Only count paid receipts
    filteredReceipts
      .filter(r => r.status === 'paid')
      .forEach((receipt) => {
        const currency = receipt.currency;
        if (!byCurrency[currency]) {
          byCurrency[currency] = { total: 0, thbEquiv: 0 };
        }
        byCurrency[currency].total += receipt.totalAmount;
        // Calculate THB equivalent
        if (currency === 'THB') {
          byCurrency[currency].thbEquiv += receipt.totalAmount;
        } else if (receipt.fxRate) {
          byCurrency[currency].thbEquiv += receipt.totalAmount * receipt.fxRate;
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
  }, [filteredReceipts]);

  // Calculate grand total in THB
  const grandTotalThb = useMemo(() => {
    return totalsByCurrency.reduce((sum, item) => sum + item.thbEquiv, 0);
  }, [totalsByCurrency]);

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading receipts...</div>
      </div>
    );
  }

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
                count = receipts.length;
              } else {
                count = receipts.filter(r => r.status === tab.value).length;
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
                  Total Amount
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
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
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
                          {receipt.totalAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(receipt.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-500">
                          {receipt.currency === 'THB'
                            ? '-'
                            : receipt.fxRate
                            ? (receipt.totalAmount * receipt.fxRate).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handlePdfPreview(receipt)}
                            disabled={loadingPdf}
                            className="p-1.5 text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Preview PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePdfPreview(receipt)}
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
        {filteredReceipts.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-start text-sm">
              <div className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredReceipts.length}</span> receipt{filteredReceipts.length !== 1 ? 's' : ''}
              </div>
              <div className="text-right">
                <div className="text-gray-600 mb-2">Total Received (Paid):</div>
                {totalsByCurrency.length === 0 ? (
                  <div className="text-gray-400">-</div>
                ) : (
                  <div className="space-y-1">
                    {totalsByCurrency.map(({ currency, total, thbEquiv }) => (
                      <div key={currency} className="flex items-center justify-end gap-4">
                        <span className="font-semibold text-green-600">
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
                        <span className="font-semibold text-green-600">
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
      {selectedReceiptForPdf && (
        <ReceiptPrintView
          receipt={{
            receiptNumber: selectedReceiptForPdf.receipt.receiptNumber,
            receiptDate: selectedReceiptForPdf.receipt.receiptDate,
            boatId: selectedReceiptForPdf.receipt.boatId,
            charterType: selectedReceiptForPdf.receipt.charterType,
            charterDateFrom: selectedReceiptForPdf.receipt.charterDateFrom,
            charterDateTo: selectedReceiptForPdf.receipt.charterDateTo,
            charterTime: selectedReceiptForPdf.receipt.charterTime,
            lineItems: selectedReceiptForPdf.lineItems,
            payments: selectedReceiptForPdf.payments,
            pricingType: selectedReceiptForPdf.receipt.pricingType,
            subtotal: selectedReceiptForPdf.receipt.subtotal,
            taxAmount: selectedReceiptForPdf.receipt.taxAmount,
            totalAmount: selectedReceiptForPdf.receipt.totalAmount,
            whtAmount: 0,
            currency: selectedReceiptForPdf.receipt.currency,
            reference: selectedReceiptForPdf.receipt.reference,
          }}
          company={selectedReceiptForPdf.company}
          client={selectedReceiptForPdf.client}
          clientName={selectedReceiptForPdf.receipt.clientName}
          bankAccount={selectedReceiptForPdf.bankAccount}
          isOpen={showPdfPreview}
          onClose={() => {
            setShowPdfPreview(false);
            setSelectedReceiptForPdf(null);
          }}
        />
      )}
    </div>
  );
}
