'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Booking, bookingStatusColors, bookingStatusLabels, bookingTypeLabels } from '@/data/booking/types';
import { Project } from '@/data/project/types';

export type CalendarViewMode = 'month' | 'week' | 'day';

interface BookingCalendarProps {
  year: number;
  month: number;
  bookings: Booking[];
  projects: Project[];
  viewMode: CalendarViewMode;
  onDateClick?: (date: string) => void;
  onBookingClick?: (booking: Booking) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  isAgencyView?: boolean;
  getBoatColor?: (boatId: string) => string;
  selectedBoatFilter?: string | null;
  allBookingsDisplayFields?: string[];
  boatTabDisplayFields?: string[];
  cabinCounts?: Map<string, { total: number; booked: number }>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Parse "YYYY-MM-DD" as local midnight (not UTC) to match week boundary dates */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Helper to convert date to day index within a week (Sun = 0, Sat = 6)
function getDayOfWeekIndex(date: Date): number {
  return date.getDay();
}

interface BookingSegment {
  booking: Booking;
  startCol: number; // 0-6 (Mon-Sun)
  endCol: number;   // 0-6 (Mon-Sun)
  isStart: boolean; // Is this the start of the booking?
  isEnd: boolean;   // Is this the end of the booking?
  row: number;      // Which row within the week (for stacking)
}

interface WeekData {
  weekStart: Date;
  days: Array<{ date: Date; dayOfMonth: number; isCurrentMonth: boolean } | null>;
  segments: BookingSegment[];
}

export function BookingCalendar({
  year,
  month,
  bookings,
  projects,
  viewMode,
  onDateClick,
  onBookingClick,
  onPrevMonth,
  onNextMonth,
  isAgencyView = false,
  getBoatColor,
  selectedBoatFilter = null,
  allBookingsDisplayFields = ['title'],
  boatTabDisplayFields = ['title'],
  cabinCounts,
}: BookingCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Create project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  // Get boat name for a booking
  const getBoatName = (booking: Booking): string => {
    if (booking.externalBoatName) return booking.externalBoatName;
    if (booking.projectId) {
      const project = projectMap.get(booking.projectId);
      return project?.name || 'Unknown Boat';
    }
    return 'External';
  };

  // Get display value for a booking field
  const getFieldValue = (booking: Booking, field: string, pMap: Map<string, Project>): string => {
    switch (field) {
      case 'title': return booking.title || '';
      case 'boatName': return getBoatName(booking);
      case 'customerName': return booking.customerName || '';
      case 'bookingType': return bookingTypeLabels[booking.type] || booking.type || '';
      case 'time': return booking.time || '';
      case 'totalPrice': return booking.totalPrice ? `${booking.currency || 'THB'} ${booking.totalPrice.toLocaleString()}` : '';
      case 'paymentStatus': return booking.paymentStatus || '';
      case 'destination': return booking.destination || '';
      case 'numberOfGuests': return booking.numberOfGuests ? `${booking.numberOfGuests} guests` : '';
      case 'bookingOwner': return booking.bookingOwnerName || '';
      case 'extras': return booking.extras?.length ? booking.extras.join(', ') : '';
      case 'contractNote': return booking.contractNote || '';
      case 'meetAndGreeter': return booking.meetAndGreeter || '';
      case 'cabinSummary': {
        if (booking.type !== 'cabin_charter' || !cabinCounts) return '';
        const counts = cabinCounts.get(booking.id);
        if (!counts) return '';
        return `${counts.booked}/${counts.total} cabins`;
      }
      default: return '';
    }
  };

  // Calculate weeks with booking segments
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Find the Sunday of the first week
    const startDayOfWeek = firstDay.getDay();
    const firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstWeekStart.getDate() - startDayOfWeek);

    const weeksData: WeekData[] = [];
    let currentWeekStart = new Date(firstWeekStart);

    // Generate weeks until we pass the last day of the month
    while (currentWeekStart <= lastDay || weeksData.length === 0) {
      const weekDays: WeekData['days'] = [];

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentDate.getDate() + i);

