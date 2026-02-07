'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Coins } from 'lucide-react';
import { bookingLookupsApi } from '@/lib/supabase/api/bookingLookups';
import type { BookingLookup } from '@/lib/supabase/api/bookingLookups';

export function CurrencySettings() {
  const [currencies, setCurrencies] = useState<BookingLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchCurrencies = async () => {
    try {
      const data = await bookingLookupsApi.getAllByCategory('currency');
      setCurrencies(data);
    } catch (e) {
      console.error('Failed to fetch currencies:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleAdd = async () => {
    const value = newValue.trim().toUpperCase();
    const label = newLabel.trim() || value;

    if (!value) return;
    if (value.length < 2 || value.length > 5) {
      setError('Currency code must be 2-5 characters');
      return;
    }
    if (currencies.some(c => c.value.toUpperCase() === value)) {
      setError('Currency already exists');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await bookingLookupsApi.create({
        category: 'currency',
        value,
        label,
        sort_order: currencies.length + 1,
        is_active: true,
      });
      setNewValue('');
      setNewLabel('');
      await fetchCurrencies();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add currency');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (currency: BookingLookup) => {
    try {
      await bookingLookupsApi.update(currency.id, { is_active: !currency.is_active });
      await fetchCurrencies();
    } catch (e) {
      console.error('Failed to toggle currency:', e);
    }
  };

  const handleDelete = async (currency: BookingLookup) => {
    if (!confirm(`Delete currency "${currency.value}"? Existing documents using this currency will not be affected.`)) return;
    try {
      await bookingLookupsApi.delete(currency.id);
      await fetchCurrencies();
    } catch (e) {
      console.error('Failed to delete currency:', e);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Coins className="h-5 w-5 text-[#5A7A8F]" />
          <h2 className="text-lg font-semibold text-gray-900">Currencies</h2>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Manage available currencies for invoices, quotations, receipts, and expenses. Changes apply across all modules.
      </p>

      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading currencies...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Currency List */}
          <div className="mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currencies.map((currency) => (
                  <tr key={currency.id} className={!currency.is_active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{currency.value}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{currency.label}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(currency)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          currency.is_active
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-gray-100 text-gray-500 border border-gray-300'
                        }`}
                      >
                        {currency.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(currency)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete currency"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {currencies.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      No currencies configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add New Currency */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add Currency</h3>
            {error && (
              <p className="text-sm text-red-600 mb-2">{error}</p>
            )}
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Code</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => { setNewValue(e.target.value.toUpperCase()); setError(null); }}
                  placeholder="JPY"
                  maxLength={5}
                  className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F] font-mono uppercase"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Japanese Yen"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5A7A8F] focus:border-[#5A7A8F]"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={saving || !newValue.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-md hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
