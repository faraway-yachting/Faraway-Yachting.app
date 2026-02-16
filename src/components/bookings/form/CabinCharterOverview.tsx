'use client';

import { useRef } from 'react';
import {
  Package,
  ScrollText,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  Upload,
  Download,
  X,
  Paperclip,
  ChevronDown,
} from 'lucide-react';
import type { Booking, CabinAllocation, BookingAttachment } from '@/data/booking/types';
import { paymentStatusLabels } from '@/data/booking/types';

interface CabinCharterOverviewProps {
  cabinAllocations: CabinAllocation[];
  currency: string;
  formData: Partial<Booking>;
  onChange: (field: keyof Booking, value: any) => void;
  canEdit: boolean;
  onUploadInternalAttachment?: (files: File[]) => void;
  onRemoveInternalAttachment?: (index: number) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function fmtAmt(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function CabinCharterOverview({
  cabinAllocations,
  currency,
  formData,
  onChange,
  canEdit,
  onUploadInternalAttachment,
  onRemoveInternalAttachment,
  isCollapsed,
  onToggleCollapse,
}: CabinCharterOverviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internalAttachments: BookingAttachment[] = formData.internalNoteAttachments ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUploadInternalAttachment) {
      onUploadInternalAttachment(Array.from(files));
      e.target.value = '';
    }
  };

  // --- Extras Summary ---
  const extrasMap = new Map<string, number>();
  for (const alloc of cabinAllocations) {
    for (const extra of alloc.extras || []) {
      extrasMap.set(extra, (extrasMap.get(extra) || 0) + 1);
    }
  }
  const hasExtras = extrasMap.size > 0;

  // --- Contract Status ---
  const contractStatuses = cabinAllocations.map(alloc => ({
    label: alloc.cabinLabel,
    number: alloc.cabinNumber,
    hasNote: !!alloc.contractNote?.trim(),
    attachmentCount: (alloc.contractAttachments || []).length,
  }));
  const contractsReceived = contractStatuses.filter(c => c.hasNote || c.attachmentCount > 0).length;

