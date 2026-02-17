import { createClient } from '../client';
import type { CabinAllocation, ProjectCabin, BookingAttachment } from '@/data/booking/types';

// Snake_case row type matching the DB schema
interface CabinAllocationRow {
  id: string;
  booking_id: string;
  project_cabin_id: string | null;
  cabin_label: string;
  cabin_number: number;
  status: string;
  guest_names: string | null;
  number_of_guests: number;
  nationality: string | null;
  guest_notes: string | null;
  booking_source_type: string | null;
  agent_name: string | null;
  contact_platform: string | null;
  contact_info: string | null;
  booking_owner: string | null;
  extras: string[] | null;
  extra_items: any; // JSONB
  contract_note: string | null;
  contract_attachments: any; // JSONB
  commission_rate: number | null;
  total_commission: number | null;
  commission_deduction: number | null;
  commission_received: number | null;
  commission_note: string | null;
  internal_notes: string | null;
  internal_note_attachments: any; // JSONB
  customer_notes: string | null;
  price: number | null;
  currency: string;
  payment_status: string;
  invoice_id: string | null;
  receipt_id: string | null;
  is_completed: boolean | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function parseJsonbAttachments(val: any): BookingAttachment[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.length > 0 ? val as BookingAttachment[] : undefined;
  if (typeof val === 'string') {
    try { const arr = JSON.parse(val); return arr.length > 0 ? arr : undefined; } catch { return undefined; }
  }
  return undefined;
}

function rowToAllocation(row: CabinAllocationRow): CabinAllocation {
  return {
    id: row.id,
    bookingId: row.booking_id,
    projectCabinId: row.project_cabin_id ?? undefined,
    cabinLabel: row.cabin_label,
    cabinNumber: row.cabin_number,
    status: row.status as CabinAllocation['status'],
    guestNames: row.guest_names ?? undefined,
    numberOfGuests: row.number_of_guests ?? 0,
    nationality: row.nationality ?? undefined,
    guestNotes: row.guest_notes ?? undefined,
    bookingSourceType: (row.booking_source_type as CabinAllocation['bookingSourceType']) ?? 'direct',
    agentName: row.agent_name ?? undefined,
    contactPlatform: row.contact_platform ?? undefined,
    contactInfo: row.contact_info ?? undefined,
    bookingOwner: row.booking_owner ?? undefined,
    extras: row.extras ?? undefined,
    extraItems: row.extra_items ?? undefined,
    contractNote: row.contract_note ?? undefined,
    contractAttachments: parseJsonbAttachments(row.contract_attachments),
    commissionRate: row.commission_rate ?? undefined,
    totalCommission: row.total_commission ?? undefined,
    commissionDeduction: row.commission_deduction ?? undefined,
    commissionReceived: row.commission_received ?? undefined,
    commissionNote: row.commission_note ?? undefined,
    agencyCommissionRate: (row as any).agency_commission_rate ?? undefined,
    agencyCommissionAmount: (row as any).agency_commission_amount ?? undefined,
    agencyCommissionThb: (row as any).agency_commission_thb ?? undefined,
    agencyPaymentStatus: (row as any).agency_payment_status ?? undefined,
    agencyPaidDate: (row as any).agency_paid_date ?? undefined,
    agencyPaymentNote: (row as any).agency_payment_note ?? undefined,
    internalNotes: row.internal_notes ?? undefined,
    internalNoteAttachments: parseJsonbAttachments(row.internal_note_attachments),
    customerNotes: row.customer_notes ?? undefined,
    charterFee: (row as any).charter_fee ?? undefined,
    adminFee: (row as any).admin_fee ?? undefined,
    price: row.price ?? undefined,
    currency: row.currency,
    fxRate: (row as any).fx_rate ?? undefined,
    fxRateSource: (row as any).fx_rate_source ?? undefined,
    thbTotalPrice: (row as any).thb_total_price ?? undefined,
    paymentStatus: row.payment_status as CabinAllocation['paymentStatus'],
    invoiceId: row.invoice_id ?? undefined,
    receiptId: row.receipt_id ?? undefined,
    isCompleted: row.is_completed ?? false,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function allocationToRow(a: Partial<CabinAllocation> & { bookingId: string }): Record<string, any> {
  const row: Record<string, any> = { booking_id: a.bookingId };
  if (a.projectCabinId !== undefined) row.project_cabin_id = a.projectCabinId || null;
  if (a.cabinLabel !== undefined) row.cabin_label = a.cabinLabel;
  if (a.cabinNumber !== undefined) row.cabin_number = a.cabinNumber;
  if (a.status !== undefined) row.status = a.status;
  if (a.guestNames !== undefined) row.guest_names = a.guestNames || null;
  if (a.numberOfGuests !== undefined) row.number_of_guests = a.numberOfGuests;
  if (a.nationality !== undefined) row.nationality = a.nationality || null;
  if (a.guestNotes !== undefined) row.guest_notes = a.guestNotes || null;
  if (a.bookingSourceType !== undefined) row.booking_source_type = a.bookingSourceType || 'direct';
  if (a.agentName !== undefined) row.agent_name = a.agentName || null;
  if (a.contactPlatform !== undefined) row.contact_platform = a.contactPlatform || null;
  if (a.contactInfo !== undefined) row.contact_info = a.contactInfo || null;
  if (a.bookingOwner !== undefined) row.booking_owner = a.bookingOwner || null;
  if (a.extras !== undefined) row.extras = a.extras || [];
  if (a.extraItems !== undefined) row.extra_items = a.extraItems || [];
  if (a.contractNote !== undefined) row.contract_note = a.contractNote || null;
  if (a.contractAttachments !== undefined) row.contract_attachments = a.contractAttachments || [];
  if (a.commissionRate !== undefined) row.commission_rate = a.commissionRate ?? null;
  if (a.totalCommission !== undefined) row.total_commission = a.totalCommission ?? null;
  if (a.commissionDeduction !== undefined) row.commission_deduction = a.commissionDeduction ?? null;
  if (a.commissionReceived !== undefined) row.commission_received = a.commissionReceived ?? null;
  if (a.commissionNote !== undefined) row.commission_note = a.commissionNote || null;
  if (a.agencyCommissionRate !== undefined) row.agency_commission_rate = a.agencyCommissionRate ?? null;
  if (a.agencyCommissionAmount !== undefined) row.agency_commission_amount = a.agencyCommissionAmount ?? null;
  if (a.agencyCommissionThb !== undefined) row.agency_commission_thb = a.agencyCommissionThb ?? null;
  if (a.agencyPaymentStatus !== undefined) row.agency_payment_status = a.agencyPaymentStatus || null;
  if (a.agencyPaidDate !== undefined) row.agency_paid_date = a.agencyPaidDate || null;
  if (a.agencyPaymentNote !== undefined) row.agency_payment_note = a.agencyPaymentNote || null;
  if (a.internalNotes !== undefined) row.internal_notes = a.internalNotes || null;
  if (a.internalNoteAttachments !== undefined) row.internal_note_attachments = a.internalNoteAttachments || [];
  if (a.customerNotes !== undefined) row.customer_notes = a.customerNotes || null;
  if (a.charterFee !== undefined) row.charter_fee = a.charterFee ?? null;
  if (a.adminFee !== undefined) row.admin_fee = a.adminFee ?? null;
  if (a.price !== undefined) row.price = a.price ?? null;
  if (a.currency !== undefined) row.currency = a.currency;
  if (a.fxRate !== undefined) row.fx_rate = a.fxRate ?? null;
  if (a.fxRateSource !== undefined) row.fx_rate_source = a.fxRateSource || null;
  if (a.thbTotalPrice !== undefined) row.thb_total_price = a.thbTotalPrice ?? null;
  if (a.paymentStatus !== undefined) row.payment_status = a.paymentStatus;
  if (a.invoiceId !== undefined) row.invoice_id = a.invoiceId || null;
  if (a.receiptId !== undefined) row.receipt_id = a.receiptId || null;
  if (a.isCompleted !== undefined) row.is_completed = a.isCompleted ?? false;
  if (a.sortOrder !== undefined) row.sort_order = a.sortOrder;
  return row;
}

export const cabinAllocationsApi = {
  async getByBookingId(bookingId: string): Promise<CabinAllocation[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cabin_allocations')
      .select('*')
      .eq('booking_id', bookingId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as CabinAllocationRow[]).map(rowToAllocation);
  },

  async create(allocation: Partial<CabinAllocation> & { bookingId: string; cabinLabel: string; cabinNumber: number }): Promise<CabinAllocation> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cabin_allocations')
      .insert(allocationToRow(allocation))
      .select()
      .single();
    if (error) throw error;
    return rowToAllocation(data as CabinAllocationRow);
  },

  async update(id: string, updates: Partial<CabinAllocation>): Promise<CabinAllocation> {
    const supabase = createClient();
    const dbUpdates: Record<string, any> = {};
    if (updates.projectCabinId !== undefined) dbUpdates.project_cabin_id = updates.projectCabinId || null;
    if (updates.cabinLabel !== undefined) dbUpdates.cabin_label = updates.cabinLabel;
    if (updates.cabinNumber !== undefined) dbUpdates.cabin_number = updates.cabinNumber;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.guestNames !== undefined) dbUpdates.guest_names = updates.guestNames || null;
    if (updates.numberOfGuests !== undefined) dbUpdates.number_of_guests = updates.numberOfGuests;
    if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality || null;
    if (updates.guestNotes !== undefined) dbUpdates.guest_notes = updates.guestNotes || null;
    if (updates.bookingSourceType !== undefined) dbUpdates.booking_source_type = updates.bookingSourceType || 'direct';
    if (updates.agentName !== undefined) dbUpdates.agent_name = updates.agentName || null;
    if (updates.contactPlatform !== undefined) dbUpdates.contact_platform = updates.contactPlatform || null;
    if (updates.contactInfo !== undefined) dbUpdates.contact_info = updates.contactInfo || null;
    if (updates.bookingOwner !== undefined) dbUpdates.booking_owner = updates.bookingOwner || null;
    if (updates.extras !== undefined) dbUpdates.extras = updates.extras || [];
    if (updates.extraItems !== undefined) dbUpdates.extra_items = updates.extraItems || [];
    if (updates.contractNote !== undefined) dbUpdates.contract_note = updates.contractNote || null;
    if (updates.contractAttachments !== undefined) dbUpdates.contract_attachments = updates.contractAttachments || [];
    if (updates.commissionRate !== undefined) dbUpdates.commission_rate = updates.commissionRate ?? null;
    if (updates.totalCommission !== undefined) dbUpdates.total_commission = updates.totalCommission ?? null;
    if (updates.commissionDeduction !== undefined) dbUpdates.commission_deduction = updates.commissionDeduction ?? null;
    if (updates.commissionReceived !== undefined) dbUpdates.commission_received = updates.commissionReceived ?? null;
    if (updates.commissionNote !== undefined) dbUpdates.commission_note = updates.commissionNote || null;
    if (updates.agencyCommissionRate !== undefined) dbUpdates.agency_commission_rate = updates.agencyCommissionRate ?? null;
    if (updates.agencyCommissionAmount !== undefined) dbUpdates.agency_commission_amount = updates.agencyCommissionAmount ?? null;
    if (updates.agencyCommissionThb !== undefined) dbUpdates.agency_commission_thb = updates.agencyCommissionThb ?? null;
    if (updates.agencyPaymentStatus !== undefined) dbUpdates.agency_payment_status = updates.agencyPaymentStatus || null;
    if (updates.agencyPaidDate !== undefined) dbUpdates.agency_paid_date = updates.agencyPaidDate || null;
    if (updates.agencyPaymentNote !== undefined) dbUpdates.agency_payment_note = updates.agencyPaymentNote || null;
    if (updates.internalNotes !== undefined) dbUpdates.internal_notes = updates.internalNotes || null;
    if (updates.internalNoteAttachments !== undefined) dbUpdates.internal_note_attachments = updates.internalNoteAttachments || [];
    if (updates.customerNotes !== undefined) dbUpdates.customer_notes = updates.customerNotes || null;
    if (updates.charterFee !== undefined) dbUpdates.charter_fee = updates.charterFee ?? null;
    if (updates.adminFee !== undefined) dbUpdates.admin_fee = updates.adminFee ?? null;
    if (updates.price !== undefined) dbUpdates.price = updates.price ?? null;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.fxRate !== undefined) dbUpdates.fx_rate = updates.fxRate ?? null;
    if (updates.fxRateSource !== undefined) dbUpdates.fx_rate_source = updates.fxRateSource || null;
    if (updates.thbTotalPrice !== undefined) dbUpdates.thb_total_price = updates.thbTotalPrice ?? null;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.invoiceId !== undefined) dbUpdates.invoice_id = updates.invoiceId || null;
    if (updates.receiptId !== undefined) dbUpdates.receipt_id = updates.receiptId || null;
    if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted ?? false;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

