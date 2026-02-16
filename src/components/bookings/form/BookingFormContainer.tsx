'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import {
  Booking,
  BookingType,
  BookingStatus,
  BookingAttachment,
  PaymentStatus,
} from '@/data/booking/types';
import { Project } from '@/data/project/types';
import { externalBoatsApi } from '@/lib/supabase/api/externalBoats';
import { bookingsApi } from '@/lib/supabase/api/bookings';
import { classifyConflicts, ConflictResult } from '@/lib/bookings/conflictChecker';
import {
  YachtProduct,
  bookingTypeToProductCharterTypes,
} from '@/data/yachtProduct/types';
import { yachtProductsApi } from '@/lib/supabase/api/yachtProducts';
import { createClient } from '@/lib/supabase/client';

import { HeaderSection } from './HeaderSection';
import { CustomerSection } from './CustomerSection';
import { BookingDetailsSection } from './BookingDetailsSection';
import { FinanceSection, PaymentRecord, LinkedDocument, BankAccountOption, CompanyOption } from './FinanceSection';
import { cashCollectionsApi, CashCollection } from '@/lib/supabase/api/cashCollections';
import { bankAccountsApi } from '@/lib/supabase/api/bankAccounts';
import { companiesApi } from '@/lib/supabase/api/companies';
import { authApi } from '@/lib/supabase/api/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { employeesApi } from '@/lib/supabase/api/employees';
import { meetGreetersApi, MeetGreeter } from '@/lib/supabase/api/meetGreeters';
import RecordCashModal from '@/components/cash-collections/RecordCashModal';
import CommissionSection from './CommissionSection';
import CrewSection from './CrewSection';
import CabinSection from './CabinSection';
import InternalNoteSection from './InternalNoteSection';
import CustomerNoteSection from './CustomerNoteSection';
import { CabinCharterOverview } from './CabinCharterOverview';
import { CabinAllocation } from '@/data/booking/types';
import { cabinAllocationsApi } from '@/lib/supabase/api/cabinAllocations';
import { projectCabinsApi } from '@/lib/supabase/api/projectCabins';

