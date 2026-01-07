'use client';

import { AccountBalance } from '@/data/finances/types';
import { Wallet, Building2, Smartphone, ChevronRight } from 'lucide-react';

interface AccountBalanceCardProps {
  account: AccountBalance;
  showCompany?: boolean;
}

const currencySymbols: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  GBP: '£',
  AED: 'د.إ',
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${Math.abs(amount).toLocaleString()}`;
}

export function AccountBalanceCard({ account, showCompany = false }: AccountBalanceCardProps) {
  const getIcon = () => {
    switch (account.accountType) {
      case 'cash':
        return <Wallet className="h-5 w-5" />;
      case 'bank':
        return <Building2 className="h-5 w-5" />;
      case 'e-wallet':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-[#5A7A8F] group-hover:text-white transition-colors">
            {getIcon()}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{account.accountName}</h4>
            {showCompany && (
              <p className="text-xs text-gray-500 mt-0.5">{account.companyName}</p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                {account.currency}
              </span>
              <span className="text-xs text-gray-400">GL: {account.glAccountCode}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(account.currentBalance, account.currency)}
          </p>
          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto mt-1 group-hover:text-[#5A7A8F] transition-colors" />
        </div>
      </div>

      {/* Balance breakdown */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Opening</p>
            <p className="font-medium text-gray-700">
              {formatCurrency(account.openingBalance, account.currency)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">In</p>
            <p className="font-medium text-green-600">
              +{formatCurrency(account.movements.totalIn, account.currency)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Out</p>
            <p className="font-medium text-red-600">
              -{formatCurrency(account.movements.totalOut, account.currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
