'use client';

import { FileUp, Plus } from 'lucide-react';

export default function DebitNotesPage() {
  return (
    <div>
      {/* Header with New Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Receive Debit Note</h2>
          <p className="text-sm text-gray-500">
            Debit notes received from suppliers (increases AP)
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          New Debit Note
        </button>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileUp className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Received Debit Notes Coming Soon
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            This module will allow you to record debit notes received from suppliers,
            increasing your accounts payable for price increases, additional charges, or late fees.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#5A7A8F] bg-[#5A7A8F]/5 rounded-lg">
            In Development
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">WHT Handling</h4>
          <p className="text-xs text-gray-500">Withholding tax calculation for debit notes</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Original Reference</h4>
          <p className="text-xs text-gray-500">Link debit notes to original expense records</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Reason Tracking</h4>
          <p className="text-xs text-gray-500">Track reasons: price increases, late fees, additional charges</p>
        </div>
      </div>
    </div>
  );
}
