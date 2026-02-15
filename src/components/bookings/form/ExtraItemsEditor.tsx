'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { BookingExtraItem } from '@/data/booking/types';
import { bookingLookupsApi } from '@/lib/supabase/api/bookingLookups';
import { projectsApi } from '@/lib/supabase/api/projects';

interface ExtraItemsEditorProps {
  items: BookingExtraItem[];
  onChange: (items: BookingExtraItem[]) => void;
  disabled?: boolean;
  currency?: string;
  bookingFxRate?: number;
  projects?: { id: string; name: string }[];
}

const CURRENCIES = ['THB', 'USD', 'EUR', 'GBP', 'AUD'];

export function ExtraItemsEditor({ items, onChange, disabled, currency = 'THB', bookingFxRate, projects: projectsProp }: ExtraItemsEditorProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    bookingLookupsApi.getByCategory('extras').then(lookups => {
      setSuggestions(lookups.map(l => l.label));
    }).catch(() => {});
    // Load all active projects (not just yachts)
    projectsApi.getActive().then(data => {
      setAllProjects(data.map(p => ({ id: p.id, name: p.name })));
    }).catch(() => {});
  }, []);

  // Always use internally loaded allProjects (all types), since extras can belong to any project.
  // projectsProp may be yacht-filtered from the calendar page, so prefer allProjects when loaded.
  const projects = allProjects.length > 0 ? allProjects : (projectsProp || []);

  const addItem = () => {
    const newItem: BookingExtraItem = {
      id: crypto.randomUUID(),
      name: '',
      type: 'internal',
      sellingPrice: 0,
      currency: currency,
      fxRate: currency === 'THB' ? 1 : bookingFxRate,
      commissionable: true,
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
      // Auto-set fxRate when currency changes
      if (field === 'currency') {
        if (value === 'THB') {
          newItem.fxRate = 1;
        } else if (value === currency) {
          newItem.fxRate = bookingFxRate;
        } else {
          newItem.fxRate = undefined;
        }
      }
      return newItem;
    });
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  // Total converted to booking currency
  const totalInBookingCurrency = items.reduce((sum, item) => {
    const itemCur = item.currency || currency;
    if (itemCur === currency) return sum + (item.sellingPrice || 0);
    // Convert: item → THB → booking currency
    const itemThb = (item.sellingPrice || 0) * (item.fxRate || 1);
    const inBooking = bookingFxRate ? itemThb / bookingFxRate : (item.sellingPrice || 0);
    return sum + inBooking;
  }, 0);

  const fmtAmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const inputCls = "w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] disabled:bg-gray-100 disabled:text-gray-500";

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left py-1.5 pr-2 font-medium">Service Name</th>
                <th className="text-left py-1.5 px-1 font-medium w-24">Type</th>
                <th className="text-left py-1.5 px-1 font-medium w-20">Currency</th>
                <th className="text-right py-1.5 px-1 font-medium w-28">Selling Price</th>
                <th className="text-right py-1.5 px-1 font-medium w-28">Cost</th>
                {projects && projects.length > 0 && (
                  <th className="text-left py-1.5 px-1 font-medium w-36">Project</th>
                )}
                <th className="text-center py-1.5 px-1 font-medium w-14">Comm.</th>
                <th className="w-7"></th>
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
                      className={inputCls}
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(index, 'type', e.target.value)}
                      disabled={disabled}
                      className={inputCls}
                    >
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-1">
                    <select
                      value={item.currency || currency}
                      onChange={(e) => updateItem(index, 'currency', e.target.value)}
                      disabled={disabled}
                      className={inputCls}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.sellingPrice || ''}
                      onChange={(e) => updateItem(index, 'sellingPrice', e.target.value ? parseFloat(e.target.value) : 0)}
                      disabled={disabled}
                      placeholder="0.00"
                      className={`${inputCls} text-right`}
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    {item.type === 'external' ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.cost ?? ''}
                        onChange={(e) => updateItem(index, 'cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={disabled}
                        placeholder="0.00"
                        className={`${inputCls} text-right`}
                      />
                    ) : (
                      <span className="block text-center text-gray-300">—</span>
                    )}
                  </td>
                  {projects && projects.length > 0 && (
                    <td className="py-1.5 px-1">
                      <select
                        value={item.projectId || ''}
                        onChange={(e) => updateItem(index, 'projectId', e.target.value || undefined)}
                        disabled={disabled}
                        className={inputCls}
                      >
                        <option value="">—</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                  )}
                  <td className="py-1.5 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={item.commissionable !== false}
                      onChange={(e) => updateItem(index, 'commissionable', e.target.checked)}
                      disabled={disabled}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
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
            Total: {fmtAmt(totalInBookingCurrency)} {currency}
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
