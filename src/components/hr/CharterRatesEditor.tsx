'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, Check } from 'lucide-react';
import { employeeCharterRatesApi } from '@/lib/supabase/api/employeeCharterRates';
import type { Database } from '@/lib/supabase/database.types';
import { ALL_CHARTER_RATE_TYPES, ALL_SEASONS, CHARTER_RATE_TYPE_LABELS, SEASON_LABELS } from '@/data/hr/types';
import type { CharterRateType, Season } from '@/data/hr/types';

type CharterRate = Database['public']['Tables']['employee_charter_rates']['Row'];

interface CharterRatesEditorProps {
  employeeId: string;
  editing?: boolean;
}

export default function CharterRatesEditor({ employeeId, editing = false }: CharterRatesEditorProps) {
  const [rates, setRates] = useState<CharterRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Matrix: rateType -> season -> amount
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});

  const loadRates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employeeCharterRatesApi.getByEmployee(employeeId);
      setRates(data);
      // Build matrix
      const m: Record<string, Record<string, string>> = {};
      for (const rt of ALL_CHARTER_RATE_TYPES) {
        m[rt] = {};
        for (const s of ALL_SEASONS) {
          const found = data.find((r) => r.charter_rate_type === rt && r.season === s);
          m[rt][s] = found?.rate_amount?.toString() || '';
        }
      }
      setMatrix(m);
    } catch (error) {
      console.error('Failed to load charter rates:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadRates(); }, [loadRates]);

  const handleChange = (rateType: string, season: string, value: string) => {
    setSaved(false);
    setMatrix((prev) => ({
      ...prev,
      [rateType]: { ...prev[rateType], [season]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upserts: { employee_id: string; charter_rate_type: CharterRateType; season: Season; rate_amount: number; currency: string }[] = [];
      for (const rt of ALL_CHARTER_RATE_TYPES) {
        for (const s of ALL_SEASONS) {
          const val = matrix[rt]?.[s];
          if (val && parseFloat(val) > 0) {
            upserts.push({
              employee_id: employeeId,
              charter_rate_type: rt,
              season: s,
              rate_amount: parseFloat(val),
              currency: 'THB',
            });
          }
        }
      }
      await employeeCharterRatesApi.upsert(upserts);
      await loadRates();
      setSaved(true);
    } catch (error) {
      console.error('Failed to save rates:', error);
      alert('Failed to save rates.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Charter Day-Bonus Rates (THB)</h3>
        {editing && (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              saved
                ? 'bg-green-600 text-white cursor-default'
                : 'bg-[#5A7A8F] text-white hover:bg-[#4a6a7f] disabled:opacity-50'
            }`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save Rates'}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charter Type</th>
              {ALL_SEASONS.map((s) => (
                <th key={s} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {SEASON_LABELS[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ALL_CHARTER_RATE_TYPES.map((rt) => (
              <tr key={rt} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-700">{CHARTER_RATE_TYPE_LABELS[rt]}</td>
                {ALL_SEASONS.map((s) => (
                  <td key={s} className="px-4 py-2 text-center">
                    {editing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={matrix[rt]?.[s] || ''}
                        onChange={(e) => handleChange(rt, s, e.target.value)}
                        className="w-28 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">
                        {matrix[rt]?.[s] ? Number(matrix[rt][s]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
