'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Edit2, Trash2, User } from 'lucide-react';
import { employeesApi } from '@/lib/supabase/api/employees';
import { companiesApi } from '@/lib/supabase/api/companies';
import { hrEmploymentTypesApi } from '@/lib/supabase/api/hrEmploymentTypes';
import type { Database } from '@/lib/supabase/database.types';
import { EMPLOYEE_STATUS_LABELS } from '@/data/hr/types';
import type { EmployeeStatus } from '@/data/hr/types';
import EmployeeForm from './EmployeeForm';
import CharterRatesEditor from './CharterRatesEditor';
import DocumentsManager from './DocumentsManager';
import BoatAssignments from './BoatAssignments';

type Employee = Database['public']['Tables']['employees']['Row'];
type HREmploymentType = Database['public']['Tables']['hr_employment_types']['Row'];

interface EmployeeProfileProps {
  employeeId: string;
}

const TABS = ['Profile', 'Charter Rates', 'Documents', 'Boats'] as const;
type Tab = typeof TABS[number];

export default function EmployeeProfile({ employeeId }: EmployeeProfileProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companyName, setCompanyName] = useState<string>('-');
  const [employmentTypeMap, setEmploymentTypeMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [editing, setEditing] = useState(false);

  const loadEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const [emp, empTypes] = await Promise.all([
        employeesApi.getById(employeeId),
        hrEmploymentTypesApi.getAll(),
      ]);
      setEmployee(emp);
      setEmploymentTypeMap(new Map(empTypes.map((et) => [et.name, et.label])));
      if (emp?.company_id) {
        const company = await companiesApi.getById(emp.company_id);
        setCompanyName(company?.name || '-');
      }
    } catch (error) {
      console.error('Failed to load employee:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this employee? This cannot be undone.')) return;
    try {
      await employeesApi.delete(employeeId);
      router.push('/hr/manager/employees');
    } catch (error) {
      console.error('Failed to delete employee:', error);
      alert('Failed to delete employee.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!employee) {
    return <p className="text-sm text-gray-500 py-8 text-center">Employee not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-br from-[#5A7A8F] to-[#4a6a7f] flex items-center justify-center shadow">
            {employee.picture_url ? (
              <img src={employee.picture_url} alt={employee.full_name_en} className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{employee.full_name_en}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 font-mono">{employee.employee_id}</span>
              {(employee as any).department && <span className="text-sm text-gray-500">· {(employee as any).department}</span>}
              {employee.position && <span className="text-sm text-gray-500">· {employee.position}</span>}
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                employee.status === 'active' ? 'bg-green-100 text-green-800' :
                employee.status === 'on_leave' ? 'bg-amber-100 text-amber-800' :
                employee.status === 'resigned' ? 'bg-gray-100 text-gray-600' :
                'bg-red-100 text-red-800'
              }`}>
                {EMPLOYEE_STATUS_LABELS[employee.status as EmployeeStatus]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            {editing ? 'View' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setEditing(false); }}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#5A7A8F] text-[#5A7A8F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'Profile' && (
        editing ? (
          <EmployeeForm employee={employee} onSaved={() => { setEditing(false); loadEmployee(); }} onCancel={() => setEditing(false)} />
        ) : (
          <ProfileView employee={employee} companyName={companyName} employmentTypeMap={employmentTypeMap} />
        )
      )}
      {activeTab === 'Charter Rates' && <CharterRatesEditor employeeId={employeeId} editing={editing} />}
      {activeTab === 'Documents' && <DocumentsManager employeeId={employeeId} editing={editing} />}
      {activeTab === 'Boats' && <BoatAssignments employeeId={employeeId} editing={editing} />}
    </div>
  );
}

function ProfileView({ employee, companyName, employmentTypeMap }: { employee: Employee; companyName: string; employmentTypeMap: Map<string, string> }) {
  const field = (label: string, value: string | number | null | undefined) => (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Personal</h4>
        <dl className="grid grid-cols-2 gap-4">
          {field('Full Name (EN)', employee.full_name_en)}
          {field('Full Name (TH)', employee.full_name_th)}
          {field('Nickname', employee.nickname)}
          {field('Email', employee.email)}
          {field('Phone', employee.phone)}
          {field('LINE ID', employee.line_id)}
        </dl>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employment</h4>
        <dl className="grid grid-cols-2 gap-4">
          {field('Type', employmentTypeMap.get(employee.employment_type) || employee.employment_type)}
          {field('Department', (employee as any).department)}
          {field('Position', employee.position)}
          {field('Company', companyName)}
          {field('Start Date', employee.start_date)}
          {field('Probation End', employee.probation_end_date)}
          {field('Contract End', employee.contract_end_date)}
          {field('Status', EMPLOYEE_STATUS_LABELS[employee.status as EmployeeStatus])}
        </dl>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Salary</h4>
        <dl className="grid grid-cols-2 gap-4">
          {field('Base Salary', employee.base_salary ? `${Number(employee.base_salary).toLocaleString()} ${employee.currency || 'THB'}` : '-')}
          {field('Currency', employee.currency)}
          {field('Thai Registered Salary', (employee as any).thai_registered_salary ? `${Number((employee as any).thai_registered_salary).toLocaleString()} THB` : '-')}
          {field('Away Charter Description', (employee as any).away_charter_description || '-')}
        </dl>
      </div>
      {employee.notes && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{employee.notes}</p>
        </div>
      )}
    </div>
  );
}
