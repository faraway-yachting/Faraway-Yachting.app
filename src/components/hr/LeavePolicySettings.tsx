'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save } from 'lucide-react';
import { companiesApi } from '@/lib/supabase/api/companies';
import { hrLeaveTypesApi, type HRLeaveType } from '@/lib/supabase/api/hrLeaveTypes';
import { leavePoliciesApi, type LeavePolicy } from '@/lib/supabase/api/leavePolicies';

interface Company {
  id: string;
  name: string;
}

export default function LeavePolicySettings() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<HRLeaveType[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local edits: map of leave_type_id -> { entitlement, carryOver }
  const [edits, setEdits] = useState<Record<string, { entitlement: number; carryOver: number }>>({});

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const [comps, lts] = await Promise.all([
        companiesApi.getAll(),
        hrLeaveTypesApi.getActive(),
      ]);
      setCompanies(comps.filter((c: any) => c.is_active !== false));
      setLeaveTypes(lts);
      if (comps.length > 0) {
        setSelectedCompanyId(comps[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Load policies when company changes
  useEffect(() => {
    if (!selectedCompanyId) return;
    (async () => {
      try {
        const pols = await leavePoliciesApi.getByCompany(selectedCompanyId);
        setPolicies(pols);
        // Initialize edits from existing policies
        const editMap: Record<string, { entitlement: number; carryOver: number }> = {};
        for (const lt of leaveTypes) {
          const existing = pols.find(p => p.leave_type_id === lt.id);
          editMap[lt.id] = {
            entitlement: existing ? Number(existing.annual_entitlement_days) : 0,
            carryOver: existing ? Number(existing.carry_over_max_days) : 0,
          };
        }
        setEdits(editMap);
      } catch (error) {
        console.error('Failed to load policies:', error);
      }
    })();
  }, [selectedCompanyId, leaveTypes]);

  const handleSave = async () => {
    if (!selectedCompanyId) return;
    setSaving(true);
    try {
      for (const lt of leaveTypes) {
        const edit = edits[lt.id];
        if (!edit) continue;
        await leavePoliciesApi.upsert({
          company_id: selectedCompanyId,
          leave_type_id: lt.id,
          annual_entitlement_days: edit.entitlement,
          carry_over_max_days: edit.carryOver,
        });
      }
      // Reload
      const pols = await leavePoliciesApi.getByCompany(selectedCompanyId);
      setPolicies(pols);
    } catch (error) {
      console.error('Failed to save policies:', error);
      alert('Failed to save leave policies.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Leave Policies</h3>
          <p className="text-xs text-gray-500 mt-0.5">Set annual leave entitlements per company.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
      <div className="p-5 space-y-4">
        {/* Company selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Policy table */}
        {leaveTypes.length === 0 ? (
          <p className="text-sm text-gray-400">No leave types configured. Add them in the Leave Types section above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-medium text-gray-500">Leave Type</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Paid?</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Annual Entitlement (days)</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Max Carry Over (days)</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map(lt => {
                const edit = edits[lt.id] || { entitlement: 0, carryOver: 0 };
                return (
                  <tr key={lt.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{lt.name}</td>
                    <td className="py-2 text-gray-500">{lt.is_paid ? 'Yes' : 'No'}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={edit.entitlement}
                        onChange={(e) => setEdits(prev => ({
                          ...prev,
                          [lt.id]: { ...prev[lt.id], entitlement: Number(e.target.value) || 0 },
                        }))}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={edit.carryOver}
                        onChange={(e) => setEdits(prev => ({
                          ...prev,
                          [lt.id]: { ...prev[lt.id], carryOver: Number(e.target.value) || 0 },
                        }))}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
