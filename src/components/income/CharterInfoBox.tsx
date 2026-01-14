'use client';

import { useEffect } from 'react';
import { Ship, Calendar, RefreshCw } from 'lucide-react';
import type { CharterType } from '@/data/income/types';
import { charterTypeLabels, singleDayCharterTypes } from '@/data/income/types';
import type { Project } from '@/data/project/types';

// Project codes that represent agency/commission bookings (not physical boats)
// When these are selected, show the External Boat Name field
const AGENCY_PROJECT_CODES = ['FA'];

interface CharterInfoBoxProps {
  boatId: string;
  charterType: CharterType | '';
  charterDateFrom: string;
  charterDateTo: string;
  charterTime: string;
  externalBoatName?: string;
  projects: Project[];
  disabled?: boolean;
  onBoatChange: (boatId: string) => void;
  onCharterTypeChange: (type: CharterType | '') => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onExternalBoatNameChange?: (name: string) => void;
  onUpdateDescription?: () => void;
  onAddToBooking?: () => void;
}

export function CharterInfoBox({
  boatId,
  charterType,
  charterDateFrom,
  charterDateTo,
  charterTime,
  externalBoatName = '',
  projects,
  disabled = false,
  onBoatChange,
  onCharterTypeChange,
  onDateFromChange,
  onDateToChange,
  onTimeChange,
  onExternalBoatNameChange,
  onUpdateDescription,
  onAddToBooking,
}: CharterInfoBoxProps) {
  // Auto-set dateTo when dateFrom changes for single-day charter types
  useEffect(() => {
    if (charterType && singleDayCharterTypes.includes(charterType as CharterType)) {
      if (charterDateFrom && charterDateTo !== charterDateFrom) {
        onDateToChange(charterDateFrom);
      }
    }
  }, [charterDateFrom, charterType, charterDateTo, onDateToChange]);

  // Auto-set dateTo when charter type changes to single-day
  useEffect(() => {
    if (charterType && singleDayCharterTypes.includes(charterType as CharterType)) {
      if (charterDateFrom) {
        onDateToChange(charterDateFrom);
      }
    }
  }, [charterType, charterDateFrom, onDateToChange]);

  const isSingleDay = !!charterType && singleDayCharterTypes.includes(charterType as CharterType);

  // Check if selected boat is an agency project (requires external boat name)
  const selectedProject = projects.find(p => p.id === boatId);
  const isAgencyBooking = selectedProject && AGENCY_PROJECT_CODES.includes(selectedProject.code);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ship className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Charter Information</span>
          <span className="text-xs text-blue-500">(Optional)</span>
        </div>
        <div className="flex items-center gap-2">
          {onUpdateDescription && (
            <button
              type="button"
              onClick={onUpdateDescription}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Update description with charter info"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Update Description
            </button>
          )}
          {onAddToBooking && (
            <button
              type="button"
              onClick={onAddToBooking}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calendar className="h-3.5 w-3.5" />
              Add to Booking Calendar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Boat Selector (with External Boat Name underneath for agency bookings) */}
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">
            Boat
          </label>
          <select
            value={boatId}
            onChange={(e) => onBoatChange(e.target.value)}
            disabled={disabled}
            className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-blue-100 disabled:cursor-not-allowed"
          >
            <option value="">Select boat...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
          {/* External Boat Name (shown under Boat for agency bookings) */}
          {isAgencyBooking && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-blue-700 mb-1">
                External Boat Name
              </label>
              <input
                type="text"
                value={externalBoatName}
                onChange={(e) => onExternalBoatNameChange?.(e.target.value)}
                placeholder="Enter boat name..."
                disabled={disabled}
                className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-blue-100 disabled:cursor-not-allowed placeholder:text-blue-300"
              />
            </div>
          )}
        </div>

        {/* Charter Type */}
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">
            Charter Type
          </label>
          <select
            value={charterType}
            onChange={(e) => onCharterTypeChange(e.target.value as CharterType | '')}
            disabled={disabled}
            className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-blue-100 disabled:cursor-not-allowed"
          >
            <option value="">Select type...</option>
            {Object.entries(charterTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Charter Date From */}
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">
            Charter Date From
          </label>
          <input
            type="date"
            value={charterDateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            disabled={disabled}
            className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-blue-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Charter Date To */}
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">
            Charter Date To
          </label>
          <input
            type="date"
            value={charterDateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            disabled={disabled || isSingleDay}
            min={charterDateFrom || undefined}
            className={`w-full px-2 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-blue-100 disabled:cursor-not-allowed ${
              isSingleDay ? 'text-gray-500' : ''
            }`}
          />
          {isSingleDay && (
            <p className="text-xs text-blue-500 mt-0.5">Same as from date</p>
          )}
        </div>

        {/* Charter Time */}
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">
            Charter Time
          </label>
          <input
            type="text"
            value={charterTime}
            onChange={(e) => onTimeChange(e.target.value)}
            placeholder="e.g., 09:00 - 17:00"
            disabled={disabled}
            className="w-full px-2 py-1.5 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-blue-100 disabled:cursor-not-allowed placeholder:text-blue-300"
          />
        </div>
      </div>
    </div>
  );
}