    const { data, error } = await (supabase as any)
      .from('cabin_allocations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToAllocation(data as CabinAllocationRow);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('cabin_allocations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Initialize cabin allocations from a yacht's cabin template.
   * Creates one allocation row per configured cabin.
   */
  async initializeFromTemplate(bookingId: string, cabins: ProjectCabin[], currency: string = 'THB'): Promise<CabinAllocation[]> {
    if (cabins.length === 0) return [];

    const supabase = createClient();
    const rows = cabins.map((cabin, idx) => ({
      booking_id: bookingId,
      project_cabin_id: cabin.id,
      cabin_label: cabin.cabinName,
      cabin_number: cabin.cabinNumber,
      status: 'available',
      number_of_guests: 0,
      currency,
      payment_status: 'unpaid',
      sort_order: cabin.sortOrder ?? idx,
    }));

    const { data, error } = await (supabase as any)
      .from('cabin_allocations')
      .insert(rows)
      .select();
    if (error) throw error;
    return ((data ?? []) as CabinAllocationRow[]).map(rowToAllocation);
  },

  /**
   * Get cabin counts (booked vs total) for multiple bookings in a single query.
   * Used for calendar badge display.
   */
  async getCabinCountsByBookingIds(bookingIds: string[]): Promise<Map<string, { total: number; booked: number }>> {
    const result = new Map<string, { total: number; booked: number }>();
    if (bookingIds.length === 0) return result;

    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cabin_allocations')
      .select('booking_id, status')
      .in('booking_id', bookingIds);
    if (error) throw error;

    for (const row of (data ?? []) as { booking_id: string; status: string }[]) {
      const current = result.get(row.booking_id) || { total: 0, booked: 0 };
      current.total += 1;
      if (row.status === 'booked') {
        current.booked += 1;
      }
      result.set(row.booking_id, current);
    }

    return result;
  },

  /**
   * Get all cabin allocations that have agency commission (for Agency Payments page).
   * Joins parent booking for context (booking number, dates, boat).
   */
  async getAgencyPayments(): Promise<(CabinAllocation & { booking?: { booking_number: string; date_from: string; date_to: string; type: string; project_id: string | null; external_boat_name: string | null } })[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('cabin_allocations')
      .select('*, booking:bookings!booking_id(booking_number, date_from, date_to, type, project_id, external_boat_name)')
      .gt('agency_commission_amount', 0)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as any[]).map((row: any) => ({
      ...rowToAllocation(row),
      booking: row.booking,
    }));
  },

  async updateAgencyPaymentStatus(id: string, status: 'unpaid' | 'paid', paidDate?: string): Promise<void> {
    const supabase = createClient();
    const updates: Record<string, any> = {
      agency_payment_status: status,
      agency_paid_date: status === 'paid' ? (paidDate || new Date().toISOString().split('T')[0]) : null,
    };
    const { error } = await (supabase as any)
      .from('cabin_allocations')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },
};