interface BookingFormContainerProps {
  booking?: Booking | null;
  defaultDate?: string;
  prefilled?: Partial<Booking> | null;
  projects: Project[];
  onSave: (booking: Partial<Booking>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
  isAgencyView?: boolean;
  canEdit?: boolean;
}

interface UserProfile {
  id: string;
  full_name: string;
}

export function BookingFormContainer({
  booking,
  defaultDate,
  prefilled,
  projects,
  onSave,
  onDelete,
  onClose,
  isAgencyView = false,
  canEdit = true,
}: BookingFormContainerProps) {
  const isEditing = !!booking;
  const { user: authUser } = useAuth();
  const [externalBoats, setExternalBoats] = useState<{ id: string; name: string; displayName?: string }[]>([]);
  const [meetGreeters, setMeetGreeters] = useState<MeetGreeter[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [userProfiles, setUserProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);

  // Load external boats, meet greeters, and companies from database
  useEffect(() => {
    async function loadData() {
      try {
        const [boats, greeters, companiesData, profiles] = await Promise.all([
          externalBoatsApi.getActive(),
          meetGreetersApi.getActive(),
          companiesApi.getAll(),
          authApi.getAllProfiles(),
        ]);
        setExternalBoats(boats.map(b => ({ id: b.id, name: b.name, displayName: b.display_name })));
        setMeetGreeters(greeters);
        setCompanies(companiesData.map(c => ({ id: c.id, name: c.name })));
        setUserProfiles(profiles);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }
    loadData();
  }, []);

  // Create new meet greeter
  const handleCreateMeetGreeter = async (name: string, phone: string, email: string): Promise<MeetGreeter | null> => {
    try {
      const newGreeter = await meetGreetersApi.create({
        name,
        phone: phone || null,
        email: email || null,
        is_active: true,
      });
      setMeetGreeters(prev => [...prev, newGreeter]);
      return newGreeter;
    } catch (err) {
      console.error('Failed to create meet greeter:', err);
      return null;
    }
  };

  const getInitialValue = <T,>(
    prefilledVal: T | undefined,
    bookingVal: T | undefined,
    defaultVal: T
  ): T => {
    if (prefilledVal !== undefined && prefilledVal !== null && prefilledVal !== '') return prefilledVal;
    if (bookingVal !== undefined && bookingVal !== null && bookingVal !== '') return bookingVal;
    return defaultVal;
  };

  const [formData, setFormData] = useState<Partial<Booking>>({
    type: getInitialValue(prefilled?.type, booking?.type, 'day_charter'),
    status: getInitialValue(prefilled?.status, booking?.status, 'enquiry'),
    title: getInitialValue(prefilled?.title, booking?.title, ''),
    dateFrom: getInitialValue(prefilled?.dateFrom, booking?.dateFrom, defaultDate || ''),
    dateTo: getInitialValue(prefilled?.dateTo, booking?.dateTo, defaultDate || ''),
    time: getInitialValue(prefilled?.time, booking?.time, ''),
    projectId: getInitialValue(prefilled?.projectId, booking?.projectId, undefined),
    externalBoatName: getInitialValue(prefilled?.externalBoatName, booking?.externalBoatName, ''),
    customerName: getInitialValue(prefilled?.customerName, booking?.customerName, ''),
    customerEmail: getInitialValue(prefilled?.customerEmail, booking?.customerEmail, ''),
    customerPhone: getInitialValue(prefilled?.customerPhone, booking?.customerPhone, ''),
    contactChannel: getInitialValue(prefilled?.contactChannel, booking?.contactChannel, undefined),
    numberOfGuests: getInitialValue(prefilled?.numberOfGuests, booking?.numberOfGuests, undefined),
    bookingOwner: getInitialValue(prefilled?.bookingOwner, booking?.bookingOwner, ''),
    agentName: getInitialValue(prefilled?.agentName, booking?.agentName, ''),
    agentPlatform: getInitialValue(prefilled?.agentPlatform, booking?.agentPlatform, 'Direct'),
    meetAndGreeter: getInitialValue(prefilled?.meetAndGreeter, booking?.meetAndGreeter, ''),
    destination: getInitialValue(prefilled?.destination, booking?.destination, ''),
    pickupLocation: getInitialValue(prefilled?.pickupLocation, booking?.pickupLocation, ''),
    departureFrom: getInitialValue(prefilled?.departureFrom, booking?.departureFrom, ''),
    arrivalTo: getInitialValue(prefilled?.arrivalTo, booking?.arrivalTo, ''),
    charterTime: getInitialValue(prefilled?.charterTime, booking?.charterTime, ''), // legacy, kept for product defaults
    currency: getInitialValue(prefilled?.currency, booking?.currency, 'THB'),
    totalPrice: getInitialValue(prefilled?.totalPrice, booking?.totalPrice, undefined),
    charterFee: getInitialValue(prefilled?.charterFee, booking?.charterFee, undefined),
    extraCharges: getInitialValue(prefilled?.extraCharges, booking?.extraCharges, undefined),
    paymentStatus: getInitialValue(prefilled?.paymentStatus, booking?.paymentStatus, 'unpaid'),
    financeNote: getInitialValue(prefilled?.financeNote, booking?.financeNote, ''),
    financeAttachments: booking?.financeAttachments || [],
    commissionRate: getInitialValue(prefilled?.commissionRate, booking?.commissionRate, undefined),
    totalCommission: getInitialValue(prefilled?.totalCommission, booking?.totalCommission, undefined),
    commissionDeduction: getInitialValue(prefilled?.commissionDeduction, booking?.commissionDeduction, undefined),
    commissionReceived: getInitialValue(prefilled?.commissionReceived, booking?.commissionReceived, undefined),
    charterCost: getInitialValue(prefilled?.charterCost, booking?.charterCost, undefined),
    charterCostCurrency: getInitialValue(prefilled?.charterCostCurrency, booking?.charterCostCurrency, undefined),
    fxRate: getInitialValue(prefilled?.fxRate, booking?.fxRate, undefined),
    fxRateSource: getInitialValue(prefilled?.fxRateSource, booking?.fxRateSource, undefined),
    extras: getInitialValue(prefilled?.extras, booking?.extras, []),
    extraItems: booking?.extraItems ?? (
      (booking?.extraCharges && booking.extraCharges > 0 && (!booking?.extraItems || booking.extraItems.length === 0))
        ? [{ id: crypto.randomUUID(), name: 'Other', type: 'internal' as const, sellingPrice: booking.extraCharges }]
        : []
    ),
    contractNote: getInitialValue(prefilled?.contractNote, booking?.contractNote, ''),
    contractAttachments: booking?.contractAttachments || [],
    internalNotes: getInitialValue(prefilled?.internalNotes, booking?.internalNotes, ''),
    customerNotes: getInitialValue(prefilled?.customerNotes, booking?.customerNotes, ''),
    internalNoteAttachments: booking?.internalNoteAttachments || [],
  });

  const [useExternalBoat, setUseExternalBoat] = useState(
    !!(prefilled?.externalBoatName && !prefilled?.projectId) ||
    !!(booking?.externalBoatName && !booking?.projectId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<Partial<Booking> | null>(null);
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);

  // Product auto-fill
  const [availableProducts, setAvailableProducts] = useState<YachtProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<YachtProduct | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [cashCollections, setCashCollections] = useState<CashCollection[]>([]);
  const [showCashModal, setShowCashModal] = useState(false);
  const [editingCash, setEditingCash] = useState<CashCollection | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);

  // Cabin charter allocations
  const [cabinAllocations, setCabinAllocations] = useState<CabinAllocation[]>([]);
  const [cabinCashAllocationId, setCabinCashAllocationId] = useState<string | null>(null);

  // Section collapse state — all expanded by default
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = useCallback((id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Load sales employees for booking owner dropdown + bank accounts
  useEffect(() => {
    async function loadUsers() {
      try {
        const salesEmployees = await employeesApi.getByDepartment('Sales');
        setUsers(salesEmployees.map(e => ({ id: e.id, full_name: e.full_name_en })));
      } catch (err) {
        console.error('Failed to load sales employees:', err);
      }
    }
    async function loadBankAccounts() {
      try {
        const accounts = await bankAccountsApi.getAll();
        setBankAccounts(accounts.map(a => ({ id: a.id, account_name: a.account_name })));
      } catch (err) {
        console.error('Failed to load bank accounts:', err);
      }
    }
    loadUsers();
    loadBankAccounts();
  }, []);

  // Load existing payments and crew for editing
  useEffect(() => {
    if (booking?.id) {
      import('@/lib/supabase/api/bookingPayments').then(({ bookingPaymentsApi }) => {
        bookingPaymentsApi.getByBookingId(booking.id).then(rows => {
          setPayments(rows.map(r => ({
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
        }).catch(console.error);
      });
      import('@/lib/supabase/api/bookingCrew').then(({ bookingCrewApi }) => {
        bookingCrewApi.getByBookingId(booking.id).then(rows => {
          setSelectedCrewIds(rows.map(r => r.employee_id));
        }).catch(console.error);
      });
      cashCollectionsApi.getByBookingId(booking.id).then(setCashCollections).catch(console.error);

      // Load cabin allocations for cabin charter bookings
      if (booking.type === 'cabin_charter') {
        cabinAllocationsApi.getByBookingId(booking.id).then(setCabinAllocations).catch(console.error);
      }
    }
  }, [booking?.id]);

  // Auto-initialize cabin allocations when projectId changes for new cabin charters
  useEffect(() => {
    if (isEditing || formData.type !== 'cabin_charter' || !formData.projectId) return;
    if (cabinAllocations.length > 0) return; // Already populated

    projectCabinsApi.getByProjectId(formData.projectId).then(cabins => {
      if (cabins.length > 0) {
        setCabinAllocations(cabins.map((cabin, idx) => ({
          id: `temp-${idx}`,
          bookingId: '',
          projectCabinId: cabin.id,
          cabinLabel: cabin.cabinName,
          cabinNumber: cabin.cabinNumber,
          status: 'available' as const,
          numberOfGuests: 0,
          currency: formData.currency || 'THB',
          paymentStatus: 'unpaid' as const,
          sortOrder: cabin.sortOrder ?? idx,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })));
      }
    }).catch(console.error);
  }, [formData.type, formData.projectId, isEditing]);

  // Load linked documents (receipts, invoices) by booking_id
  useEffect(() => {
    if (!booking?.id) return;
    const loadDocs = async () => {
      const [{ receiptsApi }, { invoicesApi }] = await Promise.all([
        import('@/lib/supabase/api/receipts'),
        import('@/lib/supabase/api/invoices'),
      ]);
      const [receipts, invoices] = await Promise.all([
        receiptsApi.getByBookingId(booking.id),
        invoicesApi.getByBookingId(booking.id),
      ]);
      const docs: LinkedDocument[] = [];
      receipts.forEach((r) => {
        docs.push({
          id: r.id,
          type: 'receipt',
          label: 'Receipt issued',
          number: r.receipt_number || r.id.slice(0, 8),
          status: r.status,
          date: r.receipt_date || r.created_at,
          companyId: r.company_id,
          currency: r.currency,
          totalAmount: r.total_amount,
        });
      });
      invoices.forEach((inv) => {
        docs.push({
          id: inv.id,
          type: 'invoice',
          label: 'Invoice issued',
          number: inv.invoice_number || inv.id.slice(0, 8),
          status: inv.status,
          date: inv.invoice_date || inv.created_at,
          companyId: inv.company_id,
          currency: inv.currency,
          totalAmount: inv.total_amount,
        });
      });
      docs.sort((a, b) => a.date.localeCompare(b.date));
      setLinkedDocuments(docs);

      // Auto-sync payment/booking status based on linked documents
      const hasPaidReceipt = receipts.some(r => r.status === 'paid');
      const hasInvoice = invoices.length > 0;

      if (hasPaidReceipt && booking.paymentStatus !== 'paid') {
        const statusUpdates: Partial<Booking> = { paymentStatus: 'paid' as PaymentStatus };
        if (['enquiry', 'hold'].includes(booking.status)) {
          statusUpdates.status = 'booked' as BookingStatus;
        }
        bookingsApi.update(booking.id, statusUpdates).then(() => {
          setFormData(prev => ({ ...prev, ...statusUpdates }));
        }).catch(console.error);
      } else if (!hasPaidReceipt && hasInvoice && booking.paymentStatus === 'unpaid') {
        bookingsApi.update(booking.id, { paymentStatus: 'awaiting_payment' as PaymentStatus }).then(() => {
          setFormData(prev => ({ ...prev, paymentStatus: 'awaiting_payment' as PaymentStatus }));
        }).catch(console.error);
      }
    };
    loadDocs().catch(console.error);
  }, [booking?.id]);

  // Initialize form with booking data
  useEffect(() => {
    if (booking) {
      setFormData(booking);
      setUseExternalBoat(!!booking.externalBoatName && !booking.projectId);
    }
  }, [booking]);

  // Auto-set dateTo for day charters
  useEffect(() => {
    if (formData.type === 'day_charter' && formData.dateFrom) {
      setFormData(prev => ({ ...prev, dateTo: prev.dateFrom }));
    }
  }, [formData.type, formData.dateFrom]);

  // Load products when yacht is selected
  useEffect(() => {
    async function loadProducts() {
      if (isEditing) return;
      const yachtId = useExternalBoat
        ? externalBoats.find(b => b.name === formData.externalBoatName)?.id
        : formData.projectId;
      if (!yachtId) {
        setAvailableProducts([]);
        setSelectedProduct(null);
        return;
      }
      try {
        const yachtSource = useExternalBoat ? 'external' : 'own';
        const products = await yachtProductsApi.getActiveByYacht(yachtSource, yachtId);
        setAvailableProducts(products);
      } catch {
        setAvailableProducts([]);
      }
    }
    loadProducts();
  }, [useExternalBoat, formData.projectId, formData.externalBoatName, externalBoats, isEditing]);

  // Auto-fill from product
  useEffect(() => {
    if (isEditing || availableProducts.length === 0 || !formData.type) return;
    const matchingCharterTypes = bookingTypeToProductCharterTypes(formData.type as BookingType);
    const matchingProduct = availableProducts.find(p =>
      matchingCharterTypes.includes(p.charterType)
    );
    if (matchingProduct && matchingProduct.id !== selectedProduct?.id) {
      applyProductPreset(matchingProduct);
    }
  }, [formData.type, availableProducts, isEditing]);

  const applyProductPreset = (product: YachtProduct) => {
    setSelectedProduct(product);
    const fieldsToFill = new Set<string>();
    setFormData(prev => {
      const updates: Partial<Booking> = { ...prev };
      if (product.destination && !prev.destination) {
        updates.destination = product.destination;
        fieldsToFill.add('destination');
      }
      if (product.departFrom && !prev.departureFrom) {
        updates.departureFrom = product.departFrom;
        fieldsToFill.add('departureFrom');
      }
      if (product.defaultTime && !prev.time) {
        updates.time = product.defaultTime;
        fieldsToFill.add('time');
      }
      if (product.price && !prev.charterFee) {
        updates.charterFee = product.price;
        updates.currency = product.currency;
        fieldsToFill.add('charterFee');
      }
      return updates;
    });
    setAutoFilledFields(fieldsToFill);
    if (fieldsToFill.size > 0) {
      setTimeout(() => setAutoFilledFields(new Set()), 5000);
    }
  };

  // Auto-compute extraCharges from extra items (converted to booking currency)
  useEffect(() => {
    const items = formData.extraItems || [];
    const bookingCur = formData.currency || 'THB';
    const bookingRate = formData.fxRate || null;
    const computed = items.reduce((sum, item) => {
      const itemCur = item.currency || bookingCur;
      if (itemCur === bookingCur) return sum + (item.sellingPrice || 0);
      // Convert via THB: item.sellingPrice * item.fxRate / bookingRate
      const itemThb = (item.sellingPrice || 0) * (item.fxRate || 1);
      const inBookingCur = bookingRate ? itemThb / bookingRate : (item.sellingPrice || 0);
      return sum + Math.round(inBookingCur * 100) / 100;
    }, 0);
    if (computed !== (formData.extraCharges || 0)) {
      setFormData(prev => ({ ...prev, extraCharges: computed }));
    }
  }, [formData.extraItems, formData.currency, formData.fxRate]);

  // Auto-sync cabin charter financials to main booking
  useEffect(() => {
    if (formData.type === 'cabin_charter' && cabinAllocations.length > 0) {
      const bookingCurrency = formData.currency || 'THB';
      const bookingFxRate = formData.fxRate || 0;
      // Sum cabin charter fees converted to booking currency
      let totalCharterFee = 0;
      let totalExtraCharges = 0;
      for (const alloc of cabinAllocations) {
        const cabinCurrency = alloc.currency || bookingCurrency;
        const cabinFx = alloc.fxRate || 0;
        const fee = alloc.charterFee || 0;
        // Convert to booking currency
        if (cabinCurrency === bookingCurrency) {
          totalCharterFee += fee;
        } else if (cabinCurrency === 'THB' && bookingFxRate) {
          totalCharterFee += fee / bookingFxRate;
        } else if (bookingCurrency === 'THB' && cabinFx) {
          totalCharterFee += fee * cabinFx;
        } else {
          totalCharterFee += fee; // fallback: no conversion available
        }
        // Sum cabin extras (selling prices)
        const cabinExtras = (alloc.extraItems || []).reduce((sum, item) => {
          const itemCur = item.currency || cabinCurrency;
          if (itemCur === bookingCurrency) return sum + (item.sellingPrice || 0);
          return sum + (item.sellingPrice || 0); // fallback
        }, 0);
        totalExtraCharges += cabinExtras;
      }
      totalCharterFee = Math.round(totalCharterFee * 100) / 100;
      totalExtraCharges = Math.round(totalExtraCharges * 100) / 100;
      setFormData(prev => ({
        ...prev,
        charterFee: totalCharterFee,
        extraCharges: totalExtraCharges,
        totalPrice: totalCharterFee + totalExtraCharges,
      }));
    }
  }, [cabinAllocations, formData.type, formData.currency, formData.fxRate]);

  // Auto-calculate total cost (regular bookings)
  useEffect(() => {
    if (formData.type === 'cabin_charter') return; // handled above
    const fee = formData.charterFee || 0;
    const extra = formData.extraCharges || 0;
    setFormData(prev => ({ ...prev, totalPrice: fee + extra }));
  }, [formData.charterFee, formData.extraCharges, formData.type]);

  const generateTitle = (data: Partial<Booking>): string => {
    const parts: string[] = [];
    if (data.customerName?.trim()) parts.push(data.customerName.trim());
    if (data.contactChannel) {
      const channelLabels: Record<string, string> = {
        whatsapp: 'WhatsApp', email: 'Email', line: 'Line', phone: 'Phone', other: 'Other',
      };
      parts.push(channelLabels[data.contactChannel] || data.contactChannel);
    }
    const useEmail = data.contactChannel === 'email';
    const contactInfo = useEmail ? data.customerEmail : data.customerPhone;
    if (contactInfo?.trim()) parts.push(contactInfo.trim());
    return parts.join(' · ');
  };

  // Auto-prefill title whenever customer/contact fields change (unless user manually edited title)
  useEffect(() => {
    if (titleManuallyEdited) return;
    const newTitle = generateTitle(formData);
    if (newTitle && newTitle !== formData.title) {
      setFormData(prev => ({ ...prev, title: newTitle }));
    }
  }, [formData.customerName, formData.contactChannel, formData.customerEmail, formData.customerPhone, titleManuallyEdited]);

  const handleChange = useCallback((field: keyof Booking, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Track manual title edits
    if (field === 'title') {
      setTitleManuallyEdited(true);
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Section completion toggle
  const toggleSectionCompleted = useCallback((sectionId: string) => {
    const current = formData.completedSections || {};
    handleChange('completedSections', { ...current, [sectionId]: !current[sectionId] });
  }, [formData.completedSections, handleChange]);

  // Compute whether all visible sections are completed
  const visibleSectionIds = useMemo(() => {
    const isCabinCharter = formData.type === 'cabin_charter';
    const ids: string[] = ['header', 'bookingDetails', 'crew'];
    if (!isCabinCharter) ids.push('customer', 'customerNote');
    if (!isCabinCharter && !isAgencyView) ids.push('finance', 'commission', 'internalNote');
    return ids;
  }, [formData.type, isAgencyView]);

  const allSectionsCompleted = useMemo(() => {
    if (visibleSectionIds.length === 0) return false;
    const cs = formData.completedSections || {};
    const sectionsComplete = visibleSectionIds.every(id => !!cs[id]);
    if (formData.type === 'cabin_charter' && cabinAllocations.length > 0) {
      return sectionsComplete && cabinAllocations.every(a => a.isCompleted);
    }
    return sectionsComplete;
  }, [visibleSectionIds, formData.completedSections, formData.type, cabinAllocations]);

  // File upload helpers
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

  const handleUploadFinanceAttachment = async (files: File[]) => {
    const prefix = booking?.id ? `bookings/${booking.id}/finance` : `bookings/temp/finance`;
    const newAttachments = await uploadAttachments(files, prefix);
    const existing = (formData.financeAttachments || []) as BookingAttachment[];
    handleChange('financeAttachments', [...existing, ...newAttachments]);
  };

  const handleRemoveFinanceAttachment = (index: number) => {
    const existing = [...((formData.financeAttachments || []) as BookingAttachment[])];
    existing.splice(index, 1);
    handleChange('financeAttachments', existing);
  };

  const handleUploadInternalAttachment = async (files: File[]) => {
    const prefix = booking?.id ? `bookings/${booking.id}/internal` : `bookings/temp/internal`;
    const newAttachments = await uploadAttachments(files, prefix);
    const existing = (formData.internalNoteAttachments || []) as BookingAttachment[];
    handleChange('internalNoteAttachments', [...existing, ...newAttachments]);
  };

  const handleRemoveInternalAttachment = (index: number) => {
    const existing = [...((formData.internalNoteAttachments || []) as BookingAttachment[])];
    existing.splice(index, 1);
    handleChange('internalNoteAttachments', existing);
  };

  const handleUploadContractAttachment = async (files: File[]) => {
    const prefix = booking?.id ? `bookings/${booking.id}/contract` : `bookings/temp/contract`;
    const newAttachments = await uploadAttachments(files, prefix);
    const existing = (formData.contractAttachments || []) as BookingAttachment[];
    handleChange('contractAttachments', [...existing, ...newAttachments]);
  };

  const handleRemoveContractAttachment = (index: number) => {
    const existing = [...((formData.contractAttachments || []) as BookingAttachment[])];
    existing.splice(index, 1);
    handleChange('contractAttachments', existing);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) newErrors.title = 'Title is required';
    if (!formData.dateFrom) newErrors.dateFrom = 'Start date is required';
    if (!formData.dateTo) newErrors.dateTo = 'End date is required';
    if (formData.dateFrom && formData.dateTo && formData.dateTo < formData.dateFrom) {
      newErrors.dateTo = 'End date must be after start date';
    }
    if (!useExternalBoat && !formData.projectId) newErrors.projectId = 'Please select a boat';
    if (useExternalBoat && !formData.externalBoatName?.trim()) newErrors.externalBoatName = 'External boat name is required';
    // customerName is optional — users may not know it at booking creation time
    setErrors(newErrors);

    // Auto-expand sections that contain validation errors
    if (Object.keys(newErrors).length > 0) {
      const fieldToSection: Record<string, string> = {
        projectId: 'header', externalBoatName: 'header',
        dateFrom: 'header', dateTo: 'header',
        customerName: 'customer',
        title: 'bookingDetails',
      };
      const sectionsToExpand = new Set(
        Object.keys(newErrors).map(f => fieldToSection[f]).filter(Boolean)
      );
      setCollapsedSections(prev => {
        const next = { ...prev };
        sectionsToExpand.forEach(s => { next[s] = false; });
        return next;
      });
    }

    return Object.keys(newErrors).length === 0;
  };

  const buildSaveData = (): Partial<Booking> => {
    // Auto-set charter expense status for external boats
    let charterExpenseStatus = formData.charterExpenseStatus;
    if (useExternalBoat && (formData.charterCost ?? 0) > 0 && !formData.linkedExpenseId) {
      charterExpenseStatus = 'pending_accounting';
    } else if (!useExternalBoat) {
      charterExpenseStatus = undefined;
    }

    const data = {
      ...formData,
      extras: undefined, // legacy field — no longer written
      projectId: useExternalBoat ? undefined : formData.projectId,
      externalBoatName: useExternalBoat ? formData.externalBoatName : undefined,
      pickupLocation: formData.departureFrom || formData.pickupLocation,
      charterExpenseStatus,
    };

    return data;
  };

  const executeSave = async (dataToSave: Partial<Booking>) => {
    setIsSaving(true);
    try {
      await onSave(dataToSave);

      // Persist crew assignments after booking save
      const bookingId = booking?.id || (dataToSave as any).id;
      if (bookingId && selectedCrewIds.length > 0) {
        try {
          const { bookingCrewApi } = await import('@/lib/supabase/api/bookingCrew');
          await bookingCrewApi.setCrewForBooking(bookingId, selectedCrewIds);
        } catch (crewErr) {
          console.error('Error persisting crew:', crewErr);
        }
      }

      // Persist booking payments after booking save
      if (bookingId) {
        try {
          const { bookingPaymentsApi } = await import('@/lib/supabase/api/bookingPayments');

          // Get existing DB payments
          const existingPayments = await bookingPaymentsApi.getByBookingId(bookingId);
          const existingIds = new Set(existingPayments.map(p => p.id));
          const currentIds = new Set(payments.filter(p => p.id).map(p => p.id!));

          // Delete removed payments
          for (const existing of existingPayments) {
            if (!currentIds.has(existing.id)) {
              await bookingPaymentsApi.delete(existing.id);
            }
          }

          // Create/update payments
          for (const payment of payments) {
            const record = {
              booking_id: bookingId,
              payment_type: payment.paymentType,
              amount: payment.amount,
              currency: payment.currency,
              due_date: payment.dueDate || null,
              paid_date: payment.paidDate || null,
              note: payment.note || null,
              receipt_id: payment.receiptId || undefined,
              payment_method: payment.paymentMethod || undefined,
              bank_account_id: payment.bankAccountId || undefined,
              synced_to_receipt: payment.syncedToReceipt || false,
              needs_accounting_action: payment.needsAccountingAction || false,
            };

            if (payment.id && existingIds.has(payment.id)) {
              // Update existing
              await bookingPaymentsApi.update(payment.id, record);
            } else {
              // Create new
              const created = await bookingPaymentsApi.create(record);
              payment.id = created.id;
            }

            // Auto-sync to receipt if paid + receipt selected + method set + not yet synced
            if (
              payment.paidDate &&
              payment.receiptId &&
              payment.paymentMethod &&
              !payment.syncedToReceipt &&
              payment.id
            ) {
              try {
                await bookingPaymentsApi.syncToReceipt(
                  payment.id,
                  payment.receiptId,
                  payment.amount,
                  payment.paidDate,
                  payment.paymentMethod,
                  payment.bankAccountId,
                );
                payment.syncedToReceipt = true;
                payment.needsAccountingAction = false;
              } catch (syncErr) {
                console.error('Failed to sync payment to receipt:', syncErr);
              }
            }

            // Notify accounting for unlinked paid payments
            if (
              payment.paidDate &&
              !payment.receiptId &&
              !payment.needsAccountingAction &&
              !payment.syncedToReceipt &&
              payment.id
            ) {
              try {
                const { notifyAccountantUnlinkedPayment } = await import('@/data/notifications/notifications');
                notifyAccountantUnlinkedPayment(
                  bookingId,
                  booking?.bookingNumber || bookingId.slice(0, 8),
                  payment.amount,
                  payment.currency,
                  payment.paymentType,
                );
                await bookingPaymentsApi.update(payment.id, { needs_accounting_action: true });
                payment.needsAccountingAction = true;
              } catch (notifErr) {
                console.error('Failed to send notification:', notifErr);
              }
            }
          }

          // Update local state with synced values
          setPayments([...payments]);

          // Auto-update booking status to 'booked' when a payment is recorded
          const hasPaidPayment = payments.some(p => p.paidDate);
          if (hasPaidPayment && ['enquiry', 'hold'].includes(formData.status || '')) {
            try {
              await bookingsApi.update(bookingId, { status: 'booked' as BookingStatus });
              setFormData(prev => ({ ...prev, status: 'booked' as BookingStatus }));
            } catch (statusErr) {
              console.error('Failed to auto-update booking status:', statusErr);
            }
          }
        } catch (paymentErr) {
          console.error('Error persisting payments:', paymentErr);
        }

        // Persist cabin allocations for cabin charter bookings
        if (dataToSave.type === 'cabin_charter' && cabinAllocations.length > 0) {
          try {
            const existingAllocations = await cabinAllocationsApi.getByBookingId(bookingId);
            const existingIds = new Set(existingAllocations.map(a => a.id));
            const currentIds = new Set(cabinAllocations.filter(a => !a.id.startsWith('temp-')).map(a => a.id));

            // Delete removed allocations
            for (const existing of existingAllocations) {
              if (!currentIds.has(existing.id)) {
                await cabinAllocationsApi.delete(existing.id);
              }
            }

            // Create/update allocations
            const updatedAllocations: CabinAllocation[] = [];
            for (const allocation of cabinAllocations) {
              const allocationFields = {
                status: allocation.status,
                guestNames: allocation.guestNames,
                numberOfGuests: allocation.numberOfGuests,
                nationality: allocation.nationality,
                guestNotes: allocation.guestNotes,
                agentName: allocation.agentName,
                contactPlatform: allocation.contactPlatform,
                contactInfo: allocation.contactInfo,
                bookingOwner: allocation.bookingOwner,
                extras: allocation.extras,
                contractNote: allocation.contractNote,
                contractAttachments: allocation.contractAttachments,
                commissionRate: allocation.commissionRate,
                totalCommission: allocation.totalCommission,
                commissionDeduction: allocation.commissionDeduction,
                commissionReceived: allocation.commissionReceived,
                internalNotes: allocation.internalNotes,
                internalNoteAttachments: allocation.internalNoteAttachments,
                customerNotes: allocation.customerNotes,
                price: allocation.price,
                currency: allocation.currency,
                paymentStatus: allocation.paymentStatus,
                sortOrder: allocation.sortOrder,
                bookingSourceType: allocation.bookingSourceType,
                extraItems: allocation.extraItems,
                commissionNote: allocation.commissionNote,
                charterFee: allocation.charterFee,
                adminFee: allocation.adminFee,
                fxRate: allocation.fxRate,
                fxRateSource: allocation.fxRateSource,
                thbTotalPrice: allocation.thbTotalPrice,
                isCompleted: allocation.isCompleted,
              };

              if (allocation.id.startsWith('temp-')) {
                // Create new
                const created = await cabinAllocationsApi.create({
                  bookingId,
                  projectCabinId: allocation.projectCabinId,
                  cabinLabel: allocation.cabinLabel,
                  cabinNumber: allocation.cabinNumber,
                  ...allocationFields,
                });
                updatedAllocations.push(created);
              } else if (existingIds.has(allocation.id)) {
                // Update existing
                const updated = await cabinAllocationsApi.update(allocation.id, allocationFields);
                updatedAllocations.push(updated);
              }
            }
            setCabinAllocations(updatedAllocations);
          } catch (cabinErr) {
            console.error('Error persisting cabin allocations:', cabinErr);
          }
        }
      }
    } catch (error: any) {
      console.error('Error saving booking:', error?.message || error?.code || JSON.stringify(error) || error);
      alert(`Save failed: ${error?.message || error?.code || 'Unknown error. Check console.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Load bank accounts filtered by company (for invoice-linked payments)
  const loadBankAccountsForCompany = async (companyId: string): Promise<BankAccountOption[]> => {
    const accounts = await bankAccountsApi.getByCompanyActive(companyId);
    return accounts.map(a => ({ id: a.id, account_name: a.account_name }));
  };

  // Auto-create receipt from an invoice when user clicks "Add Payment"
  const handleAddPaymentFromInvoice = async (paymentIndex: number) => {
    const payment = payments[paymentIndex];
    if (!payment.receiptId || !booking?.id) return;

    const invoiceId = payment.receiptId;

    try {
      const { invoicesApi } = await import('@/lib/supabase/api/invoices');
      const invoice = await invoicesApi.getByIdWithLineItems(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.id) throw new Error('Not authenticated');

      const { documentNumbersApi } = await import('@/lib/supabase/api/documentNumbers');
      const receiptNumber = await documentNumbersApi.getNextDocumentNumber(invoice.company_id, 'receipt');

      const today = new Date().toISOString().split('T')[0];

      const receiptInsert = {
        company_id: invoice.company_id,
        client_id: invoice.client_id,
        client_name: invoice.client_name,
        receipt_number: receiptNumber,
        receipt_date: today,
        invoice_id: invoiceId,
        booking_id: booking.id,
        status: 'paid' as const,
        pricing_type: invoice.pricing_type || 'exclude_vat',
        subtotal: invoice.subtotal,
        tax_amount: invoice.tax_amount,
        total_amount: invoice.total_amount,
        total_received: payment.amount,
        currency: invoice.currency,
        fx_rate: invoice.fx_rate,
        boat_id: invoice.boat_id,
        charter_type: invoice.charter_type,
        charter_date_from: invoice.charter_date_from,
        charter_date_to: invoice.charter_date_to,
        charter_time: (invoice as any).charter_time || null,
        created_by: authUser.id,
        notes: `Auto-created from ${invoice.invoice_number}`,
      };

      const lineItems = (invoice.line_items || []).map((li: any) => ({
        receipt_id: '', // will be set by API
        project_id: li.project_id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        tax_rate: li.tax_rate ?? 0,
        wht_rate: String(li.wht_rate ?? '0'),
        amount: li.amount,
      }));

      const paymentRecords = [{
        receipt_id: '', // will be set by API
        payment_date: payment.paidDate,
        amount: payment.amount,
        received_at: payment.paymentMethod === 'cash' ? 'cash' : (payment.bankAccountId || 'cash'),
        remark: `Payment from booking ${booking.bookingNumber || booking.id.slice(0, 8)}`,
      }];

      const { receiptsApi } = await import('@/lib/supabase/api/receipts');
      await receiptsApi.createWithEvent(
        receiptInsert as any,
        lineItems,
        paymentRecords,
        authUser.id,
      );

      // Mark payment as synced
      const updated = [...payments];
      updated[paymentIndex] = {
        ...updated[paymentIndex],
        syncedToReceipt: true,
        needsAccountingAction: false,
      };
      setPayments(updated);

      // Persist to booking_payments DB
      if (payment.id) {
        const { bookingPaymentsApi } = await import('@/lib/supabase/api/bookingPayments');
        await bookingPaymentsApi.update(payment.id, {
          synced_to_receipt: true,
          needs_accounting_action: false,
        });
      }

      // Refresh linked documents
      const [newReceipts, newInvoices] = await Promise.all([
        receiptsApi.getByBookingId(booking.id),
        invoicesApi.getByBookingId(booking.id),
      ]);
      const docs: LinkedDocument[] = [];
      newReceipts.forEach((r) => {
        docs.push({
          id: r.id, type: 'receipt', label: 'Receipt issued',
          number: r.receipt_number || r.id.slice(0, 8), status: r.status,
          date: r.receipt_date || r.created_at,
          companyId: r.company_id, currency: r.currency, totalAmount: r.total_amount,
        });
      });
      newInvoices.forEach((inv) => {
        docs.push({
          id: inv.id, type: 'invoice', label: 'Invoice issued',
          number: inv.invoice_number || inv.id.slice(0, 8), status: inv.status,
          date: inv.invoice_date || inv.created_at,
          companyId: inv.company_id, currency: inv.currency, totalAmount: inv.total_amount,
        });
      });
      docs.sort((a, b) => a.date.localeCompare(b.date));
      setLinkedDocuments(docs);

    } catch (err) {
      console.error('Failed to create receipt from invoice:', err);
      alert(`Failed to create receipt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !validate()) return;

    const dataToSave = buildSaveData();

    // Check for conflicts with existing bookings on the same boat/dates
    // Skip for cancelled/completed statuses AND when editing without changing dates/boat/time
    const status = dataToSave.status;
    const conflictFieldsChanged = !booking || // new booking — always check
      booking.dateFrom !== dataToSave.dateFrom ||
      booking.dateTo !== dataToSave.dateTo ||
      booking.time !== dataToSave.time ||
      booking.projectId !== dataToSave.projectId ||
      booking.externalBoatName !== dataToSave.externalBoatName;
    if (conflictFieldsChanged && status !== 'cancelled' && status !== 'completed') {
      try {
        let existingBookings: Booking[] = [];
        const dateFrom = dataToSave.dateFrom!;
        const dateTo = dataToSave.dateTo!;
        const excludeId = booking?.id;

        if (!useExternalBoat && dataToSave.projectId) {
          existingBookings = await bookingsApi.checkConflicts(dataToSave.projectId, dateFrom, dateTo, excludeId);
        } else if (useExternalBoat && dataToSave.externalBoatName) {
          existingBookings = await bookingsApi.checkConflictsExternal(dataToSave.externalBoatName, dateFrom, dateTo, excludeId);
        }

        const result = classifyConflicts(dataToSave, existingBookings);

        if (result.hasHardConflict) {
          setConflictResult(result);
          setShowConflictDialog(true);
          return;
        }

        if (result.hasSoftConflict) {
          setConflictResult(result);
          setPendingSaveData(dataToSave);
          setShowConflictDialog(true);
          return;
        }
      } catch (err) {
        console.error('Error checking conflicts:', err);
        // Allow save to proceed if conflict check fails
      }
    }

    await executeSave(dataToSave);
  };

  const handleConfirmConflict = async () => {
    setShowConflictDialog(false);
    if (pendingSaveData) {
      await executeSave(pendingSaveData);
      setPendingSaveData(null);
    }
    setConflictResult(null);
  };

  const handleCancelConflict = () => {
    setShowConflictDialog(false);
    setPendingSaveData(null);
    setConflictResult(null);
  };

  const handleViewDocument = (doc: LinkedDocument) => {
    const basePath = '/accounting/manager/income';
    const pathMap: Record<string, string> = {
      receipt: `${basePath}/receipts/${doc.id}`,
      invoice: `${basePath}/invoices/${doc.id}`,
      quotation: `${basePath}/quotations/${doc.id}`,
    };
    window.open(pathMap[doc.type], '_blank');
  };

  const handleCreateReceipt = () => {
    const params = new URLSearchParams();
    if (!useExternalBoat && formData.projectId) params.set('boatId', formData.projectId);
    if (formData.type) params.set('charterType', formData.type);
    if (formData.dateFrom) params.set('charterDateFrom', formData.dateFrom);
    if (formData.dateTo) params.set('charterDateTo', formData.dateTo);
    if (formData.time) params.set('charterTime', formData.time);
    if (formData.customerName) params.set('customerName', formData.customerName);
    if (formData.currency) params.set('currency', formData.currency);
    if (formData.totalPrice) params.set('totalPrice', String(formData.totalPrice));
    if (booking?.id) params.set('bookingId', booking.id);
    window.open(`/accounting/manager/income/receipts/new?${params.toString()}`, '_blank');
  };

  const handleCreateInvoice = () => {
    const params = new URLSearchParams();
    if (!useExternalBoat && formData.projectId) params.set('boatId', formData.projectId);
    if (formData.type) params.set('charterType', formData.type);
    if (formData.dateFrom) params.set('charterDateFrom', formData.dateFrom);
    if (formData.dateTo) params.set('charterDateTo', formData.dateTo);
    if (formData.time) params.set('charterTime', formData.time);
    if (formData.customerName) params.set('customerName', formData.customerName);
    if (formData.currency) params.set('currency', formData.currency);
    if (formData.totalPrice) params.set('totalPrice', String(formData.totalPrice));
    if (booking?.id) params.set('bookingId', booking.id);
    window.open(`/accounting/manager/income/invoices/new?${params.toString()}`, '_blank');
  };

  const handleGeneratePDF = async () => {
    const { generateBookingSummaryPdf } = await import('@/lib/pdf/generateBookingSummaryPdf');
    const boatName = formData.projectId
      ? projects.find(p => p.id === formData.projectId)?.name
      : formData.externalBoatName || undefined;
    const ownerName = formData.bookingOwner
      ? users.find(u => u.id === formData.bookingOwner)?.full_name || undefined
      : undefined;
    const doc = await generateBookingSummaryPdf({
      bookingNumber: formData.bookingNumber || '',
      type: formData.type || 'day_charter',
      status: formData.status || 'enquiry',
      title: formData.title || '',
      dateFrom: formData.dateFrom || '',
      dateTo: formData.dateTo || '',
      time: formData.time,
      customerName: formData.customerName || '',
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone,
      contactChannel: formData.contactChannel,
      numberOfGuests: formData.numberOfGuests,
      contactPerson: ownerName,
      destination: formData.destination,
      pickupLocation: formData.pickupLocation,
      departureFrom: formData.departureFrom,
      arrivalTo: formData.arrivalTo,
      extras: formData.extras,
      extraItems: formData.extraItems,
      currency: formData.currency || 'THB',
      charterFee: formData.charterFee,
      extraCharges: formData.extraCharges,
      adminFee: formData.adminFee,
      totalPrice: formData.totalPrice,
      payments: payments
        .filter(p => p.amount > 0)
        .map(p => ({ type: p.paymentType, amount: p.amount, currency: p.currency, dueDate: p.dueDate || undefined, paidDate: p.paidDate || undefined })),
      contractNote: formData.contractNote,
      customerNotes: formData.customerNotes,
      boatName,
    });
    const url = doc.output('bloburl');
    window.open(url as unknown as string, '_blank');
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    // Prevent deleting bookings with related records
    const hasRelatedRecords = payments.length > 0 || cashCollections.length > 0 || linkedDocuments.length > 0;
    if (hasRelatedRecords) {
      const reasons: string[] = [];
      if (payments.length > 0) reasons.push(`${payments.length} payment record(s)`);
      if (linkedDocuments.length > 0) reasons.push(`${linkedDocuments.length} receipt(s)/invoice(s)`);
      if (cashCollections.length > 0) reasons.push(`${cashCollections.length} cash collection(s)`);
      alert(`This booking cannot be deleted because it has related records:\n\n• ${reasons.join('\n• ')}\n\nPlease remove these records first, or cancel the booking instead.`);
      return;
    }

    if (!confirm('Are you sure you want to delete this booking?')) return;
    setIsSaving(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Error deleting booking:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Booking' : 'New Booking'}
            </h2>
            {booking && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg">
                {booking.bookingNumber}
              </span>
            )}
            {isEditing && allSectionsCompleted && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                Data Complete
              </span>
            )}
            {booking?.updatedAt && (
              <span className="text-xs text-gray-400">
                Last edited {new Date(booking.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                at {new Date(booking.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                {booking.updatedByName && ` by ${booking.updatedByName}`}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Section 1: Header */}
            <HeaderSection
              formData={formData}
              onChange={handleChange}
              errors={errors}
              canEdit={canEdit}
              projects={projects}
              externalBoats={externalBoats}
              useExternalBoat={useExternalBoat}
              onUseExternalBoatChange={(val) => {
                setUseExternalBoat(val);
                if (val) {
                  setFormData(prev => ({ ...prev, projectId: undefined }));
                } else {
                  setFormData(prev => ({ ...prev, externalBoatName: '', charterCost: undefined, charterCostCurrency: undefined }));
                }
              }}
              selectedProduct={selectedProduct}
              onClearProduct={() => { setSelectedProduct(null); setAutoFilledFields(new Set()); }}
              autoFilledFields={autoFilledFields}
              users={users}
              meetGreeters={meetGreeters}
              onCreateMeetGreeter={handleCreateMeetGreeter}
              isCollapsed={!!collapsedSections.header}
              onToggleCollapse={() => toggleSection('header')}
              isCompleted={!!(formData.completedSections || {}).header}
              onToggleCompleted={canEdit ? () => toggleSectionCompleted('header') : undefined}
            />

            {/* Section 2: Customer Information (hidden for cabin charter) */}
            {formData.type !== 'cabin_charter' && (
              <CustomerSection
                formData={formData}
                onChange={handleChange}
                errors={errors}
                canEdit={canEdit}
                isAgencyView={isAgencyView}
                isCollapsed={!!collapsedSections.customer}
                onToggleCollapse={() => toggleSection('customer')}
                isCompleted={!!(formData.completedSections || {}).customer}
                onToggleCompleted={canEdit ? () => toggleSectionCompleted('customer') : undefined}
              />
            )}

            {/* Section 3: Booking Details */}
            <BookingDetailsSection
              formData={formData}
              onChange={handleChange}
              errors={errors}
              canEdit={canEdit}
              autoFilledFields={autoFilledFields}
              onUploadContractAttachment={handleUploadContractAttachment}
              onRemoveContractAttachment={handleRemoveContractAttachment}
              cabinCharterMode={formData.type === 'cabin_charter'}
              projects={projects.map(p => ({ id: p.id, name: p.name }))}
              isCollapsed={!!collapsedSections.bookingDetails}
              onToggleCollapse={() => toggleSection('bookingDetails')}
              isCompleted={!!(formData.completedSections || {}).bookingDetails}
              onToggleCompleted={canEdit ? () => toggleSectionCompleted('bookingDetails') : undefined}
            />

            {/* Section 4: Finance (hidden for cabin charter) */}
            {!isAgencyView && formData.type !== 'cabin_charter' && (
              <FinanceSection
                formData={formData}
                onChange={handleChange}
                errors={errors}
                canEdit={canEdit}
                isEditing={isEditing}
                booking={booking}
                payments={payments}
                onPaymentsChange={setPayments}
                onUploadFinanceAttachment={handleUploadFinanceAttachment}
                onRemoveFinanceAttachment={handleRemoveFinanceAttachment}
                autoFilledFields={autoFilledFields}
                onCreateReceipt={handleCreateReceipt}
                onCreateInvoice={handleCreateInvoice}
                linkedDocuments={linkedDocuments}
                onViewDocument={handleViewDocument}
                cashCollections={cashCollections}
                onRecordCash={() => { setEditingCash(null); setShowCashModal(true); }}
                onEditCash={(cash) => { setEditingCash(cash); setShowCashModal(true); }}
                bankAccounts={bankAccounts}
                companies={companies}
                onAddPaymentFromInvoice={handleAddPaymentFromInvoice}
                loadBankAccountsForCompany={loadBankAccountsForCompany}
                isCollapsed={!!collapsedSections.finance}
                onToggleCollapse={() => toggleSection('finance')}
                isCompleted={!!(formData.completedSections || {}).finance}
                onToggleCompleted={canEdit ? () => toggleSectionCompleted('finance') : undefined}
              />
            )}

            {/* Section 5: Commission (hidden for cabin charter) */}
            {!isAgencyView && formData.type !== 'cabin_charter' && (
              <CommissionSection
                formData={formData}
                onChange={handleChange}
                canEdit={canEdit}
                isCollapsed={!!collapsedSections.commission}
                onToggleCollapse={() => toggleSection('commission')}
                isCompleted={!!(formData.completedSections || {}).commission}
                onToggleCompleted={canEdit ? () => toggleSectionCompleted('commission') : undefined}
              />
            )}

            {/* Section 6: Crew */}
            <CrewSection
              selectedCrewIds={selectedCrewIds}
              onCrewChange={setSelectedCrewIds}
              canEdit={canEdit}
              isCollapsed={!!collapsedSections.crew}
              onToggleCollapse={() => toggleSection('crew')}
              isCompleted={!!(formData.completedSections || {}).crew}
              onToggleCompleted={canEdit ? () => toggleSectionCompleted('crew') : undefined}
            />

            {/* Section 6.5: Cabin Allocations (cabin charter only) */}
            {formData.type === 'cabin_charter' && (
              <CabinSection
                bookingId={booking?.id}
                projectId={formData.projectId}
                cabinAllocations={cabinAllocations}
                onAllocationsChange={setCabinAllocations}
                canEdit={canEdit}
                currency={formData.currency || 'THB'}
                dateFrom={formData.dateFrom}
                bankAccounts={bankAccounts}
                companies={companies}
                users={users}
                onRecordCash={(allocationId) => {
                  setCabinCashAllocationId(allocationId);
                  setEditingCash(null);
                  setShowCashModal(true);
                }}
                isCollapsed={!!collapsedSections.cabinAllocations}
                onToggleCollapse={() => toggleSection('cabinAllocations')}
              />
            )}

            {/* Cabin Charter: Overview panels (Extras, Contract, Finance, Notes summaries) */}
            {formData.type === 'cabin_charter' && (
              <CabinCharterOverview
                cabinAllocations={cabinAllocations}
                currency={formData.currency || 'THB'}
                formData={formData}
                onChange={handleChange}
                canEdit={canEdit}
                onUploadInternalAttachment={handleUploadInternalAttachment}
                onRemoveInternalAttachment={handleRemoveInternalAttachment}
                isCollapsed={!!collapsedSections.cabinOverview}
                onToggleCollapse={() => toggleSection('cabinOverview')}
              />
            )}

            {/* Section 7: Internal Note (non-cabin-charter only) */}
            {formData.type !== 'cabin_charter' && !isAgencyView && (
              <InternalNoteSection
                formData={formData}
                onChange={handleChange}
                canEdit={canEdit}
                onUploadInternalAttachment={handleUploadInternalAttachment}
                onRemoveInternalAttachment={handleRemoveInternalAttachment}
                isCollapsed={!!collapsedSections.internalNote}
                onToggleCollapse={() => toggleSection('internalNote')}
                isCompleted={!!(formData.completedSections || {}).internalNote}
                onToggleCompleted={canEdit ? () => toggleSectionCompleted('internalNote') : undefined}
              />
            )}

            {/* Section 8: Customer Notes (non-cabin-charter only) */}
            {formData.type !== 'cabin_charter' && (
              <CustomerNoteSection
                formData={formData}
                onChange={handleChange}
                canEdit={canEdit}
                isCollapsed={!!collapsedSections.customerNote}
                onToggleCollapse={() => toggleSection('customerNote')}
                isCompleted={!!(formData.completedSections || {}).customerNote}
                onToggleCompleted={canEdit ? () => toggleSectionCompleted('customerNote') : undefined}
              />
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing && onDelete && canEdit && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            {isEditing && (
              <button
                onClick={handleGeneratePDF}
                className="flex items-center gap-2 px-4 py-2 text-[#5A7A8F] hover:bg-blue-50 rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4" />
                Booking Summary
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  isEditing ? 'Save Changes' : 'Create Booking'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
      {/* Conflict Dialog */}
      {showConflictDialog && conflictResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[calc(100vh-2rem)] flex flex-col">
            <h3 className={`text-lg font-semibold mb-3 ${conflictResult.hasHardConflict ? 'text-red-700' : 'text-amber-700'}`}>
              {conflictResult.hasHardConflict ? 'Booking Conflict' : 'Booking Warning'}
            </h3>
            <p className="text-sm text-gray-700 mb-4">{conflictResult.message}</p>
            {conflictResult.conflicts.length > 0 && (
              <div className="mb-4 space-y-2 overflow-y-auto flex-1 min-h-0">
                {conflictResult.conflicts.map((c) => (
                  <div key={c.id} className="text-xs bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <span className="font-medium">{c.title}</span> — {c.customerName}
                    <br />
                    {c.dateFrom}{c.dateFrom !== c.dateTo ? ` to ${c.dateTo}` : ''} · {c.time || 'Full day'} · <span className="capitalize">{c.status}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelConflict}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              {conflictResult.hasSoftConflict && !conflictResult.hasHardConflict && (
                <button
                  onClick={handleConfirmConflict}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                >
                  Confirm Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showCashModal && booking?.id && authUser?.id && (
        <RecordCashModal
          onClose={() => { setShowCashModal(false); setEditingCash(null); }}
          bookingId={booking.id}
          defaultCurrency={formData.currency || 'THB'}
          currentUserId={authUser.id}
          users={userProfiles}
          editData={editingCash ? {
            id: editingCash.id,
            amount: editingCash.amount,
            currency: editingCash.currency,
            collected_by: editingCash.collected_by,
            collection_notes: editingCash.collection_notes,
          } : undefined}
          onSubmit={async (data) => {
            if (editingCash) {
              await cashCollectionsApi.update(editingCash.id, {
                amount: data.amount,
                currency: data.currency,
                collected_by: data.collected_by_id,
                collection_notes: data.collection_notes || null,
              });
            } else {
              const resolvedCompanyId = projects.find(p => p.id === formData.projectId)?.companyId;
              if (!resolvedCompanyId) {
                alert('Cannot record cash: no company associated with this booking. Please select a boat/project first.');
                return;
              }
              await cashCollectionsApi.create({
                company_id: resolvedCompanyId,
                booking_id: booking.id,
                amount: data.amount,
                currency: data.currency,
                collected_by: data.collected_by_id,
                collection_notes: data.collection_notes,
              });
            }
            const updated = await cashCollectionsApi.getByBookingId(booking.id);
            setCashCollections(updated);
            setEditingCash(null);
          }}
          onDelete={async (id) => {
            await cashCollectionsApi.delete(id);
            const updated = await cashCollectionsApi.getByBookingId(booking.id);
            setCashCollections(updated);
            setEditingCash(null);
          }}
        />
      )}
    </>
  );
}
