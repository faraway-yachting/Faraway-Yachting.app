import { createClient } from '../client';
import type { Database } from '../database.types';

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
type ExpenseLineItem = Database['public']['Tables']['expense_line_items']['Row'];
type ExpenseLineItemInsert = Database['public']['Tables']['expense_line_items']['Insert'];
type ExpensePayment = Database['public']['Tables']['expense_payments']['Row'];
type ExpensePaymentInsert = Database['public']['Tables']['expense_payments']['Insert'];

export type ExpenseWithDetails = Expense & {
  line_items: ExpenseLineItem[];
  payments: ExpensePayment[];
};

export const expensesApi = {
  async getAll(): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Expense | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getByIdWithDetails(id: string): Promise<ExpenseWithDetails | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        line_items:expense_line_items(*),
        payments:expense_payments(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ExpenseWithDetails;
  },

  async create(expense: ExpenseInsert, lineItems?: ExpenseLineItemInsert[]): Promise<Expense> {
    const supabase = createClient();

    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .insert([expense])
      .select()
      .single();
    if (expenseError) throw expenseError;

    if (lineItems && lineItems.length > 0) {
      const lineItemsWithExpenseId = lineItems.map((item, index) => ({
        ...item,
        expense_id: expenseData.id,
        line_order: index + 1
      }));

      const { error: lineItemsError } = await supabase
        .from('expense_line_items')
        .insert(lineItemsWithExpenseId);
      if (lineItemsError) throw lineItemsError;
    }

    return expenseData;
  },

  async update(id: string, updates: ExpenseUpdate): Promise<Expense> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
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
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByStatus(status: 'draft' | 'approved' | 'void'): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('status', status)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByPaymentStatus(paymentStatus: 'unpaid' | 'partially_paid' | 'paid'): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('payment_status', paymentStatus)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByVendor(vendorId: string): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByCompany(companyId: string): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', companyId)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Line items operations
  async getLineItems(expenseId: string): Promise<ExpenseLineItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expense_line_items')
      .select('*')
      .eq('expense_id', expenseId)
      .order('line_order');
    if (error) throw error;
    return data ?? [];
  },

  async updateLineItems(expenseId: string, lineItems: ExpenseLineItemInsert[]): Promise<void> {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('expense_line_items')
      .delete()
      .eq('expense_id', expenseId);
    if (deleteError) throw deleteError;

    if (lineItems.length > 0) {
      const lineItemsWithOrder = lineItems.map((item, index) => ({
        ...item,
        expense_id: expenseId,
        line_order: index + 1
      }));

      const { error: insertError } = await supabase
        .from('expense_line_items')
        .insert(lineItemsWithOrder);
      if (insertError) throw insertError;
    }
  },

  // Payment operations
  async getPayments(expenseId: string): Promise<ExpensePayment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expense_payments')
      .select('*')
      .eq('expense_id', expenseId)
      .order('payment_date');
    if (error) throw error;
    return data ?? [];
  },

  async addPayment(payment: ExpensePaymentInsert): Promise<ExpensePayment> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expense_payments')
      .insert([payment])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePayment(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('expense_payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