  // --- Finance Summary ---
  const totalPrice = cabinAllocations.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalCommission = cabinAllocations.reduce((sum, a) => sum + (a.totalCommission || 0), 0);
  const totalCommissionReceived = cabinAllocations.reduce((sum, a) => sum + (a.commissionReceived || 0), 0);
  const statusCounts: Record<string, number> = {};
  for (const alloc of cabinAllocations) {
    const s = alloc.paymentStatus || 'unpaid';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  // --- Internal Notes ---
  const cabinNotes = cabinAllocations
    .filter(a => a.internalNotes?.trim())
    .map(a => ({ label: a.cabinLabel, number: a.cabinNumber, note: a.internalNotes!.trim() }));

  return (
    <>
      {/* Extras Summary — with collapse toggle for entire overview */}
      <div className="bg-amber-50 rounded-lg p-4">
        <div
          className={`flex items-center justify-between px-3 py-2 -mx-4 -mt-4 rounded-t-lg bg-amber-100 cursor-pointer select-none ${
            isCollapsed ? '-mb-4 rounded-b-lg' : 'mb-3'
          }`}
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Cabin Charter Overview</h3>
          </div>
          <div className="flex items-center gap-2">
            {hasExtras && (
              <span className="text-xs text-amber-600">{extrasMap.size} extra{extrasMap.size !== 1 ? 's' : ''}</span>
            )}
            {onToggleCollapse && (
              <ChevronDown className={`h-4 w-4 text-amber-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
            )}
          </div>
        </div>
        {!isCollapsed && (hasExtras ? (
          <div className="flex flex-wrap gap-2">
            {Array.from(extrasMap.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([extra, count]) => (
                <span
                  key={extra}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-sm rounded-full"
                >
                  {extra}
                  <span className="text-xs text-amber-600">({count} cabin{count !== 1 ? 's' : ''})</span>
                </span>
              ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No extras added to any cabin yet</p>
        ))}
      </div>

      {!isCollapsed && <>{/* Contract Status Summary */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center gap-2 px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-slate-200">
          <ScrollText className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">Charter Contract Status</h3>
          <span className="ml-auto text-xs text-slate-600">
            {contractsReceived}/{cabinAllocations.length} received
          </span>
        </div>
        <div className="space-y-1.5">
          {contractStatuses.map((cabin) => {
            const hasContract = cabin.hasNote || cabin.attachmentCount > 0;
            return (
              <div
                key={cabin.number}
                className="flex items-center gap-2 text-sm"
              >
                {hasContract ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                )}
                <span className="text-gray-700">Cabin {cabin.number}: {cabin.label}</span>
                {hasContract && (
                  <span className="text-xs text-gray-500">
                    {cabin.hasNote && 'Note'}
                    {cabin.hasNote && cabin.attachmentCount > 0 && ' · '}
                    {cabin.attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Paperclip className="h-3 w-3" />
                        {cabin.attachmentCount} file{cabin.attachmentCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                )}
                {!hasContract && (
                  <span className="text-xs text-gray-400">No contract</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Finance Summary */}
      <div className="bg-emerald-50 rounded-lg p-4">
        <div className="flex items-center gap-2 px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-emerald-100">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-800">Finance Summary</h3>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
            <div className="text-xs text-gray-500">Total Price</div>
            <div className="text-sm font-semibold text-gray-900">{fmtAmt(totalPrice, currency)}</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
            <div className="text-xs text-gray-500">Payment Status</div>
            <div className="text-sm font-medium text-gray-700">
              {Object.entries(statusCounts).map(([status, count], i) => (
                <span key={status}>
                  {i > 0 && ' · '}
                  {count} {paymentStatusLabels[status as keyof typeof paymentStatusLabels] || status}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
            <div className="text-xs text-gray-500">Total Commission (THB)</div>
            <div className="text-sm font-semibold text-gray-900">{fmtAmt(totalCommission, 'THB')}</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
            <div className="text-xs text-gray-500">Commission Received (THB)</div>
            <div className="text-sm font-semibold text-gray-900">{fmtAmt(totalCommissionReceived, 'THB')}</div>
          </div>
        </div>

        {/* Per-cabin rows */}
        <div className="space-y-1">
          {cabinAllocations.map((alloc) => {
            const statusLabel = paymentStatusLabels[alloc.paymentStatus] || alloc.paymentStatus;
            const isPaid = alloc.paymentStatus === 'paid';
            return (
              <div key={alloc.id} className="flex items-center justify-between text-sm py-1">
                <span className="text-gray-700">
                  Cabin {alloc.cabinNumber}: {alloc.cabinLabel}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{fmtAmt(alloc.price || 0, alloc.currency || currency)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isPaid ? 'bg-green-100 text-green-700' :
                    alloc.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Internal Notes Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 px-3 py-2 -mx-4 -mt-4 mb-3 rounded-t-lg bg-orange-50">
          <FileText className="h-4 w-4 text-orange-600" />
          <h3 className="text-sm font-semibold text-orange-800">Internal Notes</h3>
        </div>

        {/* Per-cabin notes preview */}
        {cabinNotes.length > 0 && (
          <div className="space-y-2 mb-3">
            <label className="block text-xs text-gray-500">Per-Cabin Notes</label>
            {cabinNotes.map((cn) => (
              <div key={cn.number} className="bg-white rounded-md border border-gray-200 px-3 py-2">
                <div className="text-xs font-medium text-gray-500 mb-0.5">Cabin {cn.number}: {cn.label}</div>
                <div className="text-sm text-gray-700 line-clamp-2">{cn.note}</div>
              </div>
            ))}
          </div>
        )}

        {/* Parent-level internal notes */}
        <label className="block text-xs text-gray-500 mb-1">Booking-Level Notes</label>
        <textarea
          rows={4}
          value={formData.internalNotes ?? ''}
          onChange={(e) => onChange('internalNotes', e.target.value)}
          disabled={!canEdit}
          placeholder="Add booking-level internal notes..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A8F] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 resize-y"
        />

        {/* Attachments */}
        {internalAttachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {internalAttachments.map((att, index) => (
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
                  {canEdit && onRemoveInternalAttachment && (
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
        {canEdit && onUploadInternalAttachment && (
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
      </div>
      </>}
    </>
  );
}
