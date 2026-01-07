'use client';

import { X, Info } from 'lucide-react';

interface FilterInfoBannerProps {
  selectedBankAccountIds: string[];
  bankAccounts: Array<{ id: string; name: string }>;
  onClearFilter: () => void;
}

export function FilterInfoBanner({
  selectedBankAccountIds,
  bankAccounts,
  onClearFilter,
}: FilterInfoBannerProps) {
  // Only show if a bank account is selected
  if (selectedBankAccountIds.length === 0) return null;

  // Get bank account name(s)
  const selectedAccounts = bankAccounts.filter(acc =>
    selectedBankAccountIds.includes(acc.id)
  );

  if (selectedAccounts.length === 0) return null;

  return (
    <div className="mb-4 flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-900">
            Showing transactions for:{' '}
            <span className="font-semibold">
              {selectedAccounts.map(acc => acc.name).join(', ')}
            </span>
          </p>
          {selectedAccounts.length === 1 && (
            <p className="text-xs text-blue-700 mt-0.5">
              Click "Clear Filter" to view all bank accounts
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onClearFilter}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Clear Filter
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
