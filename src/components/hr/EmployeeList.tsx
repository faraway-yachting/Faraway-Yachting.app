'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Search, Plus, Filter } from 'lucide-react';
import { employeesApi } from '@/lib/supabase/api/employees';
import { companiesApi } from '@/lib/supabase/api/companies';
import { hrEmploymentTypesApi } from '@/lib/supabase/api/hrEmploymentTypes';
import type { Database } from '@/lib/supabase/database.types';
import { EMPLOYEE_STATUS_LABELS } from '@/data/hr/types';
import type { EmployeeStatus } from '@/data/hr/types';
import { useIsMobile } from '@/hooks/useIsMobile';

type Employee = Database['public']['Tables']['employees']['Row'];
type HREmploymentType = Database['public']['Tables']['hr_employment_types']['Row'];

export default function EmployeeList() {
  const isMobile = useIsMobile();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyMap, setCompanyMap] = useState<Map<string, string>>(new Map());
  const [employmentTypes, setEmploymentTypes] = useState<HREmploymentType[]>([]);
  const [empTypeMap, setEmpTypeMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allEmployees, companies, empTypes] = await Promise.all([
        employeesApi.getAll(),
        companiesApi.getAll(),
        hrEmploymentTypesApi.getAll(),
      ]);
      setEmployees(allEmployees);
      setCompanyMap(new Map(companies.map((c) => [c.id, c.name])));
      setEmploymentTypes(empTypes);
      setEmpTypeMap(new Map(empTypes.map((et) => [et.name, et.label])));
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = employees.filter((emp) => {
    if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
    if (typeFilter !== 'all' && emp.employment_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        emp.full_name_en?.toLowerCase().includes(q) ||
        emp.full_name_th?.toLowerCase().includes(q) ||
        emp.nickname?.toLowerCase().includes(q) ||
        emp.employee_id?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.position?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, email, position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
          />
        </div>
        <Link
          href="/hr/manager/employees/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8F] text-white text-sm font-medium rounded-lg hover:bg-[#4a6a7f] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
        >
          <option value="all">All Statuses</option>
          {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
        >
          <option value="all">All Types</option>
          {employmentTypes.map((et) => (
            <option key={et.name} value={et.name}>{et.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500 ml-auto">
          {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table / Card list */}
      {isMobile ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
              {employees.length === 0 ? 'No employees yet.' : 'No employees match your filters.'}
            </div>
          ) : filtered.map((emp) => (
            <Link key={emp.id} href={`/hr/manager/employees/${emp.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm active:bg-gray-50">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#5A7A8F]">
                  {emp.full_name_en}
                  {emp.nickname && <span className="text-xs text-gray-400 ml-1">({emp.nickname})</span>}
                </span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  emp.status === 'active' ? 'bg-green-100 text-green-800' :
                  emp.status === 'on_leave' ? 'bg-amber-100 text-amber-800' :
                  emp.status === 'resigned' ? 'bg-gray-100 text-gray-600' :
                  'bg-red-100 text-red-800'
                }`}>
                  {EMPLOYEE_STATUS_LABELS[emp.status as EmployeeStatus]}
                </span>
              </div>
              <dl className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">ID</dt>
                  <dd className="text-right text-sm text-gray-900 font-mono">{emp.employee_id}</dd>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">Position</dt>
                  <dd className="text-right text-sm text-gray-900">{emp.position || '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-gray-500">Type</dt>
                  <dd className="text-right text-sm text-gray-900">{empTypeMap.get(emp.employment_type) || emp.employment_type}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      ) : (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{emp.employee_id}</td>
                <td className="px-4 py-3">
                  <Link href={`/hr/manager/employees/${emp.id}`} className="text-sm font-medium text-[#5A7A8F] hover:underline">
                    {emp.full_name_en}
                  </Link>
                  {emp.nickname && <span className="text-xs text-gray-400 ml-1">({emp.nickname})</span>}
                  {emp.full_name_th && <div className="text-xs text-gray-400">{emp.full_name_th}</div>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{emp.position || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{emp.company_id ? (companyMap.get(emp.company_id) || '-') : '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{empTypeMap.get(emp.employment_type) || emp.employment_type}</td>
                <td className="px-4 py-3 text-center">
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  {employees.length === 0 ? 'No employees yet.' : 'No employees match your filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
