import { createClient } from '../client';
import type { Database } from '../database.types';

type Receipt = Database['public']['Tables']['receipts']['Row'];
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
type ReceiptUpdate = Database['public']['Tables']['receipts']['Update'];
type ReceiptLineItem = Database['public']['Tables']['receipt_line_items']['Row'];
type ReceiptLineItemInsert = Database['public']['Tables']['receipt_line_items']['Insert'];
type ReceiptPaymentRecord = Database['public']['Tables']['receipt_payment_records']['Row'];
type ReceiptPaymentRecordInsert = Database['public']['Tables']['receipt_payment_records']['Insert'];

export type ReceiptWithDetails = Receipt & {
  line_items: ReceiptLineItem[];
  payment_records: ReceiptPaymentRecord[];
};

export const receiptsApi = {
  async getAll(): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Receipt | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByIdWithDetails(id: string): Promise<ReceiptWithDetails | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        line_items:receipt_line_items(*),
        payment_records:receipt_payment_records(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ReceiptWithDetails;
  },

  async create(receipt: ReceiptInsert, lineItems?: ReceiptLineItemInsert[]): Promise<Receipt> {
    const supabase = createClient();

    const { data: receiptData, error: receiptError } = await supabase
      .from('receipts')
      .insert([receipt])
      .select()
      .single();
    if (receiptError) throw receiptError;

    if (lineItems && lineItems.length > 0) {
      const lineItemsWithReceiptId = lineItems.map((item, index) => ({
        ...item,
        receipt_id: receiptData.id,
        line_order: index + 1
      }));

      const { error: lineItemsError } = await supabase
        .from('receipt_line_items')
        .insert(lineItemsWithReceiptId);
      if (lineItemsError) throw lineItemsError;
    }

    return receiptData;
  },

  async update(id: string, updates: ReceiptUpdate): Promise<Receipt> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByStatus(status: 'draft' | 'paid' | 'void'): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('status', status)
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByClient(clientId: string): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('client_id', clientId)
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('company_id', companyId)
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Receipt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .gte('receipt_date', startDate)
      .lte('receipt_date', endDate)
      .order('receipt_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Line items operations
  async getLineItems(receiptId: string): Promise<ReceiptLineItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipt_line_items')
      .select('*')
      .eq('receipt_id', receiptId)
      .order('line_order');
    if (error) throw error;
    return data ?? [];
  },

  async updateLineItems(receiptId: string, lineItems: ReceiptLineItemInsert[]): Promise<void> {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('receipt_line_items')
      .delete()
      .eq('receipt_id', receiptId);
    if (deleteError) throw deleteError;

    if (lineItems.length > 0) {
      const lineItemsWithOrder = lineItems.map((item, index) => ({
        ...item,
        receipt_id: receiptId,
        line_order: index + 1
      }));

      const { error: insertError } = await supabase
        .from('receipt_line_items')
        .insert(lineItemsWithOrder);
      if (insertError) throw insertError;
    }
  },

  // Payment records operations
  async getPaymentRecords(receiptId: string): Promise<ReceiptPaymentRecord[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipt_payment_records')
      .select('*')
      .eq('receipt_id', receiptId)
      .order('payment_date');
    if (error) throw error;
    return data ?? [];
  },

  async addPaymentRecord(paymentRecord: ReceiptPaymentRecordInsert): Promise<ReceiptPaymentRecord> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('receipt_payment_records')
      .insert([paymentRecord])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePaymentRecord(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('receipt_payment_records')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
