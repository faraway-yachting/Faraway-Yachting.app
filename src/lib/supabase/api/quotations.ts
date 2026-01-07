import { createClient } from '../client';
import type { Database } from '../database.types';

type Quotation = Database['public']['Tables']['quotations']['Row'];
type QuotationInsert = Database['public']['Tables']['quotations']['Insert'];
type QuotationUpdate = Database['public']['Tables']['quotations']['Update'];
type QuotationLineItem = Database['public']['Tables']['quotation_line_items']['Row'];
type QuotationLineItemInsert = Database['public']['Tables']['quotation_line_items']['Insert'];

export type QuotationWithLineItems = Quotation & {
  line_items: QuotationLineItem[];
};

export const quotationsApi = {
  async getAll(): Promise<Quotation[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('date_created', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Quotation | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByIdWithLineItems(id: string): Promise<QuotationWithLineItems | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        line_items:quotation_line_items(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as QuotationWithLineItems;
  },

  async create(quotation: QuotationInsert, lineItems?: QuotationLineItemInsert[]): Promise<Quotation> {
    const supabase = createClient();

    const { data: quotationData, error: quotationError } = await supabase
      .from('quotations')
      .insert([quotation])
      .select()
      .single();
    if (quotationError) throw quotationError;

    if (lineItems && lineItems.length > 0) {
      const lineItemsWithQuotationId = lineItems.map((item, index) => ({
        ...item,
        quotation_id: quotationData.id,
        line_order: index + 1
      }));

      const { error: lineItemsError } = await supabase
        .from('quotation_line_items')
        .insert(lineItemsWithQuotationId);
      if (lineItemsError) throw lineItemsError;
    }

    return quotationData;
  },

  async update(id: string, updates: QuotationUpdate): Promise<Quotation> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
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
      .from('quotations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByStatus(status: 'draft' | 'accepted' | 'void'): Promise<Quotation[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('status', status)
      .order('date_created', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByClient(clientId: string): Promise<Quotation[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('client_id', clientId)
      .order('date_created', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string): Promise<Quotation[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('company_id', companyId)
      .order('date_created', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Line items operations
  async getLineItems(quotationId: string): Promise<QuotationLineItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotation_line_items')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('line_order');
    if (error) throw error;
    return data ?? [];
  },

  async updateLineItems(quotationId: string, lineItems: QuotationLineItemInsert[]): Promise<void> {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('quotation_line_items')
      .delete()
      .eq('quotation_id', quotationId);
    if (deleteError) throw deleteError;

    if (lineItems.length > 0) {
      const lineItemsWithOrder = lineItems.map((item, index) => ({
        ...item,
        quotation_id: quotationId,
        line_order: index + 1
      }));

      const { error: insertError } = await supabase
        .from('quotation_line_items')
        .insert(lineItemsWithOrder);
      if (insertError) throw insertError;
    }
  },

  async convertToInvoice(quotationId: string, invoiceId: string): Promise<Quotation> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .update({
        status: 'accepted',
        converted_to_invoice_id: invoiceId
      })
      .eq('id', quotationId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
