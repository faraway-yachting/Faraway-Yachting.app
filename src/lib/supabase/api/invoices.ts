import { createClient } from '../client';
import type { Database } from '../database.types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];
type InvoiceLineItem = Database['public']['Tables']['invoice_line_items']['Row'];
type InvoiceLineItemInsert = Database['public']['Tables']['invoice_line_items']['Insert'];

export type InvoiceWithLineItems = Invoice & {
  line_items: InvoiceLineItem[];
};

export const invoicesApi = {
  async getAll(): Promise<Invoice[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Invoice | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByIdWithLineItems(id: string): Promise<InvoiceWithLineItems | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        line_items:invoice_line_items(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as InvoiceWithLineItems;
  },

  async create(invoice: InvoiceInsert, lineItems?: InvoiceLineItemInsert[]): Promise<Invoice> {
    const supabase = createClient();

    // Create invoice
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoice])
      .select()
      .single();
    if (invoiceError) throw invoiceError;

    // Create line items if provided
    if (lineItems && lineItems.length > 0) {
      const lineItemsWithInvoiceId = lineItems.map((item, index) => ({
        ...item,
        invoice_id: invoiceData.id,
        line_order: index + 1
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsWithInvoiceId);
      if (lineItemsError) throw lineItemsError;
    }

    return invoiceData;
  },

  async update(id: string, updates: InvoiceUpdate): Promise<Invoice> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    // Line items are deleted automatically via CASCADE
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByStatus(status: 'draft' | 'issued' | 'void'): Promise<Invoice[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', status)
      .order('invoice_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByClient(clientId: string): Promise<Invoice[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('invoice_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string): Promise<Invoice[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .order('invoice_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Invoice[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .order('invoice_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Line items operations
  async getLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('line_order');
    if (error) throw error;
    return data ?? [];
  },

  async updateLineItems(invoiceId: string, lineItems: InvoiceLineItemInsert[]): Promise<void> {
    const supabase = createClient();

    // Delete existing line items
    const { error: deleteError } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', invoiceId);
    if (deleteError) throw deleteError;

    // Insert new line items
    if (lineItems.length > 0) {
      const lineItemsWithOrder = lineItems.map((item, index) => ({
        ...item,
        invoice_id: invoiceId,
        line_order: index + 1
      }));

      const { error: insertError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsWithOrder);
      if (insertError) throw insertError;
    }
  }
};
