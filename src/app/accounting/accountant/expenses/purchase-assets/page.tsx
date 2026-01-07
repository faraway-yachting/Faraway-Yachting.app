'use client';

import { HardDrive, Plus } from 'lucide-react';

export default function PurchaseAssetsPage() {
  return (
    <div>
      {/* Header with New Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Purchase Order (Asset)</h2>
          <p className="text-sm text-gray-500">
            Track fixed asset acquisitions with depreciation tracking
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          New Asset Purchase
        </button>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-[#5A7A8F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HardDrive className="h-8 w-8 text-[#5A7A8F]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Asset Purchase Coming Soon
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            This module will allow you to track fixed asset purchases with depreciation
            schedules, useful life tracking, and asset registers.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#5A7A8F] bg-[#5A7A8F]/5 rounded-lg">
            In Development
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Depreciation</h4>
          <p className="text-xs text-gray-500">Automatic depreciation calculation with useful life tracking</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Asset Register</h4>
          <p className="text-xs text-gray-500">Complete asset registry with codes and descriptions</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Acquisition Tracking</h4>
          <p className="text-xs text-gray-500">Track acquisition dates and asset values</p>
        </div>
      </div>
    </div>
  );
}
