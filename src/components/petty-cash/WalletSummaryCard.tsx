'use client';

import { Wallet, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
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

interface WalletSummaryCardProps {
  wallet: WalletDisplay | null;
  pendingReimbursement: number;
  monthlyExpenses: number;
  className?: string;
}

export default function WalletSummaryCard({
  wallet,
  pendingReimbursement,
  monthlyExpenses,
  className = '',
}: WalletSummaryCardProps) {
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
            <p className="text-sm text-gray-500 mb-1">Available Balance</p>
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
