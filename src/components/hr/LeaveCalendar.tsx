'use client';

import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { leaveRequestsApi, type LeaveRequest } from '@/lib/supabase/api/leaveRequests';

const COLORS = [
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-purple-200 text-purple-800',
  'bg-orange-200 text-orange-800',
  'bg-pink-200 text-pink-800',
  'bg-teal-200 text-teal-800',
];

export default function LeaveCalendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-indexed
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
        const data = await leaveRequestsApi.getForCalendar(startDate, endDate);
        setLeaves(data);
      } catch (error) {
        console.error('Failed to load calendar:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month]);

  const goNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = new Array(firstDayOfMonth).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Map employee_id to color
  const empColorMap = new Map<string, string>();
  let colorIdx = 0;
  leaves.forEach(l => {
    if (!empColorMap.has(l.employee_id)) {
      empColorMap.set(l.employee_id, COLORS[colorIdx % COLORS.length]);
      colorIdx++;
    }
  });

  const getLeavesForDay = (day: number): LeaveRequest[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leaves.filter(l => l.start_date <= dateStr && l.end_date >= dateStr);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <button onClick={goPrev} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="text-base font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h3>
        <button onClick={goNext} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                const dayLeaves = day ? getLeavesForDay(day) : [];
                const isToday = day &&
                  year === new Date().getFullYear() &&
                  month === new Date().getMonth() &&
                  day === new Date().getDate();

                return (
                  <div
                    key={`${wi}-${di}`}
                    className={`min-h-[80px] bg-white p-1 ${!day ? 'bg-gray-50' : ''}`}
                  >
                    {day && (
                      <>
                        <span className={`text-xs font-medium ${isToday ? 'bg-[#5A7A8F] text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-600'}`}>
                          {day}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {dayLeaves.slice(0, 3).map(l => (
                            <div
                              key={l.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate ${empColorMap.get(l.employee_id) || 'bg-gray-200 text-gray-800'}`}
                              title={`${l.employee?.full_name_en || 'Employee'} — ${l.leave_type?.name || 'Leave'}`}
                            >
                              {l.employee?.nickname || l.employee?.full_name_en?.split(' ')[0] || '?'}
                            </div>
                          ))}
                          {dayLeaves.length > 3 && (
                            <div className="text-[10px] text-gray-400 px-1">+{dayLeaves.length - 3} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Legend */}
          {leaves.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from(empColorMap.entries()).map(([empId, color]) => {
                const leave = leaves.find(l => l.employee_id === empId);
                return (
                  <span key={empId} className={`text-xs px-2 py-0.5 rounded ${color}`}>
                    {leave?.employee?.full_name_en || 'Employee'}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
