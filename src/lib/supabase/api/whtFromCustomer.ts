import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type DbWhtFromCustomer = Database['public']['Tables']['wht_from_customer']['Row'];
type DbWhtFromCustomerInsert = Database['public']['Tables']['wht_from_customer']['Insert'];
type DbWhtFromCustomerUpdate = Database['public']['Tables']['wht_from_customer']['Update'];

export interface WhtFromCustomerRecord {
  id: string;
  receiptId: string;
  receiptLineItemId: string | null;
  companyId: string;
  customerId: string | null;
  customerName: string;
  customerTaxId: string | null;
  receiptDate: string;
  baseAmount: number;
  whtRate: number;
  whtAmount: number;
  currency: string;
  status: 'pending' | 'received' | 'reconciled';
  certificateNumber: string | null;
  certificateDate: string | null;
  certificateFileUrl: string | null;
  certificateFileName: string | null;
  period: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  receivedAt: string | null;
  receivedBy: string | null;
  // Joined fields
  companyName?: string;
  receiptNumber?: string;
}

// Transform database row to frontend format
function dbToFrontend(db: DbWhtFromCustomer & { companies?: { name: string }; receipts?: { receipt_number: string } }): WhtFromCustomerRecord {
  return {
    id: db.id,
    receiptId: db.receipt_id,
    receiptLineItemId: db.receipt_line_item_id,
    companyId: db.company_id,
    customerId: db.customer_id,
    customerName: db.customer_name,
    customerTaxId: db.customer_tax_id,
    receiptDate: db.receipt_date,
    baseAmount: db.base_amount,
    whtRate: db.wht_rate,
    whtAmount: db.wht_amount,
    currency: db.currency,
    status: db.status,
    certificateNumber: db.certificate_number,
    certificateDate: db.certificate_date,
    certificateFileUrl: db.certificate_file_url,
    certificateFileName: db.certificate_file_name,
    period: db.period,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    receivedAt: db.received_at,
    receivedBy: db.received_by,
    companyName: db.companies?.name,
    receiptNumber: db.receipts?.receipt_number,
  };
}

