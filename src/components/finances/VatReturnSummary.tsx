'use client';

import { useEffect, useState } from 'react';
import { vatTransactionsApi } from '@/lib/supabase/api/vatTransactions';
import { vatFilingsApi } from '@/lib/supabase/api/vatFilings';

interface VatReturnSummaryProps {
  period: string; // YYYY-MM
  companyId: string;
}

interface VatSummaryData {
  filingId: string | null;
  outputVat: number;
  inputVat: number;
  filingStatus: 'pending' | 'filed' | 'paid';
}

export default function VatReturnSummary({ period, companyId }: VatReturnSummaryProps) {
  const [data, setData] = useState<VatSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transactions, filing] = await Promise.all([
        vatTransactionsApi.getByPeriod(period),
        vatFilingsApi.getByPeriod(companyId, period),
      ]);

      const companyTransactions = companyId
        ? transactions.filter((t: any) => t.company_id === companyId)
        : transactions;

      const outputVat = companyTransactions
        .filter((t: any) => t.type === 'out')
        .reduce((sum: number, t: any) => sum + (t.vat_amount ?? 0), 0);

      const inputVat = companyTransactions
        .filter((t: any) => t.type === 'in')
        .reduce((sum: number, t: any) => sum + (t.vat_amount ?? 0), 0);

      setData({
        filingId: filing?.id ?? null,
        outputVat,
        inputVat,
        filingStatus: filing?.status ?? 'pending',
      });
    } catch (error) {
      console.error('Failed to load VAT summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, companyId]);

  const formatAmount = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getDueDate = (p: string) => {
    const [year, month] = p.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;
  };

  const handleMarkFiled = async () => {
    try {
      if (!data?.filingId) {
        // Create the filing record first
        const filing = await vatFilingsApi.createOrUpdate({
          company_id: companyId,
          period,
          vat_output: data?.outputVat ?? 0,
          vat_input: data?.inputVat ?? 0,
          net_vat: (data?.outputVat ?? 0) - (data?.inputVat ?? 0),
        });
        await vatFilingsApi.markFiled(filing.id, new Date().toISOString().slice(0, 10), '');
      } else {
        await vatFilingsApi.markFiled(data.filingId, new Date().toISOString().slice(0, 10), '');
      }
      setData((prev) => (prev ? { ...prev, filingStatus: 'filed' } : prev));
    } catch (error) {
      console.error('Failed to mark as filed:', error);
    }
  };

  const handleMarkPaid = async () => {
    try {
      if (data?.filingId) {
        await vatFilingsApi.markPaid(data.filingId, new Date().toISOString().slice(0, 10), '');
      }
      setData((prev) => (prev ? { ...prev, filingStatus: 'paid' } : prev));
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      filed: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] ?? styles.pending}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center py-16">
        <svg
          className="animate-spin h-6 w-6 text-[#5A7A8F]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!data) return null;

  const netVat = data.outputVat - data.inputVat;
  const isPayable = netVat >= 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          VAT Return &mdash; {period}
        </h2>
        {statusBadge(data.filingStatus)}
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Output VAT (Sales)</span>
          <span className="font-medium text-gray-900">{formatAmount(data.outputVat)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Input VAT (Purchases)</span>
          <span className="font-medium text-gray-900">({formatAmount(data.inputVat)})</span>
        </div>
        <hr className="border-gray-200" />
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-700">
            Net VAT {isPayable ? '(Payable)' : '(Refundable)'}
          </span>
          <span className={`text-lg font-bold ${isPayable ? 'text-red-600' : 'text-green-600'}`}>
            {formatAmount(Math.abs(netVat))}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Due Date</span>
          <span className="font-medium text-gray-900">{getDueDate(period)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        {data.filingStatus === 'pending' && (
          <button
            onClick={handleMarkFiled}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-md hover:bg-[#4a6a7f]"
          >
            Mark as Filed
          </button>
        )}
        {data.filingStatus === 'filed' && (
          <button
            onClick={handleMarkPaid}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Mark as Paid
          </button>
        )}
      </div>
    </div>
  );
}
