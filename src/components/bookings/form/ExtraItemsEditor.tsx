'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { BookingExtraItem } from '@/data/booking/types';
import { bookingLookupsApi } from '@/lib/supabase/api/bookingLookups';

interface ExtraItemsEditorProps {
  items: BookingExtraItem[];
  onChange: (items: BookingExtraItem[]) => void;
  disabled?: boolean;
  currency?: string;
}

export function ExtraItemsEditor({ items, onChange, disabled, currency = 'THB' }: ExtraItemsEditorProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    bookingLookupsApi.getByCategory('extras').then(lookups => {
      setSuggestions(lookups.map(l => l.label));
    }).catch(() => {});
  }, []);

  const addItem = () => {
    const newItem: BookingExtraItem = {
      id: crypto.randomUUID(),
      name: '',
      type: 'internal',
      sellingPrice: 0,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof BookingExtraItem, value: any) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, [field]: value };
      // Clear cost when switching to internal
      if (field === 'type' && value === 'internal') {
        newItem.cost = undefined;
      }
      return newItem;
    });
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const totalSellingPrice = items.reduce((sum, item) => sum + (item.sellingPrice || 0), 0);

  const fmtAmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left py-1.5 pr-2 font-medium">Service Name</th>
                <th className="text-left py-1.5 px-2 font-medium w-28">Type</th>
                <th className="text-right py-1.5 px-2 font-medium w-32">Selling Price</th>
                <th className="text-right py-1.5 px-2 font-medium w-32">Cost</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      list="extra-suggestions"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      disabled={disabled}
                      placeholder="e.g., Massage, Diving..."
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(index, 'type', e.target.value)}
                      disabled={disabled}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.sellingPrice || ''}
                      onChange={(e) => updateItem(index, 'sellingPrice', e.target.value ? parseFloat(e.target.value) : 0)}
                      disabled={disabled}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    {item.type === 'external' ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.cost ?? ''}
                        onChange={(e) => updateItem(index, 'cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={disabled}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    ) : (
                      <span className="block text-center text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-1.5 pl-1">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Suggestions datalist */}
      {suggestions.length > 0 && (
        <datalist id="extra-suggestions">
          {suggestions.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}

      {/* Footer: total + add button */}
      <div className="flex items-center justify-between">
        {items.length > 0 ? (
          <span className="text-xs text-gray-500">
            Total: {fmtAmt(totalSellingPrice)} {currency}
          </span>
        ) : (
          <span className="text-xs text-gray-400">No extras added</span>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Extra
          </button>
        )}
      </div>
    </div>
  );
}
