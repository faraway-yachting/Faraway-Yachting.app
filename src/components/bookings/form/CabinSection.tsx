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
  Search,
  Circle,
} from 'lucide-react';
import {
  CabinAllocation,
  CabinAllocationStatus,
  cabinAllocationStatusLabels,
  cabinAllocationStatusColors,
  PaymentStatus,
  paymentStatusLabels,
  BookingAttachment,
  ProjectCabin,
} from '@/data/booking/types';
import { bookingPaymentsApi, BookingPaymentExtended } from '@/lib/supabase/api/bookingPayments';
import { cashCollectionsApi, CashCollection } from '@/lib/supabase/api/cashCollections';
import { contactsApi } from '@/lib/supabase/api/contacts';
import { bookingAgenciesApi } from '@/lib/supabase/api/bookingAgencies';
import { projectCabinsApi } from '@/lib/supabase/api/projectCabins';
import { createClient } from '@/lib/supabase/client';
import { DynamicSelect } from './DynamicSelect';
import { ExtraItemsEditor } from './ExtraItemsEditor';
import type { PaymentRecord, BankAccountOption, CompanyOption } from './FinanceSection';
import { ExchangeRateField } from '@/components/shared/ExchangeRateField';
import { Currency } from '@/data/company/types';
import { FxRateSource } from '@/data/exchangeRate/types';
import { getExchangeRate, getTodayISO } from '@/lib/exchangeRate/service';

interface AgencyContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CabinSectionProps {
  bookingId?: string;
  projectId?: string;
  cabinAllocations: CabinAllocation[];
  onAllocationsChange: (allocations: CabinAllocation[]) => void;
  canEdit: boolean;
  currency: string;
  dateFrom?: string;
  bankAccounts: BankAccountOption[];
  companies: CompanyOption[];
  users: { id: string; full_name: string }[];
  onRecordCash?: (allocationId: string) => void;
  onCreateInvoice?: (allocation: CabinAllocation) => void;
  onCreateReceipt?: (allocation: CabinAllocation) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Payment methods list
const paymentMethods = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'promptpay', label: 'PromptPay' },
];

// Commission base: THB charter fee (minus agency commission) + commissionable extras profit (converted if non-THB)
function getThbCommissionBase(alloc: CabinAllocation, defaultCurrency: string): { charterBase: number; extrasBase: number; total: number } {
  const cabinCurrency = alloc.currency || defaultCurrency;
  const charterFee = alloc.charterFee || 0;
  const fxRate = alloc.fxRate || 0;
  const charterFeeThb = cabinCurrency !== 'THB' ? charterFee * fxRate : charterFee;
  // Deduct agency commission (in THB) from charter fee base
  const agencyThb = alloc.agencyCommissionThb || 0;
  const charterBase = charterFeeThb - agencyThb;

  // Extras: commissionable items profit in THB
  const extraItems = alloc.extraItems || [];
  const extrasBase = extraItems
    .filter(item => item.commissionable !== false)
    .reduce((sum, item) => {
      const profit = (item.sellingPrice || 0) - (item.cost || 0);
      const itemCur = item.currency || cabinCurrency;
      if (itemCur === 'THB') return sum + profit;
      if (item.fxRate) return sum + profit * item.fxRate;
      if (itemCur === cabinCurrency && fxRate) return sum + profit * fxRate;
      return sum + profit;
    }, 0);

  return { charterBase, extrasBase, total: charterBase + extrasBase };
}

// Default commission rate based on booking source type
function getDefaultCommissionRate(bookingSourceType?: string): number {
  if (!bookingSourceType || bookingSourceType === 'direct') return 2;
  return 1; // agency
}

