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
    agentName: db.agent_name ?? undefined,
    agentPlatform: db.agent_platform ?? undefined,
    meetAndGreeter: db.meet_and_greeter ?? undefined,
    destination: db.destination ?? undefined,
    pickupLocation: db.pickup_location ?? undefined,
    departureFrom: db.departure_from ?? undefined,
    arrivalTo: db.arrival_to ?? undefined,
    charterTime: db.charter_time ?? undefined,
    currency: db.currency as Booking['currency'],
    totalPrice: db.total_price ?? undefined,
    charterFee: db.charter_fee ?? undefined,
    extraCharges: db.extra_charges ?? undefined,
    adminFee: db.admin_fee ?? undefined,
    beamChargeId: db.beam_charge_id ?? undefined,
    paymentStatus: (db.payment_status as Booking['paymentStatus']) ?? undefined,
    depositAmount: db.deposit_amount ?? undefined,
    depositDueDate: db.deposit_due_date ?? undefined,
    depositPaidDate: db.deposit_paid_date ?? undefined,
    balanceAmount: db.balance_amount ?? undefined,
    balanceDueDate: db.balance_due_date ?? undefined,
    balancePaidDate: db.balance_paid_date ?? undefined,
    financeNote: db.finance_note ?? undefined,
    financeAttachments: (db.finance_attachments as BookingAttachment[] | null) ?? undefined,
    commissionRate: db.commission_rate ?? undefined,
    totalCommission: db.total_commission ?? undefined,
    commissionDeduction: db.commission_deduction ?? undefined,
    commissionReceived: db.commission_received ?? undefined,
    depositReceiptId: db.deposit_receipt_id ?? undefined,
    finalReceiptId: db.final_receipt_id ?? undefined,
    invoiceId: db.invoice_id ?? undefined,
    expenseIds: db.expense_ids ?? undefined,
    extras: (db as any).extras ?? undefined,
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
  if (booking.destination !== undefined) db.destination = booking.destination || null;
  if (booking.pickupLocation !== undefined) db.pickup_location = booking.pickupLocation || null;
  if (booking.departureFrom !== undefined) db.departure_from = booking.departureFrom || null;
  if (booking.arrivalTo !== undefined) db.arrival_to = booking.arrivalTo || null;
  if (booking.charterTime !== undefined) db.charter_time = booking.charterTime || null;
  if (booking.currency !== undefined) db.currency = booking.currency;
  if (booking.totalPrice !== undefined) db.total_price = booking.totalPrice ?? null;
  if (booking.charterFee !== undefined) db.charter_fee = booking.charterFee ?? null;
  if (booking.extraCharges !== undefined) db.extra_charges = booking.extraCharges ?? null;
  if (booking.adminFee !== undefined) db.admin_fee = booking.adminFee ?? null;
  if (booking.beamChargeId !== undefined) db.beam_charge_id = booking.beamChargeId ?? null;
  if (booking.paymentStatus !== undefined) db.payment_status = booking.paymentStatus || null;
  if (booking.depositAmount !== undefined) db.deposit_amount = booking.depositAmount ?? null;
  if (booking.depositDueDate !== undefined) db.deposit_due_date = booking.depositDueDate || null;
  if (booking.depositPaidDate !== undefined) db.deposit_paid_date = booking.depositPaidDate || null;
  if (booking.balanceAmount !== undefined) db.balance_amount = booking.balanceAmount ?? null;
  if (booking.balanceDueDate !== undefined) db.balance_due_date = booking.balanceDueDate || null;
  if (booking.balancePaidDate !== undefined) db.balance_paid_date = booking.balancePaidDate || null;
  if (booking.financeNote !== undefined) db.finance_note = booking.financeNote || null;
  if (booking.financeAttachments !== undefined) db.finance_attachments = booking.financeAttachments as unknown;
  if (booking.commissionRate !== undefined) db.commission_rate = booking.commissionRate ?? null;
  if (booking.totalCommission !== undefined) db.total_commission = booking.totalCommission ?? null;
  if (booking.commissionDeduction !== undefined) db.commission_deduction = booking.commissionDeduction ?? null;
  if (booking.commissionReceived !== undefined) db.commission_received = booking.commissionReceived ?? null;
  if (booking.depositReceiptId !== undefined) db.deposit_receipt_id = booking.depositReceiptId || null;
  if (booking.finalReceiptId !== undefined) db.final_receipt_id = booking.finalReceiptId || null;
  if (booking.invoiceId !== undefined) db.invoice_id = booking.invoiceId || null;
  if (booking.expenseIds !== undefined) db.expense_ids = booking.expenseIds || null;
  if (booking.extras !== undefined && Array.isArray(booking.extras) && booking.extras.length > 0) (db as any).extras = booking.extras;
  if (booking.contractNote) (db as any).contract_note = booking.contractNote;
  if (booking.contractAttachments !== undefined && Array.isArray(booking.contractAttachments) && booking.contractAttachments.length > 0) (db as any).contract_attachments = booking.contractAttachments;
  if (booking.internalNotes !== undefined) db.internal_notes = booking.internalNotes || null;
  if (booking.customerNotes !== undefined) db.customer_notes = booking.customerNotes || null;
  if (booking.internalNoteAttachments !== undefined) db.internal_note_attachments = booking.internalNoteAttachments as unknown;
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

export const bookingsApi = {
  async getAll(): Promise<Booking[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('date_from', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
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

  async getByDateRange(from: string, to: string): Promise<Booking[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .lte('date_from', to)
      .gte('date_to', from)
      .order('date_from', { ascending: true });
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

  async getUpcoming(): Promise<Booking[]> {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('date_from', today)
      .in('status', ['enquiry', 'hold', 'booked'])
      .order('date_from', { ascending: true })
      .limit(20);
    if (error) throw error;
    return (data ?? []).map(dbBookingToFrontend);
  },

  async getByMonth(year: number, month: number): Promise<Booking[]> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    return this.getByDateRange(from, to);
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
