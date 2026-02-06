'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Ship, AlertTriangle, Loader2 } from 'lucide-react';
import { bookingStatusLabels, bookingStatusColors } from '@/data/booking/types';

interface PublicBooking {
  id: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  projectId: string | null;
  externalBoatName: string | null;
}

interface PublicProject {
  id: string;
  name: string;
  code: string;
}

interface CalendarData {
  bookings: PublicBooking[];
  projects: PublicProject[];
  linkLabel: string;
  visibleStatuses: string[];
  error?: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Default boat colors for public view
const PUBLIC_BOAT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function getDayOfWeekIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

interface BookingSegment {
  booking: PublicBooking;
  startCol: number;
  endCol: number;
  isStart: boolean;
  isEnd: boolean;
  row: number;
}

interface WeekData {
  weekStart: Date;
  days: Array<{ date: Date; dayOfMonth: number; isCurrentMonth: boolean } | null>;
  segments: BookingSegment[];
}

export default function PublicCalendarPage() {
  const params = useParams();
  const token = params.token as string;

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBoat, setSelectedBoat] = useState<string | null>(null);

  const minYear = now.getFullYear();
  const minMonth = now.getMonth() + 1;
  const canGoPrev = currentYear > minYear || (currentYear === minYear && currentMonth > minMonth);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/calendar/${token}?year=${currentYear}&month=${currentMonth}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load calendar');
        setData(null);
      } else if (json.error) {
        setError(json.error);
        setData(json);
      } else {
        setData(json);
      }
    } catch {
      setError('Failed to load calendar');
    } finally {
      setIsLoading(false);
    }
  }, [token, currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const boatColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!data) return map;
    data.projects.forEach((p, i) => {
      map.set(p.id, PUBLIC_BOAT_COLORS[i % PUBLIC_BOAT_COLORS.length]);
    });
    map.set('external', '#64748B');
    return map;
  }, [data]);

  const getBoatColor = (id: string) => boatColorMap.get(id) || '#64748B';

  // Filter bookings by selected boat
  const filteredBookings = useMemo(() => {
    if (!data) return [];
    if (!selectedBoat) return data.bookings;
    return data.bookings.filter((b) =>
      selectedBoat === 'external'
        ? !b.projectId
        : b.projectId === selectedBoat
    );
  }, [data, selectedBoat]);

  // Build calendar weeks
  const weeks = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    const firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstWeekStart.getDate() - startDayOfWeek);

    const weeksData: WeekData[] = [];
    let currentWeekStart = new Date(firstWeekStart);

    while (currentWeekStart <= lastDay || weeksData.length === 0) {
      const weekDays: WeekData['days'] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        if (d.getMonth() === currentMonth - 1) {
          weekDays.push({ date: d, dayOfMonth: d.getDate(), isCurrentMonth: true });
        } else {
          weekDays.push(null);
        }
      }

      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const segments: BookingSegment[] = [];
      const sorted = [...filteredBookings].sort((a, b) => {
        const sd = new Date(a.dateFrom).getTime() - new Date(b.dateFrom).getTime();
        if (sd !== 0) return sd;
        return (new Date(b.dateTo).getTime() - new Date(b.dateFrom).getTime()) -
               (new Date(a.dateTo).getTime() - new Date(a.dateFrom).getTime());
      });

      sorted.forEach((booking) => {
        const bStart = new Date(booking.dateFrom);
        const bEnd = new Date(booking.dateTo);
        if (bEnd >= currentWeekStart && bStart <= weekEnd) {
          let startCol = 0, endCol = 6, isStart = false, isEnd = false;
          if (bStart >= currentWeekStart && bStart <= weekEnd) {
            startCol = getDayOfWeekIndex(bStart);
            isStart = true;
          }
          if (bEnd >= currentWeekStart && bEnd <= weekEnd) {
            endCol = getDayOfWeekIndex(bEnd);
            isEnd = true;
          }

          const visibleDays = weekDays.filter((d) => d !== null);
          if (visibleDays.length > 0) {
            const firstVisible = weekDays.findIndex((d) => d !== null);
            const lastVisible = weekDays.length - 1 - [...weekDays].reverse().findIndex((d) => d !== null);
            startCol = Math.max(startCol, firstVisible);
            endCol = Math.min(endCol, lastVisible);

            if (startCol <= endCol) {
              let row = 0;
              const occupied = new Set<number>();
              segments.forEach((seg) => {
                if (!(seg.endCol < startCol || seg.startCol > endCol)) occupied.add(seg.row);
              });
              while (occupied.has(row)) row++;
              segments.push({ booking, startCol, endCol, isStart, isEnd, row });
            }
          }
        }
      });

      weeksData.push({ weekStart: new Date(currentWeekStart), days: weekDays, segments });
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    return weeksData;
  }, [currentYear, currentMonth, filteredBookings]);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isCurrentMonthView = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;
  const maxRows = Math.max(3, ...weeks.map((w) => Math.max(0, ...w.segments.map((s) => s.row + 1))));
  const ROW_HEIGHT = 26;

  const handlePrev = () => {
    if (!canGoPrev) return;
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Error state
  if (!isLoading && error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Calendar Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5A7A8F]/10 rounded-lg">
              <Ship className="h-6 w-6 text-[#5A7A8F]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Faraway Yachting</h1>
              {data?.linkLabel && (
                <p className="text-sm text-gray-500">{data.linkLabel}</p>
              )}
            </div>
          </div>
          <span className="text-xs text-gray-400">Availability Calendar</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Boat filter tabs */}
        {data && data.projects.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedBoat(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedBoat ? 'bg-[#5A7A8F] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Boats
            </button>
            {data.projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedBoat(project.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selectedBoat === project.id
                    ? 'text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
                style={selectedBoat === project.id ? { backgroundColor: getBoatColor(project.id) } : undefined}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getBoatColor(project.id) }}
                />
                {project.name}
              </button>
            ))}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrev}
                disabled={!canGoPrev}
                className={`p-2 rounded-lg transition-colors ${
                  canGoPrev ? 'hover:bg-gray-200 text-gray-600' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </h2>
              <button
                onClick={handleNext}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            {!isCurrentMonthView && (
              <button
                onClick={() => {
                  setCurrentYear(now.getFullYear());
                  setCurrentMonth(now.getMonth() + 1);
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Today
              </button>
            )}
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Calendar grid */}
          {!isLoading && (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    {day}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              <div className="divide-y divide-gray-100">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="relative">
                    <div className="grid grid-cols-7">
                      {week.days.map((day, dayIndex) => {
                        if (!day) {
                          return (
                            <div
                              key={`empty-${weekIndex}-${dayIndex}`}
                              className="min-h-[50px] bg-gray-50 border-r border-gray-100 last:border-r-0"
                            />
                          );
                        }
                        const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                        const isToday = dateStr === todayStr;
                        const isPast = isCurrentMonthView && dateStr < todayStr;

                        return (
                          <div
                            key={dateStr}
                            className={`min-h-[50px] p-1 border-r border-gray-100 last:border-r-0 ${
                              isToday ? 'bg-blue-50/50' : isPast ? 'bg-gray-50/80' : ''
                            }`}
                          >
                            <div className="px-1">
                              <span
                                className={`text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center ${
                                  isToday ? 'bg-blue-600 text-white' : isPast ? 'text-gray-400' : 'text-gray-900'
                                }`}
                              >
                                {day.dayOfMonth}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Booking segments */}
                    <div className="absolute left-0 right-0 pointer-events-none" style={{ top: '36px' }}>
                      {week.segments.map((segment, segIndex) => {
                        const boatId = segment.booking.projectId || 'external';
                        const boatColor = getBoatColor(boatId);
                        const statusLabel = (bookingStatusLabels as Record<string, string>)[segment.booking.status] || segment.booking.status;
                        const colWidth = 100 / 7;

                        return (
                          <div
                            key={`${segment.booking.id}-${weekIndex}-${segIndex}`}
                            className="absolute px-0.5"
                            style={{
                              left: `${segment.startCol * colWidth}%`,
                              width: `${(segment.endCol - segment.startCol + 1) * colWidth}%`,
                              top: `${segment.row * ROW_HEIGHT}px`,
                            }}
                          >
                            <div
                              className={`w-full px-2 py-0.5 text-xs font-semibold truncate ${
                                segment.isStart ? 'rounded-l-md' : ''
                              } ${segment.isEnd ? 'rounded-r-md' : ''}`}
                              style={{
                                backgroundColor: boatColor + '20',
                                borderColor: boatColor,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderLeftWidth: segment.isStart ? '1px' : '0',
                                borderRightWidth: segment.isEnd ? '1px' : '0',
                                color: boatColor,
                                height: `${ROW_HEIGHT - 2}px`,
                                lineHeight: `${ROW_HEIGHT - 4}px`,
                              }}
                            >
                              {statusLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Spacer */}
                    <div style={{ height: `${Math.max(maxRows, week.segments.length > 0 ? Math.max(...week.segments.map((s) => s.row + 1)) : 0) * ROW_HEIGHT + 8}px` }} />
                  </div>
                ))}
              </div>

              {/* Legend */}
              {data && (
                <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-gray-500 font-medium">Boats:</span>
                    {data.projects.map((project) => (
                      <div key={project.id} className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded border"
                          style={{
                            backgroundColor: getBoatColor(project.id) + '40',
                            borderColor: getBoatColor(project.id),
                          }}
                        />
                        <span className="text-xs text-gray-600">{project.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Status legend */}
        {data && (
          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
            <span className="font-medium">Status:</span>
            {data.visibleStatuses.map((status) => {
              const colors = (bookingStatusColors as Record<string, { bg: string; text: string }>)[status];
              const label = (bookingStatusLabels as Record<string, string>)[status] || status;
              return (
                <span
                  key={status}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors?.bg || 'bg-gray-100'} ${colors?.text || 'text-gray-600'}`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
