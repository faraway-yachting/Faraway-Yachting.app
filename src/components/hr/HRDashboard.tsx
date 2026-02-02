'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users, AlertTriangle, UserCheck, UserX, FileWarning } from 'lucide-react';
import Link from 'next/link';
import { employeesApi } from '@/lib/supabase/api/employees';
import { employeeDocumentsApi } from '@/lib/supabase/api/employeeDocuments';
import { companiesApi } from '@/lib/supabase/api/companies';
import type { Database } from '@/lib/supabase/database.types';
import { EMPLOYEE_STATUS_LABELS, DOCUMENT_TYPE_LABELS } from '@/data/hr/types';
import type { EmployeeStatus, DocumentType } from '@/data/hr/types';

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeDocument = Database['public']['Tables']['employee_documents']['Row'];

export default function HRDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<EmployeeDocument[]>([]);
  const [companyMap, setCompanyMap] = useState<Map<string, string>>(new Map());
  const [employeeMap, setEmployeeMap] = useState<Map<string, Employee>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allEmployees, expDocs, companies] = await Promise.all([
        employeesApi.getAll(),
        employeeDocumentsApi.getExpiringSoon(60),
        companiesApi.getAll(),
      ]);
      setEmployees(allEmployees);
      setExpiringDocs(expDocs);
      setCompanyMap(new Map(companies.map((c) => [c.id, c.name])));
      setEmployeeMap(new Map(allEmployees.map((e) => [e.id, e])));
    } catch (error) {
      console.error('Failed to load HR dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const activeCount = employees.filter((e) => e.status === 'active').length;
  const onLeaveCount = employees.filter((e) => e.status === 'on_leave').length;
  const resignedCount = employees.filter((e) => e.status === 'resigned').length;
  const terminatedCount = employees.filter((e) => e.status === 'terminated').length;

  // Docs expiring within 30 days
  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);
  const urgentDocs = expiringDocs.filter((d) => {
    if (!d.expiry_date) return false;
    const exp = new Date(d.expiry_date);
    return exp <= in30Days;
  });

  // By company
  const byCompany = new Map<string, number>();
  for (const e of employees) {
    if (e.status !== 'active') continue;
    const name = e.company_id ? (companyMap.get(e.company_id) || 'Unknown') : 'Unassigned';
    byCompany.set(name, (byCompany.get(name) || 0) + 1);
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
              <div className="text-xs text-gray-500">Total Employees</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><UserCheck className="h-5 w-5 text-green-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{activeCount}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><UserX className="h-5 w-5 text-amber-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{onLeaveCount}</div>
              <div className="text-xs text-gray-500">On Leave</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{urgentDocs.length}</div>
              <div className="text-xs text-gray-500">Expiring Docs (30d)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount by Company */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Active Headcount by Company</h3>
          </div>
          <div className="p-4 space-y-2">
            {byCompany.size === 0 && <p className="text-xs text-gray-400">No active employees.</p>}
            {Array.from(byCompany.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{name}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expiring Documents */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              <FileWarning className="inline h-4 w-4 text-amber-500 mr-1" />
              Documents Expiring Soon
            </h3>
          </div>
          <div className="p-4">
            {urgentDocs.length === 0 ? (
              <p className="text-xs text-gray-400">No documents expiring in the next 30 days.</p>
            ) : (
              <div className="space-y-2">
                {urgentDocs.slice(0, 10).map((doc) => {
                  const emp = employeeMap.get(doc.employee_id);
                  const daysLeft = doc.expiry_date
                    ? Math.ceil((new Date(doc.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isExpired = daysLeft !== null && daysLeft < 0;
                  return (
                    <div key={doc.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{emp?.full_name_en || 'Unknown'}</span>
                        <span className="text-gray-400 mx-1">-</span>
                        <span className="text-gray-600">{DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] || doc.document_type}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isExpired ? `Expired ${Math.abs(daysLeft!)}d ago` : `${daysLeft}d left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Employees */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Recent Employees</h3>
          <Link href="/hr/manager/employees" className="text-xs text-[#5A7A8F] hover:underline font-medium">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Type</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.slice(0, 10).map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-600 font-mono">{emp.employee_id}</td>
                  <td className="px-4 py-2">
                    <Link href={`/hr/manager/employees/${emp.id}`} className="text-sm font-medium text-[#5A7A8F] hover:underline">
                      {emp.full_name_en}
                    </Link>
                    {emp.nickname && <span className="text-xs text-gray-400 ml-1">({emp.nickname})</span>}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{emp.company_id ? (companyMap.get(emp.company_id) || '-') : '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 capitalize">{emp.employment_type.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      emp.status === 'active' ? 'bg-green-100 text-green-800' :
                      emp.status === 'on_leave' ? 'bg-amber-100 text-amber-800' :
                      emp.status === 'resigned' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {EMPLOYEE_STATUS_LABELS[emp.status as EmployeeStatus]}
                    </span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No employees yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
