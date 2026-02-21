'use client';

import { useState } from 'react';
import { X, Banknote, CreditCard, Building2, QrCode } from 'lucide-react';
import { CurrencySelect } from '@/components/shared/CurrencySelect';

interface BankAccountOption {
  id: string;
  account_name: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'promptpay';

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'promptpay', label: 'PromptPay', icon: QrCode },
];

interface CollectBalanceModalProps {
  onClose: () => void;
  onSubmitCash: (data: {
    amount: number;
    currency: string;
    collected_by_id: string;
    collection_notes?: string;
  }) => Promise<void>;
  onSubmitPayment: (data: {
    amount: number;
    currency: string;
    paidDate: string;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    paidToCompanyId?: string;
    note?: string;
  }) => Promise<void>;
  remainingBalance: number;
  currency: string;
  meetGreeterName?: string;
  currentUserId: string;
  users: { id: string; full_name: string | null; email: string }[];
  bankAccounts?: BankAccountOption[];
  companies?: CompanyOption[];
  cabinLabel?: string;
}

export default function CollectBalanceModal({
  onClose,
  onSubmitCash,
  onSubmitPayment,
  remainingBalance,
  currency: defaultCurrency,
  meetGreeterName,
  currentUserId,
  users,
  bankAccounts = [],
  companies = [],
  cabinLabel,
}: CollectBalanceModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState(String(remainingBalance));
  const [currency, setCurrency] = useState(defaultCurrency);
  const [collectedById, setCollectedById] = useState(currentUserId);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [paidToCompanyId, setPaidToCompanyId] = useState('');
  const [notes, setNotes] = useState(
    meetGreeterName ? `Collected by ${meetGreeterName}` : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    setSaving(true);
    try {
      if (method === 'cash') {
        await onSubmitCash({
          amount: parsedAmount,
          currency,
          collected_by_id: collectedById,
          collection_notes: notes || undefined,
        });
      } else {
        await onSubmitPayment({
          amount: parsedAmount,
          currency,
          paidDate,
          paymentMethod: method,
          bankAccountId: method === 'bank_transfer' && bankAccountId ? bankAccountId : undefined,
          paidToCompanyId: method === 'bank_transfer' && paidToCompanyId ? paidToCompanyId : undefined,
          note: notes || undefined,
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to collect balance:', err);
    } finally {
      setSaving(false);
    }
  };

  const title = cabinLabel
    ? `Collect Balance — ${cabinLabel}`
    : 'Collect Balance';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-4 gap-1.5">
              {paymentMethods.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                    method === value
                      ? 'bg-[#5A7A8F] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                required
                autoFocus
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <CurrencySelect
                value={currency}
                onChange={(val) => setCurrency(val)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
              />
            </div>
          </div>

          {/* Meet & Greet context */}
          {meetGreeterName && method === 'cash' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
              <Banknote className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm text-amber-800">
                Meet & Greet: <strong>{meetGreeterName}</strong> will collect
              </span>
            </div>
          )}

          {/* Cash: Recorded By */}
          {method === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recorded By</label>
              <select
                value={collectedById}
                onChange={(e) => setCollectedById(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bank Transfer: Company + Bank Account */}
          {method === 'bank_transfer' && (
            <>
              {companies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid To Company</label>
                  <select
                    value={paidToCompanyId}
                    onChange={(e) => setPaidToCompanyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                  >
                    <option value="">-- Select --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {bankAccounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                  >
                    <option value="">-- Select --</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.account_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Non-cash: Payment Date */}
          {method !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={method === 'cash' ? 'Collection notes...' : 'Payment notes...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : method === 'cash'
                  ? 'Record Cash Collection'
                  : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
