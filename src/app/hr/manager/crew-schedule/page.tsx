'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Ship, CalendarDays } from 'lucide-react';
import { HRAppShell } from '@/components/hr/HRAppShell';
import { employeesApi } from '@/lib/supabase/api/employees';
import { bookingCrewApi } from '@/lib/supabase/api/bookingCrew';
import { leaveRequestsApi } from '@/lib/supabase/api/leaveRequests';
import { projectsApi } from '@/lib/supabase/api/projects';

interface CrewEntry {
  employeeId: string;
  employeeName: string;
  position: string;
  assignments: { date: string; type: 'booking' | 'leave'; label: string; bookingId?: string }[];
}

export default function CrewSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [crewData, setCrewData] = useState<CrewEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
  const monthLabel = new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [employees, allCrew, projects] = await Promise.all([
        employeesApi.getByDepartment('Operations'),
        bookingCrewApi.getAllWithBookings(),
        projectsApi.getActive(),
      ]);

      const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));
      const monthStart = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-01`;
      const monthEnd = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const entries: CrewEntry[] = [];

      for (const emp of employees) {
        const assignments: CrewEntry['assignments'] = [];

        // Booking assignments
        const empCrew = allCrew.filter((c: any) => c.employee_id === emp.id && c.booking);
        for (const c of empCrew) {
          const b = (c as any).booking;
          if (!b || b.status === 'cancelled') continue;
          // Check if booking overlaps this month
          if (b.date_from > monthEnd || b.date_to < monthStart) continue;

          const start = Math.max(1, new Date(b.date_from).getDate());
          const startMonth = new Date(b.date_from).getMonth();
          const endMonth = new Date(b.date_to).getMonth();
          const endYear = new Date(b.date_to).getFullYear();

          const effectiveStart = (new Date(b.date_from) < new Date(monthStart)) ? 1 : new Date(b.date_from).getDate();
          const effectiveEnd = (new Date(b.date_to) > new Date(monthEnd)) ? daysInMonth : new Date(b.date_to).getDate();

          const boatName = b.project_id ? projectMap.get(b.project_id) || 'Booking' : 'External';
          for (let d = effectiveStart; d <= effectiveEnd; d++) {
            const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            assignments.push({
              date: dateStr,
              type: 'booking',
              label: boatName,
              bookingId: b.id,
            });
          }
        }

        // Leave
        try {
          const leaves = await leaveRequestsApi.getByEmployee(emp.id);
          for (const l of leaves) {
            if (l.status !== 'approved') continue;
            if (l.start_date > monthEnd || l.end_date < monthStart) continue;

            const effectiveStart = (new Date(l.start_date) < new Date(monthStart)) ? 1 : new Date(l.start_date).getDate();
            const effectiveEnd = (new Date(l.end_date) > new Date(monthEnd)) ? daysInMonth : new Date(l.end_date).getDate();

            for (let d = effectiveStart; d <= effectiveEnd; d++) {
              const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              assignments.push({
                date: dateStr,
                type: 'leave',
                label: 'Leave',
              });
            }
          }
        } catch { /* no leave data */ }

        entries.push({
          employeeId: emp.id,
          employeeName: emp.full_name_en,
          position: emp.position || '',
          assignments,
        });
      }

      setCrewData(entries);
    } catch (error) {
      console.error('Failed to load crew schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, daysInMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const getCellData = (crew: CrewEntry, day: number) => {
    const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return crew.assignments.filter((a) => a.date === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) =>
    currentMonth.year === today.getFullYear() &&
    currentMonth.month === today.getMonth() &&
    day === today.getDate();

  const isWeekend = (day: number) => {
    const d = new Date(currentMonth.year, currentMonth.month, day);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  return (
    <HRAppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crew Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monthly view of crew assignments and availability.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-blue-200 border border-blue-300" />
            <span className="text-gray-600">Assigned to booking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-200 border border-red-300" />
            <span className="text-gray-600">On leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
            <span className="text-gray-600">Available</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : crewData.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No crew members found in Operations department.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
            <table className="min-w-max divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[160px]">
                    Crew Member
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className={`px-0.5 py-2 text-center text-xs font-medium min-w-[32px] ${
                        isToday(d)
                          ? 'bg-blue-100 text-blue-800'
                          : isWeekend(d)
                          ? 'bg-gray-100 text-gray-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {crewData.map((crew) => (
                  <tr key={crew.employeeId} className="hover:bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm border-r border-gray-100">
                      <div className="font-medium text-gray-900 truncate max-w-[150px]">
                        {crew.employeeName}
                      </div>
                      {crew.position && (
                        <div className="text-xs text-gray-400 truncate max-w-[150px]">
                          {crew.position}
                        </div>
                      )}
                    </td>
                    {days.map((d) => {
                      const cellData = getCellData(crew, d);
                      const hasBooking = cellData.some((a) => a.type === 'booking');
                      const hasLeave = cellData.some((a) => a.type === 'leave');
                      const hasConflict = hasBooking && hasLeave;
                      const boatLabel = cellData.find((a) => a.type === 'booking')?.label;

                      let bgClass = isWeekend(d) ? 'bg-gray-50' : 'bg-green-50';
                      if (hasConflict) bgClass = 'bg-amber-200';
                      else if (hasLeave) bgClass = 'bg-red-200';
                      else if (hasBooking) bgClass = 'bg-blue-200';

                      return (
                        <td
                          key={d}
                          className={`px-0.5 py-2 text-center ${bgClass} ${isToday(d) ? 'ring-1 ring-inset ring-blue-400' : ''}`}
                          title={
                            cellData.length > 0
                              ? cellData.map((a) => `${a.type === 'booking' ? '🚢' : '🏖️'} ${a.label}`).join(', ')
                              : 'Available'
                          }
                        >
                          {hasBooking && (
                            <span className="text-[9px] text-blue-700 font-medium leading-none">
                              {boatLabel && boatLabel.length > 3 ? boatLabel.substring(0, 3) : boatLabel}
                            </span>
                          )}
                          {hasLeave && !hasBooking && (
                            <span className="text-[9px] text-red-600 font-medium">L</span>
                          )}
                          {hasConflict && (
                            <span className="text-[9px] text-amber-700 font-bold">!</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </HRAppShell>
  );
}