        const isCurrentMonth = currentDate.getMonth() === month - 1;

        if (isCurrentMonth) {
          weekDays.push({
            date: currentDate,
            dayOfMonth: currentDate.getDate(),
            isCurrentMonth: true,
          });
        } else {
          weekDays.push(null);
        }
      }

      // Calculate booking segments for this week
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const segments: BookingSegment[] = [];

      // Sort bookings by start date, then by duration (longer first)
      const sortedBookings = [...bookings].sort((a, b) => {
        const startDiff = parseLocalDate(a.dateFrom).getTime() - parseLocalDate(b.dateFrom).getTime();
        if (startDiff !== 0) return startDiff;
        // Longer bookings first
        const durationA = parseLocalDate(a.dateTo).getTime() - parseLocalDate(a.dateFrom).getTime();
        const durationB = parseLocalDate(b.dateTo).getTime() - parseLocalDate(b.dateFrom).getTime();
        return durationB - durationA;
      });

      sortedBookings.forEach((booking) => {
        const bookingStart = parseLocalDate(booking.dateFrom);
        const bookingEnd = parseLocalDate(booking.dateTo);

        // Check if booking overlaps with this week
        const weekStartDate = new Date(currentWeekStart);

        if (bookingEnd >= weekStartDate && bookingStart <= weekEnd) {
          // Calculate which columns this booking spans in this week
          let startCol = 0;
          let endCol = 6;
          let isStart = false;
          let isEnd = false;

          // If booking starts this week
          if (bookingStart >= weekStartDate && bookingStart <= weekEnd) {
            startCol = getDayOfWeekIndex(bookingStart);
            isStart = true;
          }

          // If booking ends this week
          if (bookingEnd >= weekStartDate && bookingEnd <= weekEnd) {
            endCol = getDayOfWeekIndex(bookingEnd);
            isEnd = true;
          }

          // Only include if within the current month's visible days
          const visibleDays = weekDays.filter(d => d !== null);
          if (visibleDays.length > 0) {
            const firstVisibleCol = weekDays.findIndex(d => d !== null);
            const lastVisibleCol = weekDays.length - 1 - [...weekDays].reverse().findIndex(d => d !== null);

            // Clamp to visible columns
            startCol = Math.max(startCol, firstVisibleCol);
            endCol = Math.min(endCol, lastVisibleCol);

            if (startCol <= endCol) {
              // Find available row
              let row = 0;
              const occupiedRows = new Set<number>();

              segments.forEach(seg => {
                // Check if this segment overlaps with our columns
                if (!(seg.endCol < startCol || seg.startCol > endCol)) {
                  occupiedRows.add(seg.row);
                }
              });

              while (occupiedRows.has(row)) {
                row++;
              }

              segments.push({
                booking,
                startCol,
                endCol,
                isStart,
                isEnd,
                row,
              });
            }
          }
        }
      });

      weeksData.push({
        weekStart: new Date(currentWeekStart),
        days: weekDays,
        segments,
      });

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeksData;
  }, [year, month, bookings]);

  // Check if date is today
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Calculate the max rows needed per week for consistent height
  const maxRows = Math.max(3, ...weeks.map(w => Math.max(0, ...w.segments.map(s => s.row + 1))));

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <button
            onClick={onPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            onClick={onNextMonth}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // This would need to be handled by parent component
            }}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - by weeks */}
      <div className="divide-y divide-gray-100">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="relative">
            {/* Day cells */}
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
                const isToday = dateStr === today;
                const isHovered = hoveredDate === dateStr;

                return (
                  <div
                    key={dateStr}
                    className={`
                      min-h-[50px] p-1 border-r border-gray-100 last:border-r-0 transition-colors relative group cursor-pointer
                      ${isToday ? 'bg-blue-50/50' : ''}
                      ${isHovered ? 'bg-gray-50' : ''}
                    `}
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={() => onDateClick?.(dateStr)}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between px-1">
                      <span
                        className={`
                          text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center
                          ${isToday ? 'bg-blue-600 text-white' : 'text-gray-900'}
                        `}
                      >
                        {day.dayOfMonth}
                      </span>
                      {/* Add button on hover */}
                      {isHovered && onDateClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDateClick(dateStr);
                          }}
                          className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Booking segments - positioned absolutely over the week */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{ top: '36px' }}
            >
              {week.segments.map((segment, segIndex) => {
                // Get boat color - use projectId if available, otherwise 'external'
                const boatId = segment.booking.projectId || 'external';
                const boatColor = getBoatColor ? getBoatColor(boatId) : '#3B82F6';

                // Determine which extra fields to show
                const isBoatTab = selectedBoatFilter !== null && selectedBoatFilter !== 'external';
                const extraFields = isBoatTab ? boatTabDisplayFields : allBookingsDisplayFields;
                const statusLabel = bookingStatusLabels[segment.booking.status] || segment.booking.status;

                // Row height: base 24px for status + 20px per extra field + 4px padding
                const rowHeight = 28 + (extraFields.length * 20);

                // Calculate position
                const colWidth = 100 / 7;
                const left = segment.startCol * colWidth;
                const width = (segment.endCol - segment.startCol + 1) * colWidth;
                const top = segment.row * rowHeight;

                return (
                  <div
                    key={`${segment.booking.id}-${weekIndex}-${segIndex}`}
                    className="absolute pointer-events-auto px-0.5"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      top: `${top}px`,
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onBookingClick?.(segment.booking)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onBookingClick?.(segment.booking); }}
                      className={`
                        w-full text-left px-2 py-0.5 text-sm transition-all cursor-pointer
                        hover:shadow-sm hover:brightness-95
                        ${segment.isStart ? 'rounded-l-md' : 'rounded-l-none'}
                        ${segment.isEnd ? 'rounded-r-md' : 'rounded-r-none'}
                      `}
                      style={{
                        backgroundColor: boatColor + '20',
                        borderLeft: segment.isStart ? `4px solid ${boatColor}` : 'none',
                        height: `${rowHeight - 2}px`,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Line 1: Status (always) */}
                      <div className="flex items-center gap-1" style={{ height: '22px' }}>
                        {!isBoatTab && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: boatColor }}
                          />
                        )}
                        <span
                          className="truncate font-semibold"
                          style={{ color: '#111827' }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      {/* Extra fields - show on all segments so multi-day bookings display text */}
                      {extraFields.map((field) => {
                        const value = getFieldValue(segment.booking, field, projectMap);
                        if (!value) return null;
                        return (
                          <div
                            key={field}
                            className="truncate"
                            style={{ color: '#4B5563', height: '20px', lineHeight: '20px' }}
                          >
                            {value}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Spacer for booking rows */}
            <div style={{ height: `${Math.max(maxRows, week.segments.length > 0 ? Math.max(...week.segments.map(s => s.row + 1)) : 0) * (28 + ((selectedBoatFilter !== null && selectedBoatFilter !== 'external' ? boatTabDisplayFields : allBookingsDisplayFields).length * 20)) + 8}px` }} />
          </div>
        ))}
      </div>

      {/* Legend - Boat Colors */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Boats:</span>
          {/* External/Other */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded border"
              style={{
                backgroundColor: getBoatColor ? getBoatColor('external') + '40' : '#64748B40',
                borderColor: getBoatColor ? getBoatColor('external') : '#64748B',
              }}
            />
            <span className="text-xs text-gray-600">Other</span>
          </div>
          {/* Project boats */}
          {projects.map((project) => (
            <div key={project.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded border"
                style={{
                  backgroundColor: getBoatColor ? getBoatColor(project.id) + '40' : '#3B82F640',
                  borderColor: getBoatColor ? getBoatColor(project.id) : '#3B82F6',
                }}
              />
              <span className="text-xs text-gray-600">{project.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
