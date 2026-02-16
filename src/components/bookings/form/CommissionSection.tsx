'use client';

import { useEffect, useRef } from 'react';
import { DollarSign, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import type { Booking } from '@/data/booking/types';

interface CommissionSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  canEdit: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
}

function getDefaultRate(type?: string, agentPlatform?: string): number {
  if (type === 'bareboat_charter') return 4;
  if (!agentPlatform || agentPlatform === 'Direct') return 2;
  return 1; // Agency
}

export default function CommissionSection({ formData, onChange, canEdit, isCollapsed, onToggleCollapse, isCompleted, onToggleCompleted }: CommissionSectionProps) {
  const isExternalBoat = !!formData.externalBoatName && !formData.projectId;

  // Charter fee commission base — normalize currencies when they differ
  const bookingCurrency = formData.currency || 'THB';
  const costCurrency = formData.charterCostCurrency || bookingCurrency;
  const fxRate = formData.fxRate || null;

  // ALWAYS calculate commission base in THB
  let charterCommissionBase: number;
  if (!isExternalBoat) {
    // Regular booking: charter fee → THB
    const fee = formData.charterFee || 0;
    charterCommissionBase = bookingCurrency === 'THB' ? fee : fxRate ? fee * fxRate : 0;
  } else if (bookingCurrency === costCurrency) {
    // External, same currency: (fee - cost) → THB
    const profit = (formData.charterFee || 0) - (formData.charterCost || 0);
    charterCommissionBase = bookingCurrency === 'THB' ? profit : fxRate ? profit * fxRate : 0;
  } else {
    // External, different currencies: normalize each to THB then subtract
    const feeThb = bookingCurrency === 'THB'
      ? (formData.charterFee || 0)
      : fxRate ? (formData.charterFee || 0) * fxRate : 0;
    const costThb = costCurrency === 'THB'
      ? (formData.charterCost || 0)
      : 0; // no FX rate for cost currency
    charterCommissionBase = feeThb - costThb;
  }
  charterCommissionBase = Math.round(charterCommissionBase * 100) / 100;

  // Extras commission base — only commissionable items, commission on profit in THB
  const extraItems = formData.extraItems || [];
  const extrasCommissionBase = extraItems
    .filter(item => item.commissionable !== false)
    .reduce((sum, item) => {
      const profit = (item.sellingPrice || 0) - (item.cost || 0);
      const itemCur = item.currency || bookingCurrency;
      // Convert profit to THB
      if (itemCur === 'THB') return sum + profit;
      if (item.fxRate) return sum + profit * item.fxRate;
      // Fallback: same as booking currency → use booking fxRate
      if (itemCur === bookingCurrency && fxRate) return sum + profit * fxRate;
      return sum + profit; // last resort, no conversion
    }, 0);

  // Combined commission base
  const commissionBase = charterCommissionBase + extrasCommissionBase;

  const rate = formData.commissionRate || 0;
  const charterCommission = charterCommissionBase * rate / 100;
  const extrasCommission = extrasCommissionBase * rate / 100;
  const autoTotalCommission = commissionBase * rate / 100;
  const autoCommissionReceived = (formData.totalCommission ?? autoTotalCommission) - (formData.commissionDeduction || 0);

  const defaultRate = getDefaultRate(formData.type, formData.agentPlatform);
  const prevDefaultRef = useRef<number | null>(null);

  // Auto-fill commission rate based on charter type and booking source
  useEffect(() => {
    const newDefault = getDefaultRate(formData.type, formData.agentPlatform);

    if (formData.commissionRate === undefined || formData.commissionRate === null) {
      handleRateChange(String(newDefault));
      prevDefaultRef.current = newDefault;
      return;
    }

    if (prevDefaultRef.current !== null && formData.commissionRate === prevDefaultRef.current) {
      handleRateChange(String(newDefault));
    }

    prevDefaultRef.current = newDefault;
  }, [formData.type, formData.agentPlatform]);

  // Recalculate commission when base amounts change (charter fee, cost, fx rate, extras)
  const prevBaseRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevBaseRef.current !== null && prevBaseRef.current !== commissionBase && rate > 0) {
      const newTotal = Math.round(commissionBase * rate) / 100;
      onChange('totalCommission', newTotal);
      onChange('commissionReceived', newTotal - (formData.commissionDeduction || 0));
    }
    prevBaseRef.current = commissionBase;
  }, [commissionBase]);

  const handleRateChange = (value: string) => {
    const newRate = value === '' ? undefined : parseFloat(value);
    onChange('commissionRate', newRate);
    const newTotal = commissionBase * (newRate || 0) / 100;
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

  const fmtAmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-teal-50 rounded-lg p-4">
      <div
        className={`flex items-center justify-between px-3 py-2 -mx-4 -mt-4 rounded-t-lg bg-teal-100 cursor-pointer select-none ${
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
          <DollarSign className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-teal-800">Booking Owner Commission</h3>
        </div>
        {onToggleCollapse && (
          <ChevronDown className={`h-4 w-4 text-teal-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
        )}
      </div>

      {!isCollapsed && <>
      {/* Commission Rate */}
      <div className="mb-3 max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Commission Rate (%)
          <span className="text-xs text-gray-400 font-normal ml-1">Default: {defaultRate}%</span>
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

      {/* Commission Breakdown — all values in THB */}
      {(charterCommissionBase > 0 || extrasCommissionBase > 0) && (
        <div className="text-sm bg-white/50 rounded-md p-3 mb-3 space-y-1.5">
          {bookingCurrency !== 'THB' && (
            <p className="text-xs text-teal-600 mb-1">Commission calculated in THB</p>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Charter fee ({fmtAmt(charterCommissionBase)}{bookingCurrency !== 'THB' ? ' THB' : ''})</span>
            <span>{fmtAmt(charterCommission)}</span>
          </div>
          {extrasCommissionBase > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Extras ({fmtAmt(extrasCommissionBase)}{bookingCurrency !== 'THB' ? ' THB' : ''})</span>
              <span>{fmtAmt(extrasCommission)}</span>
            </div>
          )}
          {isExternalBoat && (
            <p className="text-xs text-teal-600 pt-1">
              Charter base = Fee - Boat Owner Cost (THB)
            </p>
          )}
        </div>
      )}

      {/* Editable fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Commission */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Commission{bookingCurrency !== 'THB' ? ' (THB)' : ''}
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
            Deduction{bookingCurrency !== 'THB' ? ' (THB)' : ''}
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
            Commission Received{bookingCurrency !== 'THB' ? ' (THB)' : ''}
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

      {/* Commission Note */}
      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Commission Note
        </label>
        <input
          type="text"
          value={formData.commissionNote ?? ''}
          onChange={(e) => onChange('commissionNote', e.target.value)}
          disabled={!canEdit}
          placeholder="Reason for non-standard rate, special terms..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>
      </>}
    </div>
  );
}
