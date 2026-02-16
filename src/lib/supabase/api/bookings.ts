import { createClient } from '../client';
import type { Database } from '../database.types';
import type {
  Booking,
  BookingGuest,
  BookingStatus,
  BookingAttachment,
} from '@/data/booking/types';

type DbBooking = Database['public']['Tables']['bookings']['Row'];
type DbBookingInsert = Database['public']['Tables']['bookings']['Insert'];
type DbBookingGuest = Database['public']['Tables']['booking_guests']['Row'];
type DbBookingGuestInsert = Database['public']['Tables']['booking_guests']['Insert'];

/**
 * Generate the next sequential booking number for the current month.
 * Format: FA-YYYYMMXXX (e.g., FA-202602001, FA-202602002)
 * Resets to 001 each month.
 */
export async function getNextBookingNumber(): Promise<string> {
  const supabase = createClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `FA-${year}${month}`;

  const { data, error } = await supabase
    .from('bookings')
    .select('booking_number')
    .like('booking_number', `${prefix}%`)
    .order('booking_number', { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (!error && data && data.length > 0) {
    const lastNumber = data[0].booking_number;
    const seqStr = lastNumber.substring(prefix.length);
    const lastSeq = parseInt(seqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Create a booking with a sequential booking number.
 * Retries on UNIQUE constraint collision (race condition between concurrent users).
 */
export async function createBookingWithNumber(
  bookingData: Partial<Booking>
): Promise<Booking> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const bookingNumber = await getNextBookingNumber();
    try {
      return await bookingsApi.create({ ...bookingData, bookingNumber });
    } catch (error: any) {
      if (error?.code === '23505' && attempt < MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Failed to generate unique booking number after retries');
}

function dbBookingToFrontend(db: DbBooking): Booking {
  return {
    id: db.id,
    bookingNumber: db.booking_number,
    type: db.type as Booking['type'],
    status: db.status as Booking['status'],
    title: db.title,
    dateFrom: db.date_from,
    dateTo: db.date_to,
    time: db.time ?? undefined,
    holdUntil: db.hold_until ?? undefined,
    projectId: db.project_id ?? undefined,
    externalBoatName: db.external_boat_name ?? undefined,
    customerName: db.customer_name,
    customerEmail: db.customer_email ?? undefined,
    customerPhone: db.customer_phone ?? undefined,
    contactChannel: (db.contact_channel as Booking['contactChannel']) ?? undefined,
    numberOfGuests: db.number_of_guests ?? undefined,
    bookingOwner: (db as any).sales_owner_id ?? undefined,
    bookingOwnerName: (db as any).sales_owner?.nickname || (db as any).sales_owner?.full_name_en || undefined,
    agentName: db.agent_name ?? undefined,
    agentPlatform: db.agent_platform ?? undefined,
    meetAndGreeter: db.meet_and_greeter ?? undefined,
    meetGreeterId: db.meet_greeter_id ?? undefined,
    destination: db.destination ?? undefined,
    pickupLocation: db.pickup_location ?? undefined,
    departureFrom: db.departure_from ?? undefined,
    arrivalTo: db.arrival_to ?? undefined,
    charterTime: db.charter_time ?? undefined,
    currency: db.currency as Booking['currency'],
    fxRate: (db as any).fx_rate ?? undefined,
    fxRateSource: (db as any).fx_rate_source ?? undefined,
    thbTotalPrice: (db as any).thb_total_price ?? undefined,
    totalPrice: db.total_price ?? undefined,
    charterFee: db.charter_fee ?? undefined,
    extraCharges: db.extra_charges ?? undefined,
    adminFee: db.admin_fee ?? undefined,
    beamChargeId: db.beam_charge_id ?? undefined,
    paymentStatus: (db.payment_status as Booking['paymentStatus']) ?? undefined,
    financeNote: db.finance_note ?? undefined,
    financeAttachments: (db.finance_attachments as BookingAttachment[] | null) ?? undefined,
    commissionRate: db.commission_rate ?? undefined,
    totalCommission: db.total_commission ?? undefined,
    commissionDeduction: db.commission_deduction ?? undefined,
    commissionReceived: db.commission_received ?? undefined,
    commissionNote: (db as any).commission_note ?? undefined,
    depositReceiptId: db.deposit_receipt_id ?? undefined,
    finalReceiptId: db.final_receipt_id ?? undefined,
    invoiceId: db.invoice_id ?? undefined,
    expenseIds: db.expense_ids ?? undefined,
    extras: (db as any).extras ?? undefined,
    extraItems: (db as any).extra_items ?? undefined,
    contractNote: (db as any).contract_note ?? undefined,
    contractAttachments: ((db as any).contract_attachments as BookingAttachment[] | null) ?? undefined,
    internalNotes: db.internal_notes ?? undefined,
    customerNotes: db.customer_notes ?? undefined,
    internalNoteAttachments: (db.internal_note_attachments as BookingAttachment[] | null) ?? undefined,
    createdBy: db.created_by ?? '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    updatedBy: db.updated_by ?? undefined,
    updatedByName: db.updated_by_name ?? undefined,
    charterCost: db.charter_cost ?? undefined,
    charterCostCurrency: (db as any).charter_cost_currency ?? undefined,
    charterExpenseStatus: db.charter_expense_status ?? undefined,
    linkedExpenseId: db.linked_expense_id ?? undefined,
    operatorDepositAmount: (db as any).operator_deposit_amount ?? undefined,
    operatorDepositPaidDate: (db as any).operator_deposit_paid_date ?? undefined,
    operatorBalanceAmount: (db as any).operator_balance_amount ?? undefined,
    operatorBalancePaidDate: (db as any).operator_balance_paid_date ?? undefined,
    operatorPaymentNote: (db as any).operator_payment_note ?? undefined,
    completedSections: (db as any).completed_sections ?? undefined,
  };
}

function frontendToDb(booking: Partial<Booking>): Partial<DbBookingInsert> {
  const db: Partial<DbBookingInsert> = {};
  if (booking.bookingNumber !== undefined) db.booking_number = booking.bookingNumber;
  if (booking.type !== undefined) db.type = booking.type;
  if (booking.status !== undefined) db.status = booking.status;
  if (booking.title !== undefined) db.title = booking.title;
  if (booking.dateFrom !== undefined) db.date_from = booking.dateFrom;
  if (booking.dateTo !== undefined) db.date_to = booking.dateTo;
  if (booking.time !== undefined) db.time = booking.time || null;
  if (booking.holdUntil !== undefined) db.hold_until = booking.holdUntil || null;
  if (booking.projectId !== undefined) db.project_id = booking.projectId || null;
  if (booking.externalBoatName !== undefined) db.external_boat_name = booking.externalBoatName || null;
  if (booking.customerName !== undefined) db.customer_name = booking.customerName;
  if (booking.customerEmail !== undefined) db.customer_email = booking.customerEmail || null;
  if (booking.customerPhone !== undefined) db.customer_phone = booking.customerPhone || null;
  if (booking.contactChannel !== undefined) db.contact_channel = booking.contactChannel || null;
  if (booking.numberOfGuests !== undefined) db.number_of_guests = booking.numberOfGuests ?? null;
  if (booking.bookingOwner !== undefined) (db as any).sales_owner_id = booking.bookingOwner || null;
  // Note: booking_owner (auth user FK) is set separately on create, not from form dropdown
  if (booking.agentName !== undefined) db.agent_name = booking.agentName || null;
  if (booking.agentPlatform !== undefined) db.agent_platform = booking.agentPlatform || null;
  if (booking.meetAndGreeter !== undefined) db.meet_and_greeter = booking.meetAndGreeter || null;
  if (booking.meetGreeterId !== undefined) db.meet_greeter_id = booking.meetGreeterId || null;
  if (booking.destination !== undefined) db.destination = booking.destination || null;
  if (booking.pickupLocation !== undefined) db.pickup_location = booking.pickupLocation || null;
  if (booking.departureFrom !== undefined) db.departure_from = booking.departureFrom || null;
  if (booking.arrivalTo !== undefined) db.arrival_to = booking.arrivalTo || null;
  if (booking.charterTime !== undefined) db.charter_time = booking.charterTime || null;
  if (booking.currency !== undefined) db.currency = booking.currency;
  if (booking.fxRate !== undefined) (db as any).fx_rate = booking.fxRate ?? null;
  if (booking.fxRateSource !== undefined) (db as any).fx_rate_source = booking.fxRateSource ?? null;
  if (booking.thbTotalPrice !== undefined) (db as any).thb_total_price = booking.thbTotalPrice ?? null;
  if (booking.totalPrice !== undefined) db.total_price = booking.totalPrice ?? null;
  if (booking.charterFee !== undefined) db.charter_fee = booking.charterFee ?? null;
  if (booking.extraCharges !== undefined) db.extra_charges = booking.extraCharges ?? null;
  if (booking.adminFee !== undefined) db.admin_fee = booking.adminFee ?? null;
  if (booking.beamChargeId !== undefined) db.beam_charge_id = booking.beamChargeId ?? null;
  if (booking.paymentStatus !== undefined) db.payment_status = booking.paymentStatus || null;
  if (booking.financeNote !== undefined) db.finance_note = booking.financeNote || null;
  if (booking.financeAttachments !== undefined) db.finance_attachments = booking.financeAttachments as unknown;
  if (booking.commissionRate !== undefined) db.commission_rate = booking.commissionRate ?? null;
  if (booking.totalCommission !== undefined) db.total_commission = booking.totalCommission ?? null;
  if (booking.commissionDeduction !== undefined) db.commission_deduction = booking.commissionDeduction ?? null;
  if (booking.commissionReceived !== undefined) db.commission_received = booking.commissionReceived ?? null;
  if (booking.commissionNote !== undefined) (db as any).commission_note = booking.commissionNote || null;
  if (booking.depositReceiptId !== undefined) db.deposit_receipt_id = booking.depositReceiptId || null;
  if (booking.finalReceiptId !== undefined) db.final_receipt_id = booking.finalReceiptId || null;
  if (booking.invoiceId !== undefined) db.invoice_id = booking.invoiceId || null;
  if (booking.expenseIds !== undefined) db.expense_ids = booking.expenseIds || null;
  // Legacy: extras string array no longer written (extra_items is primary store)
  if (booking.extraItems !== undefined) (db as any).extra_items = booking.extraItems || [];
  if (booking.contractNote) (db as any).contract_note = booking.contractNote;
  if (booking.contractAttachments !== undefined && Array.isArray(booking.contractAttachments) && booking.contractAttachments.length > 0) (db as any).contract_attachments = booking.contractAttachments;
  if (booking.internalNotes !== undefined) db.internal_notes = booking.internalNotes || null;
  if (booking.customerNotes !== undefined) db.customer_notes = booking.customerNotes || null;
  if (booking.internalNoteAttachments !== undefined) db.internal_note_attachments = booking.internalNoteAttachments as unknown;
  if (booking.charterCost !== undefined) db.charter_cost = booking.charterCost;
  if (booking.charterCostCurrency !== undefined) (db as any).charter_cost_currency = booking.charterCostCurrency;
  if (booking.charterExpenseStatus !== undefined) db.charter_expense_status = booking.charterExpenseStatus;
  if (booking.linkedExpenseId !== undefined) db.linked_expense_id = booking.linkedExpenseId;
  if (booking.operatorDepositAmount !== undefined) (db as any).operator_deposit_amount = booking.operatorDepositAmount ?? null;
  if (booking.operatorDepositPaidDate !== undefined) (db as any).operator_deposit_paid_date = booking.operatorDepositPaidDate || null;
  if (booking.operatorBalanceAmount !== undefined) (db as any).operator_balance_amount = booking.operatorBalanceAmount ?? null;
  if (booking.operatorBalancePaidDate !== undefined) (db as any).operator_balance_paid_date = booking.operatorBalancePaidDate || null;
  if (booking.operatorPaymentNote !== undefined) (db as any).operator_payment_note = booking.operatorPaymentNote || null;
  if (booking.completedSections !== undefined) (db as any).completed_sections = booking.completedSections ?? {};
  return db;
}

function dbGuestToFrontend(db: DbBookingGuest): BookingGuest {
  return {
    id: db.id,
    bookingId: db.booking_id,
    guestName: db.guest_name,
    guestEmail: db.guest_email ?? undefined,
    guestPhone: db.guest_phone ?? undefined,
    nationality: db.nationality ?? undefined,
    passportNumber: db.passport_number ?? undefined,
    cabinNumber: db.cabin_number ?? undefined,
    dietaryRequirements: db.dietary_requirements ?? undefined,
    notes: db.notes ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const bookingsApi = {
  async getAll(projectIds?: string[]): Promise<Booking[]> {
    if (projectIds && projectIds.length === 0) return [];
    const supabase = createClient();
    let query = supabase.from('bookings').select('*, sales_owner:employees!sales_owner_id(full_name_en, nickname)').order('date_from', { ascending: false }).limit(500);
    if (projectIds) query = query.in('project_id', projectIds);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  // Paginated version for large datasets
  async getPage(page: number = 1, pageSize: number = 50): Promise<PaginatedResult<Booking>> {
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .order('date_from', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const total = count ?? 0;
    return {
      data: (data ?? []).map(dbBookingToFrontend),
      total,
      page,
      pageSize,
      hasMore: from + (data?.length ?? 0) < total,
    };
  },

  async getById(id: string): Promise<Booking | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return dbBookingToFrontend(data);
  },

  async getByDateRange(from: string, to: string, projectIds?: string[]): Promise<Booking[]> {
    if (projectIds && projectIds.length === 0) return [];
    const supabase = createClient();
    let query = supabase.from('bookings').select('*, sales_owner:employees!sales_owner_id(full_name_en, nickname)')
      .lte('date_from', to)
      .gte('date_to', from)
      .order('date_from', { ascending: true });
    if (projectIds) query = query.in('project_id', projectIds);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  async getByProject(projectId: string): Promise<Booking[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('project_id', projectId)
      .order('date_from', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  async getByStatus(status: BookingStatus): Promise<Booking[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', status)
      .order('date_from', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  async getByOwner(userId: string): Promise<Booking[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_owner', userId)
      .order('date_from', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  async create(booking: Partial<Booking>): Promise<Booking> {
    const supabase = createClient();
    const dbData = frontendToDb(booking) as DbBookingInsert;
    // Ensure booking_owner (auth user FK, NOT NULL) is set to current user
    if (!dbData.booking_owner) {
      const { data: { user } } = await supabase.auth.getUser();
      dbData.booking_owner = user?.id || '';
    }
    const { data, error } = await supabase
      .from('bookings')
      .insert([dbData])
      .select()
      .single();
    if (error) throw error;
    return dbBookingToFrontend(data);
  },

  async update(id: string, updates: Partial<Booking>): Promise<Booking> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Get user's display name for updated_by_name
    let userName: string | null = null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      userName = profile?.full_name || user.email?.split('@')[0] || null;
    }
    const dbData = frontendToDb(updates);
    (dbData as any).updated_by = user?.id || null;
    (dbData as any).updated_by_name = userName;
    const { data, error } = await supabase
      .from('bookings')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return dbBookingToFrontend(data);
  },

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getUpcoming(projectIds?: string[]): Promise<Booking[]> {
    if (projectIds && projectIds.length === 0) return [];
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    let query = supabase.from('bookings').select('*')
      .gte('date_from', today)
      .in('status', ['enquiry', 'hold', 'booked'])
      .order('date_from', { ascending: true })
      .limit(20);
    if (projectIds) query = query.in('project_id', projectIds);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  async getPendingCharterExpenses(projectIds?: string[]): Promise<Booking[]> {
    if (projectIds && projectIds.length === 0) return [];
    const supabase = createClient();
    let query = supabase.from('bookings').select('*')
      .eq('charter_expense_status', 'pending_accounting')
      .order('date_from', { ascending: false });
    if (projectIds) query = query.in('project_id', projectIds);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  async getByMonth(year: number, month: number, projectIds?: string[]): Promise<Booking[]> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    return this.getByDateRange(from, to, projectIds);
  },

  async checkConflicts(projectId: string, dateFrom: string, dateTo: string, excludeBookingId?: string): Promise<Booking[]> {
    const supabase = createClient();
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('project_id', projectId)
      .lte('date_from', dateTo)
      .gte('date_to', dateFrom)
      .in('status', ['enquiry', 'hold', 'booked']);
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  async checkConflictsExternal(externalBoatName: string, dateFrom: string, dateTo: string, excludeBookingId?: string): Promise<Booking[]> {
    const supabase = createClient();
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('external_boat_name', externalBoatName)
      .lte('date_from', dateTo)
      .gte('date_to', dateFrom)
      .in('status', ['enquiry', 'hold', 'booked']);
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },
};

export const bookingGuestsApi = {
  async getByBookingId(bookingId: string): Promise<BookingGuest[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('booking_guests')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbGuestToFrontend);
  },

  async create(guest: Partial<BookingGuest>): Promise<BookingGuest> {
    const supabase = createClient();
    const dbData: DbBookingGuestInsert = {
      booking_id: guest.bookingId!,
      guest_name: guest.guestName!,
      guest_email: guest.guestEmail || null,
      guest_phone: guest.guestPhone || null,
      nationality: guest.nationality || null,
      passport_number: guest.passportNumber || null,
      cabin_number: guest.cabinNumber || null,
      dietary_requirements: guest.dietaryRequirements || null,
      notes: guest.notes || null,
    };
    const { data, error } = await supabase
      .from('booking_guests')
      .insert([dbData])
      .select()
      .single();
    if (error) throw error;
    return dbGuestToFrontend(data);
  },

  async update(id: string, updates: Partial<BookingGuest>): Promise<BookingGuest> {
    const supabase = createClient();
    const dbData: Partial<DbBookingGuestInsert> = {};
    if (updates.guestName !== undefined) dbData.guest_name = updates.guestName;
    if (updates.guestEmail !== undefined) dbData.guest_email = updates.guestEmail || null;
    if (updates.guestPhone !== undefined) dbData.guest_phone = updates.guestPhone || null;
    if (updates.nationality !== undefined) dbData.nationality = updates.nationality || null;
    if (updates.passportNumber !== undefined) dbData.passport_number = updates.passportNumber || null;
    if (updates.cabinNumber !== undefined) dbData.cabin_number = updates.cabinNumber || null;
    if (updates.dietaryRequirements !== undefined) dbData.dietary_requirements = updates.dietaryRequirements || null;
    if (updates.notes !== undefined) dbData.notes = updates.notes || null;
    const { data, error } = await supabase
      .from('booking_guests')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return dbGuestToFrontend(data);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_guests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteByBookingId(bookingId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_guests')
      .delete()
      .eq('booking_id', bookingId);
    if (error) throw error;
  },
};
