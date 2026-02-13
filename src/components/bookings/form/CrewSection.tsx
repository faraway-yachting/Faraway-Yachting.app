'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, X, ChevronDown, Search, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { employeesApi } from '@/lib/supabase/api/employees';
import { bookingCrewApi } from '@/lib/supabase/api/bookingCrew';
import { leaveRequestsApi } from '@/lib/supabase/api/leaveRequests';
import { checkCrewConflicts, type CrewConflict } from '@/lib/bookings/crewConflictChecker';

interface Employee {
  id: string;
  full_name_en: string;
  position: string | null;
}

interface CrewSectionProps {
  selectedCrewIds: string[];
  onCrewChange: (ids: string[]) => void;
  canEdit: boolean;
  dateFrom?: string;
  dateTo?: string;
  bookingId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
}

export default function CrewSection({ selectedCrewIds, onCrewChange, canEdit, dateFrom, dateTo, bookingId, isCollapsed, onToggleCollapse, isCompleted, onToggleCompleted }: CrewSectionProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [conflicts, setConflicts] = useState<Map<string, CrewConflict[]>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await employeesApi.getByDepartment('Operations');
        setEmployees(data.map((e) => ({ id: e.id, full_name_en: e.full_name_en, position: e.position })));
      } catch (err) {
        console.error('Failed to load employees:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEmployees();
  }, []);

  // Check conflicts for selected crew when dates change
  useEffect(() => {
    if (!dateFrom || !dateTo || selectedCrewIds.length === 0) {
      setConflicts(new Map());
      return;
    }

    async function checkConflicts() {
      const newConflicts = new Map<string, CrewConflict[]>();
      for (const empId of selectedCrewIds) {
        try {
          const [crewAssignments, leaveReqs] = await Promise.all([
            bookingCrewApi.getByEmployee(empId),
            leaveRequestsApi.getByEmployee(empId),
          ]);

          const bookingAssignments = crewAssignments
            .filter((c: any) => c.booking)
            .map((c: any) => ({
              bookingId: c.booking.id,
              bookingNumber: c.booking.booking_number,
              title: c.booking.title,
              dateFrom: c.booking.date_from,
              dateTo: c.booking.date_to,
              status: c.booking.status,
            }));

          const leaveEntries = leaveReqs.map((l: any) => ({
            id: l.id,
            startDate: l.start_date,
            endDate: l.end_date,
            status: l.status,
          }));

          const empConflicts = checkCrewConflicts(
            dateFrom!,
            dateTo!,
            bookingAssignments,
            leaveEntries,
            bookingId
          );

          if (empConflicts.length > 0) {
            newConflicts.set(empId, empConflicts);
          }
        } catch (err) {
          console.error('Failed to check conflicts for employee:', empId, err);
        }
      }
      setConflicts(newConflicts);
    }

    checkConflicts();
  }, [selectedCrewIds, dateFrom, dateTo, bookingId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.full_name_en.toLowerCase().includes(q) ||
      (emp.position && emp.position.toLowerCase().includes(q))
    );
  });

  const selectedEmployees = employees.filter((e) => selectedCrewIds.includes(e.id));

  const toggleEmployee = (id: string) => {
    if (selectedCrewIds.includes(id)) {
      onCrewChange(selectedCrewIds.filter((cid) => cid !== id));
    } else {
      onCrewChange([...selectedCrewIds, id]);
    }
  };

  const removeEmployee = (id: string) => {
    onCrewChange(selectedCrewIds.filter((cid) => cid !== id));
  };

  return (
    <div className="bg-cyan-50 rounded-lg p-4">
      <div
        className={`flex items-center justify-between px-3 py-2 -mx-4 -mt-4 rounded-t-lg bg-cyan-100 cursor-pointer select-none ${
          isCollapsed ? '-mb-4 rounded-b-lg' : 'mb-3'
        }`}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleCompleted?.(); }}
            className="flex-shrink-0 hover:scale-110 transition-transform"
            disabled={!onToggleCompleted}
          >
            {isCompleted
              ? <CheckCircle2 className="h-5 w-5 text-green-500" />
              : <Circle className="h-5 w-5 text-gray-400" />
            }
          </button>
          <Users className="h-4 w-4 text-cyan-600" />
          <h3 className="text-sm font-semibold text-cyan-800">Crew</h3>
        </div>
        {onToggleCollapse && (
          <ChevronDown className={`h-4 w-4 text-cyan-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
        )}
      </div>

      {!isCollapsed && <>{/* Selected crew tags */}
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedEmployees.map((emp) => {
            const empConflicts = conflicts.get(emp.id);
            return (
              <div key={emp.id} className="flex flex-col gap-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm bg-white border ${empConflicts ? 'border-amber-400' : 'border-gray-300'} text-gray-700`}
                >
                  {empConflicts && (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  )}
                  {emp.full_name_en}
                  {emp.position && (
                    <span className="text-gray-400 text-xs">({emp.position})</span>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeEmployee(emp.id)}
                      className="ml-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
                {empConflicts && (
                  <div className="ml-1">
                    {empConflicts.map((c, i) => (
                      <p key={i} className="text-xs text-amber-600">
                        {c.type === 'on_leave' ? '🏖️' : '⚠️'} {c.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      {canEdit && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A7A8F]"
          >
            <span className="text-gray-400">
              {loading ? 'Loading employees...' : 'Select crew members...'}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {isOpen && !loading && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search employees..."
                    className="w-full rounded-md border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5A7A8F]"
                    autoFocus
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-48 overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">No employees found</div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedCrewIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployee(emp.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div>
                          <span className="font-medium">{emp.full_name_en}</span>
                          {emp.position && (
                            <span className="ml-2 text-gray-400 text-xs">{emp.position}</span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-xs font-medium" style={{ color: '#5A7A8F' }}>
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </>}
    </div>
  );
}
