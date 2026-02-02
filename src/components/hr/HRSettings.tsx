'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { hrEmploymentTypesApi } from '@/lib/supabase/api/hrEmploymentTypes';
import { hrPositionsApi, type HRPosition as HRPositionExt } from '@/lib/supabase/api/hrPositions';
import { hrDocumentTypesApi } from '@/lib/supabase/api/hrDocumentTypes';
import { hrLeaveTypesApi, type HRLeaveType } from '@/lib/supabase/api/hrLeaveTypes';
import { hrDepartmentsApi, type HRDepartment } from '@/lib/supabase/api/hrDepartments';
import type { Database } from '@/lib/supabase/database.types';

type HREmploymentType = Database['public']['Tables']['hr_employment_types']['Row'];
type HRPosition = Database['public']['Tables']['hr_positions']['Row'];
type HRDocumentType = Database['public']['Tables']['hr_document_types']['Row'];

export default function HRSettings() {
  const [employmentTypes, setEmploymentTypes] = useState<HREmploymentType[]>([]);
  const [positions, setPositions] = useState<HRPosition[]>([]);
  const [documentTypes, setDocumentTypes] = useState<HRDocumentType[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<HRLeaveType[]>([]);
  const [depts, setDepts] = useState<HRDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [et, pos, dt, lt, dp] = await Promise.all([
        hrEmploymentTypesApi.getAll(),
        hrPositionsApi.getAll(),
        hrDocumentTypesApi.getAll(),
        hrLeaveTypesApi.getAll(),
        hrDepartmentsApi.getAll(),
      ]);
      setEmploymentTypes(et);
      setPositions(pos);
      setDocumentTypes(dt);
      setLeaveTypes(lt);
      setDepts(dp);
    } catch (error) {
      console.error('Failed to load settings:', error);
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

  return (
    <div className="space-y-8">
      <LookupManager<HREmploymentType>
        title="Employment Types"
        description="Manage employment type options shown in the employee form."
        items={employmentTypes}
        getLabel={(item) => item.label}
        getName={(item) => item.name}
        onAdd={async (name) => {
          const key = name.toLowerCase().replace(/\s+/g, '_');
          const created = await hrEmploymentTypesApi.create({
            name: key,
            label: name,
            sort_order: employmentTypes.length + 1,
          });
          setEmploymentTypes((prev) => [...prev, created]);
        }}
        onEdit={async (item, newLabel) => {
          const newName = newLabel.toLowerCase().replace(/\s+/g, '_');
          await hrEmploymentTypesApi.update(item.id, { name: newName, label: newLabel });
          setEmploymentTypes((prev) =>
            prev.map((et) => (et.id === item.id ? { ...et, name: newName, label: newLabel } : et))
          );
        }}
        onDelete={async (item) => {
          await hrEmploymentTypesApi.delete(item.id);
          setEmploymentTypes((prev) => prev.filter((et) => et.id !== item.id));
        }}
      />

      <LookupManager<HRDepartment>
        title="Departments"
        description="Manage department options shown in the employee form."
        items={depts}
        getLabel={(item) => item.name}
        getName={(item) => item.name}
        onAdd={async (name) => {
          const created = await hrDepartmentsApi.create({
            name,
            sort_order: depts.length + 1,
          });
          setDepts((prev) => [...prev, created]);
        }}
        onEdit={async (item, newName) => {
          await hrDepartmentsApi.update(item.id, { name: newName });
          setDepts((prev) =>
            prev.map((d) => (d.id === item.id ? { ...d, name: newName } : d))
          );
        }}
        onDelete={async (item) => {
          await hrDepartmentsApi.delete(item.id);
          setDepts((prev) => prev.filter((d) => d.id !== item.id));
        }}
      />

      <PositionsManager
        positions={positions}
        departments={depts}
        onUpdate={(updated) => setPositions(updated)}
      />

      <LookupManager<HRDocumentType>
        title="Document Types"
        description="Manage document type options shown in the employee documents section."
        items={documentTypes}
        getLabel={(item) => item.name}
        getName={(item) => item.name}
        onAdd={async (name) => {
          const created = await hrDocumentTypesApi.create({
            name,
            sort_order: documentTypes.length + 1,
          });
          setDocumentTypes((prev) => [...prev, created]);
        }}
        onEdit={async (item, newName) => {
          await hrDocumentTypesApi.update(item.id, { name: newName });
          setDocumentTypes((prev) =>
            prev.map((dt) => (dt.id === item.id ? { ...dt, name: newName } : dt))
          );
        }}
        onDelete={async (item) => {
          await hrDocumentTypesApi.delete(item.id);
          setDocumentTypes((prev) => prev.filter((dt) => dt.id !== item.id));
        }}
      />

      <LookupManager<HRLeaveType>
        title="Leave Types"
        description="Manage leave type options for leave requests."
        items={leaveTypes}
        getLabel={(item) => `${item.name}${item.is_paid ? '' : ' (Unpaid)'}`}
        getName={(item) => item.name}
        onAdd={async (name) => {
          const created = await hrLeaveTypesApi.create({
            name,
            sort_order: leaveTypes.length + 1,
          });
          setLeaveTypes((prev) => [...prev, created]);
        }}
        onEdit={async (item, newName) => {
          await hrLeaveTypesApi.update(item.id, { name: newName });
          setLeaveTypes((prev) =>
            prev.map((lt) => (lt.id === item.id ? { ...lt, name: newName } : lt))
          );
        }}
        onDelete={async (item) => {
          await hrLeaveTypesApi.delete(item.id);
          setLeaveTypes((prev) => prev.filter((lt) => lt.id !== item.id));
        }}
      />
    </div>
  );
}

interface LookupManagerProps<T extends { id: string }> {
  title: string;
  description: string;
  items: T[];
  getLabel: (item: T) => string;
  getName: (item: T) => string;
  onAdd: (name: string) => Promise<void>;
  onEdit: (item: T, newLabel: string) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
}

function LookupManager<T extends { id: string }>({
  title,
  description,
  items,
  getLabel,
  getName,
  onAdd,
  onEdit,
  onDelete,
}: LookupManagerProps<T>) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAdd(newName.trim());
      setNewName('');
    } catch (error) {
      console.error(`Failed to add ${title}:`, error);
      alert(`Failed to add. The name may already exist.`);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (item: T) => {
    if (!editValue.trim() || editValue.trim() === getLabel(item)) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    try {
      await onEdit(item, editValue.trim());
      setEditingId(null);
    } catch (error) {
      console.error(`Failed to edit ${title}:`, error);
      alert(`Failed to update. The name may already exist.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: T) => {
    if (!confirm(`Delete "${getLabel(item)}"? Employees using this value will keep their current value but it won't appear in the dropdown.`)) return;
    try {
      await onDelete(item);
    } catch (error) {
      console.error(`Failed to delete ${title}:`, error);
      alert('Failed to delete.');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="p-5 space-y-3">
        {/* Existing items */}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {editingId === item.id ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-[#5A7A8F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEdit(item);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
                <button
                  onClick={() => handleEdit(item)}
                  disabled={saving}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Save"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700">{getLabel(item)}</span>
                <button
                  onClick={() => { setEditingId(item.id); setEditValue(getLabel(item)); }}
                  className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-sm text-gray-400">No items yet.</p>
        )}

        {/* Add new */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Add new ${title.toLowerCase().replace(/s$/, '')}...`}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom Positions manager with department assignment
interface PositionsManagerProps {
  positions: HRPosition[];
  departments: HRDepartment[];
  onUpdate: (positions: HRPosition[]) => void;
}

function PositionsManager({ positions, departments, onUpdate }: PositionsManagerProps) {
  const [newName, setNewName] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [saving, setSaving] = useState(false);

  const getDeptName = (deptId?: string | null) => {
    if (!deptId) return null;
    return departments.find(d => d.id === deptId)?.name || null;
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const created = await hrPositionsApi.create({
        name: newName.trim(),
        sort_order: positions.length + 1,
        department_id: newDeptId || null,
      });
      onUpdate([...positions, created as HRPosition]);
      setNewName('');
      setNewDeptId('');
    } catch (error) {
      console.error('Failed to add position:', error);
      alert('Failed to add. The name may already exist.');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (item: HRPosition) => {
    if (!editName.trim()) { setEditingId(null); return; }
    setSaving(true);
    try {
      await hrPositionsApi.update(item.id, { name: editName.trim(), department_id: editDeptId || null });
      onUpdate(positions.map(p =>
        p.id === item.id ? { ...p, name: editName.trim(), department_id: editDeptId || null } : p
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update position:', error);
      alert('Failed to update. The name may already exist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: HRPosition) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await hrPositionsApi.delete(item.id);
      onUpdate(positions.filter(p => p.id !== item.id));
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete.');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Positions</h3>
        <p className="text-xs text-gray-500 mt-0.5">Manage positions and assign them to departments.</p>
      </div>
      <div className="p-5 space-y-3">
        {positions.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {editingId === item.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-[#5A7A8F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(item); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                />
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                >
                  <option value="">No dept</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button onClick={() => handleEdit(item)} disabled={saving}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button onClick={() => setEditingId(null)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700">
                  {item.name}
                  {getDeptName((item as any).department_id) && (
                    <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {getDeptName((item as any).department_id)}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => { setEditingId(item.id); setEditName(item.name); setEditDeptId((item as any).department_id || ''); }}
                  className="p-1.5 text-gray-400 hover:text-[#5A7A8F] hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(item)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}

        {positions.length === 0 && (
          <p className="text-sm text-gray-400">No positions yet.</p>
        )}

        {/* Add new */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New position name..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]/50"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <select
            value={newDeptId}
            onChange={(e) => setNewDeptId(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
          >
            <option value="">No dept</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#5A7A8F] text-white rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
