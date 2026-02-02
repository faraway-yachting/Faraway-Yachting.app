'use client';

import { useState, useEffect } from 'react';
import { Loader2, Banknote, CalendarDays, FileText, AlertTriangle } from 'lucide-react';
import { leaveBalancesApi, type LeaveBalance } from '@/lib/supabase/api/leaveBalances';
import { payrollSlipsApi, type PayrollSlip } from '@/lib/supabase/api/payrollSlips';
import { employeeDocumentsApi } from '@/lib/supabase/api/employeeDocuments';
import Link from 'next/link';

interface Props {
  employeeId: string;
  employeeName: string;
}

export default function EmployeeDashboard({ employeeId, employeeName }: Props) {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [recentSlips, setRecentSlips] = useState<PayrollSlip[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const year = new Date().getFullYear();
        const [bal, slips, docs] = await Promise.all([
          leaveBalancesApi.getByEmployee(employeeId, year),
          payrollSlipsApi.getByEmployee(employeeId),
          employeeDocumentsApi.getByEmployee(employeeId),
        ]);
        setBalances(bal);
        setRecentSlips(slips.slice(0, 3));
        // Filter docs expiring within 60 days or already expired
        const now = new Date();
        const soon = new Date();
        soon.setDate(soon.getDate() + 60);
        setExpiringDocs(docs.filter((d: any) => d.expiry_date && new Date(d.expiry_date) <= soon));
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [employeeId]);

  const formatMoney = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#5A7A8F] to-[#4a6a7f] rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">Welcome, {employeeName}</h2>
        <p className="text-blue-100 text-sm mt-1">Here&apos;s your overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Leave Balances */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#5A7A8F]" />
            Leave Balances
          </h3>
          <Link href="/hr/employee/leave" className="text-sm text-[#5A7A8F] hover:underline">View all</Link>
        </div>
        {balances.length === 0 ? (
          <p className="text-sm text-gray-500">No leave balances configured for this year.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {balances.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500">{b.leave_type?.name || 'Leave'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{b.remaining_days}</p>
                <p className="text-xs text-gray-400">of {b.entitlement_days + b.carried_over_days} days</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Payslips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-[#5A7A8F]" />
            Recent Payslips
          </h3>
          <Link href="/hr/employee/payslips" className="text-sm text-[#5A7A8F] hover:underline">View all</Link>
        </div>
        {recentSlips.length === 0 ? (
          <p className="text-sm text-gray-500">No payslips found.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {recentSlips.map((slip) => {
              const run = (slip as any).payroll_run;
              const period = run ? `${monthNames[run.period_month]} ${run.period_year}` : 'Unknown';
              return (
                <div key={slip.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{period}</p>
                    <p className="text-xs text-gray-500">Net: {formatMoney(slip.net_pay)} THB</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${run?.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {run?.status || 'draft'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Alerts */}
      {expiringDocs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Document Alerts
            </h3>
            <Link href="/hr/employee/documents" className="text-sm text-[#5A7A8F] hover:underline">View all</Link>
          </div>
          <div className="bg-white border border-amber-200 rounded-lg divide-y divide-gray-200">
            {expiringDocs.map((doc: any) => {
              const expiry = new Date(doc.expiry_date);
              const now = new Date();
              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isExpired = daysLeft < 0;
              return (
                <div key={doc.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.document_name || doc.document_type}</p>
                    <p className="text-xs text-gray-500">Expires: {expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isExpired ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
