'use client';

import { X, Download, FileText, AlertCircle } from 'lucide-react';
import { BankFeedLine, ReconciliationStats } from '@/data/banking/bankReconciliationTypes';
import {
  exportBankLinesCSV,
  exportUnmatchedCSV,
  exportReconciliationSummaryPDF,
} from '@/utils/banking/export';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankLines: BankFeedLine[];
  stats: ReconciliationStats;
  dateFrom: string;
  dateTo: string;
  dataScope: string;
}

export function ExportOptionsModal({
  isOpen,
  onClose,
  bankLines,
  stats,
  dateFrom,
  dateTo,
  dataScope,
}: ExportOptionsModalProps) {
  const handleExport = (type: 'summary-pdf' | 'all-csv' | 'unmatched-csv') => {
    const dateStr = new Date().toISOString().split('T')[0];

    switch (type) {
      case 'summary-pdf':
        exportReconciliationSummaryPDF(stats, bankLines, dateFrom, dateTo);
        break;

      case 'all-csv':
        exportBankLinesCSV(
          bankLines,
          `bank-reconciliation-all-${dateStr}.csv`
        );
        break;

      case 'unmatched-csv':
        exportUnmatchedCSV(
          bankLines,
          `bank-reconciliation-unmatched-${dateStr}.csv`
        );
        break;
    }

    // Close modal after a short delay
    setTimeout(() => {
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  const unmatchedCount = stats.unmatchedLines + stats.missingRecordLines;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Export Reconciliation Data</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose an export format
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Data Scope Info */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Export Scope</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Data Scope: <span className="font-semibold">{dataScope}</span>
                  </p>
                  <p className="text-sm text-blue-700">
                    Period: <span className="font-semibold">{dateFrom} to {dateTo}</span>
                  </p>
                  <p className="text-sm text-blue-700">
                    Total Transactions: <span className="font-semibold">{bankLines.length}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div className="space-y-3">
              {/* Option 1: Reconciliation Summary (PDF) */}
              <button
                onClick={() => handleExport('summary-pdf')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#5A7A8F] hover:bg-gray-50 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">
                      Reconciliation Summary (PDF)
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Complete overview with statistics, account coverage, and unmatched transactions
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        Coming Soon
                      </span>
                      <span className="text-xs text-gray-500">
                        Will offer CSV summary instead
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Option 2: All Bank Lines CSV */}
              <button
                onClick={() => handleExport('all-csv')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#5A7A8F] hover:bg-gray-50 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                    <Download className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">
                      All Bank Lines (CSV)
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Export all {bankLines.length} bank transactions in current scope
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      Includes: Date, Description, Amount, Status, Matched Amount, and more
                    </div>
                  </div>
                </div>
              </button>

              {/* Option 3: Unmatched Only CSV */}
              <button
                onClick={() => handleExport('unmatched-csv')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#5A7A8F] hover:bg-gray-50 transition-all text-left group"
                disabled={unmatchedCount === 0}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
                    unmatchedCount === 0
                      ? 'bg-gray-100'
                      : 'bg-yellow-100 group-hover:bg-yellow-200'
                  }`}>
                    <AlertCircle className={`h-6 w-6 ${
                      unmatchedCount === 0 ? 'text-gray-400' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-base ${
                      unmatchedCount === 0 ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      Unmatched/Missing Only (CSV)
                    </h3>
                    <p className={`text-sm mt-1 ${
                      unmatchedCount === 0 ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {unmatchedCount === 0
                        ? 'No unmatched or missing transactions to export'
                        : `Export ${unmatchedCount} unreconciled transaction${unmatchedCount !== 1 ? 's' : ''}`
                      }
                    </p>
                    {unmatchedCount > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Only includes unmatched and missing_record transactions
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
