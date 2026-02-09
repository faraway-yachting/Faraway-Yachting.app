'use client';

import { Download } from 'lucide-react';
import { WhtFromCustomer, WhtToSupplier } from '@/data/finances/types';
import { useIsMobile } from '@/hooks/useIsMobile';

interface WhtTransactionTableProps {
  transactions: (WhtFromCustomer | WhtToSupplier)[];
  type: 'from-customer' | 'to-supplier';
  showCompany?: boolean;
  onDownloadCertificate?: (transaction: WhtToSupplier) => void;
}

function getStatusBadge(status: string): { bg: string; text: string } {
  switch (status) {
    case 'received':
    case 'filed':
    case 'reconciled':
      return { bg: 'bg-green-100', text: 'text-green-700' };
    case 'submitted':
      return { bg: 'bg-blue-100', text: 'text-blue-700' };
    case 'pending':
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700' };
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function WhtTransactionTable({
  transactions,
  type,
  showCompany = false,
  onDownloadCertificate,
}: WhtTransactionTableProps) {
  const isMobile = useIsMobile();
  const isToSupplier = type === 'to-supplier';

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No transactions found for the selected period</p>
      </div>
    );
  }

  const totalAmount = transactions.reduce((sum, t) => sum + (('invoiceAmount' in t) ? t.invoiceAmount : (t as WhtToSupplier).paymentAmount), 0);
  const totalWht = transactions.reduce((sum, t) => sum + t.whtAmount, 0);

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Totals summary card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Total Amount</span>
            <span className="font-semibold text-gray-900">฿{totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="font-medium text-gray-700">Total WHT</span>
            <span className="font-bold text-gray-900">฿{totalWht.toLocaleString()}</span>
          </div>
        </div>
        {transactions.map((txn) => {
          const statusBadge = getStatusBadge(txn.status);
          const isFromCustomer = 'customerName' in txn;
          const counterpartyName = isFromCustomer
            ? (txn as WhtFromCustomer).customerName
            : (txn as WhtToSupplier).supplierName;
          const amount = isFromCustomer
            ? (txn as WhtFromCustomer).invoiceAmount
            : (txn as WhtToSupplier).paymentAmount;
          return (
            <div key={txn.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#5A7A8F]">{txn.documentNumber}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                  {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                </span>
              </div>
              <dl className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">Date</dt>
                  <dd className="text-right text-sm text-gray-900">{formatDate(txn.date)}</dd>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">{isToSupplier ? 'Supplier' : 'Customer'}</dt>
                  <dd className="text-right text-sm text-gray-900">{counterpartyName}</dd>
                </div>
                {isToSupplier && (
                  <div className="flex items-start justify-between gap-2">
                    <dt className="shrink-0 text-xs font-medium text-gray-500">Type</dt>
                    <dd className="text-right text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${(txn as WhtToSupplier).whtType === 'pnd53' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {(txn as WhtToSupplier).whtType.toUpperCase()}
                      </span>
                    </dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">Amount</dt>
                  <dd className="text-right text-sm text-gray-900">฿{amount.toLocaleString()}</dd>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">WHT ({txn.whtRate}%)</dt>
                  <dd className="text-right text-sm font-semibold text-gray-900">฿{txn.whtAmount.toLocaleString()}</dd>
                </div>
              </dl>
              {isToSupplier && onDownloadCertificate && (
                <div className="mt-3 flex items-center border-t border-gray-100 pt-3">
                  <button
                    onClick={() => onDownloadCertificate(txn as WhtToSupplier)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#5A7A8F] hover:text-[#4a6a7f] hover:bg-gray-100 rounded transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    50 ทวิ
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Document
              </th>
              {showCompany && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Company
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {isToSupplier ? 'Supplier' : 'Customer'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tax ID
              </th>
              {isToSupplier && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                WHT
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {isToSupplier && onDownloadCertificate && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((txn) => {
              const statusBadge = getStatusBadge(txn.status);
              const isFromCustomer = 'customerName' in txn;
              const counterpartyName = isFromCustomer
                ? (txn as WhtFromCustomer).customerName
                : (txn as WhtToSupplier).supplierName;
              const taxId = isFromCustomer
                ? (txn as WhtFromCustomer).customerTaxId || '-'
                : (txn as WhtToSupplier).supplierTaxId;
              const amount = isFromCustomer
                ? (txn as WhtFromCustomer).invoiceAmount
                : (txn as WhtToSupplier).paymentAmount;

              return (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(txn.date)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium text-[#5A7A8F]">{txn.documentNumber}</span>
                  </td>
                  {showCompany && (
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {txn.companyName}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {counterpartyName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                    {taxId}
                  </td>
                  {isToSupplier && (
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          (txn as WhtToSupplier).whtType === 'pnd53'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {(txn as WhtToSupplier).whtType.toUpperCase()}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    ฿{amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">
                    {txn.whtRate}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                    ฿{txn.whtAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                    >
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </span>
                  </td>
                  {isToSupplier && onDownloadCertificate && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDownloadCertificate(txn as WhtToSupplier)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#5A7A8F] hover:text-[#4a6a7f] hover:bg-gray-100 rounded transition-colors"
                        title="Download WHT Certificate"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">50 ทวิ</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {/* Footer with totals */}
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td
                colSpan={isToSupplier ? (showCompany ? 6 : 5) : (showCompany ? 5 : 4)}
                className="px-4 py-3 text-sm font-semibold text-gray-700 text-right"
              >
                Total WHT:
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                ฿{totalAmount.toLocaleString()}
              </td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right font-bold">
                ฿{totalWht.toLocaleString()}
              </td>
              <td className="px-4 py-3"></td>
              {isToSupplier && onDownloadCertificate && <td className="px-4 py-3"></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
