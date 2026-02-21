'use client';

import { Wallet, TrendingDown, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/petty-cash/utils';
import type { Currency } from '@/data/company/types';

// Simplified wallet type for display purposes
interface WalletDisplay {
  id: string;
  walletName: string;
  userName: string;
  balance: number;
  currency: Currency;
  status: string;
  balanceLimit?: number | null;
  lowBalanceThreshold?: number | null;
}

interface BalanceBreakdown {
  initialBalance: number;
  topups: number;
  paidReimbursements: number;
  submittedExpenses: number;
}

interface WalletSummaryCardProps {
  wallet: WalletDisplay | null;
  pendingReimbursement: number;
  monthlyExpenses: number;
  balanceBreakdown?: BalanceBreakdown | null;
  className?: string;
}

export default function WalletSummaryCard({
  wallet,
  pendingReimbursement,
  monthlyExpenses,
  balanceBreakdown,
  className = '',
}: WalletSummaryCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!wallet) {
    return null;
  }

  const isLowBalance =
    wallet.lowBalanceThreshold && wallet.balance <= wallet.lowBalanceThreshold;

  const balancePercentage = wallet.balanceLimit
    ? (wallet.balance / wallet.balanceLimit) * 100
    : null;

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">My Wallet</h3>
              <p className="text-sm text-white/70">{wallet.userName}</p>
            </div>
          </div>
          {wallet.status === 'closed' && (
            <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full">
              Closed
            </span>
          )}
        </div>
      </div>

      {/* Balance Section */}
      <div className="px-6 py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-sm text-gray-500">Available Balance</p>
              {balanceBreakdown && (
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip(!showTooltip)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                  {showTooltip && (
                    <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
                      <p className="font-medium mb-2 text-gray-200">Balance Calculation</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Initial Balance</span>
                          <span className="font-mono">{formatCurrency(balanceBreakdown.initialBalance, wallet.currency)}</span>
                        </div>
                        {balanceBreakdown.topups > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-300">+ Top-ups</span>
                            <span className="font-mono text-green-400">{formatCurrency(balanceBreakdown.topups, wallet.currency)}</span>
                          </div>
                        )}
                        {balanceBreakdown.paidReimbursements > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-300">+ Paid Reimbursements</span>
                            <span className="font-mono text-green-400">{formatCurrency(balanceBreakdown.paidReimbursements, wallet.currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-300">- Submitted Expenses</span>
                          <span className="font-mono text-red-400">{formatCurrency(balanceBreakdown.submittedExpenses, wallet.currency)}</span>
                        </div>
                        <div className="border-t border-gray-600 pt-1.5 mt-1.5 flex justify-between font-medium">
                          <span>= Available Balance</span>
                          <span className="font-mono">{formatCurrency(wallet.balance, wallet.currency)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p
              className={`text-3xl font-bold ${
                isLowBalance ? 'text-orange-600' : 'text-gray-900'
              }`}
            >
              {formatCurrency(wallet.balance, wallet.currency)}
            </p>
          </div>
          {isLowBalance && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-600">
                Low Balance
              </span>
            </div>
          )}
        </div>

        {/* Balance Meter */}
        {balancePercentage !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Balance</span>
              <span>
                {formatCurrency(wallet.balance, wallet.currency)} /{' '}
                {formatCurrency(wallet.balanceLimit || 0, wallet.currency)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  balancePercentage <= 20
                    ? 'bg-red-500'
                    : balancePercentage <= 40
                    ? 'bg-orange-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(balancePercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">This Month</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(monthlyExpenses, wallet.currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(pendingReimbursement, wallet.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
