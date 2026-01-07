'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Wallet, Building2, Smartphone } from 'lucide-react';
import { AccountBalance, AccountType } from '@/data/finances/types';
import { AccountBalanceCard } from './AccountBalanceCard';

interface AccountGroupSectionProps {
  type: AccountType;
  label: string;
  accounts: AccountBalance[];
  totalBalance: number;
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

// Group accounts by currency and sum balances
function sumByMainCurrency(accounts: AccountBalance[]): { currency: string; total: number }[] {
  const byGroup: Record<string, number> = {};
  accounts.forEach(acc => {
    if (!byGroup[acc.currency]) {
      byGroup[acc.currency] = 0;
    }
    byGroup[acc.currency] += acc.currentBalance;
  });

  return Object.entries(byGroup)
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);
}

export function AccountGroupSection({
  type,
  label,
  accounts,
  totalBalance,
  showCompany = false,
}: AccountGroupSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getIcon = () => {
    switch (type) {
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

  const currencyTotals = sumByMainCurrency(accounts);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#5A7A8F] text-white rounded-lg">
            {getIcon()}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{label}</h3>
            <p className="text-sm text-gray-500">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Currency breakdown */}
          <div className="flex items-center gap-3 text-right">
            {currencyTotals.map(({ currency, total }) => (
              <div key={currency} className="text-sm">
                <span className="text-gray-500">{currency}:</span>
                <span className="ml-1 font-semibold text-gray-900">
                  {currencySymbols[currency] || ''}{total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Expand/Collapse icon */}
          <div className="text-gray-400">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </button>

      {/* Accounts Grid */}
      {isExpanded && accounts.length > 0 && (
        <div className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <AccountBalanceCard
                key={account.id}
                account={account}
                showCompany={showCompany}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isExpanded && accounts.length === 0 && (
        <div className="px-6 pb-6 pt-2">
          <p className="text-center text-gray-500 py-8">No accounts in this category</p>
        </div>
      )}
    </div>
  );
}
