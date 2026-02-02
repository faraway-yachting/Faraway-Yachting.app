'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { employeesApi } from '@/lib/supabase/api/employees';
import { hrLeaveTypesApi, type HRLeaveType } from '@/lib/supabase/api/hrLeaveTypes';
import { leaveRequestsApi } from '@/lib/supabase/api/leaveRequests';
import { leaveBalancesApi, type LeaveBalance } from '@/lib/supabase/api/leaveBalances';
import { createClient } from '@/lib/supabase/client';

interface Employee {
  id: string;
  employee_id: string;
  full_name_en: string;
  nickname: string | null;
  company_id: string | null;
  status: string;
}

export default function LeaveRequestForm() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<HRLeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [emps, lts] = await Promise.all([
        employeesApi.getByStatus('active'),
        hrLeaveTypesApi.getActive(),
      ]);
      setEmployees(emps as Employee[]);
      setLeaveTypes(lts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load balances when employee changes
  useEffect(() => {
    if (!employeeId) { setBalances([]); return; }
    (async () => {
      try {
        const bals = await leaveBalancesApi.getByEmployee(employeeId, new Date().getFullYear());
        setBalances(bals);
      } catch {
        setBalances([]);
      }
    })();
  }, [employeeId]);

  // Calculate total days
  const calcDays = (): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  const totalDays = calcDays();

  const handleSubmit = async () => {
    if (!employeeId || !leaveTypeId || !startDate || !endDate || totalDays <= 0) {
      alert('Please fill in all required fields.');
      return;
    }

    const employee = employees.find(e => e.id === employeeId);
    if (!employee?.company_id) {
      alert('Selected employee has no company assigned.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const requestNumber = await leaveRequestsApi.generateNumber();

      await leaveRequestsApi.create({
        request_number: requestNumber,
        employee_id: employeeId,
        company_id: employee.company_id,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: reason || null,
        created_by: user?.id || null,
      });

      router.push('/hr/manager/leave');
    } catch (error) {
      console.error('Failed to create leave request:', error);
      alert('Failed to create leave request.');
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

  // Find balance for selected leave type
  const selectedBalance = balances.find(b => b.leave_type_id === leaveTypeId);

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push('/hr/manager/leave')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leave Requests
      </button>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Leave Request</h2>
        </div>
        <div className="p-6 space-y-5">
          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
            >
              <option value="">Select employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name_en}{emp.nickname ? ` (${emp.nickname})` : ''} — {emp.employee_id}
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
            >
              <option value="">Select leave type...</option>
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name}{!lt.is_paid ? ' (Unpaid)' : ''}</option>
              ))}
            </select>
            {selectedBalance && (
              <p className="mt-1 text-xs text-gray-500">
                Balance: {Number(selectedBalance.remaining_days)} days remaining ({Number(selectedBalance.used_days)} used of {Number(selectedBalance.entitlement_days)})
              </p>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
              />
            </div>
          </div>

          {totalDays > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <p className="text-sm text-blue-800">Total: <strong>{totalDays} day{totalDays !== 1 ? 's' : ''}</strong></p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Optional reason for leave..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => router.push('/hr/manager/leave')}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !employeeId || !leaveTypeId || !startDate || !endDate || totalDays <= 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
