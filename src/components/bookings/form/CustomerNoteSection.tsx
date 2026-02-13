'use client';

import { MessageSquare, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import type { Booking } from '@/data/booking/types';

interface CustomerNoteSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  canEdit: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
}

export default function CustomerNoteSection({ formData, onChange, canEdit, isCollapsed, onToggleCollapse, isCompleted, onToggleCompleted }: CustomerNoteSectionProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div
        className={`flex items-center justify-between px-3 py-2 -mx-4 -mt-4 rounded-t-lg bg-rose-50 cursor-pointer select-none ${
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
          <MessageSquare className="h-4 w-4 text-rose-600" />
          <h3 className="text-sm font-semibold text-rose-800">Customer Notes</h3>
          <span className="text-xs text-rose-400 ml-1">Notes visible to the customer</span>
        </div>
        {onToggleCollapse && (
          <ChevronDown className={`h-4 w-4 text-rose-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
        )}
      </div>

      {!isCollapsed &&
        <textarea
          rows={3}
          value={formData.customerNotes ?? ''}
          onChange={(e) => onChange('customerNotes', e.target.value)}
          disabled={!canEdit}
          placeholder="Add notes visible to the customer..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 resize-y"
        />
      }
    </div>
  );
}
