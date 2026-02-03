'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IncomeScopeBar } from '@/components/income/IncomeScopeBar';
import { AlertsPanel } from '@/components/income/AlertsPanel';
import { RecentTransactions } from '@/components/income/RecentTransactions';
import { DollarSign, FileText, Receipt, TrendingUp, Calendar, ArrowUpRight, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { companiesApi } from '@/lib/supabase/api/companies';
import { invoicesApi } from '@/lib/supabase/api/invoices';
import { quotationsApi } from '@/lib/supabase/api/quotations';
import { receiptsApi } from '@/lib/supabase/api/receipts';
import { projectsApi } from '@/lib/supabase/api/projects';
import { bookingPaymentsApi, BookingPaymentExtended } from '@/lib/supabase/api/bookingPayments';
import { getFiscalYear, getFiscalYearDateRange } from '@/lib/reports/projectPLCalculation';
import type { Database } from '@/lib/supabase/database.types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Quotation = Database['public']['Tables']['quotations']['Row'];
type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

export default function IncomeOverviewPage() {
  const router = useRouter();

  // State
  const [dataScope, setDataScope] = useState('all-companies');
  const [dateFrom, setDateFrom] = useState(() => {
    const { startDate } = getFiscalYearDateRange(getFiscalYear(new Date()));
    return startDate;
  });
  const [dateTo, setDateTo] = useState(() => {
    const { endDate } = getFiscalYearDateRange(getFiscalYear(new Date()));
    return endDate;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [paymentsNeedingAction, setPaymentsNeedingAction] = useState<BookingPaymentExtended[]>([]);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [invoicesData, quotationsData, receiptsData, companiesData, projectsData, needingActionData] = await Promise.all([
          invoicesApi.getAll(),
          quotationsApi.getAll(),
          receiptsApi.getAll(),
          companiesApi.getAll(),
          projectsApi.getAll(),
          bookingPaymentsApi.getNeedingAction(),
        ]);

        setInvoices(invoicesData);
        setQuotations(quotationsData);
        setReceipts(receiptsData);
        setCompanies(companiesData);
        setProjects(projectsData);
        setPaymentsNeedingAction(needingActionData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data by date range and company
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invoiceDate = inv.invoice_date;
      const inDateRange = invoiceDate >= dateFrom && invoiceDate <= dateTo;
      const inScope = dataScope === 'all-companies' || inv.company_id === dataScope.replace('company-', '');
      return inDateRange && inScope;
    });
  }, [invoices, dateFrom, dateTo, dataScope]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const quotationDate = q.date_created;
      const inDateRange = quotationDate >= dateFrom && quotationDate <= dateTo;
      const inScope = dataScope === 'all-companies' || q.company_id === dataScope.replace('company-', '');
      return inDateRange && inScope;
    });
  }, [quotations, dateFrom, dateTo, dataScope]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const receiptDate = r.receipt_date;
      const inDateRange = receiptDate >= dateFrom && receiptDate <= dateTo;
      const inScope = dataScope === 'all-companies' || r.company_id === dataScope.replace('company-', '');
      return inDateRange && inScope;
    });
  }, [receipts, dateFrom, dateTo, dataScope]);

  // Calculate KPIs grouped by currency
  const revenueByCurrency = useMemo(() => {
    const byCurrency: Record<string, { total: number; thbEquiv: number; count: number }> = {};
    filteredInvoices
      .filter(inv => inv.status !== 'void')
      .forEach((inv) => {
        const currency = inv.currency || 'USD';
        if (!byCurrency[currency]) {
          byCurrency[currency] = { total: 0, thbEquiv: 0, count: 0 };
        }
        byCurrency[currency].total += inv.total_amount || 0;
        byCurrency[currency].count += 1;
        if (currency === 'THB') {
          byCurrency[currency].thbEquiv += inv.total_amount || 0;
        } else if (inv.fx_rate) {
          byCurrency[currency].thbEquiv += (inv.total_amount || 0) * inv.fx_rate;
        }
      });
    // Sort: THB first, then alphabetically
    const sorted = Object.keys(byCurrency).sort((a, b) => {
      if (a === 'THB') return -1;
      if (b === 'THB') return 1;
      return a.localeCompare(b);
    });
    return sorted.map(currency => ({ currency, ...byCurrency[currency] }));
  }, [filteredInvoices]);

  const totalRevenueThb = useMemo(() => {
    return revenueByCurrency.reduce((sum, item) => sum + item.thbEquiv, 0);
  }, [revenueByCurrency]);

  const totalRevenueCount = useMemo(() => {
    return revenueByCurrency.reduce((sum, item) => sum + item.count, 0);
  }, [revenueByCurrency]);

  const arByCurrency = useMemo(() => {
    const byCurrency: Record<string, { total: number; thbEquiv: number }> = {};
    filteredInvoices
      .filter(inv => inv.status !== 'void')
      .forEach((inv) => {
        const currency = inv.currency || 'USD';
        if (!byCurrency[currency]) {
          byCurrency[currency] = { total: 0, thbEquiv: 0 };
        }
        byCurrency[currency].total += inv.amount_outstanding || 0;
        if (currency === 'THB') {
          byCurrency[currency].thbEquiv += inv.amount_outstanding || 0;
        } else if (inv.fx_rate) {
          byCurrency[currency].thbEquiv += (inv.amount_outstanding || 0) * inv.fx_rate;
        }
      });
    const sorted = Object.keys(byCurrency).sort((a, b) => {
      if (a === 'THB') return -1;
      if (b === 'THB') return 1;
      return a.localeCompare(b);
    });
    return sorted.map(currency => ({ currency, ...byCurrency[currency] }));
  }, [filteredInvoices]);

  const totalARThb = useMemo(() => {
    return arByCurrency.reduce((sum, item) => sum + item.thbEquiv, 0);
  }, [arByCurrency]);

  const cashByCurrency = useMemo(() => {
    const byCurrency: Record<string, { total: number; thbEquiv: number; count: number }> = {};
    filteredReceipts
      .filter(r => r.status !== 'void')
      .forEach((r) => {
        const currency = r.currency || 'USD';
        if (!byCurrency[currency]) {
          byCurrency[currency] = { total: 0, thbEquiv: 0, count: 0 };
        }
        byCurrency[currency].total += r.total_amount || 0;
        byCurrency[currency].count += 1;
        if (currency === 'THB') {
          byCurrency[currency].thbEquiv += r.total_amount || 0;
        } else if (r.fx_rate) {
          byCurrency[currency].thbEquiv += (r.total_amount || 0) * r.fx_rate;
        }
      });
    const sorted = Object.keys(byCurrency).sort((a, b) => {
      if (a === 'THB') return -1;
      if (b === 'THB') return 1;
      return a.localeCompare(b);
    });
    return sorted.map(currency => ({ currency, ...byCurrency[currency] }));
  }, [filteredReceipts]);

  const totalCashThb = useMemo(() => {
    return cashByCurrency.reduce((sum, item) => sum + item.thbEquiv, 0);
  }, [cashByCurrency]);

  const totalCashCount = useMemo(() => {
    return cashByCurrency.reduce((sum, item) => sum + item.count, 0);
  }, [cashByCurrency]);

  // Legacy single totals for secondary metrics
  const totalRevenue = useMemo(() => {
    return filteredInvoices
      .filter(inv => inv.status !== 'void')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [filteredInvoices]);

  const totalAR = useMemo(() => {
    return filteredInvoices
      .filter(inv => inv.status !== 'void')
      .reduce((sum, inv) => sum + (inv.amount_outstanding || 0), 0);
  }, [filteredInvoices]);

  const totalCash = useMemo(() => {
    return filteredReceipts
      .filter(r => r.status !== 'void')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  }, [filteredReceipts]);

  const openQuotations = useMemo(() => {
    return filteredQuotations.filter(q => q.status === 'draft' || q.status === 'accepted').length;
  }, [filteredQuotations]);

  const unpaidInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => (inv.amount_outstanding || 0) > 0 && inv.status !== 'void').length;
  }, [filteredInvoices]);

  // Calculate average days to payment
  const avgDaysToPayment = useMemo(() => {
    const paidInvoices = filteredInvoices.filter(inv =>
      inv.status === 'issued' && (inv.amount_outstanding || 0) === 0
    );
    if (paidInvoices.length === 0) return 0;

    const matchedReceipts = filteredReceipts.filter(r =>
      paidInvoices.some(inv => inv.id === r.invoice_id)
    );

    if (matchedReceipts.length === 0) return 0;

    const totalDays = matchedReceipts.reduce((sum, receipt) => {
      const invoice = paidInvoices.find(inv => inv.id === receipt.invoice_id);
      if (!invoice) return sum;
      const invoiceDate = new Date(invoice.invoice_date);
      const receiptDate = new Date(receipt.receipt_date);
      const days = Math.floor((receiptDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days);
    }, 0);

    return Math.round(totalDays / matchedReceipts.length);
  }, [filteredInvoices, filteredReceipts]);

  // Calculate alerts
  const overdueInvoices = useMemo(() => {
    const today = new Date();
    return filteredInvoices.filter(inv => {
      const dueDate = new Date(inv.due_date);
      return (inv.amount_outstanding || 0) > 0 && dueDate < today && inv.status !== 'void';
    });
  }, [filteredInvoices]);

  const expiringQuotations = useMemo(() => {
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return filteredQuotations.filter(q => {
      const validUntil = new Date(q.valid_until);
      return (q.status === 'draft' || q.status === 'accepted') && validUntil <= sevenDaysFromNow && validUntil >= today;
    });
  }, [filteredQuotations]);

  const unreconciledReceipts = useMemo(() => {
    return filteredReceipts.filter(r => r.status === 'draft' || r.status === 'paid');
  }, [filteredReceipts]);

  const handleExport = () => {
    console.log('Export income data');
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Transform data for RecentTransactions component
  const transformedQuotations = useMemo(() => {
    return filteredQuotations.slice(0, 10).map(q => ({
      id: q.id,
      quotationNumber: q.quotation_number,
      clientName: q.client_name,
      totalAmount: q.total_amount,
      status: q.status as 'draft' | 'accepted' | 'void',
      validUntil: q.valid_until,
      dateCreated: q.created_at,
    }));
  }, [filteredQuotations]);

  const transformedInvoices = useMemo(() => {
    return filteredInvoices.slice(0, 10).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: inv.client_name,
      totalAmount: inv.total_amount,
      amountOutstanding: inv.amount_outstanding,
      status: inv.status as 'draft' | 'issued' | 'void',
      dueDate: inv.due_date,
      invoiceDate: inv.invoice_date,
    }));
  }, [filteredInvoices]);

  const transformedReceipts = useMemo(() => {
    return filteredReceipts.slice(0, 10).map(r => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      clientName: r.client_name,
      totalReceived: r.total_amount,
      status: r.status as 'draft' | 'paid' | 'void',
      receiptDate: r.receipt_date,
    }));
  }, [filteredReceipts]);

  // Transform alerts data
  const transformedOverdueInvoices = useMemo(() => {
    return overdueInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: inv.client_name,
      totalAmount: inv.total_amount,
      amountOutstanding: inv.amount_outstanding,
      status: inv.status as 'draft' | 'issued' | 'void',
      dueDate: inv.due_date,
      invoiceDate: inv.invoice_date,
    }));
  }, [overdueInvoices]);

  const transformedExpiringQuotations = useMemo(() => {
    return expiringQuotations.map(q => ({
      id: q.id,
      quotationNumber: q.quotation_number,
      clientName: q.client_name,
      totalAmount: q.total_amount,
      status: q.status as 'draft' | 'accepted' | 'void',
      validUntil: q.valid_until,
      dateCreated: q.created_at,
    }));
  }, [expiringQuotations]);

  const transformedUnreconciledReceipts = useMemo(() => {
    return unreconciledReceipts.map(r => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      clientName: r.client_name,
      totalReceived: r.total_amount,
      status: r.status as 'draft' | 'paid' | 'void',
      receiptDate: r.receipt_date,
    }));
  }, [unreconciledReceipts]);

  // Prepare companies for scope bar
  const companiesForScopeBar = useMemo(() => {
    return companies.map(c => ({
      id: c.id,
      name: c.name,
    }));
  }, [companies]);

  // Prepare projects for scope bar
  const projectsForScopeBar = useMemo(() => {
    return projects.map(p => ({
      id: p.id,
      name: p.name,
    }));
  }, [projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#5A7A8F]" />
        <span className="ml-2 text-gray-600">Loading income data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading data</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scope Bar */}
      <IncomeScopeBar
        dataScope={dataScope}
        onDataScopeChange={setDataScope}
        companies={companiesForScopeBar}
        projects={projectsForScopeBar}
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
          <div className="space-y-2">
            {revenueByCurrency.length === 0 ? (
              <div className="text-3xl font-bold text-gray-400">-</div>
            ) : (
              <>
                {revenueByCurrency.map(({ currency, total }) => (
                  <div key={currency} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{currency}</span>
                    <span className="text-xl font-bold text-gray-900">{formatNumber(total)}</span>
                  </div>
                ))}
                {revenueByCurrency.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">THB Equiv.</span>
                      <span className="text-xl font-bold text-green-600">฿{formatCurrency(totalRevenueThb)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            {totalRevenueCount > 0 && (
              <div className="flex items-center gap-1 text-xs font-medium text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3" />
                <span>From {totalRevenueCount} invoices</span>
              </div>
            )}
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
          <div className="space-y-2">
            {cashByCurrency.length === 0 ? (
              <div className="text-3xl font-bold text-gray-400">-</div>
            ) : (
              <>
                {cashByCurrency.map(({ currency, total }) => (
                  <div key={currency} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{currency}</span>
                    <span className="text-xl font-bold text-gray-900">{formatNumber(total)}</span>
                  </div>
                ))}
                {cashByCurrency.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">THB Equiv.</span>
                      <span className="text-xl font-bold text-blue-600">฿{formatCurrency(totalCashThb)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            {totalCashCount > 0 && (
              <div className="flex items-center gap-1 text-xs font-medium text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3" />
                <span>From {totalCashCount} receipts</span>
              </div>
            )}
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
          <div className="space-y-2">
            {arByCurrency.length === 0 ? (
              <div className="text-3xl font-bold text-gray-400">-</div>
            ) : (
              <>
                {arByCurrency.map(({ currency, total }) => (
                  <div key={currency} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{currency}</span>
                    <span className={`text-xl font-bold ${total > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>{formatNumber(total)}</span>
                  </div>
                ))}
                {arByCurrency.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">THB Equiv.</span>
                      <span className={`text-xl font-bold ${totalARThb > 0 ? 'text-yellow-600' : 'text-green-600'}`}>฿{formatCurrency(totalARThb)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            {overdueInvoices.length > 0 && (
              <div className="text-xs font-medium text-amber-600 mt-1">
                ⚠ {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      <AlertsPanel
        overdueInvoices={transformedOverdueInvoices}
        expiringQuotations={transformedExpiringQuotations}
        unreconciledReceipts={transformedUnreconciledReceipts}
      />

      {/* Payments Needing Action */}
      {paymentsNeedingAction.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-sm font-semibold text-yellow-800">
              Booking Payments Needing Action ({paymentsNeedingAction.length})
            </h3>
          </div>
          <div className="space-y-2">
            {paymentsNeedingAction.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-yellow-100 px-4 py-2">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{p.currency} {Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">{p.payment_type}</span>
                  {p.paid_date && (
                    <>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-gray-500">Paid {new Date(p.paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/accounting/manager/income/receipts/new?bookingId=${p.booking_id}&amount=${p.amount}&currency=${p.currency}`)}
                    className="text-xs px-3 py-1 rounded bg-[#5A7A8F] text-white hover:bg-[#4a6a7f]"
                  >
                    Create Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div className="text-xs text-gray-500">฿{formatCurrency(totalARThb)} total (THB)</div>
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
            <div className="text-xs text-green-600">{avgDaysToPayment === 0 ? 'No data yet' : 'Based on paid invoices'}</div>
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
            quotations={transformedQuotations}
            invoices={transformedInvoices}
            receipts={transformedReceipts}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => router.push('/accounting/manager/income/quotations/new')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4A6A7F] transition-colors font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          New Quotation
        </button>
        <button
          onClick={() => router.push('/accounting/manager/income/invoices/new')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4A6A7F] transition-colors font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          New Invoice
        </button>
        <button
          onClick={() => router.push('/accounting/manager/income/receipts/new')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4A6A7F] transition-colors font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Record Receipt
        </button>
      </div>
    </div>
  );
}
