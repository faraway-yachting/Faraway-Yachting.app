'use client';

import { MessageSquare } from 'lucide-react';
import type { Booking } from '@/data/booking/types';

interface CustomerNoteSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  canEdit: boolean;
}

export default function CustomerNoteSection({ formData, onChange, canEdit }: CustomerNoteSectionProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-rose-50">
        <MessageSquare className="h-4 w-4 text-rose-600" />
        <h3 className="text-sm font-semibold text-rose-800">Customer Notes</h3>
        <span className="text-xs text-rose-400 ml-1">Notes visible to the customer</span>
      </div>

      <textarea
        rows={3}
        value={formData.customerNotes ?? ''}
        onChange={(e) => onChange('customerNotes', e.target.value)}
        disabled={!canEdit}
        placeholder="Add notes visible to the customer..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 resize-y"
      />
    </div>
  );
}
