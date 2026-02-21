'use client';

import { useRef } from 'react';
import {
  FileText,
  Sparkles,
  Package,
  ScrollText,
  Upload,
  Eye,
  X,
  CheckCircle2,
  Circle,
  ChevronDown,
} from 'lucide-react';
import {
  Booking,
  BookingAttachment,
} from '@/data/booking/types';
import { DynamicSelect } from './DynamicSelect';
import { ExtraItemsEditor } from './ExtraItemsEditor';
import { BookingTaxiSection } from '../taxi/BookingTaxiSection';

interface BookingDetailsSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  errors: Record<string, string>;
  canEdit: boolean;
  autoFilledFields: Set<string>;
  onUploadContractAttachment?: (files: File[]) => Promise<void>;
  onRemoveContractAttachment?: (index: number) => void;
  cabinCharterMode?: boolean;
  projects?: { id: string; name: string }[];
  bookingId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
}

export function BookingDetailsSection({
  formData,
  onChange,
  errors,
  canEdit,
  autoFilledFields,
  onUploadContractAttachment,
  onRemoveContractAttachment,
  cabinCharterMode,
  projects,
  bookingId,
  isCollapsed,
  onToggleCollapse,
  isCompleted,
  onToggleCompleted,
}: BookingDetailsSectionProps) {
  const contractFileRef = useRef<HTMLInputElement>(null);

  const getAutoFillClass = (field: string) => {
    return autoFilledFields.has(field) ? 'bg-blue-50 ring-2 ring-blue-200' : '';
  };

  const handleContractFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onUploadContractAttachment) return;
    await onUploadContractAttachment(Array.from(files));
    if (contractFileRef.current) contractFileRef.current.value = '';
  };

  const contractAttachments = (formData.contractAttachments || []) as BookingAttachment[];

  return (
    <>
      <div className="bg-indigo-50 rounded-lg p-4">
        <div
          className={`flex items-center justify-between px-3 py-2 -mx-4 -mt-4 rounded-t-lg bg-indigo-100 cursor-pointer select-none ${
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
            <FileText className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-indigo-800">Booking Details</h3>
          </div>
          {onToggleCollapse && (
            <ChevronDown className={`h-4 w-4 text-indigo-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
          )}
        </div>

        {!isCollapsed && <div className="space-y-4">
          {/* Booking ID Badge */}
          {formData.bookingNumber && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Booking ID</label>
              <span className="inline-flex items-center px-3 py-1.5 bg-[#5A7A8F]/10 text-[#5A7A8F] text-sm font-semibold rounded-lg border border-[#5A7A8F]/20">
                {formData.bookingNumber}
              </span>
            </div>
          )}

          {/* Booking Title */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Booking Title *</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="e.g., Smith Family Day Charter"
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
              Destination
              {autoFilledFields.has('destination') && (
                <Sparkles className="h-3 w-3 text-blue-500" />
              )}
            </label>
            <DynamicSelect
              category="destination"
              value={formData.destination || ''}
              onChange={(val) => onChange('destination', val)}
              disabled={!canEdit}
              placeholder="Select destination..."
              className={getAutoFillClass('destination')}
            />
          </div>

          {/* Departure / Arrival */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Departure From</label>
              <DynamicSelect
                category="departure_location"
                value={formData.departureFrom || ''}
                onChange={(val) => onChange('departureFrom', val)}
                disabled={!canEdit}
                placeholder="Select departure..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Arrival To</label>
              <DynamicSelect
                category="arrival_location"
                value={formData.arrivalTo || ''}
                onChange={(val) => onChange('arrivalTo', val)}
                disabled={!canEdit}
                placeholder="Select arrival..."
              />
            </div>
          </div>

          {/* Number of Guests — hidden in cabin charter mode (sum of cabin guests) */}
          {!cabinCharterMode && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Number of Guests</label>
              <input
                type="number"
                value={formData.numberOfGuests || ''}
                onChange={(e) =>
                  onChange('numberOfGuests', e.target.value ? parseInt(e.target.value) : undefined)
                }
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          )}
        </div>}
      </div>

      {/* Extras & Contract — hidden in cabin charter mode (managed per-cabin) */}
      {!isCollapsed && !cabinCharterMode && (
        <>
          {/* Extras Section */}
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-2 px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-amber-100">
              <Package className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">Extras</h3>
            </div>
            <ExtraItemsEditor
              items={formData.extraItems || []}
              onChange={(items) => onChange('extraItems', items)}
              disabled={!canEdit}
              currency={formData.currency || 'THB'}
              bookingFxRate={formData.fxRate}
              projects={projects}
            />
          </div>

          {/* Taxi Transfers Section */}
          {bookingId ? (
            <BookingTaxiSection bookingId={bookingId} />
          ) : (
            <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Save booking to add taxi transfers</p>
            </div>
          )}

          {/* Charter Contract Section */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-slate-200">
              <ScrollText className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-800">Charter Contract</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contract Details</label>
                <textarea
                  value={formData.contractNote || ''}
                  onChange={(e) => onChange('contractNote', e.target.value)}
                  placeholder="Contract notes, terms, or reference..."
                  disabled={!canEdit}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-none"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Attachments</label>
                {contractAttachments.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {contractAttachments.map((att, i) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between bg-white rounded-md border border-gray-200 px-3 py-2"
                      >
                        <span className="text-sm text-gray-700 truncate flex-1">{att.name}</span>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            type="button"
                            onClick={() => window.open(att.url, '_blank', 'noopener,noreferrer')}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View file"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEdit && onRemoveContractAttachment && (
                            <button
                              type="button"
                              onClick={() => onRemoveContractAttachment(i)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {canEdit && onUploadContractAttachment && (
                  <>
                    <input
                      ref={contractFileRef}
                      type="file"
                      multiple
                      onChange={handleContractFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <button
                      type="button"
                      onClick={() => contractFileRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors w-full justify-center"
                    >
                      <Upload className="h-4 w-4" />
                      Click to upload files
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
