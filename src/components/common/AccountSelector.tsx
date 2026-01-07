'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { chartOfAccounts, type AccountType } from '@/data/accounting/chartOfAccounts';

interface AccountSelectorProps {
  value: string; // account code
  onChange: (code: string) => void;
  accountTypes?: AccountType[]; // Filter by account types (e.g., ['Expense'], ['Asset', 'Liability'])
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
}

export default function AccountSelector({
  value,
  onChange,
  accountTypes,
  required = false,
  disabled = false,
  placeholder = 'Select account...',
  error = false,
}: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter accounts by type if specified
  const filteredByType = accountTypes
    ? chartOfAccounts.filter((acc) => accountTypes.includes(acc.accountType))
    : chartOfAccounts;

  // Get selected account
  const selectedAccount = chartOfAccounts.find((acc) => acc.code === value);

  // Filter accounts based on search query
  const filteredAccounts = filteredByType.filter((account) =>
    account.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: by code
  const sortedAccounts = [...filteredAccounts].sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 text-sm border rounded-lg transition-colors
          ${
            disabled
              ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed'
              : error
              ? 'bg-white border-red-500 hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
              : 'bg-white border-gray-300 hover:border-[#5A7A8F] focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]'
          }
          ${!selectedAccount && !disabled ? 'text-gray-400' : 'text-gray-900'}
        `}
      >
        <span className="truncate">
          {selectedAccount
            ? `${selectedAccount.code} - ${selectedAccount.name}`
            : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code or name..."
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/20 focus:border-[#5A7A8F]"
              />
            </div>
          </div>

          {/* Account List */}
          <div className="overflow-y-auto max-h-60">
            {sortedAccounts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No accounts found
              </div>
            ) : (
              <ul className="py-1">
                {sortedAccounts.map((account) => (
                  <li key={account.code}>
                    <button
                      type="button"
                      onClick={() => handleSelect(account.code)}
                      className={`
                        w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between
                        ${account.code === value ? 'bg-blue-50 text-[#5A7A8F]' : 'text-gray-900'}
                      `}
                    >
                      <span className="truncate">
                        <span className="font-medium">{account.code}</span>
                        <span className="text-gray-500"> - </span>
                        <span>{account.name}</span>
                      </span>
                      {account.code === value && (
                        <Check className="h-4 w-4 text-[#5A7A8F] flex-shrink-0 ml-2" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
