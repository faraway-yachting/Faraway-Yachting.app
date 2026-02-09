'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Filter, CheckCircle2, XCircle, Clock, Ban } from 'lucide-react';
import { leaveRequestsApi, type LeaveRequest } from '@/lib/supabase/api/leaveRequests';
import { companiesApi } from '@/lib/supabase/api/companies';
import { createClient } from '@/lib/supabase/client';
import { LEAVE_REQUEST_STATUS_LABELS, LEAVE_REQUEST_STATUS_COLORS, type LeaveRequestStatus } from '@/data/hr/types';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Company {
  id: string;
  name: string;
}

export default function LeaveRequestList() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqs, comps] = await Promise.all([
        leaveRequestsApi.getAll({
          status: filterStatus || undefined,
          companyId: filterCompany || undefined,
          year: new Date().getFullYear(),
        }),
        companiesApi.getAll(),
      ]);
      setRequests(reqs);
      setCompanies(comps);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await leaveRequestsApi.approve(id, user.id);
      await loadData();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve leave request.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    setActionLoading(id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await leaveRequestsApi.reject(id, user.id, reason);
      await loadData();
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Failed to reject leave request.');
    } finally {
      setActionLoading(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3.5 w-3.5" />;
      case 'approved': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'rejected': return <XCircle className="h-3.5 w-3.5" />;
      case 'cancelled': return <Ban className="h-3.5 w-3.5" />;
      default: return null;
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
    <div className="space-y-4">
      {/* Filters + New button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
          >
            <option value="">All Statuses</option>
            {(Object.entries(LEAVE_REQUEST_STATUS_LABELS) as [LeaveRequestStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
          >
            <option value="">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => router.push('/hr/manager/leave/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg hover:bg-[#4a6a7f] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Leave Request
          </button>
        </div>
      </div>

      {/* Table */}
      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No leave requests found.</p>
        </div>
      ) : (
        isMobile ? (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{req.request_number}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${LEAVE_REQUEST_STATUS_COLORS[req.status as LeaveRequestStatus] || 'bg-gray-100 text-gray-800'}`}>
                    {statusIcon(req.status)}
                    {LEAVE_REQUEST_STATUS_LABELS[req.status as LeaveRequestStatus] || req.status}
                  </span>
                </div>
                <dl className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <dt className="shrink-0 text-xs font-medium text-gray-500">Employee</dt>
                    <dd className="text-right text-sm text-gray-900">
                      {req.employee?.full_name_en || '—'}
                      {req.employee?.nickname && <span className="text-gray-400 ml-1">({req.employee.nickname})</span>}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <dt className="shrink-0 text-xs font-medium text-gray-500">Type</dt>
                    <dd className="text-right text-sm text-gray-900">{req.leave_type?.name || '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <dt className="shrink-0 text-xs font-medium text-gray-500">Period</dt>
                    <dd className="text-right text-sm text-gray-900">{req.start_date} — {req.end_date}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <dt className="shrink-0 text-xs font-medium text-gray-500">Days</dt>
                    <dd className="text-right text-sm text-gray-900">{Number(req.total_days)}</dd>
                  </div>
                </dl>
                {req.status === 'pending' && (
                  <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading === req.id}
                      className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === req.id ? 'Loading...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={actionLoading === req.id}
                      className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.request_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {req.employee?.full_name_en || '—'}
                    {req.employee?.nickname && <span className="text-gray-400 ml-1">({req.employee.nickname})</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{req.leave_type?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {req.start_date} — {req.end_date}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{Number(req.total_days)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${LEAVE_REQUEST_STATUS_COLORS[req.status as LeaveRequestStatus] || 'bg-gray-100 text-gray-800'}`}>
                      {statusIcon(req.status)}
                      {LEAVE_REQUEST_STATUS_LABELS[req.status as LeaveRequestStatus] || req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {req.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === req.id}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve"
                        >
                          {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actionLoading === req.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}
    </div>
  );
}
