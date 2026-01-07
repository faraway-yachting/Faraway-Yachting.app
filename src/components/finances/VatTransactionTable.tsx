'use client';

import { VatTransaction } from '@/data/finances/types';

interface VatTransactionTableProps {
  transactions: VatTransaction[];
  showCompany?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDocumentTypeBadge(type: string): { bg: string; text: string; label: string } {
  switch (type) {
    case 'invoice':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Invoice' };
    case 'receipt':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Receipt' };
    case 'expense':
      return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Expense' };
    case 'credit_note':
      return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Credit Note' };
    case 'debit_note':
      return { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Debit Note' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: type };
  }
}

export function VatTransactionTable({
  transactions,
  showCompany = false,
}: VatTransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No transactions found for the selected period</p>
      </div>
    );
  }

  const totalBase = transactions.reduce((sum, t) => sum + t.baseAmount, 0);
  const totalVat = transactions.reduce((sum, t) => sum + t.vatAmount, 0);

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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Type
              </th>
              {showCompany && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Company
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Counterparty
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tax ID
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Base Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                VAT
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((txn) => {
              const docBadge = getDocumentTypeBadge(txn.documentType);

              return (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(txn.date)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium text-[#5A7A8F]">{txn.documentNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${docBadge.bg} ${docBadge.text}`}
                    >
                      {docBadge.label}
                    </span>
                  </td>
                  {showCompany && (
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {txn.companyName}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {txn.counterpartyName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                    {txn.counterpartyTaxId}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ฿{txn.baseAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">
                    {txn.vatRate}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                    ฿{txn.vatAmount.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Footer with totals */}
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td
                colSpan={showCompany ? 6 : 5}
                className="px-4 py-3 text-sm font-semibold text-gray-700 text-right"
              >
                Totals:
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                ฿{totalBase.toLocaleString()}
              </td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right font-bold">
                ฿{totalVat.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
