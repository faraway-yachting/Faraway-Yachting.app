'use client';

import React from 'react';
import { X } from 'lucide-react';
import { JournalEntryLine, EntryType } from '@/data/accounting/journalEntryTypes';
import { ChartOfAccount } from '@/data/accounting/chartOfAccounts';

interface JournalEntryLineItemProps {
  line: JournalEntryLine;
  index: number;
  onUpdate: (index: number, updatedLine: Partial<JournalEntryLine>) => void;
  onRemove: (index: number) => void;
  availableAccounts: ChartOfAccount[];
  errors?: Record<string, string>;
  isPosted: boolean; // Disable editing if posted
}

export default function JournalEntryLineItem({
  line,
  index,
  onUpdate,
  onRemove,
  availableAccounts,
  errors = {},
  isPosted,
}: JournalEntryLineItemProps) {
  const handleAccountChange = (accountCode: string) => {
    const account = availableAccounts.find(acc => acc.code === accountCode);
    onUpdate(index, {
      accountCode,
      accountName: account?.name || '',
    });
  };

  const handleDescriptionChange = (description: string) => {
    onUpdate(index, { description });
  };

  const handleTypeChange = (type: EntryType) => {
    onUpdate(index, { type });
  };

  const handleAmountChange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    onUpdate(index, { amount: numAmount });
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      {/* Account Dropdown */}
      <td className="px-4 py-3">
        <select
          value={line.accountCode}
          onChange={(e) => handleAccountChange(e.target.value)}
          disabled={isPosted}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
            errors[`line-${index}-account`]
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isPosted ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        >
          <option value="">Select account...</option>
          {availableAccounts.map((account) => (
            <option key={account.code} value={account.code}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>
        {errors[`line-${index}-account`] && (
          <p className="text-xs text-red-500 mt-1">
            {errors[`line-${index}-account`]}
          </p>
        )}
      </td>

      {/* Description */}
      <td className="px-4 py-3">
        <input
          type="text"
          value={line.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          disabled={isPosted}
          placeholder="Line description..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
            errors[`line-${index}-description`]
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isPosted ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        {errors[`line-${index}-description`] && (
          <p className="text-xs text-red-500 mt-1">
            {errors[`line-${index}-description`]}
          </p>
        )}
      </td>

      {/* Type Toggle (Debit/Credit) */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name={`type-${index}`}
              value="debit"
              checked={line.type === 'debit'}
              onChange={() => handleTypeChange('debit')}
              disabled={isPosted}
              className="mr-2 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <span className="text-sm text-gray-700">Debit</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={`type-${index}`}
              value="credit"
              checked={line.type === 'credit'}
              onChange={() => handleTypeChange('credit')}
              disabled={isPosted}
              className="mr-2 text-[#5A7A8F] focus:ring-[#5A7A8F]"
            />
            <span className="text-sm text-gray-700">Credit</span>
          </label>
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-3">
        <input
          type="number"
          value={line.amount || ''}
          onChange={(e) => handleAmountChange(e.target.value)}
          disabled={isPosted}
          placeholder="0.00"
          step="0.01"
          min="0"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent ${
            errors[`line-${index}-amount`]
              ? 'border-red-500'
              : 'border-gray-300'
          } ${isPosted ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        {errors[`line-${index}-amount`] && (
          <p className="text-xs text-red-500 mt-1">
            {errors[`line-${index}-amount`]}
          </p>
        )}
      </td>

      {/* Currency Display */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">{line.currency}</span>
      </td>

      {/* Remove Button */}
      <td className="px-4 py-3">
        {!isPosted && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-600 hover:text-red-800 transition-colors p-1"
            title="Remove line"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}