export default function CabinSection({
  bookingId,
  projectId,
  cabinAllocations,
  onAllocationsChange,
  canEdit,
  currency,
  dateFrom,
  bankAccounts,
  companies,
  users,
  onRecordCash,
  onCreateInvoice,
  onCreateReceipt,
  isCollapsed,
  onToggleCollapse,
}: CabinSectionProps) {
  const [expandedCabinId, setExpandedCabinId] = useState<string | null>(null);
  // Per-cabin payments: Map<allocationId, PaymentRecord[]>
  const [cabinPayments, setCabinPayments] = useState<Map<string, PaymentRecord[]>>(new Map());
  // Per-cabin cash collections: Map<allocationId, CashCollection[]>
  const [cabinCash, setCabinCash] = useState<Map<string, CashCollection[]>>(new Map());
  const [loadingPayments, setLoadingPayments] = useState(false);
  // Per-cabin FX rate loading/error state
  const [fxState, setFxState] = useState<Map<string, { isLoading: boolean; error: string | null }>>(new Map());
  // Agencies for Direct/Agency dropdown
  const [agencies, setAgencies] = useState<AgencyContact[]>([]);

  // Yacht register cabins — for the "+ Add Cabin" picker
  const [projectCabins, setProjectCabins] = useState<ProjectCabin[]>([]);
  const [showCabinPicker, setShowCabinPicker] = useState(false);

  // Load yacht cabins from register when projectId changes
  useEffect(() => {
    if (!projectId) {
      setProjectCabins([]);
      return;
    }
    projectCabinsApi.getByProjectId(projectId).then(setProjectCabins).catch(console.error);
  }, [projectId]);

  // Compute unallocated yacht cabins (not yet in current allocations)
  const allocatedCabinIds = new Set(cabinAllocations.map(a => a.projectCabinId).filter(Boolean));
  const unallocatedCabins = projectCabins.filter(pc => !allocatedCabinIds.has(pc.id));

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

  // Customers for Direct guest name search
  const [customers, setCustomers] = useState<AgencyContact[]>([]);

  // Load agencies and customers on mount
  useEffect(() => {
    Promise.all([
      contactsApi.getAgencies(),
      contactsApi.getCustomers(),
    ]).then(([agenciesData, customersData]) => {
      setAgencies(agenciesData as AgencyContact[]);
      setCustomers(customersData as AgencyContact[]);
    }).catch(err => console.error('Error loading contacts:', err));
  }, []);

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

  // Commission auto-calc helper — uses THB charter fee as base
  const handleCommissionRateChange = (allocationId: string, rateStr: string) => {
    const alloc = cabinAllocations.find(a => a.id === allocationId);
    if (!alloc) return;
    const rate = rateStr === '' ? undefined : parseFloat(rateStr);
    const { total: base } = getThbCommissionBase(alloc, currency);
    const total = Math.round(base * (rate || 0)) / 100;
    const received = Math.round((total - (alloc.commissionDeduction || 0)) * 100) / 100;
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
    const received = Math.round(((total || 0) - (alloc.commissionDeduction || 0)) * 100) / 100;
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
    const { total: base } = getThbCommissionBase(alloc, currency);
    const autoTotal = Math.round(base * (alloc.commissionRate || 0)) / 100;
    const received = Math.round(((alloc.totalCommission ?? autoTotal) - (deduction || 0)) * 100) / 100;
    onAllocationsChange(
      cabinAllocations.map(a => a.id === allocationId ? {
        ...a,
        commissionDeduction: deduction,
        commissionReceived: received,
      } : a)
    );
  };

  // Agency commission handlers (per-cabin)
  // Both handlers merge agency + commission recalc into a single onAllocationsChange
  // to avoid stale-closure bugs from setTimeout.
  const handleAgencyCommissionRateChange = (allocationId: string, rateStr: string) => {
    const alloc = cabinAllocations.find(a => a.id === allocationId);
    if (!alloc) return;
    const rate = rateStr === '' ? undefined : parseFloat(rateStr);
    const charterFee = alloc.charterFee || 0;
    const amount = rate ? Math.round(charterFee * rate) / 100 : undefined;
    const cabinCurrency = alloc.currency || currency;
    const fx = alloc.fxRate || 0;
    const thb = amount ? (cabinCurrency === 'THB' ? amount : Math.round(amount * fx * 100) / 100) : undefined;
    // Build updated allocation, then recalculate commission base from it
    const updated = { ...alloc, agencyCommissionRate: rate, agencyCommissionAmount: amount, agencyCommissionThb: thb };
    const { total: base } = getThbCommissionBase(updated, currency);
    const commRate = alloc.commissionRate || 0;
    const total = Math.round(base * commRate) / 100;
    const received = Math.round((total - (alloc.commissionDeduction || 0)) * 100) / 100;
    onAllocationsChange(
      cabinAllocations.map(a => a.id === allocationId ? {
        ...updated,
        totalCommission: total,
        commissionReceived: received,
      } : a)
    );
  };

  const handleAgencyCommissionAmountChange = (allocationId: string, amountStr: string) => {
    const alloc = cabinAllocations.find(a => a.id === allocationId);
    if (!alloc) return;
    const amount = amountStr === '' ? undefined : parseFloat(amountStr);
    const cabinCurrency = alloc.currency || currency;
    const fx = alloc.fxRate || 0;
    const thb = amount ? (cabinCurrency === 'THB' ? amount : Math.round(amount * fx * 100) / 100) : undefined;
    const updated = { ...alloc, agencyCommissionAmount: amount, agencyCommissionThb: thb };
    const { total: base } = getThbCommissionBase(updated, currency);
    const commRate = alloc.commissionRate || 0;
    const total = Math.round(base * commRate) / 100;
    const received = Math.round((total - (alloc.commissionDeduction || 0)) * 100) / 100;
    onAllocationsChange(
      cabinAllocations.map(a => a.id === allocationId ? {
        ...updated,
        totalCommission: total,
        commissionReceived: received,
      } : a)
    );
  };

  // Fetch FX rate for a specific cabin allocation
  const handleFetchFxRate = async (allocationId: string) => {
    const alloc = cabinAllocations.find(a => a.id === allocationId);
    if (!alloc) return;
    const cabinCurrency = alloc.currency || currency;
    if (cabinCurrency === 'THB') return;

    setFxState(prev => new Map(prev).set(allocationId, { isLoading: true, error: null }));
    const rateDate = dateFrom || getTodayISO();
    const result = await getExchangeRate(cabinCurrency as Currency, rateDate);

    if (result.success && result.rate) {
      setFxState(prev => new Map(prev).set(allocationId, { isLoading: false, error: null }));
      updateCabinFinance(allocationId, {
        fxRate: result.rate!,
        fxRateSource: (result.source || 'api') as string,
      });
    } else {
      setFxState(prev => new Map(prev).set(allocationId, {
        isLoading: false,
        error: result.error || 'Failed to fetch rate',
      }));
    }
  };

  const handleManualFxRate = (allocationId: string, rate: number) => {
    setFxState(prev => new Map(prev).set(allocationId, { isLoading: false, error: null }));
    updateCabinFinance(allocationId, { fxRate: rate, fxRateSource: 'manual' });
  };

  // Update finance fields with auto-calculation of price and thbTotalPrice
  const updateCabinFinance = (allocationId: string, updates: Partial<CabinAllocation>) => {
    onAllocationsChange(
      cabinAllocations.map(a => {
        if (a.id !== allocationId) return a;
        const merged = { ...a, ...updates };
        const charterFee = merged.charterFee || 0;
        const adminFee = merged.adminFee || 0;
        const totalPrice = charterFee + adminFee;
        const cabinCurrency = merged.currency || currency;
        const fxRate = merged.fxRate || 0;
        const thbTotalPrice = cabinCurrency !== 'THB' && fxRate > 0 ? totalPrice * fxRate : (cabinCurrency === 'THB' ? totalPrice : undefined);
        // Recalculate commission if rate is set (uses charter fee + extras profit)
        const { total: commissionBase } = getThbCommissionBase(merged, currency);
        const totalCommission = Math.round(commissionBase * (merged.commissionRate || 0)) / 100;
        const commissionReceived = Math.round((totalCommission - (merged.commissionDeduction || 0)) * 100) / 100;
        return {
          ...merged,
          price: totalPrice,
          thbTotalPrice: thbTotalPrice,
          totalCommission,
          commissionReceived,
        };
      })
    );
  };

  // Summary stats
  const totalCabins = cabinAllocations.length;
  const bookedCabins = cabinAllocations.filter(a => a.status === 'booked').length;
  const totalRevenue = cabinAllocations.reduce((sum, a) => sum + (a.thbTotalPrice || a.price || 0), 0);

  const toggleCabin = (id: string) => {
    setExpandedCabinId(prev => prev === id ? null : id);
  };

  return (
    <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
      {/* Section Header */}
      <div
        className={`flex items-center justify-between cursor-pointer select-none ${isCollapsed ? '' : 'mb-4'}`}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <BedDouble className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-900">Cabin Allocations</h3>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{bookedCabins}/{totalCabins} cabins booked</span>
          {totalRevenue > 0 && (
            <span className="font-medium">
              Total: THB {totalRevenue.toLocaleString()}
            </span>
          )}
          {onToggleCollapse && (
            <ChevronDown className={`h-4 w-4 text-indigo-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
          )}
        </div>
      </div>

      {!isCollapsed && <>{loadingPayments && (
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
            dateFrom={dateFrom}
            bankAccounts={bankAccounts}
            users={users}
            agencies={agencies}
            customers={customers}
            bookingId={bookingId}
            updateAllocation={updateAllocation}
            updateCabinFinance={updateCabinFinance}
            handleFetchFxRate={handleFetchFxRate}
            handleManualFxRate={handleManualFxRate}
            fxLoading={fxState.get(allocation.id)?.isLoading || false}
            fxError={fxState.get(allocation.id)?.error || null}
            addCabinPayment={addCabinPayment}
            updateCabinPayment={updateCabinPayment}
            deleteCabinPayment={deleteCabinPayment}
            handleCommissionRateChange={handleCommissionRateChange}
            handleCommissionTotalChange={handleCommissionTotalChange}
            handleCommissionDeductionChange={handleCommissionDeductionChange}
            handleAgencyCommissionRateChange={handleAgencyCommissionRateChange}
            handleAgencyCommissionAmountChange={handleAgencyCommissionAmountChange}
            uploadAttachments={uploadAttachments}
            onAllocationsChange={onAllocationsChange}
            allAllocations={cabinAllocations}
            onRecordCash={onRecordCash}
            onCreateInvoice={onCreateInvoice}
            onCreateReceipt={onCreateReceipt}
            onAddAgency={(agency) => setAgencies(prev => [...prev, agency])}
            onDelete={() => {
              onAllocationsChange(cabinAllocations.filter(a => a.id !== allocation.id));
              if (expandedCabinId === allocation.id) setExpandedCabinId(null);
            }}
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

      {/* Add Cabin */}
      {canEdit && (
        <div className="relative mt-3">
          {unallocatedCabins.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setShowCabinPicker(!showCabinPicker)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-indigo-300 text-sm font-medium text-indigo-600 hover:bg-indigo-100 hover:border-indigo-400 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Cabin
                <ChevronDown className={`h-4 w-4 transition-transform ${showCabinPicker ? 'rotate-180' : ''}`} />
              </button>
              {showCabinPicker && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                  {unallocatedCabins.map((pc) => (
                    <button
                      key={pc.id}
                      type="button"
                      onClick={() => {
                        const newCabin: CabinAllocation = {
                          id: `temp-${Date.now()}`,
                          bookingId: bookingId || '',
                          projectCabinId: pc.id,
                          cabinLabel: pc.cabinName,
                          cabinNumber: pc.cabinNumber,
                          status: 'available' as CabinAllocationStatus,
                          numberOfGuests: 0,
                          currency: currency,
                          paymentStatus: 'unpaid' as PaymentStatus,
                          sortOrder: pc.sortOrder,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };
                        onAllocationsChange([...cabinAllocations, newCabin]);
                        setExpandedCabinId(newCabin.id);
                        setShowCabinPicker(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors flex items-center gap-3"
                    >
                      <BedDouble className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{pc.cabinName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0 bg-indigo-100 text-indigo-700 text-xs rounded">
                            Cabin {pc.cabinNumber}
                          </span>
                          {pc.isEnsuite && (
                            <span className="px-1.5 py-0 bg-teal-100 text-teal-700 text-xs rounded">
                              Ensuite
                            </span>
                          )}
                          {pc.position && (
                            <span className="text-xs text-gray-400">{pc.position}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">Max {pc.maxGuests}</span>
                    </button>
                  ))}
                  {/* Custom cabin option */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextNumber = cabinAllocations.length > 0
                        ? Math.max(...cabinAllocations.map(a => a.cabinNumber)) + 1
                        : 1;
                      const newCabin: CabinAllocation = {
                        id: `temp-${Date.now()}`,
                        bookingId: bookingId || '',
                        cabinLabel: `Cabin ${nextNumber}`,
                        cabinNumber: nextNumber,
                        status: 'available' as CabinAllocationStatus,
                        numberOfGuests: 0,
                        currency: currency,
                        paymentStatus: 'unpaid' as PaymentStatus,
                        sortOrder: nextNumber,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      };
                      onAllocationsChange([...cabinAllocations, newCabin]);
                      setExpandedCabinId(newCabin.id);
                      setShowCabinPicker(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-t border-gray-200 text-gray-500"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">Add Custom Cabin</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                const nextNumber = cabinAllocations.length > 0
                  ? Math.max(...cabinAllocations.map(a => a.cabinNumber)) + 1
                  : 1;
                const newCabin: CabinAllocation = {
                  id: `temp-${Date.now()}`,
                  bookingId: bookingId || '',
                  cabinLabel: `Cabin ${nextNumber}`,
                  cabinNumber: nextNumber,
                  status: 'available' as CabinAllocationStatus,
                  numberOfGuests: 0,
                  currency: currency,
                  paymentStatus: 'unpaid' as PaymentStatus,
                  sortOrder: nextNumber,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                onAllocationsChange([...cabinAllocations, newCabin]);
                setExpandedCabinId(newCabin.id);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-indigo-300 text-sm font-medium text-indigo-600 hover:bg-indigo-100 hover:border-indigo-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Cabin
            </button>
          )}
        </div>
      )}
      </>}
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
  dateFrom?: string;
  bankAccounts: BankAccountOption[];
  users: { id: string; full_name: string }[];
  agencies: AgencyContact[];
  customers: AgencyContact[];
  bookingId?: string;
  updateAllocation: (id: string, field: keyof CabinAllocation, value: any) => void;
  updateCabinFinance: (allocationId: string, updates: Partial<CabinAllocation>) => void;
  handleFetchFxRate: (allocationId: string) => void;
  handleManualFxRate: (allocationId: string, rate: number) => void;
  fxLoading: boolean;
  fxError: string | null;
  addCabinPayment: (allocationId: string, paymentType: 'deposit' | 'balance') => void;
  updateCabinPayment: (allocationId: string, paymentIndex: number, updates: Partial<PaymentRecord>) => void;
  deleteCabinPayment: (allocationId: string, paymentIndex: number) => void;
  handleCommissionRateChange: (allocationId: string, rateStr: string) => void;
  handleCommissionTotalChange: (allocationId: string, totalStr: string) => void;
  handleCommissionDeductionChange: (allocationId: string, deductStr: string) => void;
  handleAgencyCommissionRateChange: (allocationId: string, rateStr: string) => void;
  handleAgencyCommissionAmountChange: (allocationId: string, amountStr: string) => void;
  uploadAttachments: (files: File[], prefix: string) => Promise<BookingAttachment[]>;
  onAllocationsChange: (allocations: CabinAllocation[]) => void;
  allAllocations: CabinAllocation[];
  onRecordCash?: (allocationId: string) => void;
  onCreateInvoice?: (allocation: CabinAllocation) => void;
  onCreateReceipt?: (allocation: CabinAllocation) => void;
  onDelete?: () => void;
  onAddAgency?: (agency: AgencyContact) => void;
}

function CabinAllocationCard({
  allocation,
  isExpanded,
  onToggle,
  payments,
  cash,
  canEdit,
  currency,
  dateFrom,
  bankAccounts,
  users,
  agencies,
  customers,
  bookingId,
  updateAllocation,
  updateCabinFinance,
  handleFetchFxRate,
  handleManualFxRate,
  fxLoading,
  fxError,
  addCabinPayment,
  updateCabinPayment,
  deleteCabinPayment,
  handleCommissionRateChange,
  handleCommissionTotalChange,
  handleCommissionDeductionChange,
  handleAgencyCommissionRateChange,
  handleAgencyCommissionAmountChange,
  uploadAttachments,
  onAllocationsChange,
  allAllocations,
  onRecordCash,
  onCreateInvoice,
  onCreateReceipt,
  onDelete,
  onAddAgency,
}: CabinAllocationCardProps) {
  const contractFileRef = useRef<HTMLInputElement>(null);
  const internalFileRef = useRef<HTMLInputElement>(null);
  const guestSearchRef = useRef<HTMLDivElement>(null);
  const agencySearchRef = useRef<HTMLDivElement>(null);

  // Guest contact search state (Direct mode) — stored in agentName field
  const [guestSearch, setGuestSearch] = useState(
    (allocation.bookingSourceType || 'direct') === 'direct' ? (allocation.agentName || '') : ''
  );
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  // Agency search state
  const [agencySearch, setAgencySearch] = useState(
    allocation.bookingSourceType === 'agency' ? (allocation.agentName || '') : ''
  );
  const [showAgencyDropdown, setShowAgencyDropdown] = useState(false);
  const [showNewAgencyForm, setShowNewAgencyForm] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newAgencyEmail, setNewAgencyEmail] = useState('');
  const [newAgencyPhone, setNewAgencyPhone] = useState('');
  const [isCreatingAgency, setIsCreatingAgency] = useState(false);

  // Sync guestSearch when allocation.agentName changes externally
  useEffect(() => {
    if ((allocation.bookingSourceType || 'direct') === 'direct' && allocation.agentName !== undefined && allocation.agentName !== guestSearch) {
      setGuestSearch(allocation.agentName || '');
    }
  }, [allocation.agentName, allocation.bookingSourceType]);

  // Close guest dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (guestSearchRef.current && !guestSearchRef.current.contains(event.target as Node)) {
        setShowGuestDropdown(false);
      }
    };
    if (showGuestDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGuestDropdown]);

  // Sync agencySearch when allocation.agentName changes externally (agency mode)
  useEffect(() => {
    if (allocation.bookingSourceType === 'agency' && allocation.agentName !== undefined && allocation.agentName !== agencySearch) {
      setAgencySearch(allocation.agentName || '');
    }
  }, [allocation.agentName, allocation.bookingSourceType]);

  // Close agency dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agencySearchRef.current && !agencySearchRef.current.contains(event.target as Node)) {
        setShowAgencyDropdown(false);
      }
    };
    if (showAgencyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAgencyDropdown]);

  const filteredAgencies = agencies.filter(a =>
    a.name.toLowerCase().includes((agencySearch || '').toLowerCase())
  );

  const handleAgencySelect = (agency: AgencyContact) => {
    updateAllocation(allocation.id, 'agentName', agency.name);
    setAgencySearch(agency.name);
    setShowAgencyDropdown(false);
  };

  const handleCreateAgency = async () => {
    if (!newAgencyName.trim()) return;
    setIsCreatingAgency(true);
    try {
      const newContact = await contactsApi.create({
        name: newAgencyName.trim(),
        type: ['agency'],
        email: newAgencyEmail.trim() || null,
        phone: newAgencyPhone.trim() || null,
        is_active: true,
      });
      await bookingAgenciesApi.create({
        contact_id: newContact.id,
        is_active: true,
        default_currency: 'THB',
      });
      const agencyContact: AgencyContact = { id: newContact.id, name: newContact.name, email: newContact.email || undefined, phone: newContact.phone || undefined };
      onAddAgency?.(agencyContact);
      handleAgencySelect(agencyContact);
      setNewAgencyName('');
      setNewAgencyEmail('');
      setNewAgencyPhone('');
      setShowNewAgencyForm(false);
    } catch (error) {
      console.error('Error creating agency:', error);
      alert('Failed to create agency');
    } finally {
      setIsCreatingAgency(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes((guestSearch || '').toLowerCase()) ||
    (c.email?.toLowerCase().includes((guestSearch || '').toLowerCase()))
  );

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

  // Agency commission derived values
  const isAgencyCabin = allocation.bookingSourceType === 'agency';
  const cabinCurrency = allocation.currency || currency;
  const cabinCharterFee = allocation.charterFee || 0;
  const cabinFxRate = allocation.fxRate || 0;
  const agencyAutoAmt = allocation.agencyCommissionRate
    ? Math.round(cabinCharterFee * allocation.agencyCommissionRate) / 100
    : 0;
  const agencyAmt = allocation.agencyCommissionAmount ?? agencyAutoAmt;
  const agencyThbCalc = agencyAmt ? (cabinCurrency === 'THB' ? agencyAmt : agencyAmt * cabinFxRate) : 0;
  const cabinNetRevenue = cabinCharterFee - agencyAmt;
  const cabinCharterFeeThb = cabinCurrency !== 'THB' ? cabinCharterFee * cabinFxRate : cabinCharterFee;
  const cabinNetRevenueThb = cabinCharterFeeThb - (allocation.agencyCommissionThb || 0);

  // Commission auto-calc values
  const { charterBase: commCharterBase, extrasBase: commExtrasBase, total: commBase } = getThbCommissionBase(allocation, currency);
  const defaultRate = getDefaultCommissionRate(allocation.bookingSourceType);
  const autoTotal = Math.round(commBase * (allocation.commissionRate || 0)) / 100;
  const autoReceived = Math.round(((allocation.totalCommission ?? autoTotal) - (allocation.commissionDeduction || 0)) * 100) / 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Collapsed Header */}
      <div className="flex items-center">
        <div
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
          className="flex-1 px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) updateAllocation(allocation.id, 'isCompleted', !allocation.isCompleted);
              }}
              className="flex-shrink-0 hover:scale-110 transition-transform"
              disabled={!canEdit}
            >
              {allocation.isCompleted
                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : <Circle className="h-5 w-5 text-gray-400" />
              }
            </button>
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
        </div>
        {canEdit && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remove Cabin ${allocation.cabinNumber}: ${allocation.cabinLabel}?`)) {
                onDelete();
              }
            }}
            className="px-3 py-3 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
            title="Remove cabin"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">

          {/* ── Cabin Info ── */}
          <div className="pt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cabin Label</label>
              <input
                type="text"
                value={allocation.cabinLabel}
                onChange={e => updateAllocation(allocation.id, 'cabinLabel', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cabin Number</label>
              <input
                type="number"
                value={allocation.cabinNumber}
                onChange={e => updateAllocation(allocation.id, 'cabinNumber', parseInt(e.target.value) || 1)}
                disabled={!canEdit}
                min="1"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* ── A. Guest & Source ── */}
          <div>
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

              {/* Direct / Agency Toggle */}
              <div className="col-span-2 pt-2 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-600 mb-2">Booking Type</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={(allocation.bookingSourceType || 'direct') === 'direct'}
                      onChange={() => {
                        onAllocationsChange(
                          allAllocations.map(a => a.id === allocation.id
                            ? { ...a, bookingSourceType: 'direct' as const, agentName: '' }
                            : a)
                        );
                      }}
                      disabled={!canEdit}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Direct Booking</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={allocation.bookingSourceType === 'agency'}
                      onChange={() => updateAllocation(allocation.id, 'bookingSourceType', 'agency')}
                      disabled={!canEdit}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Agency</span>
                  </label>
                </div>
              </div>

              {/* Agency dropdown - only when Agency is selected */}
              {allocation.bookingSourceType === 'agency' && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Agency</label>
                  <div className="relative" ref={agencySearchRef}>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={agencySearch}
                        onChange={(e) => {
                          setAgencySearch(e.target.value);
                          setShowAgencyDropdown(true);
                          if (!e.target.value) {
                            updateAllocation(allocation.id, 'agentName', '');
                          }
                        }}
                        onFocus={() => setShowAgencyDropdown(true)}
                        placeholder="Search agency..."
                        disabled={!canEdit}
                        className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                      />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setShowNewAgencyForm(true)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Add new agency"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Agency search dropdown */}
                    {showAgencyDropdown && filteredAgencies.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                        {filteredAgencies.map((agency) => (
                          <button
                            key={agency.id}
                            type="button"
                            onClick={() => handleAgencySelect(agency)}
                            className="w-full px-3 py-1.5 text-left hover:bg-indigo-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900">{agency.name}</p>
                            {agency.email && <p className="text-xs text-gray-500">{agency.email}</p>}
                          </button>
                        ))}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewAgencyForm(true);
                              setShowAgencyDropdown(false);
                              setNewAgencyName(agencySearch);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-purple-50 transition-colors border-t border-gray-200 flex items-center gap-1.5 text-indigo-600"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="text-sm font-medium">Add New Agency</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* No results */}
                    {showAgencyDropdown && agencySearch && filteredAgencies.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                        <p className="text-sm text-gray-500">No agencies found.</p>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewAgencyForm(true);
                              setShowAgencyDropdown(false);
                              setNewAgencyName(agencySearch);
                            }}
                            className="mt-1 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add &quot;{agencySearch}&quot; as new agency
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline New Agency Form */}
                  {showNewAgencyForm && (
                    <div className="mt-2 p-3 border border-indigo-200 bg-indigo-50 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Add New Agency
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Name *</label>
                          <input
                            type="text"
                            value={newAgencyName}
                            onChange={(e) => setNewAgencyName(e.target.value)}
                            placeholder="Agency name"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Email</label>
                          <input
                            type="email"
                            value={newAgencyEmail}
                            onChange={(e) => setNewAgencyEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Phone</label>
                          <input
                            type="tel"
                            value={newAgencyPhone}
                            onChange={(e) => setNewAgencyPhone(e.target.value)}
                            placeholder="Phone"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleCreateAgency}
                          disabled={!newAgencyName.trim() || isCreatingAgency}
                          className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {isCreatingAgency ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Create & Select
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewAgencyForm(false);
                            setNewAgencyName('');
                            setNewAgencyEmail('');
                            setNewAgencyPhone('');
                          }}
                          className="px-2.5 py-1 text-gray-600 text-xs hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        Saved as Contact (Agency) in Accounting + Booking Agencies.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Guest Name with contact search - only when Direct */}
              {(allocation.bookingSourceType || 'direct') === 'direct' && (
                <div className="col-span-2" ref={guestSearchRef}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Guest Name</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={guestSearch}
                      onChange={e => {
                        setGuestSearch(e.target.value);
                        updateAllocation(allocation.id, 'agentName', e.target.value);
                        setShowGuestDropdown(true);
                      }}
                      onFocus={() => { if (guestSearch) setShowGuestDropdown(true); }}
                      disabled={!canEdit}
                      placeholder="Search contact or type guest name..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                  {showGuestDropdown && guestSearch && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-[calc(100%-2rem)] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                      {filteredCustomers.slice(0, 8).map(contact => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            onAllocationsChange(
                              allAllocations.map(a => a.id === allocation.id
                                ? {
                                    ...a,
                                    agentName: contact.name,
                                    contactInfo: contact.email || contact.phone || a.contactInfo || '',
                                  }
                                : a)
                            );
                            setGuestSearch(contact.name);
                            setShowGuestDropdown(false);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-indigo-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          {contact.email && <p className="text-xs text-gray-500">{contact.email}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
              <ExtraItemsEditor
                items={allocation.extraItems || []}
                onChange={(items) => {
                  // Update extraItems and recalculate commission
                  const updated = { ...allocation, extraItems: items };
                  const { total: commBase } = getThbCommissionBase(updated, currency);
                  const totalCommission = Math.round(commBase * (updated.commissionRate || 0)) / 100;
                  const commissionReceived = Math.round((totalCommission - (updated.commissionDeduction || 0)) * 100) / 100;
                  onAllocationsChange(
                    allAllocations.map(a => a.id === allocation.id ? {
                      ...a,
                      extraItems: items,
                      totalCommission,
                      commissionReceived,
                    } : a)
                  );
                }}
                disabled={!canEdit}
                currency={allocation.currency || currency}
                bookingFxRate={allocation.fxRate}
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

            {/* Currency + FX Rate */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <select
                  value={allocation.currency || currency}
                  onChange={e => {
                    const newCurr = e.target.value;
                    updateCabinFinance(allocation.id, {
                      currency: newCurr,
                      fxRate: newCurr === 'THB' ? undefined : allocation.fxRate,
                      fxRateSource: newCurr === 'THB' ? undefined : allocation.fxRateSource,
                    });
                  }}
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

            {/* FX Rate (non-THB only) */}
            {(allocation.currency || currency) !== 'THB' && (
              <div className="mb-3">
                <ExchangeRateField
                  currency={(allocation.currency || currency) as Currency}
                  date={dateFrom || getTodayISO()}
                  rate={allocation.fxRate ?? null}
                  source={(allocation.fxRateSource as FxRateSource) ?? null}
                  isLoading={fxLoading}
                  error={fxError}
                  isManualOverride={allocation.fxRateSource === 'manual'}
                  onFetchRate={() => handleFetchFxRate(allocation.id)}
                  onManualRate={(rate) => handleManualFxRate(allocation.id, rate)}
                  disabled={!canEdit}
                />
              </div>
            )}

            {/* Charter Fee + Admin Fee + Total Cost */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Charter Fee</label>
                <input
                  type="number"
                  value={allocation.charterFee ?? ''}
                  onChange={e => updateCabinFinance(allocation.id, { charterFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                  disabled={!canEdit}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Admin Fee</label>
                <input
                  type="number"
                  value={allocation.adminFee ?? ''}
                  onChange={e => updateCabinFinance(allocation.id, { adminFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                  disabled={!canEdit}
                  placeholder="CC fee"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Cost</label>
                <input
                  type="number"
                  value={allocation.price ?? ''}
                  disabled
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-medium"
                />
              </div>
            </div>

            {/* THB Equivalents (non-THB only, when FX rate is set) */}
            {(allocation.currency || currency) !== 'THB' && allocation.fxRate && allocation.fxRate > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3 bg-blue-50 rounded-lg p-2">
                <div>
                  <label className="block text-xs font-medium text-blue-600 mb-0.5">THB Charter Fee</label>
                  <span className="text-sm font-medium text-blue-800">
                    {((allocation.charterFee || 0) * allocation.fxRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-600 mb-0.5">THB Admin Fee</label>
                  <span className="text-sm font-medium text-blue-800">
                    {((allocation.adminFee || 0) * allocation.fxRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-600 mb-0.5">THB Total</label>
                  <span className="text-sm font-medium text-blue-800">
                    {(allocation.thbTotalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

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

          {/* ── F1. Agency Commission (amber, only for agency cabins) ── */}
          {isAgencyCabin && (
            <div className="border-t border-gray-100 pt-4">
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Agency Commission</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rate (%)</label>
                    <select
                      value={allocation.agencyCommissionRate != null ? String(allocation.agencyCommissionRate) : ''}
                      onChange={e => handleAgencyCommissionRateChange(allocation.id, e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-400 disabled:bg-gray-100"
                    >
                      <option value="">-- Select --</option>
                      {[5, 7.5, 10, 12.5, 15, 17.5, 20, 25, 30].map(r => (
                        <option key={r} value={String(r)}>{r}%</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount ({cabinCurrency})</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={allocation.agencyCommissionAmount ?? (agencyAutoAmt || '')}
                      onChange={e => handleAgencyCommissionAmountChange(allocation.id, e.target.value)}
                      disabled={!canEdit}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-400 disabled:bg-gray-100"
                    />
                    {cabinCurrency !== 'THB' && agencyThbCalc > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">= {agencyThbCalc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB</p>
                    )}
                  </div>
                </div>

                {/* Net revenue */}
                {agencyAmt > 0 && (
                  <div className="text-xs bg-white/60 rounded px-2 py-1.5 mb-2 space-y-0.5">
                    <div className="flex justify-between text-gray-600">
                      <span>Charter Fee</span>
                      <span>{cabinCharterFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cabinCurrency}</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>Agency Commission</span>
                      <span>-{agencyAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cabinCurrency}</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-800 border-t border-gray-200 pt-0.5">
                      <span>Net Revenue</span>
                      <span>{cabinNetRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cabinCurrency}{cabinCurrency !== 'THB' && cabinNetRevenueThb > 0 ? ` (${cabinNetRevenueThb.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB)` : ''}</span>
                    </div>
                  </div>
                )}

                {/* Payment status */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment</label>
                    <select
                      value={allocation.agencyPaymentStatus || 'unpaid'}
                      onChange={e => {
                        updateAllocation(allocation.id, 'agencyPaymentStatus', e.target.value);
                        if (e.target.value === 'paid' && !allocation.agencyPaidDate) {
                          updateAllocation(allocation.id, 'agencyPaidDate', new Date().toISOString().split('T')[0]);
                        }
                      }}
                      disabled={!canEdit}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-400 disabled:bg-gray-100"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  {allocation.agencyPaymentStatus === 'paid' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Paid Date</label>
                      <input
                        type="date"
                        value={allocation.agencyPaidDate || ''}
                        onChange={e => updateAllocation(allocation.id, 'agencyPaidDate', e.target.value || undefined)}
                        disabled={!canEdit}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-400 disabled:bg-gray-100"
                      />
                    </div>
                  )}
                  <div className={allocation.agencyPaymentStatus === 'paid' ? '' : 'col-span-2'}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
                    <input
                      type="text"
                      value={allocation.agencyPaymentNote || ''}
                      onChange={e => updateAllocation(allocation.id, 'agencyPaymentNote', e.target.value || undefined)}
                      disabled={!canEdit}
                      placeholder="Payment ref..."
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-400 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── F2. Commission (teal) ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-teal-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-teal-800">Booking Owner Commission</h4>
              </div>

              {/* Commission Rate */}
              <div className="mb-3 max-w-xs">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rate (%)
                  <span className="text-xs text-gray-400 font-normal ml-1">Default: {defaultRate}%</span>
                </label>
                <input
                  type="number" step="0.01" min="0" max="100"
                  value={allocation.commissionRate ?? ''}
                  onChange={e => handleCommissionRateChange(allocation.id, e.target.value)}
                  disabled={!canEdit}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                />
              </div>

              {/* Commission Breakdown */}
              {(commCharterBase > 0 || commExtrasBase > 0) && (allocation.commissionRate || 0) > 0 && (
                <div className="text-sm bg-white/50 rounded-md p-2.5 mb-3 space-y-1">
                  {(allocation.currency || currency) !== 'THB' && (
                    <p className="text-xs text-teal-600 mb-1">Commission calculated in THB</p>
                  )}
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>{isAgencyCabin && agencyAmt > 0 ? 'Charter net revenue' : 'Charter fee'} ({commCharterBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                    <span>{(commCharterBase * (allocation.commissionRate || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {commExtrasBase > 0 && (
                    <div className="flex justify-between text-gray-600 text-xs">
                      <span>Extras ({commExtrasBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                      <span>{(commExtrasBase * (allocation.commissionRate || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
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

              {/* Commission Note */}
              <div className="mt-2">
                <input
                  type="text"
                  value={allocation.commissionNote ?? ''}
                  onChange={e => updateAllocation(allocation.id, 'commissionNote', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Commission note..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                />
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
