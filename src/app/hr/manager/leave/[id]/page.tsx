'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HRAppShell } from '@/components/hr/HRAppShell';
import { leaveRequestsApi, type LeaveRequest } from '@/lib/supabase/api/leaveRequests';
import { createClient } from '@/lib/supabase/client';
import { LEAVE_REQUEST_STATUS_LABELS, LEAVE_REQUEST_STATUS_COLORS, type LeaveRequestStatus } from '@/data/hr/types';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Ban, Clock } from 'lucide-react';

export default function LeaveRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const data = await leaveRequestsApi.getById(id);
        setRequest(data);
      } catch (error) {
        console.error('Failed to load leave request:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleApprove = async () => {
    if (!request) return;
    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await leaveRequestsApi.approve(request.id, user.id);
      const updated = await leaveRequestsApi.getById(request.id);
      setRequest(updated);
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve leave request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await leaveRequestsApi.reject(request.id, user.id, reason);
      const updated = await leaveRequestsApi.getById(request.id);
      setRequest(updated);
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Failed to reject leave request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!request || !confirm('Cancel this leave request?')) return;
    setActionLoading(true);
    try {
      await leaveRequestsApi.cancel(request.id);
      const updated = await leaveRequestsApi.getById(request.id);
      setRequest(updated);
    } catch (error) {
      console.error('Failed to cancel:', error);
      alert('Failed to cancel leave request.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <HRAppShell>
      <div className="max-w-2xl">
        <button
          onClick={() => router.push('/hr/manager/leave')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leave Requests
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !request ? (
          <p className="text-gray-500">Leave request not found.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{request.request_number}</h2>
                <p className="text-sm text-gray-500">Created {new Date(request.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${LEAVE_REQUEST_STATUS_COLORS[request.status as LeaveRequestStatus] || 'bg-gray-100 text-gray-800'}`}>
                {request.status === 'pending' && <Clock className="h-3.5 w-3.5" />}
                {request.status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {request.status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
                {request.status === 'cancelled' && <Ban className="h-3.5 w-3.5" />}
                {LEAVE_REQUEST_STATUS_LABELS[request.status as LeaveRequestStatus] || request.status}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Employee</label>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {request.employee?.full_name_en || '—'}
                    {request.employee?.nickname && <span className="text-gray-400 ml-1">({request.employee.nickname})</span>}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Position</label>
                  <p className="text-sm text-gray-900 mt-0.5">{request.employee?.position || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Leave Type</label>
                  <p className="text-sm text-gray-900 mt-0.5">{request.leave_type?.name || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Total Days</label>
                  <p className="text-sm text-gray-900 mt-0.5">{Number(request.total_days)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Start Date</label>
                  <p className="text-sm text-gray-900 mt-0.5">{request.start_date}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">End Date</label>
                  <p className="text-sm text-gray-900 mt-0.5">{request.end_date}</p>
                </div>
              </div>

              {request.reason && (
                <div>
                  <label className="block text-xs font-medium text-gray-500">Reason</label>
                  <p className="text-sm text-gray-900 mt-0.5">{request.reason}</p>
                </div>
              )}

              {request.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <label className="block text-xs font-medium text-red-700">Rejection Reason</label>
                  <p className="text-sm text-red-800 mt-0.5">{request.rejection_reason}</p>
                </div>
              )}

              {/* Actions */}
              {request.status === 'pending' && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <Ban className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              )}
              {request.status === 'approved' && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    Cancel Leave
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </HRAppShell>
  );
}
