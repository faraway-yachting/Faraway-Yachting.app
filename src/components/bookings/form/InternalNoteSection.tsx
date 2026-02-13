'use client';

import { useRef } from 'react';
import { FileText, X, Upload, Download, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import type { Booking, BookingAttachment } from '@/data/booking/types';

interface InternalNoteSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  canEdit: boolean;
  onUploadInternalAttachment: (files: File[]) => void;
  onRemoveInternalAttachment: (index: number) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
}

export default function InternalNoteSection({
  formData,
  onChange,
  canEdit,
  onUploadInternalAttachment,
  onRemoveInternalAttachment,
  isCollapsed,
  onToggleCollapse,
  isCompleted,
  onToggleCompleted,
}: InternalNoteSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachments: BookingAttachment[] = formData.internalNoteAttachments ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadInternalAttachment(Array.from(files));
      // Reset input so user can upload the same file again
      e.target.value = '';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div
        className={`flex items-center justify-between px-3 py-2 -mx-4 -mt-4 rounded-t-lg bg-orange-50 cursor-pointer select-none ${
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
          <FileText className="h-4 w-4 text-orange-600" />
          <h3 className="text-sm font-semibold text-orange-800">Internal Note</h3>
        </div>
        {onToggleCollapse && (
          <ChevronDown className={`h-4 w-4 text-orange-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
        )}
      </div>

      {!isCollapsed && <>{/* Textarea */}
      <textarea
        rows={6}
        value={formData.internalNotes ?? ''}
        onChange={(e) => onChange('internalNotes', e.target.value)}
        disabled={!canEdit}
        placeholder="Add internal notes here..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 resize-y"
        style={{ minHeight: '150px' }}
      />

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((att, index) => (
            <div
              key={att.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline"
                  style={{ color: '#5A7A8F' }}
                >
                  {att.name}
                </a>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onRemoveInternalAttachment(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
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

      {/* Upload area */}
      {canEdit && (
        <div className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-[#5A7A8F] hover:text-[#5A7A8F] transition-colors"
          >
            <Upload className="h-4 w-4" />
            Click to upload attachments
          </button>
        </div>
      )}
      </>}
    </div>
  );
}
