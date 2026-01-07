'use client';

import { useState, useMemo } from 'react';
import { X, Loader2, ArrowUpCircle } from 'lucide-react';
import type { PettyCashWallet } from '@/data/petty-cash/types';
import { getActiveCompanies } from '@/data/company/companies';
import { getActiveBankAccountsByCompany } from '@/data/banking/bankAccounts';
import { formatCurrency, getTodayISO } from '@/lib/petty-cash/utils';

interface TopUpModalProps {
  wallet: PettyCashWallet;
  onSubmit: (data: {
    walletId: string;
    walletHolderName: string;
    amount: number;
    companyId: string;
    companyName: string;
    bankAccountId: string;
    bankAccountName: string;
    topUpDate: string;
    reference?: string;
    notes?: string;
  }) => void;
  onClose: () => void;
}

export default function TopUpModal({
  wallet,
  onSubmit,
  onClose,
}: TopUpModalProps) {
  const companies = useMemo(() => getActiveCompanies(), []);

  const [companyId, setCompanyId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [topUpDate, setTopUpDate] = useState(getTodayISO());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get bank accounts for selected company
  const bankAccounts = useMemo(
    () => (companyId ? getActiveBankAccountsByCompany(companyId) : []),
    [companyId]
  );

  // Reset bank account when company changes
  const handleCompanyChange = (newCompanyId: string) => {
    setCompanyId(newCompanyId);
    setBankAccountId('');
  };

  // Calculate new balance
  const newBalance = useMemo(() => {
    const topUpAmount = parseFloat(amount) || 0;
    return wallet.balance + topUpAmount;
  }, [wallet.balance, amount]);

  // Check if would exceed limit
  const exceedsLimit = useMemo(() => {
    if (!wallet.balanceLimit) return false;
    return newBalance > wallet.balanceLimit;
  }, [newBalance, wallet.balanceLimit]);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!companyId) {
      newErrors.companyId = 'Please select a company';
    }
    if (!bankAccountId) {
      newErrors.bankAccountId = 'Please select a bank account';
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!topUpDate) {
      newErrors.topUpDate = 'Please select a date';
    }
    if (exceedsLimit) {
      newErrors.amount = `Top-up would exceed wallet limit of ${formatCurrency(
        wallet.balanceLimit || 0,
        wallet.currency
      )}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const selectedCompany = companies.find((c) => c.id === companyId);
      const selectedAccount = bankAccounts.find((a) => a.id === bankAccountId);

      onSubmit({
        walletId: wallet.id,
        walletHolderName: wallet.userName,
        amount: parseFloat(amount),
        companyId,
        companyName: selectedCompany?.name || '',
        bankAccountId,
        bankAccountName: selectedAccount?.accountName || '',
        topUpDate,
        reference: reference || undefined,
        notes: notes || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Top-up Wallet
                </h2>
                <p className="text-sm text-gray-500">{wallet.userName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            {/* Current Balance */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Balance</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(wallet.balance, wallet.currency)}
                </span>
              </div>
              {wallet.balanceLimit && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">Wallet Limit</span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(wallet.balanceLimit, wallet.currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Company <span className="text-red-500">*</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                  errors.companyId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {errors.companyId && (
                <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>
              )}
            </div>

            {/* Bank Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account <span className="text-red-500">*</span>
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                disabled={!companyId}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] disabled:bg-gray-100 ${
                  errors.bankAccountId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">
                  {companyId ? 'Select Bank Account' : 'Select company first'}
                </option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName} ({account.accountNumber})
                  </option>
                ))}
              </select>
              {errors.bankAccountId && (
                <p className="mt-1 text-sm text-red-600">{errors.bankAccountId}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ฿
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Top-up Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={topUpDate}
                onChange={(e) => setTopUpDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F] ${
                  errors.topUpDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.topUpDate && (
                <p className="mt-1 text-sm text-red-600">{errors.topUpDate}</p>
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference (optional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transfer reference number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>

            {/* New Balance Preview */}
            {amount && parseFloat(amount) > 0 && (
              <div
                className={`p-4 rounded-lg ${
                  exceedsLimit
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-green-50 border border-green-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm ${
                      exceedsLimit ? 'text-red-700' : 'text-green-700'
                    }`}
                  >
                    New Balance After Top-up
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      exceedsLimit ? 'text-red-700' : 'text-green-700'
                    }`}
                  >
                    {formatCurrency(newBalance, wallet.currency)}
                  </span>
                </div>
                {exceedsLimit && (
                  <p className="text-sm text-red-600 mt-1">
                    This would exceed the wallet limit
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || exceedsLimit}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Top-up Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
