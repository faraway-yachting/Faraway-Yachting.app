'use client';

import { useEffect, useRef } from 'react';
import { DollarSign, ChevronDown, CheckCircle2, Circle, Info } from 'lucide-react';
import type { Booking } from '@/data/booking/types';
import type { Project } from '@/data/project/types';

interface CommissionSectionProps {
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  canEdit: boolean;
  managementFeePercentage?: number;
  ownershipPercentage?: number;
  projects?: Project[];
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

export default function CommissionSection({ formData, onChange, canEdit, managementFeePercentage, ownershipPercentage, projects, isCollapsed, onToggleCollapse, isCompleted, onToggleCompleted }: CommissionSectionProps) {
  const isExternalBoat = !!formData.externalBoatName && !formData.projectId;
  const isAgencyBooking = !!formData.agentPlatform && formData.agentPlatform !== 'Direct';

  // Charter fee commission base — normalize currencies when they differ
  const bookingCurrency = formData.currency || 'THB';
  const costCurrency = formData.charterCostCurrency || bookingCurrency;
  const fxRate = formData.fxRate || null;

  // --- Agency commission (what we pay to the agency) ---
  const agencyCommThb = formData.agencyCommissionThb || 0;

  // Auto-calculate agency commission amount from rate
  const agencyAutoAmount = formData.agencyCommissionRate
    ? Math.round((formData.charterFee || 0) * formData.agencyCommissionRate) / 100
    : 0;
  const agencyAmount = formData.agencyCommissionAmount ?? agencyAutoAmount;
  const agencyThbCalc = bookingCurrency === 'THB' ? agencyAmount : fxRate ? agencyAmount * fxRate : 0;

  // Net revenue after agency commission (in booking currency and THB)
  const charterFee = formData.charterFee || 0;
  const netRevenue = charterFee - agencyAmount;
  const charterFeeThb = bookingCurrency === 'THB' ? charterFee : fxRate ? charterFee * fxRate : 0;
  const netRevenueThb = charterFeeThb - agencyCommThb;

  // Extras commission base — only commissionable items, commission on profit in THB
  const extraItems = formData.extraItems || [];
  const bookingProjectMfPct = managementFeePercentage || 0;
  const bookingProjectOwnPct = ownershipPercentage ?? 100;

  // Helper: convert extra item profit to THB
  const extraProfitThb = (item: typeof extraItems[number]): number => {
    const profit = (item.sellingPrice || 0) - (item.cost || 0);
    const itemCur = item.currency || bookingCurrency;
    if (itemCur === 'THB') return profit;
    if (item.fxRate) return profit * item.fxRate;
    if (itemCur === bookingCurrency && fxRate) return profit * fxRate;
    return profit;
  };

  // Raw extras profit (for display)
  const extrasCommissionBase = extraItems
    .filter(item => item.commissionable !== false)
    .reduce((sum, item) => sum + extraProfitThb(item), 0);

  // Ownership-adjusted extras base (per-item project lookup)
  const adjustedExtrasBase = extraItems
    .filter(item => item.commissionable !== false)
    .reduce((sum, item) => {
      const profitThb = extraProfitThb(item);
      if (isExternalBoat) return sum + profitThb;
      const extraProject = item.projectId && projects ? projects.find(p => p.id === item.projectId) : null;
      const mfPct = extraProject ? (extraProject.managementFeePercentage || 0) : bookingProjectMfPct;
      const ownPct = extraProject ? (extraProject.managementOwnershipPercentage ?? 100) : bookingProjectOwnPct;
      if (ownPct === 100) return sum + profitThb;
      const mf = Math.round(profitThb * mfPct) / 100;
      const ni = profitThb - mf;
      return sum + Math.round((mf + ni * ownPct / 100) * 100) / 100;
    }, 0);

  // Helper: compute commission base in THB from given agency amounts
  // Used both for display AND inside agency handlers to avoid useEffect cascade
  const calcCommissionBase = (agencyAmt: number, agencyThb: number): number => {
    const netRev = charterFee - agencyAmt;
    const netRevThb = charterFeeThb - agencyThb;
    let base: number;
    if (!isExternalBoat) {
      base = netRevThb;
    } else if (bookingCurrency === costCurrency) {
      const profit = netRev - (formData.charterCost || 0);
      base = bookingCurrency === 'THB' ? profit : fxRate ? profit * fxRate : 0;
    } else {
      const costThb = costCurrency === 'THB' ? (formData.charterCost || 0) : 0;
      base = netRevThb - costThb;
    }
    return Math.round(base * 100) / 100 + adjustedExtrasBase;
  };

  // Combined commission base (charter + extras, in THB)
  const commissionBase = calcCommissionBase(agencyAmount, agencyCommThb);
  const charterCommissionBase = commissionBase - adjustedExtrasBase;

  // Apply management fee + ownership to charter portion (matches sync RPC formula)
  const applyMfOwnership = (charterBase: number): number => {
    if (isExternalBoat || (!managementFeePercentage && !ownershipPercentage)) return charterBase;
    const ownPct = ownershipPercentage ?? 100;
    if (ownPct === 100) return charterBase;
    const mfPct = managementFeePercentage || 0;
    const mf = Math.round(charterBase * mfPct) / 100;
    const ni = charterBase - mf;
    return Math.round((mf + ni * ownPct / 100) * 100) / 100;
  };

  const adjustedCharterBase = applyMfOwnership(charterCommissionBase);
  const adjustedCommissionBase = adjustedCharterBase + adjustedExtrasBase;

  const rate = formData.commissionRate || 0;
  const charterCommission = adjustedCharterBase * rate / 100;
  const extrasCommission = adjustedExtrasBase * rate / 100;
  const autoTotalCommission = Math.round(adjustedCommissionBase * rate) / 100;
  const autoCommissionReceived = Math.round(((formData.totalCommission ?? autoTotalCommission) - (formData.commissionDeduction || 0)) * 100) / 100;

  const defaultRate = getDefaultRate(formData.type, formData.agentPlatform);
  const prevDefaultRef = useRef<number | null>(null);

  // Ref for agency amount input — managed imperatively to avoid React 19 typing issues
  const agencyAmountRef = useRef<HTMLInputElement>(null);
  const agencyAmountFocused = useRef(false);
  const pendingAgencyAmount = useRef<number | undefined>(undefined);
  const hasPendingAgencyUpdate = useRef(false);

  // Sync amount DOM from formData when NOT focused (handles data loading, external changes)
  useEffect(() => {
    if (agencyAmountRef.current && !agencyAmountFocused.current) {
      agencyAmountRef.current.value = formData.agencyCommissionAmount != null ? String(formData.agencyCommissionAmount) : '';
    }
  }, [formData.agencyCommissionAmount]);

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

  // Recalculate commission when base amounts change (charter fee, cost, fx rate, extras, agency commission)
  // Also recalculate on initial mount to fix stale values from old calculations
  const prevBaseRef = useRef<number | null>(null);
  useEffect(() => {
    if (rate > 0 && (prevBaseRef.current === null || prevBaseRef.current !== adjustedCommissionBase)) {
      const newTotal = Math.round(adjustedCommissionBase * rate) / 100;
      onChange('totalCommission', Math.round(newTotal * 100) / 100);
      onChange('commissionReceived', Math.round((newTotal - (formData.commissionDeduction || 0)) * 100) / 100);
    }
    prevBaseRef.current = adjustedCommissionBase;
  }, [adjustedCommissionBase]);

  // Auto-sync agency commission THB when fxRate or currency changes
  // (amount changes are handled directly in the agency handlers above)
  useEffect(() => {
    if (!isAgencyBooking || !agencyAmount) return;
    const newThb = Math.round(agencyThbCalc * 100) / 100;
    if (newThb !== (formData.agencyCommissionThb || 0)) {
      onChange('agencyCommissionThb', newThb || undefined);
    }
  }, [fxRate, bookingCurrency]);

  const handleRateChange = (value: string) => {
    const newRate = value === '' ? undefined : parseFloat(value);
    onChange('commissionRate', newRate);
    const newTotal = Math.round(adjustedCommissionBase * (newRate || 0)) / 100;
    onChange('totalCommission', newTotal);
    onChange('commissionReceived', Math.round((newTotal - (formData.commissionDeduction || 0)) * 100) / 100);
  };

  const handleTotalCommissionChange = (value: string) => {
    const total = value === '' ? undefined : parseFloat(value);
    onChange('totalCommission', total);
    onChange('commissionReceived', Math.round(((total || 0) - (formData.commissionDeduction || 0)) * 100) / 100);
  };

  const handleDeductionChange = (value: string) => {
    const deduction = value === '' ? undefined : parseFloat(value);
    onChange('commissionDeduction', deduction);
    onChange('commissionReceived', Math.round(((formData.totalCommission ?? autoTotalCommission) - (deduction || 0)) * 100) / 100);
  };

  const handleReceivedChange = (value: string) => {
    const received = value === '' ? undefined : parseFloat(value);
    onChange('commissionReceived', received);
  };

  // --- Agency commission handlers ---
  const agencyRateOptions = [5, 7.5, 10, 12.5, 15, 17.5, 20, 25, 30];

  // Select handler — no typing involved, so no React 19 issues
  const handleAgencyRateSelect = (value: string) => {
    const newRate = value === '' ? undefined : parseFloat(value);
    onChange('agencyCommissionRate', newRate);
    const newAmount = newRate ? Math.round(charterFee * newRate / 100 * 100) / 100 : undefined;
    onChange('agencyCommissionAmount', newAmount);
    // Update amount input DOM directly
    if (agencyAmountRef.current) {
      agencyAmountRef.current.value = newAmount != null ? String(newAmount) : '';
    }
    pendingAgencyAmount.current = newAmount;
    const newThb = newAmount
      ? Math.round((bookingCurrency === 'THB' ? newAmount : fxRate ? newAmount * fxRate : 0) * 100) / 100
      : undefined;
    onChange('agencyCommissionThb', newThb);
    const newBase = calcCommissionBase(newAmount || 0, newThb || 0);
    const newCharterBase = newBase - adjustedExtrasBase;
    const adjustedBase = applyMfOwnership(newCharterBase) + adjustedExtrasBase;
    if (rate > 0) {
      const newTotal = Math.round(adjustedBase * rate) / 100;
      onChange('totalCommission', Math.round(newTotal * 100) / 100);
      onChange('commissionReceived', Math.round((newTotal - (formData.commissionDeduction || 0)) * 100) / 100);
    }
    prevBaseRef.current = adjustedBase;
  };

  // Amount handler — flush on blur to avoid React 19 typing issues
  const handleAgencyAmountChange = (value: string) => {
    const amount = value === '' ? undefined : parseFloat(value);
    if (value !== '' && isNaN(amount!)) return;
    pendingAgencyAmount.current = amount;
    hasPendingAgencyUpdate.current = true;
  };

  const flushAgencyAmountUpdate = () => {
    if (!hasPendingAgencyUpdate.current) return;
    hasPendingAgencyUpdate.current = false;
    const newAmount = pendingAgencyAmount.current;
    onChange('agencyCommissionAmount', newAmount);
    const newThb = newAmount
      ? Math.round((bookingCurrency === 'THB' ? newAmount : fxRate ? newAmount * fxRate : 0) * 100) / 100
      : undefined;
    onChange('agencyCommissionThb', newThb);
    const newBase = calcCommissionBase(newAmount || 0, newThb || 0);
    const newCharterBase = newBase - adjustedExtrasBase;
    const adjustedBase = applyMfOwnership(newCharterBase) + adjustedExtrasBase;
    if (rate > 0) {
      const newTotal = Math.round(adjustedBase * rate) / 100;
      onChange('totalCommission', Math.round(newTotal * 100) / 100);
      onChange('commissionReceived', Math.round((newTotal - (formData.commissionDeduction || 0)) * 100) / 100);
    }
    prevBaseRef.current = adjustedBase;
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

      {/* === Agency Commission Block (only for agency bookings) === */}
      {isAgencyBooking && (
        <div className="bg-amber-50 rounded-md p-3 mb-3 border border-amber-200">
          <h4 className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Agency Commission</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rate (%)</label>
              <select
                value={formData.agencyCommissionRate != null ? String(formData.agencyCommissionRate) : ''}
                onChange={(e) => handleAgencyRateSelect(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">-- Select --</option>
                {agencyRateOptions.map(r => (
                  <option key={r} value={String(r)}>{r}%</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount ({bookingCurrency})</label>
              <input
                ref={agencyAmountRef}
                type="text"
                inputMode="decimal"
                defaultValue={formData.agencyCommissionAmount != null ? String(formData.agencyCommissionAmount) : ''}
                onChange={(e) => {
                  if (/^\d*\.?\d*$/.test(e.target.value)) {
                    handleAgencyAmountChange(e.target.value);
                  }
                }}
                onFocus={() => {
                  agencyAmountFocused.current = true;
                  pendingAgencyAmount.current = formData.agencyCommissionAmount;
                }}
                onBlur={() => {
                  agencyAmountFocused.current = false;
                  flushAgencyAmountUpdate();
                  if (agencyAmountRef.current) {
                    agencyAmountRef.current.value = pendingAgencyAmount.current != null ? String(pendingAgencyAmount.current) : '';
                  }
                }}
                disabled={!canEdit}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:bg-gray-100"
                placeholder="0.00"
              />
              {bookingCurrency !== 'THB' && agencyThbCalc > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">= {fmtAmt(agencyThbCalc)} THB</p>
              )}
            </div>
          </div>

          {/* Net revenue display */}
          {agencyAmount > 0 && (
            <div className="text-sm bg-white/60 rounded px-2 py-1.5 mb-2">
              <div className="flex justify-between text-gray-600">
                <span>Charter Fee</span>
                <span>{fmtAmt(charterFee)} {bookingCurrency}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Agency Commission</span>
                <span>-{fmtAmt(agencyAmount)} {bookingCurrency}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-800 border-t border-gray-200 mt-1 pt-1">
                <span>Net Revenue</span>
                <span>{fmtAmt(netRevenue)} {bookingCurrency}{bookingCurrency !== 'THB' && netRevenueThb > 0 ? ` (${fmtAmt(netRevenueThb)} THB)` : ''}</span>
              </div>
            </div>
          )}

          {/* Payment status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
              <select
                value={formData.agencyPaymentStatus || 'unpaid'}
                onChange={(e) => {
                  onChange('agencyPaymentStatus', e.target.value as 'unpaid' | 'paid');
                  if (e.target.value === 'paid' && !formData.agencyPaidDate) {
                    onChange('agencyPaidDate', new Date().toISOString().split('T')[0]);
                  }
                }}
                disabled={!canEdit}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-100"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {formData.agencyPaymentStatus === 'paid' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paid Date</label>
                <input
                  type="date"
                  value={formData.agencyPaidDate || ''}
                  onChange={(e) => onChange('agencyPaidDate', e.target.value || undefined)}
                  disabled={!canEdit}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-100"
                />
              </div>
            )}
            <div className={formData.agencyPaymentStatus === 'paid' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
              <input
                type="text"
                value={formData.agencyPaymentNote || ''}
                onChange={(e) => onChange('agencyPaymentNote', e.target.value || undefined)}
                disabled={!canEdit}
                placeholder="Payment reference, bank details..."
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>
      )}

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
      {(charterCommissionBase > 0 || adjustedExtrasBase > 0) && (
        <div className="text-sm bg-white/50 rounded-md p-3 mb-3 space-y-1.5">
          {bookingCurrency !== 'THB' && (
            <p className="text-xs text-teal-600 mb-1">Commission calculated in THB</p>
          )}
          <div className="flex justify-between text-gray-600">
            <span>{isAgencyBooking && agencyAmount > 0 ? 'Charter net revenue' : 'Charter fee'} ({fmtAmt(charterCommissionBase)}{bookingCurrency !== 'THB' ? ' THB' : ''})</span>
            <span>{fmtAmt(charterCommission)}</span>
          </div>
          {adjustedExtrasBase > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Extras ({fmtAmt(adjustedExtrasBase)}{bookingCurrency !== 'THB' ? ' THB' : ''})</span>
              <span>{fmtAmt(extrasCommission)}</span>
            </div>
          )}
          {isExternalBoat && (
            <p className="text-xs text-teal-600 pt-1">
              Charter base = Fee - Boat Owner Cost (THB)
            </p>
          )}
          {!isExternalBoat && (managementFeePercentage || ownershipPercentage) && (ownershipPercentage ?? 100) < 100 && charterCommissionBase > 0 && (() => {
            const mfPct = managementFeePercentage || 0;
            const ownPct = ownershipPercentage ?? 100;
            const mf = Math.round(charterCommissionBase * mfPct) / 100;
            return (
              <div className="border-t border-gray-200 mt-1.5 pt-1.5 space-y-1">
                {mfPct > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span className="text-xs">Management Fee ({mfPct}%)</span>
                    <span className="text-xs">{fmtAmt(mf)} THB</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span className="text-xs">FA Share ({ownPct}%)</span>
                  <span className="text-xs">{fmtAmt(adjustedCharterBase)} THB</span>
                </div>
              </div>
            );
          })()}
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

      {/* Info note about commission sync */}
      {!isExternalBoat && (
        <div className="flex items-start gap-2 mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Final commission on the Commissions page is calculated using management fee and ownership % from project settings.
          </p>
        </div>
      )}

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
