'use client';

import { useState } from 'react';
import { X, CheckCircle, Loader2, Calendar, FileText } from 'lucide-react';
import type { PettyCashBatch } from '@/lib/supabase/api/pettyCash';
import { formatCurrency, getTodayISO } from '@/lib/petty-cash/utils';

interface MarkBatchPaidModalProps {
  batch: PettyCashBatch;
  onConfirm: (paymentDate: string, paymentReference?: string) => void;
  onClose: () => void;
}

export default function MarkBatchPaidModal({
  batch,
  onConfirm,
  onClose,
}: MarkBatchPaidModalProps) {
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [paymentReference, setPaymentReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!paymentDate) {
      setError('Please select a payment date');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      onConfirm(paymentDate, paymentReference || undefined);
    } catch (err) {
      console.error('Error marking batch as paid:', err);
      setError('Failed to mark batch as paid');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mark Batch as Paid</h2>
              <p className="text-sm text-gray-500">Confirm bank transfer completed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Batch Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Batch Number:</span>
              <span className="font-medium text-gray-900">{batch.batch_number}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Wallet Holder:</span>
              <span className="font-medium text-gray-900">{batch.wallet_holder_name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Reimbursements:</span>
              <span className="font-medium text-gray-900">{batch.reimbursement_count}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(batch.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Reference (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g., Bank transfer reference number"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>
          </div>

          {/* Info */}
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            This will mark all {batch.reimbursement_count} reimbursement(s) in this batch as paid
            and update the wallet balances accordingly.
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !paymentDate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirm Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
