import { createClient } from '../client';
import type { TaxiTransfer } from '@/data/taxi/types';

// DB row shape (snake_case) — we use `as any` for columns not yet in generated types
type DbRow = Record<string, any>;

function dbToFrontend(db: DbRow): TaxiTransfer {
  return {
    id: db.id,
    transferNumber: db.transfer_number,
    bookingId: db.booking_id ?? undefined,
    tripType: db.trip_type,
    status: db.status,
    boatName: db.boat_name ?? undefined,
    guestName: db.guest_name,
    contactNumber: db.contact_number ?? undefined,
    numberOfGuests: db.number_of_guests ?? undefined,
    pickupDate: db.pickup_date ?? undefined,
    pickupTime: db.pickup_time ?? undefined,
    pickupLocation: db.pickup_location ?? undefined,
    pickupLocationUrl: db.pickup_location_url ?? undefined,
    pickupDropoff: db.pickup_dropoff ?? undefined,
    pickupDropoffUrl: db.pickup_dropoff_url ?? undefined,
    returnDate: db.return_date ?? undefined,
    returnTime: db.return_time ?? undefined,
    returnLocation: db.return_location ?? undefined,
    returnLocationUrl: db.return_location_url ?? undefined,
    returnDropoff: db.return_dropoff ?? undefined,
    returnDropoffUrl: db.return_dropoff_url ?? undefined,
    taxiCompanyId: db.taxi_company_id ?? undefined,
    taxiCompanyName: db.taxi_companies?.name ?? undefined,
    driverName: db.driver_name ?? undefined,
    driverPhone: db.driver_phone ?? undefined,
    vanNumberPlate: db.van_number_plate ?? undefined,
    paidBy: db.paid_by ?? 'guest',
    amount: db.amount ?? undefined,
    currency: db.currency ?? 'THB',
    paymentNote: db.payment_note ?? undefined,
    farawayPaid: db.faraway_paid ?? false,
    farawayPaidDate: db.faraway_paid_date ?? undefined,
    farawayPaidWeek: db.faraway_paid_week ?? undefined,
    guestNote: db.guest_note ?? undefined,
    driverNote: db.driver_note ?? undefined,
    createdBy: db.created_by ?? '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function frontendToDb(t: Partial<TaxiTransfer>): Record<string, any> {
  const db: Record<string, any> = {};
  if (t.transferNumber !== undefined) db.transfer_number = t.transferNumber;
  if (t.bookingId !== undefined) db.booking_id = t.bookingId || null;
  if (t.tripType !== undefined) db.trip_type = t.tripType;
  if (t.status !== undefined) db.status = t.status;
  if (t.boatName !== undefined) db.boat_name = t.boatName || null;
  if (t.guestName !== undefined) db.guest_name = t.guestName;
  if (t.contactNumber !== undefined) db.contact_number = t.contactNumber || null;
  if (t.numberOfGuests !== undefined) db.number_of_guests = t.numberOfGuests ?? null;
  if (t.pickupDate !== undefined) db.pickup_date = t.pickupDate || null;
  if (t.pickupTime !== undefined) db.pickup_time = t.pickupTime || null;
  if (t.pickupLocation !== undefined) db.pickup_location = t.pickupLocation || null;
  if (t.pickupLocationUrl !== undefined) db.pickup_location_url = t.pickupLocationUrl || null;
  if (t.pickupDropoff !== undefined) db.pickup_dropoff = t.pickupDropoff || null;
  if (t.pickupDropoffUrl !== undefined) db.pickup_dropoff_url = t.pickupDropoffUrl || null;
  if (t.returnDate !== undefined) db.return_date = t.returnDate || null;
  if (t.returnTime !== undefined) db.return_time = t.returnTime || null;
  if (t.returnLocation !== undefined) db.return_location = t.returnLocation || null;
  if (t.returnLocationUrl !== undefined) db.return_location_url = t.returnLocationUrl || null;
  if (t.returnDropoff !== undefined) db.return_dropoff = t.returnDropoff || null;
  if (t.returnDropoffUrl !== undefined) db.return_dropoff_url = t.returnDropoffUrl || null;
  if (t.taxiCompanyId !== undefined) db.taxi_company_id = t.taxiCompanyId || null;
  if (t.driverName !== undefined) db.driver_name = t.driverName || null;
  if (t.driverPhone !== undefined) db.driver_phone = t.driverPhone || null;
  if (t.vanNumberPlate !== undefined) db.van_number_plate = t.vanNumberPlate || null;
  if (t.paidBy !== undefined) db.paid_by = t.paidBy;
  if (t.amount !== undefined) db.amount = t.amount ?? null;
  if (t.currency !== undefined) db.currency = t.currency;
  if (t.paymentNote !== undefined) db.payment_note = t.paymentNote || null;
  if (t.farawayPaid !== undefined) db.faraway_paid = t.farawayPaid;
  if (t.farawayPaidDate !== undefined) db.faraway_paid_date = t.farawayPaidDate || null;
  if (t.farawayPaidWeek !== undefined) db.faraway_paid_week = t.farawayPaidWeek || null;
  if (t.guestNote !== undefined) db.guest_note = t.guestNote || null;
  if (t.driverNote !== undefined) db.driver_note = t.driverNote || null;
  return db;
}

const SELECT_WITH_COMPANY = '*, taxi_companies(name)';

/**
 * Generate the next sequential transfer number for the current month.
 * Format: TX-YYYYMMXXX (e.g., TX-202602001)
 */
export async function getNextTransferNumber(): Promise<string> {
  const supabase = createClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `TX-${year}${month}`;

  const { data, error } = await supabase
    .from('taxi_transfers' as any)
    .select('transfer_number')
    .like('transfer_number', `${prefix}%`)
    .order('transfer_number', { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (!error && data && data.length > 0) {
    const lastNumber = (data[0] as any).transfer_number;
    const seqStr = lastNumber.substring(prefix.length);
    const lastSeq = parseInt(seqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Create a transfer with a sequential number.
 * Retries on UNIQUE constraint collision (race condition).
 */
export async function createTransferWithNumber(
  transferData: Partial<TaxiTransfer>
): Promise<TaxiTransfer> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const transferNumber = await getNextTransferNumber();
    try {
      return await taxiTransfersApi.create({ ...transferData, transferNumber });
    } catch (error: any) {
      if (error?.code === '23505' && attempt < MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Failed to generate unique transfer number after retries');
}

export const taxiTransfersApi = {
  async getAll(): Promise<TaxiTransfer[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .select(SELECT_WITH_COMPANY)
      .order('pickup_date', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getById(id: string): Promise<TaxiTransfer | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .select(SELECT_WITH_COMPANY)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return dbToFrontend(data);
  },

  async getByBookingId(bookingId: string): Promise<TaxiTransfer[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .select(SELECT_WITH_COMPANY)
      .eq('booking_id', bookingId)
      .order('pickup_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getByCompanyId(companyId: string): Promise<TaxiTransfer[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .select(SELECT_WITH_COMPANY)
      .eq('taxi_company_id', companyId)
      .order('pickup_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getByDateRange(from: string, to: string): Promise<TaxiTransfer[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .select(SELECT_WITH_COMPANY)
      .or(`pickup_date.gte.${from},return_date.gte.${from}`)
      .or(`pickup_date.lte.${to},return_date.lte.${to}`)
      .neq('status', 'cancelled')
      .order('pickup_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getByWeek(weekString: string): Promise<TaxiTransfer[]> {
    const supabase = createClient();
    // Get transfers that should be settled in this week
    // This includes transfers where paid_by = 'faraway' with matching payment week
    // OR transfers within the week's date range regardless of paid_by
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .select(SELECT_WITH_COMPANY)
      .eq('faraway_paid_week', weekString)
      .order('pickup_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async getUnpaidByFaraway(): Promise<TaxiTransfer[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .select(SELECT_WITH_COMPANY)
      .eq('paid_by', 'faraway')
      .eq('faraway_paid', false)
      .neq('status', 'cancelled')
      .order('pickup_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(dbToFrontend);
  },

  async create(transfer: Partial<TaxiTransfer>): Promise<TaxiTransfer> {
    const supabase = createClient();
    const dbData = frontendToDb(transfer);
    if (!dbData.created_by) {
      const { data: { user } } = await supabase.auth.getUser();
      dbData.created_by = user?.id || null;
    }
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .insert([dbData])
      .select(SELECT_WITH_COMPANY)
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async update(id: string, updates: Partial<TaxiTransfer>): Promise<TaxiTransfer> {
    const supabase = createClient();
    const dbData = frontendToDb(updates);
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .update(dbData)
      .eq('id', id)
      .select(SELECT_WITH_COMPANY)
      .single();
    if (error) throw error;
    return dbToFrontend(data);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('taxi_transfers' as any)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async markFarawayPaid(id: string, paidDate?: string): Promise<TaxiTransfer> {
    const now = new Date();
    const date = paidDate || now.toISOString().split('T')[0];
    // Calculate ISO week string: YYYY-Www
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
    const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
    const weekString = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    return this.update(id, {
      farawayPaid: true,
      farawayPaidDate: date,
      farawayPaidWeek: weekString,
    });
  },

  async getTaxiCountsByBookingIds(bookingIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (bookingIds.length === 0) return result;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('taxi_transfers' as any)
      .select('booking_id')
      .in('booking_id', bookingIds)
      .neq('status', 'cancelled');
    if (error) throw error;

    for (const row of (data ?? []) as unknown as { booking_id: string }[]) {
      result.set(row.booking_id, (result.get(row.booking_id) || 0) + 1);
    }

    return result;
  },

  async markFarawayUnpaid(id: string): Promise<TaxiTransfer> {
    return this.update(id, {
      farawayPaid: false,
      farawayPaidDate: undefined,
      farawayPaidWeek: undefined,
    });
  },
};