export const whtFromCustomerApi = {
  /**
   * Get all WHT from customer records for a period
   * Returns empty array if table doesn't exist (migration not run)
   */
  async getByPeriod(
    period: string,
    companyId?: string
  ): Promise<WhtFromCustomerRecord[]> {
    const supabase = createClient();

    try {
      let query = supabase
        .from('wht_from_customer')
        .select(`
          *,
          companies:company_id(name),
          receipts:receipt_id(receipt_number)
        `)
        .eq('period', period)
        .order('receipt_date', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        // Check if table doesn't exist (migration not run)
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.warn('wht_from_customer table not found - run migration 020');
          return [];
        }
        console.error('Error fetching WHT from customer records:', error);
        return [];
      }

      return (data || []).map(dbToFrontend);
    } catch (err) {
      // Gracefully handle any errors - table might not exist yet
      console.warn('Could not fetch WHT from customer records:', err);
      return [];
    }
  },

  /**
   * Get WHT records by receipt ID
   * Returns empty array if table doesn't exist (migration not run)
   */
  async getByReceiptId(receiptId: string): Promise<WhtFromCustomerRecord[]> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('wht_from_customer')
        .select(`
          *,
          companies:company_id(name),
          receipts:receipt_id(receipt_number)
        `)
        .eq('receipt_id', receiptId);

      if (error) {
        // Check if table doesn't exist (migration not run)
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.warn('wht_from_customer table not found - run migration 020');
          return [];
        }
        console.error('Error fetching WHT records for receipt:', error);
        return [];
      }

      return (data || []).map(dbToFrontend);
    } catch (err) {
      console.warn('Could not fetch WHT records for receipt:', err);
      return [];
    }
  },

  /**
   * Create WHT from customer record (called when receipt with WHT is approved)
   */
  async create(record: DbWhtFromCustomerInsert): Promise<WhtFromCustomerRecord> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('wht_from_customer')
      .insert(record)
      .select(`
        *,
        companies:company_id(name),
        receipts:receipt_id(receipt_number)
      `)
      .single();

    if (error) {
      console.error('Error creating WHT from customer record:', error);
      throw error;
    }

    return dbToFrontend(data);
  },

  /**
   * Create multiple WHT records from receipt line items
   */
  async createFromReceiptLineItems(
    receiptId: string,
    companyId: string,
    customerId: string | null,
    customerName: string,
    customerTaxId: string | null,
    receiptDate: string,
    currency: string,
    lineItems: Array<{
      id: string;
      description: string;
      unitPrice: number;
      quantity: number;
      whtRate: number | 'custom';
      customWhtAmount?: number;
    }>
  ): Promise<WhtFromCustomerRecord[]> {
    const supabase = createClient();
    const period = receiptDate.slice(0, 7); // YYYY-MM

    const recordsToInsert: DbWhtFromCustomerInsert[] = [];

    for (const item of lineItems) {
      // Skip items without WHT
      if (item.whtRate === 0 || (item.whtRate === 'custom' && !item.customWhtAmount)) {
        continue;
      }

      const baseAmount = item.unitPrice * item.quantity;
      let whtRate: number;
      let whtAmount: number;

      if (item.whtRate === 'custom') {
        whtAmount = item.customWhtAmount || 0;
        whtRate = baseAmount > 0 ? (whtAmount / baseAmount) * 100 : 0;
      } else {
        whtRate = item.whtRate;
        whtAmount = baseAmount * (whtRate / 100);
      }

      if (whtAmount > 0) {
        recordsToInsert.push({
          receipt_id: receiptId,
          receipt_line_item_id: item.id,
          company_id: companyId,
          customer_id: customerId || null,
          customer_name: customerName,
          customer_tax_id: customerTaxId || null,
          receipt_date: receiptDate,
          base_amount: baseAmount,
          wht_rate: whtRate,
          wht_amount: whtAmount,
          currency,
          period,
          status: 'pending',
        });
      }
    }

    if (recordsToInsert.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('wht_from_customer')
      .insert(recordsToInsert)
      .select(`
        *,
        companies:company_id(name),
        receipts:receipt_id(receipt_number)
      `);

    if (error) {
      console.error('Error creating WHT from customer records:', error);
      throw error;
    }

    return (data || []).map(dbToFrontend);
  },

  /**
   * Update WHT record (mark as received, add certificate info)
   */
  async update(
    id: string,
    updates: DbWhtFromCustomerUpdate
  ): Promise<WhtFromCustomerRecord> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('wht_from_customer')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        companies:company_id(name),
        receipts:receipt_id(receipt_number)
      `)
      .single();

    if (error) {
      console.error('Error updating WHT from customer record:', error);
      throw error;
    }

    return dbToFrontend(data);
  },

  /**
   * Mark WHT as received with certificate info (all fields optional)
   */
  async markAsReceived(
    id: string,
    certificateNumber?: string,
    certificateDate?: string,
    certificateFileUrl?: string,
    certificateFileName?: string,
    notes?: string
  ): Promise<WhtFromCustomerRecord> {
    return this.update(id, {
      status: 'received',
      certificate_number: certificateNumber || null,
      certificate_date: certificateDate || null,
      certificate_file_url: certificateFileUrl || null,
      certificate_file_name: certificateFileName || null,
      notes: notes || null,
      received_at: new Date().toISOString(),
    });
  },

  /**
   * Delete WHT records for a receipt (when receipt is voided)
   */
  async deleteByReceiptId(receiptId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('wht_from_customer')
      .delete()
      .eq('receipt_id', receiptId);

    if (error) {
      console.error('Error deleting WHT records for receipt:', error);
      throw error;
    }
  },

  /**
   * Get summary statistics for a period
   */
  async getSummary(
    period: string,
    companyId?: string
  ): Promise<{
    totalAmount: number;
    pendingCount: number;
    receivedCount: number;
    totalCount: number;
  }> {
    const records = await this.getByPeriod(period, companyId);

    return {
      totalAmount: records.reduce((sum, r) => sum + r.whtAmount, 0),
      pendingCount: records.filter(r => r.status === 'pending').length,
      receivedCount: records.filter(r => r.status === 'received' || r.status === 'reconciled').length,
      totalCount: records.length,
    };
  },

  /**
   * Upload certificate file to storage
   * Returns null if bucket doesn't exist (storage not configured)
   */
  async uploadCertificateFile(
    file: File,
    whtRecordId: string
  ): Promise<{ url: string; fileName: string } | null> {
    const supabase = createClient();

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${whtRecordId}-${Date.now()}.${fileExt}`;
    const filePath = `wht-certificates/${fileName}`;

    try {
      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('Documents')
        .upload(filePath, file);

      if (uploadError) {
        // Check if bucket doesn't exist
        if (uploadError.message?.includes('Bucket not found') ||
            uploadError.message?.includes('bucket') ||
            uploadError.message?.includes('not found')) {
          console.warn('Storage bucket "documents" not found. File upload skipped. Please create the bucket in Supabase Storage.');
          return null;
        }
        console.error('Error uploading certificate file:', uploadError);
        throw new Error('Failed to upload file. Please try again.');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('Documents')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        fileName: file.name,
      };
    } catch (err) {
      // Handle any other errors
      if (err instanceof Error && err.message === 'Failed to upload file. Please try again.') {
        throw err;
      }
      console.warn('Could not upload certificate file:', err);
      return null;
    }
  },
};
