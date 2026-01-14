'use client';

import { CalendarViewMode } from './BookingCalendar';

interface CalendarViewToggleProps {
  viewMode: CalendarViewMode;
  onChange: (mode: CalendarViewMode) => void;
}

export function CalendarViewToggle({ viewMode, onChange }: CalendarViewToggleProps) {
  const modes: { id: CalendarViewMode; label: string }[] = [
    { id: 'month', label: 'Month' },
    { id: 'week', label: 'Week' },
    { id: 'day', label: 'Day' },
  ];

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-all
            ${viewMode === mode.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
