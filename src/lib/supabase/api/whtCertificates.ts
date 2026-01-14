import { createClient } from '../client';
import type { Database } from '../database.types';

type WhtCertificate = Database['public']['Tables']['wht_certificates']['Row'];
type WhtCertificateInsert = Database['public']['Tables']['wht_certificates']['Insert'];
type WhtCertificateUpdate = Database['public']['Tables']['wht_certificates']['Update'];
type ExpenseWhtCertificate = Database['public']['Tables']['expense_wht_certificates']['Row'];

export type WhtCertificateWithExpenses = WhtCertificate & {
  expense_links: ExpenseWhtCertificate[];
};

export const whtCertificatesApi = {
  /**
   * Get all WHT certificates
   */
  async getAll(): Promise<WhtCertificate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('*')
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get WHT certificate by ID
   */
  async getById(id: string): Promise<WhtCertificate | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Get WHT certificate with linked expenses
   */
  async getByIdWithExpenses(id: string): Promise<WhtCertificateWithExpenses | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select(`
        *,
        expense_links:expense_wht_certificates(*)
      `)
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as WhtCertificateWithExpenses;
  },

  /**
   * Get WHT certificates by company
   */
  async getByCompany(companyId: string): Promise<WhtCertificate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('*')
      .eq('company_id', companyId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get WHT certificates by vendor
   */
  async getByVendor(vendorId: string): Promise<WhtCertificate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('*')
      .eq('payee_vendor_id', vendorId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get WHT certificates by tax period (YYYY-MM format)
   */
  async getByPeriod(period: string): Promise<WhtCertificate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('*')
      .eq('tax_period', period)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get WHT certificates by status
   */
  async getByStatus(status: 'draft' | 'issued' | 'filed'): Promise<WhtCertificate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('*')
      .eq('status', status)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Get WHT certificates by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<WhtCertificate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('*')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Create a new WHT certificate
   */
  async create(certificate: WhtCertificateInsert): Promise<WhtCertificate> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .insert([certificate])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Update an existing WHT certificate
   */
  async update(id: string, updates: WhtCertificateUpdate): Promise<WhtCertificate> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Delete a WHT certificate
   */
  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('wht_certificates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Link a WHT certificate to an expense
   */
  async linkToExpense(certificateId: string, expenseId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('expense_wht_certificates')
      .insert([{
        expense_id: expenseId,
        wht_certificate_id: certificateId,
      }]);
    if (error) throw error;
  },

  /**
   * Unlink a WHT certificate from an expense
   */
  async unlinkFromExpense(certificateId: string, expenseId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('expense_wht_certificates')
      .delete()
      .eq('expense_id', expenseId)
      .eq('wht_certificate_id', certificateId);
    if (error) throw error;
  },

  /**
   * Get WHT certificates linked to an expense
   */
  async getByExpense(expenseId: string): Promise<WhtCertificate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expense_wht_certificates')
      .select(`
        wht_certificate:wht_certificates(*)
      `)
      .eq('expense_id', expenseId);
    if (error) throw error;
    // Extract certificates from the join result
    return (data ?? [])
      .map(item => item.wht_certificate)
      .filter((cert): cert is WhtCertificate => cert !== null);
  },

  /**
   * Generate a unique certificate number
   * Format: WHT-{COMPANY_CODE}-YYYY-NNNN
   */
  async generateCertificateNumber(companyId: string, companyCode: string): Promise<string> {
    const supabase = createClient();
    const year = new Date().getFullYear();
    const prefix = `WHT-${companyCode}-${year}-`;

    // Get the highest existing number for this company and year
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('certificate_number')
      .eq('company_id', companyId)
      .like('certificate_number', `${prefix}%`)
      .order('certificate_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].certificate_number;
      const match = lastNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  },

  /**
   * Issue a WHT certificate (change status from draft to issued)
   */
  async issue(id: string): Promise<WhtCertificate> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .update({
        status: 'issued',
        issued_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Mark a WHT certificate as filed
   */
  async markAsFiled(id: string, submissionReference?: string): Promise<WhtCertificate> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .update({
        status: 'filed',
        filed_date: new Date().toISOString().split('T')[0],
        submission_reference: submissionReference,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Get summary of WHT certificates by period
   */
  async getSummaryByPeriod(period: string): Promise<{
    pnd3Count: number;
    pnd3Total: number;
    pnd53Count: number;
    pnd53Total: number;
    totalCount: number;
    totalAmount: number;
  }> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('wht_certificates')
      .select('form_type, wht_amount')
      .eq('tax_period', period);

    if (error) throw error;

    const summary = {
      pnd3Count: 0,
      pnd3Total: 0,
      pnd53Count: 0,
      pnd53Total: 0,
      totalCount: 0,
      totalAmount: 0,
    };

    for (const cert of data ?? []) {
      summary.totalCount++;
      summary.totalAmount += cert.wht_amount;

      if (cert.form_type === 'pnd3') {
        summary.pnd3Count++;
        summary.pnd3Total += cert.wht_amount;
      } else {
        summary.pnd53Count++;
        summary.pnd53Total += cert.wht_amount;
      }
    }

    return summary;
  },
};
