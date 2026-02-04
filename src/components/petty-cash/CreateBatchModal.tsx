'use client';

import { useState, useEffect } from 'react';
import { X, Package, Loader2, Building2, Wallet, CreditCard } from 'lucide-react';
import type { PettyCashReimbursement } from '@/lib/supabase/api/pettyCash';
import { bankAccountsApi } from '@/lib/supabase/api';
import type { Database } from '@/lib/supabase/database.types';
import { formatCurrency } from '@/lib/petty-cash/utils';

type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];

interface CreateBatchModalProps {
  companyId: string;
  companyName: string;
  walletHolderName: string;
  reimbursements: PettyCashReimbursement[];
  totalAmount: number;
  onConfirm: (bankAccountId: string, bankAccountName: string) => void;
  onClose: () => void;
}

export default function CreateBatchModal({
  companyId,
  companyName,
  walletHolderName,
  reimbursements,
  totalAmount,
  onConfirm,
  onClose,
}: CreateBatchModalProps) {
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Load bank accounts for the company
  useEffect(() => {
    const loadBankAccounts = async () => {
      setIsLoadingData(true);
      try {
        const allBankAccounts = await bankAccountsApi.getActive();
        // Filter bank accounts by company
        const companyBankAccounts = allBankAccounts.filter(
          (ba) => ba.company_id === companyId
        );
        setBankAccounts(companyBankAccounts);
        // Auto-select first bank account if available
        if (companyBankAccounts.length > 0) {
          setBankAccountId(companyBankAccounts[0].id);
        }
      } catch (err) {
        console.error('Error loading bank accounts:', err);
        setError('Failed to load bank accounts');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadBankAccounts();
  }, [companyId]);

  const handleSubmit = async () => {
    if (!bankAccountId) {
      setError('Please select a bank account');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const selectedBank = bankAccounts.find((ba) => ba.id === bankAccountId);
      onConfirm(bankAccountId, selectedBank?.account_name || 'Bank Account');
    } catch (err) {
      console.error('Error creating batch:', err);
      setError('Failed to create batch');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Reimbursement Batch</h2>
              <p className="text-sm text-gray-500">Group reimbursements for one bank transfer</p>
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
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Company:</span>
              <span className="font-medium text-gray-900">{companyName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Wallet Holder:</span>
              <span className="font-medium text-gray-900">{walletHolderName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Reimbursements:</span>
              <span className="font-medium text-gray-900">{reimbursements.length}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Reimbursements List */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Included Reimbursements</h3>
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {reimbursements.map((r) => (
                <div key={r.id} className="px-3 py-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{r.reimbursement_number}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(r.final_amount || r.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Account Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Account for Transfer
            </label>
            {isLoadingData ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 p-3 border rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading bank accounts...
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-sm text-amber-600 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                No bank accounts found for this company. Please add a bank account first.
              </div>
            ) : (
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
                >
                  <option value="">Select bank account...</option>
                  {bankAccounts.map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.account_name} ({ba.account_number})
                    </option>
                  ))}
                </select>
              </div>
            )}
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
            disabled={isProcessing || !bankAccountId || bankAccounts.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                Create Batch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
