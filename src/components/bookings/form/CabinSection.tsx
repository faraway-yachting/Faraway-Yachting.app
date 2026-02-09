'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BedDouble,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Users,
  DollarSign,
  Banknote,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  Package,
  ScrollText,
  User,
  MessageSquare,
  Upload,
  Eye,
  X,
  Download,
} from 'lucide-react';
import {
  CabinAllocation,
  CabinAllocationStatus,
  cabinAllocationStatusLabels,
  cabinAllocationStatusColors,
  PaymentStatus,
  paymentStatusLabels,
  BookingAttachment,
} from '@/data/booking/types';
import { bookingPaymentsApi, BookingPaymentExtended } from '@/lib/supabase/api/bookingPayments';
import { cashCollectionsApi, CashCollection } from '@/lib/supabase/api/cashCollections';
import { createClient } from '@/lib/supabase/client';
import { DynamicMultiSelect } from './DynamicMultiSelect';
import { DynamicSelect } from './DynamicSelect';
import type { PaymentRecord, BankAccountOption, CompanyOption } from './FinanceSection';

interface CabinSectionProps {
  bookingId?: string;
  cabinAllocations: CabinAllocation[];
  onAllocationsChange: (allocations: CabinAllocation[]) => void;
  canEdit: boolean;
  currency: string;
  bankAccounts: BankAccountOption[];
  companies: CompanyOption[];
  users: { id: string; full_name: string }[];
  onRecordCash?: (allocationId: string) => void;
  onCreateInvoice?: (allocation: CabinAllocation) => void;
  onCreateReceipt?: (allocation: CabinAllocation) => void;
}

// Payment methods list
const paymentMethods = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'promptpay', label: 'PromptPay' },
];

