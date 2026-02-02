'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, Ship } from 'lucide-react';
import { employeeBoatAssignmentsApi } from '@/lib/supabase/api/employeeBoatAssignments';
import { projectsApi } from '@/lib/supabase/api/projects';
import type { Database } from '@/lib/supabase/database.types';

type BoatAssignment = Database['public']['Tables']['employee_boat_assignments']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

interface BoatAssignmentsProps {
  employeeId: string;
  editing?: boolean;
}

export default function BoatAssignments({ employeeId, editing = false }: BoatAssignmentsProps) {
  const [assignments, setAssignments] = useState<BoatAssignment[]>([]);
  const [boats, setBoats] = useState<Project[]>([]);
  const [boatMap, setBoatMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ boat_id: '', role_on_boat: '', is_primary: false });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assn, allBoats] = await Promise.all([
        employeeBoatAssignmentsApi.getByEmployee(employeeId),
        projectsApi.getAll(),
      ]);
      setAssignments(assn);
      setBoats(allBoats);
      setBoatMap(new Map(allBoats.map((b) => [b.id, b.name])));
    } catch (error) {
      console.error('Failed to load boat assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.boat_id) return;
    setSaving(true);
    try {
      await employeeBoatAssignmentsApi.create({
        employee_id: employeeId,
        boat_id: form.boat_id,
        role_on_boat: form.role_on_boat.trim() || null,
        is_primary: form.is_primary,
      });
      setForm({ boat_id: '', role_on_boat: '', is_primary: false });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Failed to add assignment:', error);
      alert('Failed to add assignment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this boat assignment?')) return;
    try {
      await employeeBoatAssignmentsApi.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
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
        <h3 className="text-sm font-semibold text-gray-900">Boat Assignments</h3>
        {editing && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white text-sm font-medium rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Assign Boat
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Boat *</label>
              <select
                value={form.boat_id}
                onChange={(e) => setForm((f) => ({ ...f, boat_id: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              >
                <option value="">Select boat...</option>
                {boats.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role on Boat</label>
              <input
                value={form.role_on_boat}
                onChange={(e) => setForm((f) => ({ ...f, role_on_boat: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                placeholder="e.g. Captain, Crew"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
                  className="rounded border-gray-300 text-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
                Primary boat
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !form.boat_id}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white text-sm font-medium rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      {assignments.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No boats assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <Ship className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {boatMap.get(a.boat_id) || 'Unknown Boat'}
                    {a.is_primary && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Primary</span>
                    )}
                  </div>
                  {a.role_on_boat && <div className="text-xs text-gray-500">{a.role_on_boat}</div>}
                </div>
              </div>
              {editing && (
                <button onClick={() => handleDelete(a.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
