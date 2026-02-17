'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Ship,
  Calendar,
  Sparkles,
  X,
  User,
  UserCheck,
  Plus,
  Phone,
  Mail,
  ChevronDown,
  CheckCircle2,
  Circle,
  Search,
} from 'lucide-react';
import {
  Booking,
  BookingStatus,
  BookingType,
} from '@/data/booking/types';
import { Project } from '@/data/project/types';
import { DynamicSelect } from './DynamicSelect';
import { MeetGreeter } from '@/lib/supabase/api/meetGreeters';

// Time presets now loaded dynamically via DynamicSelect

interface HeaderSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  errors: Record<string, string>;
  canEdit: boolean;
  projects: Project[];
  externalBoats: { id: string; name: string; displayName?: string }[];
  useExternalBoat: boolean;
  onUseExternalBoatChange: (val: boolean) => void;
  selectedProduct: any | null;
  onClearProduct: () => void;
  autoFilledFields: Set<string>;
  users: { id: string; full_name: string }[];
  meetGreeters: MeetGreeter[];
  onCreateMeetGreeter: (name: string, phone: string, email: string) => Promise<MeetGreeter | null>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
  cabinCounts?: { total: number; booked: number; held: number };
}

export function HeaderSection({
  formData,
  onChange,
  errors,
  canEdit,
  projects,
  externalBoats,
  useExternalBoat,
  onUseExternalBoatChange,
  selectedProduct,
  onClearProduct,
  autoFilledFields,
  users,
  meetGreeters,
  onCreateMeetGreeter,
  isCollapsed,
  onToggleCollapse,
  isCompleted,
  onToggleCompleted,
  cabinCounts,
}: HeaderSectionProps) {
  const [holdUntilMode, setHoldUntilMode] = useState<'days' | 'manual'>('days');
  const [holdDays, setHoldDays] = useState<number>(3);

  // Meet & Greeter form state
  // External boat search state
  const [boatSearch, setBoatSearch] = useState('');
  const [boatDropdownOpen, setBoatDropdownOpen] = useState(false);
  const boatDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boatDropdownRef.current && !boatDropdownRef.current.contains(e.target as Node)) {
        setBoatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [showNewGreeterForm, setShowNewGreeterForm] = useState(false);
  const [newGreeterName, setNewGreeterName] = useState('');
  const [newGreeterPhone, setNewGreeterPhone] = useState('');
  const [newGreeterEmail, setNewGreeterEmail] = useState('');
  const [isCreatingGreeter, setIsCreatingGreeter] = useState(false);

  // Get selected meet greeter details
  const selectedGreeter = meetGreeters.find(g => g.id === formData.meetGreeterId);

  const handleCreateGreeter = async () => {
    if (!newGreeterName.trim()) return;
    setIsCreatingGreeter(true);
    try {
      const newGreeter = await onCreateMeetGreeter(
        newGreeterName.trim(),
        newGreeterPhone.trim(),
        newGreeterEmail.trim()
      );
      if (newGreeter) {
        onChange('meetGreeterId', newGreeter.id);
        setNewGreeterName('');
        setNewGreeterPhone('');
        setNewGreeterEmail('');
        setShowNewGreeterForm(false);
      }
    } finally {
      setIsCreatingGreeter(false);
    }
  };

  // Auto-calculate holdUntil when status changes to 'hold' and mode is 'days'
  useEffect(() => {
    if (formData.status === 'hold' && holdUntilMode === 'days' && !formData.holdUntil) {
      const holdDate = new Date();
      holdDate.setDate(holdDate.getDate() + holdDays);
      onChange('holdUntil', holdDate.toISOString());
    }
  }, [formData.status, holdUntilMode, holdDays, formData.holdUntil, onChange]);

  const getAutoFillClass = (field: string) => {
    return autoFilledFields.has(field) ? 'bg-blue-50 ring-2 ring-blue-200' : '';
  };

  return (
    <div className="bg-blue-50 rounded-lg p-4">
      <div
        className={`flex items-center justify-between px-3 py-2 -mx-4 -mt-4 rounded-t-lg bg-blue-100 cursor-pointer select-none ${
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
          <Ship className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-800">Header</h3>
        </div>
        {onToggleCollapse && (
          <ChevronDown className={`h-4 w-4 text-blue-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
        )}
      </div>

      {!isCollapsed && <div className="space-y-4">
        {/* Boat + Charter Type */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3">
            <label className="block text-xs text-gray-500 mb-2">Boat</label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useExternalBoat}
                  onChange={() => onUseExternalBoatChange(false)}
                  disabled={!canEdit}
                  className="text-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
                <span className="text-sm text-gray-700">Owned Yacht</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useExternalBoat}
                  onChange={() => onUseExternalBoatChange(true)}
                  disabled={!canEdit}
                  className="text-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
                <span className="text-sm text-gray-700">External Boat</span>
              </label>
            </div>

            {!useExternalBoat ? (
              <select
                value={formData.projectId || ''}
                onChange={(e) => onChange('projectId', e.target.value || undefined)}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                  errors.projectId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a boat...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            ) : (
              <div ref={boatDropdownRef} className="relative">
                <div
                  onClick={() => canEdit && setBoatDropdownOpen(!boatDropdownOpen)}
                  className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between cursor-pointer ${
                    !canEdit ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                  } ${errors.externalBoatName ? 'border-red-500' : 'border-gray-300'} ${
                    boatDropdownOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''
                  }`}
                >
                  {formData.externalBoatName ? (
                    <span className="text-gray-900 truncate">
                      {(() => {
                        const selected = externalBoats.find(b => b.name === formData.externalBoatName);
                        if (selected?.displayName && selected.displayName !== selected.name) {
                          return <>{selected.displayName} <span className="text-gray-400 text-xs">({selected.name})</span></>;
                        }
                        return selected?.displayName || formData.externalBoatName;
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-400">Select external boat...</span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${boatDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                {boatDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 flex flex-col">
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={boatSearch}
                          onChange={(e) => setBoatSearch(e.target.value)}
                          placeholder="Search boats..."
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      <div
                        onClick={() => {
                          onChange('externalBoatName', '');
                          setBoatDropdownOpen(false);
                          setBoatSearch('');
                        }}
                        className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                      >
                        Select external boat...
                      </div>
                      {externalBoats
                        .filter(boat => {
                          if (!boatSearch) return true;
                          const q = boatSearch.toLowerCase();
                          return (
                            boat.name.toLowerCase().includes(q) ||
                            (boat.displayName?.toLowerCase().includes(q))
                          );
                        })
                        .map((boat) => (
                          <div
                            key={boat.id}
                            onClick={() => {
                              onChange('externalBoatName', boat.name);
                              setBoatDropdownOpen(false);
                              setBoatSearch('');
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                              formData.externalBoatName === boat.name ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                            }`}
                          >
                            <span className="font-medium">{boat.displayName || boat.name}</span>
                            {boat.displayName && boat.displayName !== boat.name && (
                              <span className="text-gray-400 text-xs ml-1.5">({boat.name})</span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {(errors.projectId || errors.externalBoatName) && (
              <p className="text-sm text-red-500 mt-1">{errors.projectId || errors.externalBoatName}</p>
            )}
          </div>

          <div className="col-span-2 flex flex-col justify-end">
            <label className="block text-xs text-gray-500 mb-1">Charter Type</label>
            <DynamicSelect
              category="charter_type"
              value={formData.type || 'day_charter'}
              onChange={(val) => onChange('type', val as BookingType)}
              disabled={!canEdit}
              placeholder="Select charter type..."
            />
          </div>
        </div>

        {/* Product preset indicator */}
        {selectedProduct && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Sparkles className="h-4 w-4" />
            <span>
              Applied preset: <strong>{selectedProduct.name}</strong>
            </span>
            <button
              type="button"
              onClick={onClearProduct}
              className="ml-auto text-blue-500 hover:text-blue-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Dates */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Dates
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.dateFrom || ''}
                onChange={(e) => onChange('dateFrom', e.target.value)}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                  errors.dateFrom ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.dateFrom && <p className="text-sm text-red-500 mt-1">{errors.dateFrom}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.dateTo || ''}
                onChange={(e) => onChange('dateTo', e.target.value)}
                disabled={!canEdit || formData.type === 'day_charter'}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                  errors.dateTo ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.dateTo && <p className="text-sm text-red-500 mt-1">{errors.dateTo}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Time</label>
              <DynamicSelect
                category="time_preset"
                value={formData.time || ''}
                onChange={(val) => onChange('time', val)}
                disabled={!canEdit}
                placeholder="Select time..."
                className={getAutoFillClass('time')}
                allowCustomInput
                allowEditOptions
              />
            </div>
          </div>
        </div>

        {/* Booking Status */}
        <div className="bg-white/60 border border-blue-200 rounded-lg p-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Booking Status</label>
          <DynamicSelect
            category="booking_status"
            value={formData.status || 'enquiry'}
            onChange={(val) => onChange('status', val as BookingStatus)}
            disabled={!canEdit}
            placeholder="Select status..."
          />
          {cabinCounts && cabinCounts.total > 0 && (
            <p className="text-xs text-gray-500 mt-1.5">
              {cabinCounts.booked}/{cabinCounts.total} cabins booked
              {cabinCounts.held > 0 && `, ${cabinCounts.held} held`}
            </p>
          )}
        </div>

        {/* Booking Owner + Meet & Greeter */}
        <div className={`grid ${formData.type === 'cabin_charter' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          {formData.type !== 'cabin_charter' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Booking Owner
              </label>
              <select
                value={formData.bookingOwner || ''}
                onChange={(e) => onChange('bookingOwner', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select owner...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5" />
              Meet & Greeter
            </label>
            <div className="relative">
              <select
                value={formData.meetGreeterId || ''}
                onChange={(e) => onChange('meetGreeterId', e.target.value || undefined)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select meet & greeter...</option>
                {meetGreeters.filter(g => g.is_active).map((greeter) => (
                  <option key={greeter.id} value={greeter.id}>
                    {greeter.name}
                  </option>
                ))}
              </select>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowNewGreeterForm(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#5A7A8F] hover:bg-blue-50 rounded transition-colors"
                  title="Add new meet & greeter"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Contact details */}
            {selectedGreeter && (
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                {selectedGreeter.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {selectedGreeter.phone}
                  </span>
                )}
                {selectedGreeter.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {selectedGreeter.email}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* New Meet & Greeter Form */}
        {showNewGreeterForm && (
          <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add New Meet & Greeter
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name *</label>
                <input
                  type="text"
                  value={newGreeterName}
                  onChange={(e) => setNewGreeterName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newGreeterPhone}
                  onChange={(e) => setNewGreeterPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={newGreeterEmail}
                  onChange={(e) => setNewGreeterEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleCreateGreeter}
                disabled={!newGreeterName.trim() || isCreatingGreeter}
                className="px-3 py-1.5 bg-[#5A7A8F] text-white text-sm rounded-lg hover:bg-[#4a6a7f] disabled:opacity-50 flex items-center gap-1"
              >
                {isCreatingGreeter ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    Create & Select
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewGreeterForm(false);
                  setNewGreeterName('');
                  setNewGreeterPhone('');
                  setNewGreeterEmail('');
                }}
                className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Hold Until Section */}
        {formData.status === 'hold' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Hold Until
            </label>

            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={holdUntilMode === 'days'}
                  onChange={() => setHoldUntilMode('days')}
                  disabled={!canEdit}
                  className="text-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
                <span className="text-sm text-gray-700">Select Days</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={holdUntilMode === 'manual'}
                  onChange={() => setHoldUntilMode('manual')}
                  disabled={!canEdit}
                  className="text-[#5A7A8F] focus:ring-[#5A7A8F]"
                />
                <span className="text-sm text-gray-700">Manual Entry</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {holdUntilMode === 'days' ? 'Number of Days' : 'Date & Time'}
                </label>
                {holdUntilMode === 'days' ? (
                  <select
                    value={holdDays}
                    onChange={(e) => {
                      const days = parseInt(e.target.value);
                      setHoldDays(days);
                      const holdDate = new Date();
                      holdDate.setDate(holdDate.getDate() + days);
                      onChange('holdUntil', holdDate.toISOString());
                    }}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <option key={day} value={day}>
                        {day} {day === 1 ? 'day' : 'days'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="datetime-local"
                    value={formData.holdUntil ? formData.holdUntil.slice(0, 16) : ''}
                    onChange={(e) =>
                      onChange('holdUntil', e.target.value ? new Date(e.target.value).toISOString() : undefined)
                    }
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hold Expires On</label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 font-medium">
                  {formData.holdUntil ? (
                    new Date(formData.holdUntil).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  ) : (
                    <span className="text-gray-400">Not set</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">The booking will be held until this date and time</p>
          </div>
        )}
      </div>}
    </div>
  );
}
