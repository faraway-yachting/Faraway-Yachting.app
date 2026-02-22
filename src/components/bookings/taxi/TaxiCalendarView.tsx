'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TaxiTransfer, TransferStatus, transferStatusColors } from '@/data/taxi/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface CalendarTransfer {
  id: string;
  tripType: string;
  status: string;
  guestName: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
}

interface TransferEntry<T extends CalendarTransfer> {
  transfer: T;
  type: 'pickup' | 'return';
  time?: string;
}

const defaultStatusColor = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

interface TaxiCalendarViewProps<T extends CalendarTransfer = TaxiTransfer> {
  transfers: T[];
  onTransferClick: (transfer: T) => void;
}

export function TaxiCalendarView<T extends CalendarTransfer = TaxiTransfer>({ transfers, onTransferClick }: TaxiCalendarViewProps<T>) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);

  const goToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  const goPrev = () => {
    if (currentMonth === 1) { setCurrentYear(y => y - 1); setCurrentMonth(12); }
    else setCurrentMonth(m => m - 1);
  };

  const goNext = () => {
    if (currentMonth === 12) { setCurrentYear(y => y + 1); setCurrentMonth(1); }
    else setCurrentMonth(m => m + 1);
  };

  // Build date -> entries map
  const dateMap = useMemo(() => {
    const map = new Map<string, TransferEntry<T>[]>();
    const addEntry = (date: string | undefined, entry: TransferEntry<T>) => {
      if (!date) return;
      const existing = map.get(date) || [];
      existing.push(entry);
      map.set(date, existing);
    };

    transfers.forEach(t => {
      if (t.tripType !== 'return_only' && t.pickupDate) {
        addEntry(t.pickupDate, { transfer: t, type: 'pickup', time: t.pickupTime });
      }
      if (t.tripType !== 'pickup_only' && t.returnDate) {
        addEntry(t.returnDate, { transfer: t, type: 'return', time: t.returnTime });
      }
    });

    // Sort entries within each day by time
    map.forEach((entries) => {
      entries.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });

    return map;
  }, [transfers]);

  // Build calendar grid
  const weeks = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startDayOfWeek = firstDay.getDay();

    const result: Array<Array<{ date: Date; dayOfMonth: number; isCurrentMonth: boolean } | null>> = [];
    let currentWeekStart = new Date(firstDay);
    currentWeekStart.setDate(currentWeekStart.getDate() - startDayOfWeek);

    while (currentWeekStart <= lastDay || result.length === 0) {
      const week: typeof result[0] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        if (d.getMonth() === currentMonth - 1) {
          week.push({ date: d, dayOfMonth: d.getDate(), isCurrentMonth: true });
        } else {
          week.push(null);
        }
      }
      result.push(week);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return result;
  }, [currentYear, currentMonth]);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const formatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <button onClick={goPrev} className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h3>
          <button
            onClick={goToToday}
            className="px-2 py-0.5 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
          >
            Today
          </button>
        </div>
        <button onClick={goNext} className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAYS.map(day => (
          <div key={day} className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 bg-gray-50">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="min-h-[100px] bg-gray-50/50 border-r border-gray-100 last:border-r-0" />;
              }

              const dateStr = formatDateStr(day.date);
              const entries = dateMap.get(dateStr) || [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={di}
                  className={`min-h-[100px] border-r border-gray-100 last:border-r-0 p-1 ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                  {/* Day number */}
                  <div className={`text-xs font-medium mb-0.5 px-1 ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                    {day.dayOfMonth}
                  </div>

                  {/* Transfer entries */}
                  <div className="space-y-0.5">
                    {entries.slice(0, 4).map((entry, ei) => {
                      const statusColor = transferStatusColors[entry.transfer.status as TransferStatus] || defaultStatusColor;
                      return (
                        <button
                          key={`${entry.transfer.id}-${entry.type}-${ei}`}
                          onClick={() => onTransferClick(entry.transfer)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate border-l-2 hover:opacity-80 transition-opacity ${
                            entry.type === 'pickup'
                              ? 'bg-blue-50 border-l-blue-500'
                              : 'bg-orange-50 border-l-orange-500'
                          }`}
                          title={`${entry.type === 'pickup' ? 'Pick-up' : 'Return'}: ${entry.transfer.guestName}${entry.time ? ` at ${entry.time}` : ''}`}
                        >
                          <span className="flex items-center gap-1">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor.bg} ${statusColor.border} border`} />
                            <span className="truncate">
                              {entry.time && <span className="font-medium">{entry.time} </span>}
                              {entry.transfer.guestName}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    {entries.length > 4 && (
                      <div className="text-[10px] text-gray-400 px-1">+{entries.length - 4} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 bg-blue-50 border-l-2 border-l-blue-500 rounded-sm" />
          <span className="text-[11px] text-gray-500">Pick-up</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 bg-orange-50 border-l-2 border-l-orange-500 rounded-sm" />
          <span className="text-[11px] text-gray-500">Return</span>
        </div>
      </div>
    </div>
  );
}