export default function CabinSection({
  bookingId,
  cabinAllocations,
  onAllocationsChange,
  canEdit,
  currency,
  bankAccounts,
  companies,
  users,
  onRecordCash,
  onCreateInvoice,
  onCreateReceipt,
}: CabinSectionProps) {
  const [expandedCabinId, setExpandedCabinId] = useState<string | null>(null);
  // Per-cabin payments: Map<allocationId, PaymentRecord[]>
  const [cabinPayments, setCabinPayments] = useState<Map<string, PaymentRecord[]>>(new Map());
  // Per-cabin cash collections: Map<allocationId, CashCollection[]>
  const [cabinCash, setCabinCash] = useState<Map<string, CashCollection[]>>(new Map());
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Load payments and cash for all cabin allocations
  useEffect(() => {
    if (!bookingId || cabinAllocations.length === 0) return;

    const savedAllocations = cabinAllocations.filter(a => a.id && !a.id.startsWith('temp-'));
    if (savedAllocations.length === 0) return;

    setLoadingPayments(true);
    Promise.all(
      savedAllocations.map(async (alloc) => {
        const [payments, cash] = await Promise.all([
          bookingPaymentsApi.getByAllocationId(alloc.id),
          cashCollectionsApi.getByAllocationId(alloc.id),
        ]);
        return { id: alloc.id, payments, cash };
      })
    ).then(results => {
      const pMap = new Map<string, PaymentRecord[]>();
      const cMap = new Map<string, CashCollection[]>();
      for (const { id, payments, cash } of results) {
        pMap.set(id, payments.map(r => ({
          id: r.id,
          paymentType: r.payment_type as 'deposit' | 'balance',
          amount: r.amount,
          currency: r.currency,
          dueDate: r.due_date || '',
          paidDate: r.paid_date || '',
          note: r.note || '',
          receiptId: r.receipt_id || undefined,
          paymentMethod: r.payment_method || undefined,
          bankAccountId: r.bank_account_id || undefined,
          syncedToReceipt: r.synced_to_receipt || false,
          needsAccountingAction: r.needs_accounting_action || false,
        })));
        cMap.set(id, cash);
      }
      setCabinPayments(pMap);
      setCabinCash(cMap);
    }).catch(console.error).finally(() => setLoadingPayments(false));
  }, [bookingId, cabinAllocations.length]);

  // Update a single allocation field
  const updateAllocation = (id: string, field: keyof CabinAllocation, value: any) => {
    onAllocationsChange(
      cabinAllocations.map(a => a.id === id ? { ...a, [field]: value } : a)
    );
  };

  // File upload helper (same pattern as BookingFormContainer)
  const uploadAttachments = async (files: File[], prefix: string): Promise<BookingAttachment[]> => {
    const supabase = createClient();
    const attachments: BookingAttachment[] = [];
    for (const file of files) {
      const ts = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${prefix}/${ts}_${safeName}`;
      const { error } = await supabase.storage
        .from('booking-attachments')
        .upload(path, file, { upsert: true });
      if (error) { console.error('Upload error:', error); continue; }
      const { data: urlData } = supabase.storage.from('booking-attachments').getPublicUrl(path);
      attachments.push({
        id: `${ts}_${safeName}`,
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
    return attachments;
  };

  // Add a payment to a cabin (immediate save if booking is saved)
  const addCabinPayment = async (allocationId: string, paymentType: 'deposit' | 'balance') => {
    const newPayment: PaymentRecord = {
      paymentType,
      amount: 0,
      currency,
      dueDate: '',
      paidDate: '',
      note: '',
    };

    // Save immediately if allocation is persisted
    if (bookingId && !allocationId.startsWith('temp-')) {
      try {
        const created = await bookingPaymentsApi.create({
          booking_id: bookingId,
          cabin_allocation_id: allocationId,
          payment_type: paymentType,
          amount: 0,
          currency,
        });
        newPayment.id = created.id;
      } catch (err) {
        console.error('Error creating cabin payment:', err);
        return;
      }
    }

    setCabinPayments(prev => {
      const updated = new Map(prev);
      const existing = updated.get(allocationId) || [];
      updated.set(allocationId, [...existing, newPayment]);
      return updated;
    });
  };

  // Update a cabin payment
  const updateCabinPayment = async (allocationId: string, paymentIndex: number, updates: Partial<PaymentRecord>) => {
    const payments = cabinPayments.get(allocationId) || [];
    const payment = payments[paymentIndex];
    if (!payment) return;

    const updatedPayment = { ...payment, ...updates };
    const updatedPayments = [...payments];
    updatedPayments[paymentIndex] = updatedPayment;

    setCabinPayments(prev => {
      const map = new Map(prev);
      map.set(allocationId, updatedPayments);
      return map;
    });

    // Persist if has an ID
    if (updatedPayment.id) {
      try {
        await bookingPaymentsApi.update(updatedPayment.id, {
          payment_type: updatedPayment.paymentType,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
          due_date: updatedPayment.dueDate || null,
          paid_date: updatedPayment.paidDate || null,
          note: updatedPayment.note || null,
          payment_method: updatedPayment.paymentMethod || undefined,
          bank_account_id: updatedPayment.bankAccountId || undefined,
        });

        // Auto-sync to receipt
        if (
          updatedPayment.paidDate &&
          updatedPayment.receiptId &&
          updatedPayment.paymentMethod &&
          !updatedPayment.syncedToReceipt &&
          updatedPayment.id
        ) {
          await bookingPaymentsApi.syncToReceipt(
            updatedPayment.id,
            updatedPayment.receiptId,
            updatedPayment.amount,
            updatedPayment.paidDate,
            updatedPayment.paymentMethod,
            updatedPayment.bankAccountId,
          );
          updatedPayments[paymentIndex] = { ...updatedPayment, syncedToReceipt: true };
          setCabinPayments(prev => {
            const map = new Map(prev);
            map.set(allocationId, [...updatedPayments]);
            return map;
          });
        }
      } catch (err) {
        console.error('Error updating cabin payment:', err);
      }
    }

    // Update allocation payment status
    updatePaymentStatus(allocationId, updatedPayments);
  };

  // Delete a cabin payment
  const deleteCabinPayment = async (allocationId: string, paymentIndex: number) => {
    const payments = cabinPayments.get(allocationId) || [];
    const payment = payments[paymentIndex];
    if (!payment) return;

    if (payment.id) {
      try {
        await bookingPaymentsApi.delete(payment.id);
      } catch (err) {
        console.error('Error deleting cabin payment:', err);
        return;
      }
    }

    const updatedPayments = payments.filter((_, i) => i !== paymentIndex);
    setCabinPayments(prev => {
      const map = new Map(prev);
      map.set(allocationId, updatedPayments);
      return map;
    });

    updatePaymentStatus(allocationId, updatedPayments);
  };

  // Auto-calculate payment status for an allocation
  const updatePaymentStatus = (allocationId: string, payments: PaymentRecord[]) => {
    const allocation = cabinAllocations.find(a => a.id === allocationId);
    if (!allocation) return;

    const totalPaid = payments.filter(p => p.paidDate && p.amount > 0).reduce((s, p) => s + p.amount, 0);
    const price = allocation.price || 0;

    let status: PaymentStatus;
    if (payments.length === 0 || totalPaid <= 0) {
      status = 'unpaid';
    } else if (price > 0 && totalPaid >= price) {
      status = 'paid';
    } else {
      status = 'partial';
    }

    updateAllocation(allocationId, 'paymentStatus', status);
  };

  // Commission auto-calc helper
  const handleCommissionRateChange = (allocationId: string, rateStr: string) => {
    const alloc = cabinAllocations.find(a => a.id === allocationId);
    if (!alloc) return;
    const rate = rateStr === '' ? undefined : parseFloat(rateStr);
    const base = alloc.price || 0;
    const total = base * (rate || 0) / 100;
    const received = total - (alloc.commissionDeduction || 0);
    onAllocationsChange(
      cabinAllocations.map(a => a.id === allocationId ? {
        ...a,
        commissionRate: rate,
        totalCommission: total,
        commissionReceived: received,
      } : a)
    );
  };

  const handleCommissionTotalChange = (allocationId: string, totalStr: string) => {
    const alloc = cabinAllocations.find(a => a.id === allocationId);
    if (!alloc) return;
    const total = totalStr === '' ? undefined : parseFloat(totalStr);
    const received = (total || 0) - (alloc.commissionDeduction || 0);
    onAllocationsChange(
      cabinAllocations.map(a => a.id === allocationId ? {
        ...a,
        totalCommission: total,
        commissionReceived: received,
      } : a)
    );
  };

  const handleCommissionDeductionChange = (allocationId: string, deductStr: string) => {
    const alloc = cabinAllocations.find(a => a.id === allocationId);
    if (!alloc) return;
    const deduction = deductStr === '' ? undefined : parseFloat(deductStr);
    const autoTotal = (alloc.price || 0) * (alloc.commissionRate || 0) / 100;
    const received = (alloc.totalCommission ?? autoTotal) - (deduction || 0);
    onAllocationsChange(
      cabinAllocations.map(a => a.id === allocationId ? {
        ...a,
        commissionDeduction: deduction,
        commissionReceived: received,
      } : a)
    );
  };

  // Summary stats
  const totalCabins = cabinAllocations.length;
  const bookedCabins = cabinAllocations.filter(a => a.status === 'booked').length;
  const totalRevenue = cabinAllocations.reduce((sum, a) => sum + (a.price || 0), 0);

  const toggleCabin = (id: string) => {
    setExpandedCabinId(prev => prev === id ? null : id);
  };

  return (
    <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BedDouble className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-900">Cabin Allocations</h3>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{bookedCabins}/{totalCabins} cabins booked</span>
          {totalRevenue > 0 && (
            <span className="font-medium">
              Total: {currency} {totalRevenue.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {loadingPayments && (
        <div className="flex justify-center py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      )}

      {/* Cabin Cards */}
      <div className="space-y-2">
        {cabinAllocations.map((allocation) => (
          <CabinAllocationCard
            key={allocation.id}
            allocation={allocation}
            isExpanded={expandedCabinId === allocation.id}
            onToggle={() => toggleCabin(allocation.id)}
            payments={cabinPayments.get(allocation.id) || []}
            cash={cabinCash.get(allocation.id) || []}
            canEdit={canEdit}
            currency={currency}
            bankAccounts={bankAccounts}
            users={users}
            bookingId={bookingId}
            updateAllocation={updateAllocation}
            addCabinPayment={addCabinPayment}
            updateCabinPayment={updateCabinPayment}
            deleteCabinPayment={deleteCabinPayment}
            handleCommissionRateChange={handleCommissionRateChange}
            handleCommissionTotalChange={handleCommissionTotalChange}
            handleCommissionDeductionChange={handleCommissionDeductionChange}
            uploadAttachments={uploadAttachments}
            onAllocationsChange={onAllocationsChange}
            allAllocations={cabinAllocations}
            onRecordCash={onRecordCash}
            onCreateInvoice={onCreateInvoice}
            onCreateReceipt={onCreateReceipt}
          />
        ))}
      </div>

      {/* Empty State */}
      {cabinAllocations.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <BedDouble className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>No cabin allocations</p>
          <p className="text-xs mt-1">Select a yacht with configured cabins to auto-populate</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CabinAllocationCard — collapsible card with all per-cabin sections
// ─────────────────────────────────────────────────────────────────────────────

interface CabinAllocationCardProps {
  allocation: CabinAllocation;
  isExpanded: boolean;
  onToggle: () => void;
  payments: PaymentRecord[];
  cash: CashCollection[];
  canEdit: boolean;
  currency: string;
  bankAccounts: BankAccountOption[];
  users: { id: string; full_name: string }[];
  bookingId?: string;
  updateAllocation: (id: string, field: keyof CabinAllocation, value: any) => void;
  addCabinPayment: (allocationId: string, paymentType: 'deposit' | 'balance') => void;
  updateCabinPayment: (allocationId: string, paymentIndex: number, updates: Partial<PaymentRecord>) => void;
  deleteCabinPayment: (allocationId: string, paymentIndex: number) => void;
  handleCommissionRateChange: (allocationId: string, rateStr: string) => void;
  handleCommissionTotalChange: (allocationId: string, totalStr: string) => void;
  handleCommissionDeductionChange: (allocationId: string, deductStr: string) => void;
  uploadAttachments: (files: File[], prefix: string) => Promise<BookingAttachment[]>;
  onAllocationsChange: (allocations: CabinAllocation[]) => void;
  allAllocations: CabinAllocation[];
  onRecordCash?: (allocationId: string) => void;
  onCreateInvoice?: (allocation: CabinAllocation) => void;
  onCreateReceipt?: (allocation: CabinAllocation) => void;
}

function CabinAllocationCard({
  allocation,
  isExpanded,
  onToggle,
  payments,
  cash,
  canEdit,
  currency,
  bankAccounts,
  users,
  bookingId,
  updateAllocation,
  addCabinPayment,
  updateCabinPayment,
  deleteCabinPayment,
  handleCommissionRateChange,
  handleCommissionTotalChange,
  handleCommissionDeductionChange,
  uploadAttachments,
  onAllocationsChange,
  allAllocations,
  onRecordCash,
  onCreateInvoice,
  onCreateReceipt,
}: CabinAllocationCardProps) {
  const contractFileRef = useRef<HTMLInputElement>(null);
  const internalFileRef = useRef<HTMLInputElement>(null);

  const statusColor = cabinAllocationStatusColors[allocation.status];
  const paidTotal = payments.filter(p => p.paidDate && p.amount > 0).reduce((s, p) => s + p.amount, 0);

  // File upload handlers
  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const prefix = bookingId
      ? `bookings/${bookingId}/cabin/${allocation.id}/contract`
      : `bookings/temp/cabin/${allocation.id}/contract`;
    const newAttachments = await uploadAttachments(Array.from(files), prefix);
    const existing = allocation.contractAttachments || [];
    updateAllocation(allocation.id, 'contractAttachments', [...existing, ...newAttachments]);
    if (contractFileRef.current) contractFileRef.current.value = '';
  };

  const handleRemoveContractAttachment = (index: number) => {
    const existing = [...(allocation.contractAttachments || [])];
    existing.splice(index, 1);
    updateAllocation(allocation.id, 'contractAttachments', existing);
  };

  const handleInternalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const prefix = bookingId
      ? `bookings/${bookingId}/cabin/${allocation.id}/internal`
      : `bookings/temp/cabin/${allocation.id}/internal`;
    const newAttachments = await uploadAttachments(Array.from(files), prefix);
    const existing = allocation.internalNoteAttachments || [];
    updateAllocation(allocation.id, 'internalNoteAttachments', [...existing, ...newAttachments]);
    if (internalFileRef.current) internalFileRef.current.value = '';
  };

  const handleRemoveInternalAttachment = (index: number) => {
    const existing = [...(allocation.internalNoteAttachments || [])];
    existing.splice(index, 1);
    updateAllocation(allocation.id, 'internalNoteAttachments', existing);
  };

  // Commission auto-calc values
  const autoTotal = (allocation.price || 0) * (allocation.commissionRate || 0) / 100;
  const autoReceived = (allocation.totalCommission ?? autoTotal) - (allocation.commissionDeduction || 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
            {cabinAllocationStatusLabels[allocation.status]}
          </span>
          <span className="font-medium text-gray-900 truncate">
            Cabin {allocation.cabinNumber}: {allocation.cabinLabel}
          </span>
          {allocation.numberOfGuests > 0 && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {allocation.numberOfGuests} guest{allocation.numberOfGuests !== 1 ? 's' : ''}
            </span>
          )}
          {allocation.guestNames && (
            <span className="text-sm text-gray-500 truncate">
              {allocation.guestNames}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {allocation.price != null && allocation.price > 0 && (
            <span className="text-sm font-medium text-gray-700">
              {allocation.currency} {allocation.price.toLocaleString()}
            </span>
          )}
          {allocation.paymentStatus && allocation.paymentStatus !== 'unpaid' && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              allocation.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
              allocation.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {paymentStatusLabels[allocation.paymentStatus]}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">

          {/* ── A. Guest & Source ── */}
          <div className="pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-400" />
              Guest & Source
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={allocation.status}
                  onChange={e => updateAllocation(allocation.id, 'status', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                >
                  <option value="available">Available</option>
                  <option value="held">Held</option>
                  <option value="booked">Booked</option>
                </select>
              </div>

              {/* Number of Guests */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Number of Guests</label>
                <input
                  type="number"
                  value={allocation.numberOfGuests || ''}
                  onChange={e => updateAllocation(allocation.id, 'numberOfGuests', parseInt(e.target.value) || 0)}
                  disabled={!canEdit}
                  min="0"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {/* Guest Names */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Guest Names</label>
                <textarea
                  value={allocation.guestNames || ''}
                  onChange={e => updateAllocation(allocation.id, 'guestNames', e.target.value)}
                  disabled={!canEdit}
                  rows={2}
                  placeholder="e.g., Rudolf & Bettie"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {/* Nationality */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nationality</label>
                <input
                  type="text"
                  value={allocation.nationality || ''}
                  onChange={e => updateAllocation(allocation.id, 'nationality', e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g., German"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {/* Guest Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Guest Notes</label>
                <input
                  type="text"
                  value={allocation.guestNotes || ''}
                  onChange={e => updateAllocation(allocation.id, 'guestNotes', e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g., couple, dietary needs"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {/* Agent Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={allocation.agentName || ''}
                  onChange={e => updateAllocation(allocation.id, 'agentName', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Agent or agency name"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {/* Contact Platform */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Platform</label>
                <DynamicSelect
                  category="contact_channel"
                  value={allocation.contactPlatform || ''}
                  onChange={(val) => updateAllocation(allocation.id, 'contactPlatform', val)}
                  disabled={!canEdit}
                  placeholder="Select..."
                />
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Info</label>
                <input
                  type="text"
                  value={allocation.contactInfo || ''}
                  onChange={e => updateAllocation(allocation.id, 'contactInfo', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Phone or email"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* ── B. Extras (amber) ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-amber-800">Extras</h4>
              </div>
              <DynamicMultiSelect
                category="extras"
                values={allocation.extras || []}
                onChange={(vals) => updateAllocation(allocation.id, 'extras', vals)}
                disabled={!canEdit}
                placeholder="Select extras (Taxi, BBQ, Diving...)"
              />
            </div>
          </div>

          {/* ── C. Charter Contract (slate) ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <ScrollText className="h-4 w-4 text-slate-600" />
                <h4 className="text-sm font-semibold text-slate-800">Charter Contract</h4>
              </div>
              <textarea
                value={allocation.contractNote || ''}
                onChange={e => updateAllocation(allocation.id, 'contractNote', e.target.value)}
                placeholder="Contract notes, terms, or reference..."
                disabled={!canEdit}
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-none mb-2"
              />
              {/* Contract attachments */}
              {(allocation.contractAttachments || []).length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {(allocation.contractAttachments || []).map((att, i) => (
                    <div key={att.id} className="flex items-center justify-between bg-white rounded-md border border-gray-200 px-3 py-1.5 text-sm">
                      <span className="text-gray-700 truncate flex-1">{att.name}</span>
                      <div className="flex items-center gap-1 ml-2">
                        <button type="button" onClick={() => window.open(att.url, '_blank', 'noopener,noreferrer')} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {canEdit && (
                          <button type="button" onClick={() => handleRemoveContractAttachment(i)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Remove">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {canEdit && (
                <>
                  <input ref={contractFileRef} type="file" multiple onChange={handleContractUpload} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                  <button type="button" onClick={() => contractFileRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg hover:border-gray-400 w-full justify-center">
                    <Upload className="h-3.5 w-3.5" /> Upload files
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── D. Booking Owner ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-400" />
              <h4 className="text-sm font-medium text-gray-700">Booking Owner</h4>
            </div>
            <select
              value={allocation.bookingOwner || ''}
              onChange={e => updateAllocation(allocation.id, 'bookingOwner', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            >
              <option value="">Select owner...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          {/* ── E. Finance ── */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-gray-400" />
              Finance
            </h4>

            {/* Price */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cabin Price</label>
                <input
                  type="number"
                  value={allocation.price ?? ''}
                  onChange={e => updateAllocation(allocation.id, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={!canEdit}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <select
                  value={allocation.currency || currency}
                  onChange={e => updateAllocation(allocation.id, 'currency', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                >
                  <option value="THB">THB</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            {/* Payment Summary */}
            {payments.length > 0 && (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className="text-gray-500">
                  Paid: {allocation.currency || currency} {paidTotal.toLocaleString()}
                  {allocation.price ? ` / ${allocation.price.toLocaleString()}` : ''}
                </span>
                {allocation.paymentStatus === 'paid' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {allocation.paymentStatus === 'partial' && <Clock className="h-4 w-4 text-yellow-500" />}
              </div>
            )}

            {/* Payment Records */}
            {payments.length > 0 && (
              <div className="space-y-2 mb-3">
                {payments.map((payment, idx) => (
                  <div key={payment.id || idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        payment.paymentType === 'deposit' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {payment.paymentType === 'deposit' ? 'Deposit' : 'Balance'}
                      </span>
                      {payment.paidDate && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      )}
                      {canEdit && (
                        <button onClick={() => deleteCabinPayment(allocation.id, idx)} className="p-1 text-red-400 hover:text-red-600 rounded">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Amount</label>
                        <input type="number" value={payment.amount || ''} onChange={e => updateCabinPayment(allocation.id, idx, { amount: parseFloat(e.target.value) || 0 })} disabled={!canEdit} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Due Date</label>
                        <input type="date" value={payment.dueDate || ''} onChange={e => updateCabinPayment(allocation.id, idx, { dueDate: e.target.value })} disabled={!canEdit} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Paid Date</label>
                        <input type="date" value={payment.paidDate || ''} onChange={e => updateCabinPayment(allocation.id, idx, { paidDate: e.target.value })} disabled={!canEdit} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Method</label>
                        <select value={payment.paymentMethod || ''} onChange={e => updateCabinPayment(allocation.id, idx, { paymentMethod: e.target.value })} disabled={!canEdit} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100">
                          <option value="">Select...</option>
                          {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      {bankAccounts.length > 0 && payment.paymentMethod === 'bank_transfer' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-0.5">Bank Account</label>
                          <select value={payment.bankAccountId || ''} onChange={e => updateCabinPayment(allocation.id, idx, { bankAccountId: e.target.value })} disabled={!canEdit} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100">
                            <option value="">Select bank account...</option>
                            {bankAccounts.map(ba => <option key={ba.id} value={ba.id}>{ba.account_name}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-0.5">Note</label>
                        <input type="text" value={payment.note || ''} onChange={e => updateCabinPayment(allocation.id, idx, { note: e.target.value })} disabled={!canEdit} placeholder="Payment note" className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Payment Buttons */}
            {canEdit && (
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => addCabinPayment(allocation.id, 'deposit')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors">
                  <Plus className="h-3 w-3" /> Add Deposit
                </button>
                <button onClick={() => addCabinPayment(allocation.id, 'balance')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors">
                  <Plus className="h-3 w-3" /> Add Balance
                </button>
                {onRecordCash && (
                  <button onClick={() => onRecordCash(allocation.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors">
                    <Banknote className="h-3 w-3" /> Record Cash
                  </button>
                )}
              </div>
            )}

            {/* Cash Collections */}
            {cash.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Cash Collections</p>
                <div className="space-y-1">
                  {cash.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-green-50 rounded px-3 py-1.5 text-sm">
                      <span className="text-green-800">{c.currency} {c.amount.toLocaleString()}</span>
                      <span className="text-xs text-green-600">
                        {new Date(c.collected_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Actions */}
            {canEdit && bookingId && !allocation.id.startsWith('temp-') && (
              <div className="flex items-center gap-2">
                {onCreateInvoice && (
                  <button onClick={() => onCreateInvoice(allocation)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                    <FileText className="h-3 w-3" /> Create Invoice
                  </button>
                )}
                {onCreateReceipt && (
                  <button onClick={() => onCreateReceipt(allocation)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                    <Receipt className="h-3 w-3" /> Create Receipt
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── F. Commission (teal) ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-teal-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-teal-800">Booking Owner Commission</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rate (%)</label>
                  <input
                    type="number" step="0.01" min="0" max="100"
                    value={allocation.commissionRate ?? ''}
                    onChange={e => handleCommissionRateChange(allocation.id, e.target.value)}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={allocation.totalCommission ?? (autoTotal || '')}
                    onChange={e => handleCommissionTotalChange(allocation.id, e.target.value)}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deduction</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={allocation.commissionDeduction ?? ''}
                    onChange={e => handleCommissionDeductionChange(allocation.id, e.target.value)}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Received</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={allocation.commissionReceived ?? (autoReceived || '')}
                    onChange={e => updateAllocation(allocation.id, 'commissionReceived', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── G. Internal Note (orange) ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 px-2 py-1.5 -mx-3 -mt-3 mb-2 rounded-t-lg bg-orange-50">
                <FileText className="h-4 w-4 text-orange-600" />
                <h4 className="text-sm font-semibold text-orange-800">Internal Note</h4>
              </div>
              <textarea
                rows={3}
                value={allocation.internalNotes ?? ''}
                onChange={e => updateAllocation(allocation.id, 'internalNotes', e.target.value)}
                disabled={!canEdit}
                placeholder="Add internal notes here..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y"
              />
              {/* Internal note attachments */}
              {(allocation.internalNoteAttachments || []).length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {(allocation.internalNoteAttachments || []).map((att, i) => (
                    <div key={att.id} className="flex items-center justify-between bg-white rounded-md border border-gray-200 px-3 py-1.5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline text-indigo-600">{att.name}</a>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-gray-600" title="Download">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {canEdit && (
                          <button type="button" onClick={() => handleRemoveInternalAttachment(i)} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {canEdit && (
                <div className="mt-2">
                  <input ref={internalFileRef} type="file" multiple onChange={handleInternalUpload} className="hidden" />
                  <button type="button" onClick={() => internalFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                    <Upload className="h-3.5 w-3.5" /> Upload attachments
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── H. Customer Notes (rose) ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 px-2 py-1.5 -mx-3 -mt-3 mb-2 rounded-t-lg bg-rose-50">
                <MessageSquare className="h-4 w-4 text-rose-600" />
                <h4 className="text-sm font-semibold text-rose-800">Customer Notes</h4>
                <span className="text-xs text-rose-400 ml-1">Notes visible to the customer</span>
              </div>
              <textarea
                rows={2}
                value={allocation.customerNotes ?? ''}
                onChange={e => updateAllocation(allocation.id, 'customerNotes', e.target.value)}
                disabled={!canEdit}
                placeholder="Add notes visible to the customer..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 resize-y"
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
