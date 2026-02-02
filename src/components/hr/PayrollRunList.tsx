'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, FileText, Trash2 } from 'lucide-react';
import { payrollRunsApi, type PayrollRun } from '@/lib/supabase/api/payrollRuns';
import { payrollSlipsApi } from '@/lib/supabase/api/payrollSlips';
import { createClient } from '@/lib/supabase/client';
import { PAYROLL_RUN_STATUS_LABELS, PAYROLL_RUN_STATUS_COLORS, type PayrollRunStatus } from '@/data/hr/types';

export default function PayrollRunList() {
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const rs = await payrollRunsApi.getAll();

      // Auto-create draft for current month if none exists
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const hasCurrentMonth = rs.some(r => r.period_year === currentYear && r.period_month === currentMonth);

      if (!hasCurrentMonth) {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          const runNumber = await payrollRunsApi.generateNumber();
          const run = await payrollRunsApi.create({
            run_number: runNumber,
            period_year: currentYear,
            period_month: currentMonth,
            created_by: user?.id || null,
          });
          await payrollSlipsApi.generateForRun(run.id, currentYear, currentMonth);
          const updated = await payrollRunsApi.getAll();
          setRuns(updated);
          return;
        } catch (autoErr: any) {
          if (autoErr?.code !== '23505') {
            console.error('Failed to auto-create payroll run:', autoErr);
          }
        }
      }

      setRuns(rs);
    } catch (error) {
      console.error('Failed to load payroll runs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const runNumber = await payrollRunsApi.generateNumber();
      const run = await payrollRunsApi.create({
        run_number: runNumber,
        period_year: newYear,
        period_month: newMonth,
        created_by: user?.id || null,
      });

      // Auto-generate slips for ALL active employees
      await payrollSlipsApi.generateForRun(run.id, newYear, newMonth);

      setShowCreateModal(false);
      router.push(`/hr/manager/payroll/${run.id}`);
    } catch (error: any) {
      console.error('Failed to create payroll run:', error);
      if (error?.code === '23505') {
        alert('A payroll run already exists for this period.');
      } else {
        alert(`Failed to create payroll run: ${error?.message || error?.code || JSON.stringify(error)}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, runNumber: string) => {
    if (!confirm(`Delete payroll run ${runNumber}? This will also delete all associated slips.`)) return;
    try {
      await payrollRunsApi.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete payroll run.');
    }
  };

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatMoney = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Payroll Run
        </button>
      </div>

      {/* List */}
      {runs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No payroll runs found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Run #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map(run => (
                <tr key={run.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/hr/manager/payroll/${run.id}`)}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{run.run_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {monthNames[run.period_month]} {run.period_year}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{run.employee_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatMoney(run.total_gross)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">{formatMoney(run.total_net)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYROLL_RUN_STATUS_COLORS[run.status as PayrollRunStatus] || 'bg-gray-100 text-gray-800'}`}>
                      {PAYROLL_RUN_STATUS_LABELS[run.status as PayrollRunStatus] || run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/hr/manager/payroll/${run.id}`)}
                        className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                        title="View"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      {run.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(run.id, run.run_number)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Create Payroll Run</h3>
            <p className="text-sm text-gray-500">All active employees will be included automatically.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{monthNames[m]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create & Generate Slips
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
