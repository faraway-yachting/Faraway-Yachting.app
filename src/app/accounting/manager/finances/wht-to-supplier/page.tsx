'use client';

import { useState, useMemo, useEffect } from 'react';
import { FinancesScopeBar } from '@/components/finances/FinancesScopeBar';
import { WhtSummaryBox } from '@/components/finances/WhtSummaryBox';
import { WhtTransactionTable } from '@/components/finances/WhtTransactionTable';
import WhtCertificatePrintView from '@/components/finances/WhtCertificatePrintView';
import { companiesApi } from '@/lib/supabase/api/companies';
import { whtCertificatesApi } from '@/lib/supabase/api/whtCertificates';
import { contactsApi } from '@/lib/supabase/api/contacts';
import type { Database } from '@/lib/supabase/database.types';
import type { WhtToSupplier, WhtToSupplierSummary } from '@/data/finances/types';
import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';

type DbCompany = Database['public']['Tables']['companies']['Row'];
type DbContact = Database['public']['Tables']['contacts']['Row'];
type WhtCertificate = Database['public']['Tables']['wht_certificates']['Row'];

// Convert Supabase WhtCertificate to UI WhtToSupplier type
function convertToWhtToSupplier(
  cert: WhtCertificate,
  companies: DbCompany[],
  contacts: DbContact[]
): WhtToSupplier {
  const company = companies.find(c => c.id === cert.company_id);
  const vendor = contacts.find(c => c.id === cert.payee_vendor_id);

  // Map status: draft/issued/filed -> pending/submitted/filed
  const statusMap: Record<string, WhtToSupplier['status']> = {
    'draft': 'pending',
    'issued': 'submitted',
    'filed': 'filed',
  };

  return {
    id: cert.id,
    date: cert.payment_date,
    documentNumber: cert.certificate_number,
    documentType: 'payment',
    supplierId: cert.payee_vendor_id || '',
    supplierName: cert.payee_name,
    supplierTaxId: cert.payee_tax_id || '',
    companyId: cert.company_id,
    companyName: company?.name || 'Unknown Company',
    paymentAmount: cert.amount_paid,
    whtType: cert.form_type,
    whtRate: cert.wht_rate,
    whtAmount: cert.wht_amount,
    whtCertificateNumber: cert.certificate_number,
    status: statusMap[cert.status] || 'pending',
    submissionDate: cert.filed_date || undefined,
    period: cert.tax_period,
    currency: 'THB',
  };
}

// Convert Company type to UI format
function convertCompanyToUi(company: DbCompany): { id: string; name: string } {
  return { id: company.id, name: company.name };
}

