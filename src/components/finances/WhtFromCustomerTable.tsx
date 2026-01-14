'use client';

import { useState } from 'react';
import { Upload, Check, FileText, ExternalLink, Eye, X, Pencil } from 'lucide-react';
import type { WhtFromCustomerRecord } from '@/lib/supabase/api/whtFromCustomer';

interface WhtFromCustomerTableProps {
  records: WhtFromCustomerRecord[];
  showCompany?: boolean;
  onMarkAsReceived: (record: WhtFromCustomerRecord) => void;
  onViewReceipt: (receiptId: string) => void;
  onEdit?: (record: WhtFromCustomerRecord) => void;
}

function getStatusBadge(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'received':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Received WHT' };
    case 'reconciled':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Reconciled' };
    case 'pending':
    default:
      return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Waiting for WHT' };
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// WHT Detail Modal Component
function WhtDetailModal({
  record,
  isOpen,
  onClose,
  onViewReceipt,
  onMarkAsReceived,
  onEdit,
}: {
  record: WhtFromCustomerRecord;
  isOpen: boolean;
  onClose: () => void;
  onViewReceipt: (receiptId: string) => void;
  onMarkAsReceived: (record: WhtFromCustomerRecord) => void;
  onEdit?: (record: WhtFromCustomerRecord) => void;
}) {
  if (!isOpen) return null;

  const statusBadge = getStatusBadge(record.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">WHT Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {record.receiptNumber || `Receipt ${record.receiptId.slice(0, 8)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Status</span>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}
            >
              {statusBadge.label}
            </span>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium text-gray-900">{record.customerName}</p>
              </div>
              <div>
                <span className="text-gray-500">Tax ID:</span>
                <p className="font-medium font-mono text-gray-900">{record.customerTaxId || '-'}</p>
              </div>
            </div>
          </div>

          {/* WHT Details */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-700 mb-3">WHT Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-600">Receipt Date:</span>
                <p className="font-medium text-gray-900">{formatDate(record.receiptDate)}</p>
              </div>
              <div>
                <span className="text-blue-600">Period:</span>
                <p className="font-medium text-gray-900">{record.period}</p>
              </div>
              <div>
                <span className="text-blue-600">Base Amount:</span>
                <p className="font-medium text-gray-900">฿{record.baseAmount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-blue-600">WHT Rate:</span>
                <p className="font-medium text-gray-900">{record.whtRate.toFixed(0)}%</p>
              </div>
              <div className="col-span-2">
                <span className="text-blue-600">WHT Amount:</span>
                <p className="text-xl font-bold text-amber-600">฿{record.whtAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Certificate Info (if received) */}
          {record.status !== 'pending' && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-700 mb-3">Certificate Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-green-600">Certificate Number:</span>
                  <p className="font-medium text-gray-900">{record.certificateNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-green-600">Certificate Date:</span>
                  <p className="font-medium text-gray-900">
                    {record.certificateDate ? formatDate(record.certificateDate) : '-'}
                  </p>
                </div>
                {record.receivedAt && (
                  <div>
                    <span className="text-green-600">Received At:</span>
                    <p className="font-medium text-gray-900">{formatDate(record.receivedAt)}</p>
                  </div>
                )}
                {record.certificateFileUrl && (
                  <div className="col-span-2">
                    <span className="text-green-600">Certificate File:</span>
                    <a
                      href={record.certificateFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{record.certificateFileName || 'View Certificate'}</span>
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  </div>
                )}
              </div>
              {record.notes && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <span className="text-green-600 text-sm">Notes:</span>
                  <p className="text-sm text-gray-700 mt-1">{record.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Company Info */}
          {record.companyName && (
            <div className="text-sm text-gray-500">
              <span>Company: </span>
              <span className="font-medium text-gray-700">{record.companyName}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              onClose();
              onViewReceipt(record.receiptId);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5A7A8F] hover:bg-[#5A7A8F]/10 rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            View Receipt
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            {record.status === 'pending' && (
              <button
                onClick={() => {
                  onClose();
                  onMarkAsReceived(record);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Mark as Received
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WhtFromCustomerTable({
  records,
  showCompany = false,
  onMarkAsReceived,
  onViewReceipt,
  onEdit,
}: WhtFromCustomerTableProps) {
  const [selectedRecord, setSelectedRecord] = useState<WhtFromCustomerRecord | null>(null);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No WHT transactions found for the selected period</p>
        <p className="text-sm text-gray-400 mt-2">
          WHT records are created automatically when receipts with WHT are approved
        </p>
      </div>
    );
  }

  // Calculate totals
  const totalBaseAmount = records.reduce((sum, r) => sum + r.baseAmount, 0);
  const totalWhtAmount = records.reduce((sum, r) => sum + r.whtAmount, 0);

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
                {showCompany && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
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
                  WHT Amount
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Certificate
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => {
                const statusBadge = getStatusBadge(record.status);

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(record.receiptDate)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReceipt(record.receiptId);
                        }}
                        className="font-medium text-[#5A7A8F] hover:underline"
                      >
                        {record.receiptNumber || 'View Receipt'}
                      </button>
                    </td>
                    {showCompany && (
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {record.companyName || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                      {record.customerTaxId || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      ฿{record.baseAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">
                      {record.whtRate.toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                      ฿{record.whtAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.certificateFileUrl ? (
                        <a
                          href={record.certificateFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          title={record.certificateFileName || 'View Certificate'}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="hidden sm:inline">View</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.status === 'pending' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsReceived(record);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                          title="Mark as Received"
                        >
                          <Upload className="h-4 w-4" />
                          <span className="hidden sm:inline">Upload</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer with totals */}
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td
                  colSpan={showCompany ? 5 : 4}
                  className="px-4 py-3 text-sm font-semibold text-gray-700 text-right"
                >
                  Total:
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                  ฿{totalBaseAmount.toLocaleString()}
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-bold">
                  ฿{totalWhtAmount.toLocaleString()}
                </td>
                <td colSpan={3} className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <WhtDetailModal
          record={selectedRecord}
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onViewReceipt={onViewReceipt}
          onMarkAsReceived={onMarkAsReceived}
          onEdit={onEdit}
        />
      )}
    </>
  );
}
