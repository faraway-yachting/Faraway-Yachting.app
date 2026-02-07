'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Camera, User, Plus } from 'lucide-react';
import { employeesApi } from '@/lib/supabase/api/employees';
import { companiesApi } from '@/lib/supabase/api/companies';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import { hrEmploymentTypesApi } from '@/lib/supabase/api/hrEmploymentTypes';
import { hrPositionsApi } from '@/lib/supabase/api/hrPositions';
import { hrDepartmentsApi, type HRDepartment } from '@/lib/supabase/api/hrDepartments';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { EMPLOYEE_STATUS_LABELS } from '@/data/hr/types';
import type { EmployeeStatus } from '@/data/hr/types';

type Company = Database['public']['Tables']['companies']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type Employee = Database['public']['Tables']['employees']['Row'];
type HREmploymentType = Database['public']['Tables']['hr_employment_types']['Row'];
type HRPosition = Database['public']['Tables']['hr_positions']['Row'];

interface EmployeeFormProps {
  employee?: Employee | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function EmployeeForm({ employee, onSaved, onCancel }: EmployeeFormProps) {
  const router = useRouter();
  const isEdit = !!employee;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<HREmploymentType[]>([]);
  const [positions, setPositions] = useState<HRPosition[]>([]);
  const [departments, setDepartments] = useState<HRDepartment[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [picturePreview, setPicturePreview] = useState<string | null>(employee?.picture_url || null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [addingPosition, setAddingPosition] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [addingDepartment, setAddingDepartment] = useState(false);

  const [form, setForm] = useState({
    full_name_en: employee?.full_name_en || '',
    full_name_th: employee?.full_name_th || '',
    nickname: employee?.nickname || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    line_id: employee?.line_id || '',
    employment_type: employee?.employment_type || 'fixed',
    company_id: employee?.company_id || '',
    position: employee?.position || '',
    department: (employee as any)?.department || '',
    status: employee?.status || 'active',
    start_date: employee?.start_date || '',
    probation_end_date: employee?.probation_end_date || '',
    contract_end_date: employee?.contract_end_date || '',
    base_salary: employee?.base_salary?.toString() || '',
    thai_registered_salary: (employee as any)?.thai_registered_salary?.toString() || '',
    away_charter_description: (employee as any)?.away_charter_description || 'Guest service',
    ssf_enabled: (employee as any)?.ssf_enabled !== false ? 'true' : 'false',
    ssf_override: (employee as any)?.ssf_override?.toString() || '',
    currency: employee?.currency || 'THB',
    notes: employee?.notes || '',
  });

  useEffect(() => {
    Promise.all([
      companiesApi.getAll(),
      hrEmploymentTypesApi.getActive(),
      hrDepartmentsApi.getActive(),
    ]).then(async ([c, et, dept]) => {
      setCompanies(c);
      setEmploymentTypes(et);
      setDepartments(dept);
      // Load positions filtered by employee's current department
      const empDept = (employee as any)?.department;
      const deptObj = empDept ? dept.find((d: HRDepartment) => d.name === empDept) : null;
      const pos = deptObj
        ? await hrPositionsApi.getByDepartment(deptObj.id)
        : await hrPositionsApi.getActive();
      setPositions(pos);
    }).finally(() => setLoadingData(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDepartmentChange = async (deptName: string) => {
    setForm((prev) => ({ ...prev, department: deptName, position: '' }));
    if (deptName) {
      const dept = departments.find(d => d.name === deptName);
      if (dept) {
        const pos = await hrPositionsApi.getByDepartment(dept.id);
        setPositions(pos);
      }
    } else {
      const pos = await hrPositionsApi.getActive();
      setPositions(pos);
    }
  };

  const handlePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureFile(file);
    setPicturePreview(URL.createObjectURL(file));
  };

  const uploadPicture = async (employeeId: string): Promise<string | null> => {
    if (!pictureFile) return employee?.picture_url || null;
    const supabase = createClient();
    const ext = pictureFile.name.split('.').pop() || 'jpg';
    const path = `employees/${employeeId}/profile.${ext}`;
    const { error } = await supabase.storage
      .from('hr-files')
      .upload(path, pictureFile, { upsert: true });
    if (error) {
      console.error('Failed to upload picture:', error);
      return employee?.picture_url || null;
    }
    const { data: urlData } = supabase.storage.from('hr-files').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleAddEmploymentType = async () => {
    if (!newTypeName.trim()) return;
    setAddingType(true);
    try {
      const name = newTypeName.trim().toLowerCase().replace(/\s+/g, '_');
      const created = await hrEmploymentTypesApi.create({
        name,
        label: newTypeName.trim(),
        sort_order: employmentTypes.length + 1,
      });
      setEmploymentTypes((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, employment_type: created.name }));
      setNewTypeName('');
      setShowAddType(false);
    } catch (error) {
      console.error('Failed to add employment type:', error);
      alert('Failed to add type. It may already exist.');
    } finally {
      setAddingType(false);
    }
  };

  const handleAddPosition = async () => {
    if (!newPositionName.trim()) return;
    setAddingPosition(true);
    try {
      const currentDept = departments.find(d => d.name === form.department);
      const created = await hrPositionsApi.create({
        name: newPositionName.trim(),
        sort_order: positions.length + 1,
        department_id: currentDept?.id || null,
      });
      setPositions((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, position: created.name }));
      setNewPositionName('');
      setShowAddPosition(false);
    } catch (error) {
      console.error('Failed to add position:', error);
      alert('Failed to add position. It may already exist.');
    } finally {
      setAddingPosition(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    setAddingDepartment(true);
    try {
      const created = await hrDepartmentsApi.create({
        name: newDepartmentName.trim(),
        sort_order: departments.length + 1,
      });
      setDepartments((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, department: created.name }));
      setNewDepartmentName('');
      setShowAddDepartment(false);
    } catch (error) {
      console.error('Failed to add department:', error);
      alert('Failed to add department. It may already exist.');
    } finally {
      setAddingDepartment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name_en.trim()) return;

    setSaving(true);
    try {
      const payload: EmployeeInsert & { department?: string | null; thai_registered_salary?: number; away_charter_description?: string | null; ssf_enabled?: boolean; ssf_override?: number | null } = {
        full_name_en: form.full_name_en.trim(),
        full_name_th: form.full_name_th.trim() || null,
        nickname: form.nickname.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        line_id: form.line_id.trim() || null,
        employment_type: form.employment_type,
        company_id: form.company_id || null,
        position: form.position.trim() || null,
        department: form.department.trim() || null,
        status: form.status as EmployeeStatus,
        start_date: form.start_date || null,
        probation_end_date: form.probation_end_date || null,
        contract_end_date: form.contract_end_date || null,
        base_salary: form.base_salary ? parseFloat(form.base_salary) : undefined,
        thai_registered_salary: form.thai_registered_salary ? parseFloat(form.thai_registered_salary) : 0,
        away_charter_description: form.away_charter_description.trim() || 'Guest service',
        ssf_enabled: form.ssf_enabled === 'true',
        ssf_override: form.ssf_override ? parseFloat(form.ssf_override) : null,
        currency: form.currency,
        notes: form.notes.trim() || null,
      };

      if (isEdit && employee) {
        const pictureUrl = await uploadPicture(employee.id);
        if (pictureUrl !== employee.picture_url) {
          payload.picture_url = pictureUrl;
        }
        await employeesApi.update(employee.id, payload);
        if (onSaved) {
          onSaved();
        } else {
          router.push(`/hr/manager/employees/${employee.id}`);
        }
      } else {
        const created = await employeesApi.create(payload);
        const pictureUrl = await uploadPicture(created.id);
        if (pictureUrl) {
          await employeesApi.update(created.id, { picture_url: pictureUrl });
        }
        router.push(`/hr/manager/employees/${created.id}`);
      }
    } catch (error) {
      console.error('Failed to save employee:', error);
      alert('Failed to save employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Picture */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile Picture</h3>
        <div className="flex items-center gap-4">
          <div
            className="relative h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-[#5A7A8F] to-[#4a6a7f] flex items-center justify-center shadow cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {picturePreview ? (
              <img src={picturePreview} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-white" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-[#5A7A8F] hover:underline font-medium"
            >
              {picturePreview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG. Max 5MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePictureSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name (EN) *</label>
            <input
              name="full_name_en"
              value={form.full_name_en}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name (TH)</label>
            <input
              name="full_name_th"
              value={form.full_name_th}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nickname</label>
            <input
              name="nickname"
              value={form.nickname}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">LINE ID</label>
            <input
              name="line_id"
              value={form.line_id}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
        </div>
      </div>

      {/* Employment Details */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Employment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Employment Type</label>
            <div className="flex gap-2">
              <select
                name="employment_type"
                value={form.employment_type}
                onChange={handleChange}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
              >
                {employmentTypes.map((et) => (
                  <option key={et.name} value={et.name}>{et.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddType(!showAddType)}
                className="p-2 text-[#5A7A8F] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Add new type"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {showAddType && (
              <div className="mt-2 flex gap-2">
                <input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="New type name..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmploymentType(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddEmploymentType}
                  disabled={addingType || !newTypeName.trim()}
                  className="px-3 py-1.5 text-sm bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
                >
                  {addingType ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <div className="flex gap-2">
              <select
                name="department"
                value={form.department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddDepartment(!showAddDepartment)}
                className="p-2 text-[#5A7A8F] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Add new department"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {showAddDepartment && (
              <div className="mt-2 flex gap-2">
                <input
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="New department name..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDepartment(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  disabled={addingDepartment || !newDepartmentName.trim()}
                  className="px-3 py-1.5 text-sm bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
                >
                  {addingDepartment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
            <div className="flex gap-2">
              <select
                name="position"
                value={form.position}
                onChange={handleChange}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
              >
                <option value="">— None —</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddPosition(!showAddPosition)}
                className="p-2 text-[#5A7A8F] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Add new position"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {showAddPosition && (
              <div className="mt-2 flex gap-2">
                <input
                  value={newPositionName}
                  onChange={(e) => setNewPositionName(e.target.value)}
                  placeholder="New position name..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPosition(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddPosition}
                  disabled={addingPosition || !newPositionName.trim()}
                  className="px-3 py-1.5 text-sm bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
                >
                  {addingPosition ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
            <select
              name="company_id"
              value={form.company_id}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            >
              <option value="">— None —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            >
              {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Probation End Date</label>
            <input
              name="probation_end_date"
              type="date"
              value={form.probation_end_date}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contract End Date</label>
            <input
              name="contract_end_date"
              type="date"
              value={form.contract_end_date}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
        </div>
      </div>

      {/* Salary */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Salary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Base Salary</label>
            <input
              name="base_salary"
              type="number"
              step="0.01"
              value={form.base_salary}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
            <CurrencySelect
              value={form.currency}
              onChange={(val) => handleChange({ target: { name: 'currency', value: val } } as React.ChangeEvent<HTMLSelectElement>)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Thai Registered Salary</label>
            <input
              name="thai_registered_salary"
              type="number"
              step="0.01"
              value={form.thai_registered_salary}
              onChange={handleChange}
              placeholder="Amount paid from Thai company"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Away Charter Description</label>
            <input
              name="away_charter_description"
              value={form.away_charter_description}
              onChange={handleChange}
              placeholder="Guest service"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SSF Registered</label>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={form.ssf_enabled === 'true'}
                onChange={e => setForm(prev => ({ ...prev, ssf_enabled: e.target.checked ? 'true' : 'false', ...(!e.target.checked ? { ssf_override: '' } : {}) }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#5A7A8F]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A7A8F]"></div>
              <span className="ml-2 text-sm text-gray-600">{form.ssf_enabled === 'true' ? 'Yes' : 'No'}</span>
            </label>
          </div>
          {form.ssf_enabled === 'true' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SSF Amount Override</label>
              <input
                name="ssf_override"
                type="number"
                step="0.01"
                value={form.ssf_override}
                onChange={handleChange}
                placeholder="Auto: 5% capped at 750"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Notes</h3>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50 focus:border-[#5A7A8F]"
          placeholder="Private manager notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !form.full_name_en.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A7A8F] text-white text-sm font-medium rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Update Employee' : 'Create Employee'}
        </button>
        <button
          type="button"
          onClick={() => onCancel ? onCancel() : router.back()}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
