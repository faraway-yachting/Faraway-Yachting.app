'use client';

import { Package, Plus } from 'lucide-react';

export default function PurchaseInventoryPage() {
  return (
    <div>
      {/* Header with New Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Purchase Inventory</h2>
          <p className="text-sm text-gray-500">
            Track inventory purchases from suppliers
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5A7A8F] rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          New Purchase
        </button>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-[#5A7A8F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-[#5A7A8F]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Purchase Inventory Coming Soon
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            This module will allow you to track inventory purchases with SKU codes,
            delivery tracking, and automatic stock updates.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#5A7A8F] bg-[#5A7A8F]/5 rounded-lg">
            In Development
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">SKU Tracking</h4>
          <p className="text-xs text-gray-500">Track items by SKU code with quantity and cost tracking</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Delivery Tracking</h4>
          <p className="text-xs text-gray-500">Expected and actual delivery date tracking</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Project Allocation</h4>
          <p className="text-xs text-gray-500">Allocate inventory to specific projects</p>
        </div>
      </div>
    </div>
  );
}
