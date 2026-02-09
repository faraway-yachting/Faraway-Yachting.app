'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { useBookingSettings, CALENDAR_DISPLAY_FIELD_OPTIONS } from '@/contexts/BookingSettingsContext';

export function CalendarDisplayPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { calendarDisplay, setCalendarDisplayFields, saveSettings } = useBookingSettings();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const toggleField = (view: 'all' | 'boat', fieldKey: string) => {
    const currentFields = view === 'all' ? calendarDisplay.allBookingsFields : calendarDisplay.boatTabFields;
    const newFields = currentFields.includes(fieldKey)
      ? currentFields.filter(f => f !== fieldKey)
      : [...currentFields, fieldKey];
    setCalendarDisplayFields(view, newFields);

    // Debounced auto-save so rapid clicks batch into one API call
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSettings().catch(err => console.error('Failed to save display settings:', err));
    }, 500);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        title="Calendar display settings"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Calendar Display</h3>
            <p className="text-xs text-gray-500 mt-0.5">Choose fields to show on booking bars</p>
          </div>

          {/* All Bookings Tab */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">All Bookings Tab</p>
            <p className="text-xs text-gray-400 mb-2">Line 1: Status (always shown)</p>
            {CALENDAR_DISPLAY_FIELD_OPTIONS.map(({ key, label }) => (
              <label key={`all-${key}`} className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calendarDisplay.allBookingsFields.includes(key)}
                  onChange={() => toggleField('all', key)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {/* Boat Tab */}
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Boat Tab</p>
            <p className="text-xs text-gray-400 mb-2">Line 1: Status (always shown)</p>
            {CALENDAR_DISPLAY_FIELD_OPTIONS.map(({ key, label }) => (
              <label key={`boat-${key}`} className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calendarDisplay.boatTabFields.includes(key)}
                  onChange={() => toggleField('boat', key)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
