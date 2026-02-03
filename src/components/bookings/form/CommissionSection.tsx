'use client';

import { useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import type { Booking } from '@/data/booking/types';

interface CommissionSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  canEdit: boolean;
}

export default function CommissionSection({ formData, onChange, canEdit }: CommissionSectionProps) {
  // For external boats, commission is based on profit (revenue - cost)
  const isExternalBoat = !!formData.externalBoatName && !formData.projectId;
  const commissionBase = isExternalBoat
    ? (formData.charterFee || 0) + (formData.extraCharges || 0) - (formData.charterCost || 0)
    : (formData.charterFee || 0);
  const autoTotalCommission = commissionBase * (formData.commissionRate || 0) / 100;
  const autoCommissionReceived = (formData.totalCommission ?? autoTotalCommission) - (formData.commissionDeduction || 0);

  // Auto-calculate total commission when charterFee or commissionRate changes
  useEffect(() => {
    if (formData.totalCommission === undefined || formData.totalCommission === null) {
      // Only auto-set if user hasn't manually overridden
    }
  }, [formData.charterFee, formData.commissionRate]);

  const handleRateChange = (value: string) => {
    const rate = value === '' ? undefined : parseFloat(value);
    onChange('commissionRate', rate);
    // Auto-update totalCommission
    const newTotal = commissionBase * (rate || 0) / 100;
    onChange('totalCommission', newTotal);
    onChange('commissionReceived', newTotal - (formData.commissionDeduction || 0));
  };

  const handleTotalCommissionChange = (value: string) => {
    const total = value === '' ? undefined : parseFloat(value);
    onChange('totalCommission', total);
    onChange('commissionReceived', (total || 0) - (formData.commissionDeduction || 0));
  };

  const handleDeductionChange = (value: string) => {
    const deduction = value === '' ? undefined : parseFloat(value);
    onChange('commissionDeduction', deduction);
    onChange('commissionReceived', (formData.totalCommission ?? autoTotalCommission) - (deduction || 0));
  };

  const handleReceivedChange = (value: string) => {
    const received = value === '' ? undefined : parseFloat(value);
    onChange('commissionReceived', received);
  };

  return (
    <div className="bg-teal-50 rounded-lg p-4">
      <div className="flex items-center gap-2 px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-teal-100">
        <DollarSign className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-teal-800">Booking Owner Commission</h3>
      </div>

      {isExternalBoat && (
        <p className="text-xs text-teal-700 mb-2">
          Commission based on profit: {commissionBase.toLocaleString('en', { minimumFractionDigits: 2 })}
          {' '}(Charter Fee + Extras - Boat Owner Cost)
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Commission Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commission Rate (%)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.commissionRate ?? ''}
            onChange={(e) => handleRateChange(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="0.00"
          />
        </div>

        {/* Total Commission */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Commission
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.totalCommission ?? (autoTotalCommission || '')}
            onChange={(e) => handleTotalCommissionChange(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="0.00"
          />
        </div>

        {/* Deduction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deduction
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.commissionDeduction ?? ''}
            onChange={(e) => handleDeductionChange(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="0.00"
          />
        </div>

        {/* Commission Received */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commission Received
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.commissionReceived ?? (autoCommissionReceived || '')}
            onChange={(e) => handleReceivedChange(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="0.00"
          />
        </div>
      </div>
    </div>
  );
}