// Convert Contact to UI Company type (for print view)
function convertDbCompanyToUiCompany(company: DbCompany | undefined): Company | undefined {
  if (!company) return undefined;
  const contactInfo = company.contact_information as { primaryContactName?: string; phoneNumber?: string; email?: string } | null;
  const billingAddr = company.billing_address as { street?: string; city?: string; state?: string; postalCode?: string; country?: string } | null;
  const registeredAddr = company.registered_address as { street?: string; city?: string; state?: string; postalCode?: string; country?: string } | null;
  return {
    id: company.id,
    name: company.name,
    taxId: company.tax_id || '',
    registeredAddress: {
      street: registeredAddr?.street || '',
      city: registeredAddr?.city || '',
      state: registeredAddr?.state || '',
      postalCode: registeredAddr?.postalCode || '',
      country: registeredAddr?.country || '',
    },
    billingAddress: {
      street: billingAddr?.street || '',
      city: billingAddr?.city || '',
      state: billingAddr?.state || '',
      postalCode: billingAddr?.postalCode || '',
      country: billingAddr?.country || '',
    },
    sameAsBillingAddress: company.same_as_billing_address,
    contactInformation: {
      primaryContactName: contactInfo?.primaryContactName || '',
      phoneNumber: contactInfo?.phoneNumber || '',
      email: contactInfo?.email || '',
    },
    currency: (company.currency as 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED') || 'THB',
    fiscalYearEnd: '12-31',
    logoUrl: company.logo_url || '',
    isActive: company.is_active,
    isVatRegistered: company.is_vat_registered,
    vatRate: company.vat_rate || undefined,
    createdAt: company.created_at,
    updatedAt: company.updated_at,
  };
}

// Convert DbContact to UI Contact type (for print view)
function convertDbContactToUiContact(contact: DbContact | undefined): Contact | undefined {
  if (!contact) return undefined;
  const billingAddr = contact.billing_address as { street?: string; city?: string; state?: string; postalCode?: string; country?: string } | null;
  return {
    id: contact.id,
    name: contact.name,
    type: contact.type as 'customer' | 'vendor' | 'both',
    contactPerson: contact.contact_person || undefined,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    taxId: contact.tax_id || undefined,
    billingAddress: billingAddr ? {
      street: billingAddr.street,
      city: billingAddr.city,
      state: billingAddr.state,
      postalCode: billingAddr.postalCode,
      country: billingAddr.country,
    } : undefined,
    defaultCurrency: (contact.default_currency as 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED') || undefined,
    paymentTerms: contact.payment_terms || undefined,
    notes: contact.notes || undefined,
    isActive: contact.is_active,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
  };
}

export default function WhtToSupplierPage() {
  const [dataScope, setDataScope] = useState('all-companies');
  // Initialize to current month
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(() => new Date().getMonth() + 1); // null = all periods

  // Data from Supabase
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [whtCertificates, setWhtCertificates] = useState<WhtCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // WHT Certificate print view state
  const [selectedTransaction, setSelectedTransaction] = useState<WhtToSupplier | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>(undefined);
  const [selectedSupplier, setSelectedSupplier] = useState<Contact | undefined>(undefined);
  const [showPrintView, setShowPrintView] = useState(false);

  // Load data from Supabase
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [companiesData, contactsData, whtData] = await Promise.all([
          companiesApi.getAll(),
          contactsApi.getAll(),
          whtCertificatesApi.getAll(),
        ]);
        setCompanies(companiesData);
        setContacts(contactsData);
        setWhtCertificates(whtData);
      } catch (error) {
        console.error('Error loading WHT data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handlePeriodChange = (newYear: number, newMonth: number | null) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleExport = () => {
    console.log('Exporting WHT to Supplier data...');
  };

  const handleDownloadCertificate = (transaction: WhtToSupplier) => {
    // Fetch company and supplier details from loaded data
    const company = companies.find(c => c.id === transaction.companyId);
    const supplier = contacts.find(c => c.id === transaction.supplierId);

    setSelectedTransaction(transaction);
    setSelectedCompany(convertDbCompanyToUiCompany(company));
    setSelectedSupplier(convertDbContactToUiContact(supplier));
    setShowPrintView(true);
  };

  const handleClosePrintView = () => {
    setShowPrintView(false);
    setSelectedTransaction(null);
    setSelectedCompany(undefined);
    setSelectedSupplier(undefined);
  };

  const period = month ? `${year}-${String(month).padStart(2, '0')}` : null; // null = all periods

  // Convert and filter data
  const { summaries, transactions, showCompany } = useMemo(() => {
    // Convert all WHT certificates to UI format
    const allTransactions = whtCertificates.map(cert =>
      convertToWhtToSupplier(cert, companies, contacts)
    );

    // Filter by period (if specific month selected) or by year (if all periods)
    let periodFiltered = allTransactions;
    if (period) {
      periodFiltered = allTransactions.filter(t => t.period === period);
    } else {
      // All periods - filter by year only
      periodFiltered = allTransactions.filter(t => t.period.startsWith(`${year}-`));
    }

    // Filter by company if not "all-companies"
    let filtered = periodFiltered;
    if (dataScope !== 'all-companies') {
      filtered = periodFiltered.filter(t => t.companyId === dataScope);
    }

    // Build summaries from filtered data
    const summaryMap = new Map<string, WhtToSupplierSummary>();

    for (const t of filtered) {
      const key = `${t.companyId}-${t.period}`;
      const existing = summaryMap.get(key);

      if (existing) {
        existing.transactionCount++;
        existing.totalWhtAmount += t.whtAmount;
        if (t.whtType === 'pnd3') {
          existing.pnd3Amount += t.whtAmount;
        } else {
          existing.pnd53Amount += t.whtAmount;
        }
        // Update status: if any pending, summary is pending
        if (t.status === 'pending') {
          existing.status = 'pending';
        }
      } else {
        // Calculate due date for this period
        const [pYear, pMonth] = t.period.split('-').map(Number);
        const nextMonth = pMonth === 12 ? 1 : pMonth + 1;
        const nextYear = pMonth === 12 ? pYear + 1 : pYear;
        const dueDate = new Date(nextYear, nextMonth - 1, 7);

        summaryMap.set(key, {
          period: t.period,
          companyId: t.companyId,
          companyName: t.companyName,
          pnd3Amount: t.whtType === 'pnd3' ? t.whtAmount : 0,
          pnd53Amount: t.whtType === 'pnd53' ? t.whtAmount : 0,
          totalWhtAmount: t.whtAmount,
          transactionCount: 1,
          dueDate: dueDate.toISOString().split('T')[0],
          status: t.status,
        });
      }
    }

    return {
      summaries: Array.from(summaryMap.values()),
      transactions: filtered,
      showCompany: dataScope === 'all-companies',
    };
  }, [dataScope, period, year, whtCertificates, companies, contacts]);

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

  // Convert companies for scope bar
  const companiesForScopeBar = companies.map(convertCompanyToUi);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A7A8F]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Scope Bar */}
      <FinancesScopeBar
        dataScope={dataScope}
        onDataScopeChange={setDataScope}
        companies={companiesForScopeBar}
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
