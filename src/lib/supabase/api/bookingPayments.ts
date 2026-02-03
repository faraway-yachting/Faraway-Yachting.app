import { createClient } from '../client';
import type { Database } from '../database.types';

type BookingPaymentRow = Database['public']['Tables']['booking_payments']['Row'];
type BookingPaymentInsert = Database['public']['Tables']['booking_payments']['Insert'];

// Extended type with new columns (not yet in generated types)
export interface BookingPaymentExtended extends BookingPaymentRow {
  receipt_id?: string | null;
  payment_method?: string | null;
  bank_account_id?: string | null;
  synced_to_receipt?: boolean;
  needs_accounting_action?: boolean;
}

export const bookingPaymentsApi = {
  async getByBookingId(bookingId: string): Promise<BookingPaymentExtended[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('booking_payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as BookingPaymentExtended[];
  },

  async create(record: Partial<BookingPaymentInsert> & {
    receipt_id?: string;
    payment_method?: string;
    bank_account_id?: string;
    paid_to_company_id?: string;
    synced_to_receipt?: boolean;
    needs_accounting_action?: boolean;
  }): Promise<BookingPaymentExtended> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('booking_payments')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data as BookingPaymentExtended;
  },

  async update(id: string, updates: Record<string, any>): Promise<void> {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('booking_payments')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteByBookingId(bookingId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('booking_payments')
      .delete()
      .eq('booking_id', bookingId);
    if (error) throw error;
  },

  async getNeedingAction(): Promise<BookingPaymentExtended[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('booking_payments')
      .select('*')
      .eq('needs_accounting_action', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as BookingPaymentExtended[];
  },

  /**
   * Sync a booking payment to its linked receipt by creating a receipt_payment_record.
   */
  async syncToReceipt(
    bookingPaymentId: string,
    receiptId: string,
    amount: number,
    paidDate: string,
    paymentMethod: string,
    bankAccountId?: string,
  ): Promise<void> {
    const { receiptsApi } = await import('./receipts');

    // Determine received_at: 'cash' for cash, bank_account_id for transfers
    const receivedAt = paymentMethod === 'cash' ? 'cash' : (bankAccountId || 'cash');

    // Create the receipt payment record
    await receiptsApi.addPaymentRecord({
      receipt_id: receiptId,
      payment_date: paidDate,
      amount,
      received_at: receivedAt,
      remark: `Synced from booking payment`,
    });

    // Mark booking payment as synced
    await this.update(bookingPaymentId, {
      synced_to_receipt: true,
      needs_accounting_action: false,
    });
  },
};
