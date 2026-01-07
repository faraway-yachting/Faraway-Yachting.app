'use client';

import { useState, useMemo } from 'react';
import { X, Download, AlertTriangle, Search } from 'lucide-react';
import { BankFeedLine } from '@/data/banking/bankReconciliationTypes';

interface DiscrepancyDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankLines: BankFeedLine[];
}

export function DiscrepancyDrilldownModal({
  isOpen,
  onClose,
  bankLines,
}: DiscrepancyDrilldownModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter to show only lines with discrepancies
  const discrepancyLines = useMemo(() => {
    return bankLines.filter(line => {
      const hasDiscrepancy = line.matchedAmount !== Math.abs(line.amount);
      const needsReview = line.status === 'needs_review';
      return hasDiscrepancy || needsReview;
    });
  }, [bankLines]);

  // Filter by search term
  const filteredLines = useMemo(() => {
    if (!searchTerm) return discrepancyLines;

    const term = searchTerm.toLowerCase();
    return discrepancyLines.filter(line =>
      line.description.toLowerCase().includes(term) ||
      line.reference?.toLowerCase().includes(term)
    );
  }, [discrepancyLines, searchTerm]);

  // Calculate stats
  const totalBankAmount = filteredLines.reduce((sum, line) => sum + line.amount, 0);
  const totalMatchedAmount = filteredLines.reduce((sum, line) => sum + line.matchedAmount, 0);
  const totalDifference = totalBankAmount - totalMatchedAmount;

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Description', 'Reference', 'Bank Amount', 'Matched Amount', 'Difference', 'Currency', 'Status'];
    const rows = filteredLines.map(line => [
      line.transactionDate,
      line.description,
      line.reference || '-',
      Math.abs(line.amount).toString(),
      line.matchedAmount.toString(),
      (Math.abs(line.amount) - line.matchedAmount).toString(),
      line.currency,
      line.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `discrepancy-drilldown-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      needs_review: 'bg-orange-100 text-orange-800',
      partially_matched: 'bg-blue-100 text-blue-800',
      unmatched: 'bg-yellow-100 text-yellow-800',
      matched: 'bg-green-100 text-green-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      needs_review: 'Needs Review',
      partially_matched: 'Partially Matched',
      unmatched: 'Unmatched',
      matched: 'Matched',
      missing_record: 'Missing Record',
      ignored: 'Ignored',
    };
    return labels[status] || status;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Discrepancy Drilldown</h2>
              <p className="text-sm text-gray-500 mt-1">
                Bank lines with amount differences or requiring review
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by description or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Content - Table */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filteredLines.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No discrepancies found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'Try adjusting your search'
                    : 'All bank lines are either fully matched or have no amount differences'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Matched Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Difference
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLines.map((line) => {
                      const difference = Math.abs(line.amount) - line.matchedAmount;
                      const hasDifference = Math.abs(difference) > 0.01; // Account for floating point

                      return (
                        <tr
                          key={line.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {new Date(line.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                            <div className="truncate">{line.description}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {line.reference || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            <span className={line.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {line.currency} {Math.abs(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {line.currency} {line.matchedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            {hasDifference ? (
                              <span className={`font-semibold ${difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {difference > 0 ? '+' : ''}{difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(line.status)}`}>
                              {getStatusLabel(line.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredLines.length}</span> discrepanc{filteredLines.length !== 1 ? 'ies' : 'y'}
              {filteredLines.length > 0 && (
                <>
                  {' • '}
                  <span className="font-medium">Bank Total: {Math.abs(totalBankAmount).toLocaleString()} </span>
                  {' • '}
                  <span className="font-medium">Matched Total: {totalMatchedAmount.toLocaleString()} </span>
                  {' • '}
                  <span className={`font-semibold ${totalDifference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Difference: {totalDifference.toLocaleString()}
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {filteredLines.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#2c3e50] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
