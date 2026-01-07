'use client';

import { FileDown, Plus } from 'lucide-react';

export default function CreditNotesPage() {
  return (
    <div>
      {/* Header with New Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Receive Credit Note</h2>
          <p className="text-sm text-gray-500">
            Credit notes received from suppliers (reduces AP)
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          New Credit Note
        </button>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileDown className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Received Credit Notes Coming Soon
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            This module will allow you to record credit notes received from suppliers,
            reducing your accounts payable and reversing VAT/WHT as applicable.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#5A7A8F] bg-[#5A7A8F]/5 rounded-lg">
            In Development
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">VAT Reversal</h4>
          <p className="text-xs text-gray-500">Automatic VAT input reversal for credit notes</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Original Reference</h4>
          <p className="text-xs text-gray-500">Link credit notes to original expense records</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Reason Tracking</h4>
          <p className="text-xs text-gray-500">Track reasons: returns, price adjustments, discounts</p>
        </div>
      </div>
    </div>
  );
}
