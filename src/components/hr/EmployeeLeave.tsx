'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, CalendarDays } from 'lucide-react';
import { leaveBalancesApi, type LeaveBalance } from '@/lib/supabase/api/leaveBalances';
import { leaveRequestsApi, type LeaveRequest } from '@/lib/supabase/api/leaveRequests';
import { LEAVE_REQUEST_STATUS_COLORS, LEAVE_REQUEST_STATUS_LABELS } from '@/data/hr/types';
import { createClient } from '@/lib/supabase/client';

interface Props {
  employeeId: string;
  companyId: string;
}

export default function EmployeeLeave({ employeeId, companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  const year = new Date().getFullYear();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bal, reqs] = await Promise.all([
        leaveBalancesApi.getByEmployee(employeeId, year),
        leaveRequestsApi.getByEmployee(employeeId),
      ]);
      setBalances(bal);
      setRequests(reqs);
      // Extract leave types from balances
      const types = bal.map(b => b.leave_type).filter(Boolean);
      setLeaveTypes(types);
      if (types.length > 0 && !leaveTypeId) setLeaveTypeId(types[0]!.id);
    } catch (error) {
      console.error('Failed to load leave data:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId, year, leaveTypeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const calcDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSubmit = async () => {
    if (!leaveTypeId || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const requestNumber = await leaveRequestsApi.generateNumber();
      await leaveRequestsApi.create({
        request_number: requestNumber,
        employee_id: employeeId,
        company_id: companyId,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        total_days: calcDays(startDate, endDate),
        reason: reason || null,
        status: 'pending',
        created_by: user?.id || null,
      });
      setShowForm(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      await loadData();
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      alert('Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await leaveRequestsApi.cancel(id);
      await loadData();
    } catch (error) {
      console.error('Failed to cancel:', error);
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
    <div className="space-y-6">
      {/* Leave Balances */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Leave Balances ({year})</h3>
        {balances.length === 0 ? (
          <p className="text-sm text-gray-500">No leave balances configured.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {balances.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500">{b.leave_type?.name || 'Leave'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{b.remaining_days}</p>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Used: {b.used_days}</span>
                  <span>Total: {b.entitlement_days + b.carried_over_days}</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5A7A8F] rounded-full"
                    style={{ width: `${Math.min(100, (b.used_days / (b.entitlement_days + b.carried_over_days)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Leave */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">My Requests</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Request Leave
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              >
                {leaveTypes.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
              <input
                type="text"
                readOnly
                value={calcDays(startDate, endDate) || '-'}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !leaveTypeId || !startDate || !endDate}
              className="px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">No leave requests yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.request_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.leave_type?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(r.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    {r.start_date !== r.end_date && ` - ${new Date(r.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{r.total_days}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEAVE_REQUEST_STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-800'}`}>
                      {LEAVE_REQUEST_STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                    {r.status === 'rejected' && r.rejection_reason && (
                      <span className="text-xs text-gray-500" title={r.rejection_reason}>Reason: {r.rejection_reason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
