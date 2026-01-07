'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { chartOfAccounts, type ChartOfAccount, type AccountType } from '@/data/accounting/chartOfAccounts';

interface AccountCodeSelectorProps {
  value: string;
  onChange: (code: string) => void;
  filterByType?: AccountType | AccountType[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  variant?: 'default' | 'minimal';  // minimal = no border, subtle like WHT% dropdown
  className?: string;
}

// Group accounts by type and category for better organization
function groupAccounts(accounts: ChartOfAccount[]) {
  const grouped: Record<string, Record<string, ChartOfAccount[]>> = {};

  for (const account of accounts) {
    if (!grouped[account.accountType]) {
      grouped[account.accountType] = {};
    }
    if (!grouped[account.accountType][account.category]) {
      grouped[account.accountType][account.category] = [];
    }
    grouped[account.accountType][account.category].push(account);
  }

  return grouped;
}

export default function AccountCodeSelector({
  value,
  onChange,
  filterByType,
  placeholder = 'Select account...',
  disabled = false,
  size = 'sm',
  variant = 'default',
  className = '',
}: AccountCodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter accounts by type if specified
  const filteredByTypeAccounts = useMemo(() => {
    if (!filterByType) return chartOfAccounts;
    const types = Array.isArray(filterByType) ? filterByType : [filterByType];
    return chartOfAccounts.filter(acc => types.includes(acc.accountType));
  }, [filterByType]);

  // Filter accounts by search query
  const searchedAccounts = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTypeAccounts;
    const query = searchQuery.toLowerCase();
    return filteredByTypeAccounts.filter(
      acc =>
        acc.code.toLowerCase().includes(query) ||
        acc.name.toLowerCase().includes(query) ||
        acc.category.toLowerCase().includes(query)
    );
  }, [filteredByTypeAccounts, searchQuery]);

  // Group the searched accounts
  const groupedAccounts = useMemo(() => groupAccounts(searchedAccounts), [searchedAccounts]);

  // Get selected account details
  const selectedAccount = useMemo(() => {
    if (!value) return null;
    return chartOfAccounts.find(acc => acc.code === value) || null;
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Style classes based on size and variant
  const sizeClasses = size === 'sm'
    ? 'h-8 text-xs px-2'
    : 'h-9 text-sm px-3';

  const minimalSizeClasses = size === 'sm'
    ? 'py-0.5 px-1 text-xs'
    : 'py-1 px-2 text-sm';

  const buttonClasses = variant === 'minimal'
    ? `w-full flex items-center justify-between gap-1 border-0 bg-transparent hover:bg-transparent disabled:bg-transparent disabled:cursor-not-allowed cursor-pointer ${minimalSizeClasses}`
    : `w-full flex items-center justify-between gap-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed ${sizeClasses}`;

  const textClasses = variant === 'minimal'
    ? `truncate text-right ${selectedAccount ? 'text-gray-400' : 'text-gray-400'}`
    : `truncate ${selectedAccount ? 'text-gray-900' : 'text-gray-500'}`;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={buttonClasses}
      >
        <span className={textClasses}>
          {selectedAccount
            ? (variant === 'minimal' ? selectedAccount.name : `${selectedAccount.code} - ${selectedAccount.name}`)
            : placeholder
          }
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedAccount && !disabled && variant !== 'minimal' && (
            <X
              className="h-3 w-3 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code or name..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent"
              />
            </div>
          </div>

          {/* Account List */}
          <div className="max-h-64 overflow-y-auto">
            {Object.keys(groupedAccounts).length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                No accounts found
              </div>
            ) : (
              Object.entries(groupedAccounts).map(([type, categories]) => (
                <div key={type}>
                  {/* Type Header */}
                  <div className="sticky top-0 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {type}
                  </div>
                  {Object.entries(categories).map(([category, accounts]) => (
                    <div key={category}>
                      {/* Category Subheader */}
                      <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                        {category}
                      </div>
                      {/* Accounts */}
                      {accounts.map((account) => (
                        <button
                          key={account.code}
                          type="button"
                          onClick={() => handleSelect(account.code)}
                          className={`w-full px-3 py-1.5 text-left text-sm hover:bg-[#5A7A8F]/10 flex items-center gap-2 ${
                            value === account.code ? 'bg-[#5A7A8F]/10 text-[#5A7A8F]' : 'text-gray-700'
                          }`}
                        >
                          <span className="font-mono text-xs text-gray-500 w-10 flex-shrink-0">
                            {account.code}
                          </span>
                          <span className="truncate">{account.name}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export helper to get accounts filtered by type
export function getAccountsByType(type: AccountType | AccountType[]): ChartOfAccount[] {
  const types = Array.isArray(type) ? type : [type];
  return chartOfAccounts.filter(acc => types.includes(acc.accountType));
}

// Export helper to get account by code
export function getAccountByCode(code: string): ChartOfAccount | undefined {
  return chartOfAccounts.find(acc => acc.code === code);
}
